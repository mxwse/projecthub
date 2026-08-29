import { BrowserWindow, app, dialog, ipcMain, shell } from 'electron'
import { execFile } from 'child_process'
import fs from 'fs'
import path from 'path'
import * as db from './db'
import { istInnerhalb } from './pfad-grenze'
import type { ExportBundle, ImportResult } from '../shared/types'

let vscodeChecked: boolean | null = null

/**
 * Ordner, die der Nutzer in dieser Sitzung selbst ueber den Dialog gewaehlt
 * hat. Sie gelten zusaetzlich zu den Projektordnern als erlaubt — wer einen
 * Ordner bewusst auswaehlt, will ihn auch oeffnen koennen.
 */
const gewaehlteOrdner = new Set<string>()

/**
 * Grenzt die Dateizugriffe auf die Projektordner ein.
 *
 * Vorher nahmen files:listDir, readFile, writeFile und openInVSCode jeden
 * absoluten Pfad entgegen. Die contextBridge-API war damit ein Lese- und
 * Schreibzugang zum gesamten Dateisystem — der Renderer ist zwar eigener
 * Code, aber ein importiertes Projekt-Bundle bringt fremde localPath-Werte
 * mit, und ein XSS im Editor haette die volle Platte gehabt.
 *
 * Die Regel selbst steht in pfad-grenze.ts und ist dort getestet.
 */
function istErlaubt(ziel: string): boolean {
  return istInnerhalb(ziel, [
    ...db.listProjects().map((p) => p.localPath),
    ...gewaehlteOrdner
  ])
}

/** Einheitliche Ablehnung, damit alle Handler dieselbe Meldung liefern. */
const abgelehnt = { ok: false as const, error: 'Pfad liegt ausserhalb der Projektordner' }

export function registerIpcHandlers(getWindow: () => BrowserWindow | null): void {
  // Projekte
  ipcMain.handle('projects:list', () => db.listProjects())
  ipcMain.handle('projects:get', (_e, id: string) => db.getProject(id))
  ipcMain.handle('projects:create', (_e, input) => db.createProject(input))
  ipcMain.handle('projects:update', (_e, id: string, patch) => db.updateProject(id, patch))
  ipcMain.handle('projects:remove', (_e, id: string) => db.deleteProject(id))
  ipcMain.handle('projects:duplicate', (_e, id: string) => db.duplicateProject(id))

  // Aufgaben
  ipcMain.handle('tasks:list', () => db.listTasks())
  ipcMain.handle('tasks:create', (_e, input) => db.createTask(input))
  ipcMain.handle('tasks:update', (_e, id: string, patch) => db.updateTask(id, patch))
  ipcMain.handle('tasks:remove', (_e, id: string) => db.deleteTask(id))

  // Notizen
  ipcMain.handle('notes:list', (_e, projectId: string) => db.listNotes(projectId))
  ipcMain.handle('notes:create', (_e, projectId: string, title: string) => db.createNote(projectId, title))
  ipcMain.handle('notes:update', (_e, id: string, patch) => db.updateNote(id, patch))
  ipcMain.handle('notes:remove', (_e, id: string) => db.deleteNote(id))

  // Versionen
  ipcMain.handle('versions:list', (_e, projectId: string) => db.listVersions(projectId))
  ipcMain.handle('versions:create', (_e, input) => db.createVersion(input))
  ipcMain.handle('versions:remove', (_e, id: string) => db.deleteVersion(id))

  // Meilensteine
  ipcMain.handle('milestones:list', (_e, projectId: string) => db.listMilestones(projectId))
  ipcMain.handle('milestones:listAll', () => db.listAllMilestones())
  ipcMain.handle('milestones:create', (_e, input) => db.createMilestone(input))
  ipcMain.handle('milestones:update', (_e, id: string, patch) => db.updateMilestone(id, patch))
  ipcMain.handle('milestones:remove', (_e, id: string) => db.deleteMilestone(id))

  // Einstellungen
  ipcMain.handle('settings:getAll', () => db.getAllSettings())
  ipcMain.handle('settings:set', (_e, key: string, value: string) => db.setSetting(key, value))

  // Daten: Export / Import / Backup
  ipcMain.handle('data:export', async () => {
    const win = getWindow()
    if (!win) return { ok: false }
    const result = await dialog.showSaveDialog(win, {
      title: 'Projekte als JSON exportieren',
      defaultPath: `projecthub-export-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (result.canceled || !result.filePath) return { ok: false }
    fs.writeFileSync(result.filePath, JSON.stringify(db.exportBundle(), null, 2), 'utf-8')
    return { ok: true, path: result.filePath }
  })

  ipcMain.handle('data:import', async (): Promise<ImportResult> => {
    const win = getWindow()
    if (!win) return { ok: false, message: 'Kein Fenster aktiv' }
    const result = await dialog.showOpenDialog(win, {
      title: 'ProjectHub JSON importieren',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile']
    })
    if (result.canceled || !result.filePaths.length) return { ok: false, message: 'Abgebrochen' }
    try {
      const raw = fs.readFileSync(result.filePaths[0], 'utf-8')
      const bundle = JSON.parse(raw) as ExportBundle
      if (bundle.app !== 'projecthub' || !Array.isArray(bundle.projects)) {
        return { ok: false, message: 'Die Datei ist kein gültiger ProjectHub-Export.' }
      }
      db.createBackup()
      const counts = db.importBundle(bundle)
      return { ok: true, message: `${counts.projects} Projekte importiert`, counts }
    } catch (err) {
      return { ok: false, message: `Import fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}` }
    }
  })

  ipcMain.handle('data:backup', () => {
    try {
      return { ok: true, path: db.createBackup() }
    } catch {
      return { ok: false }
    }
  })

  ipcMain.handle('data:openBackupFolder', () => {
    fs.mkdirSync(db.backupDir(), { recursive: true })
    shell.openPath(db.backupDir())
  })

  ipcMain.handle('data:getDbPath', () => db.dbPath())
  ipcMain.handle('data:wipe', () => db.wipeAll())

  // Dateisystem
  ipcMain.handle('files:listDir', (_e, dirPath: string) => {
    try {
      if (!dirPath || !fs.existsSync(dirPath)) {
        return { ok: false, entries: [], error: 'Pfad existiert nicht' }
      }
      if (!istErlaubt(dirPath)) return { ...abgelehnt, entries: [] }
      const entries = fs
        .readdirSync(dirPath, { withFileTypes: true })
        .slice(0, 200)
        .map((d) => {
          let size = 0
          try {
            if (d.isFile()) size = fs.statSync(path.join(dirPath, d.name)).size
          } catch {
            /* unlesbare Datei überspringen */
          }
          return { name: d.name, isDirectory: d.isDirectory(), size }
        })
        .sort((a, b) => Number(b.isDirectory) - Number(a.isDirectory) || a.name.localeCompare(b.name))
      return { ok: true, entries }
    } catch (err) {
      return { ok: false, entries: [], error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('files:readFile', (_e, filePath: string) => {
    try {
      if (!istErlaubt(filePath)) return abgelehnt
      const stat = fs.statSync(filePath)
      if (!stat.isFile()) return { ok: false, error: 'Kein gültiger Dateipfad' }
      if (stat.size > 1_500_000) return { ok: false, error: 'Datei ist zu groß für den Editor (max. 1,5 MB)' }
      const buf = fs.readFileSync(filePath)
      // Binärdateien erkennen (NUL-Byte im Anfangsbereich)
      if (buf.subarray(0, 8000).includes(0)) return { ok: false, error: 'Binärdatei – kann nicht als Text bearbeitet werden' }
      return { ok: true, content: buf.toString('utf-8') }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('files:writeFile', (_e, filePath: string, content: string) => {
    try {
      if (!istErlaubt(filePath)) return abgelehnt
      fs.writeFileSync(filePath, content, 'utf-8')
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('files:vscodeAvailable', async () => {
    if (vscodeChecked !== null) return vscodeChecked
    vscodeChecked = await new Promise<boolean>((resolve) => {
      execFile('code', ['--version'], { timeout: 5000, shell: true }, (err) => resolve(!err))
    })
    return vscodeChecked
  })

  ipcMain.handle('files:openInVSCode', async (_e, target: string) => {
    if (!target || !fs.existsSync(target)) return { ok: false, error: 'Pfad existiert nicht' }
    if (!istErlaubt(target)) return abgelehnt
    return new Promise((resolve) => {
      // execFile mit Argument-Array statt exec mit Template-String: der Pfad
      // wird als ein Argument uebergeben und nie vom Kommandointerpreter
      // geparst.
      execFile('code', [target], { timeout: 10000, shell: true }, (err) => {
        if (err) {
          // Fallback: im Explorer/Standardprogramm öffnen
          shell.openPath(target)
          resolve({ ok: false, error: 'VS Code (code-CLI) nicht gefunden – stattdessen im Explorer geöffnet' })
        } else {
          resolve({ ok: true })
        }
      })
    })
  })

  ipcMain.handle('files:openPath', (_e, p: string) => {
    if (p && istErlaubt(p)) shell.openPath(p)
  })

  ipcMain.handle('files:openExternal', (_e, url: string) => {
    if (url && /^https?:\/\//.test(url)) shell.openExternal(url)
  })

  ipcMain.handle('files:pickFolder', async () => {
    const win = getWindow()
    if (!win) return null
    const result = await dialog.showOpenDialog(win, { properties: ['openDirectory'] })
    if (result.canceled || !result.filePaths.length) return null
    // Der Nutzer hat diesen Ordner bewusst gewaehlt, also darf er ihn auch
    // durchsuchen, bevor daraus ein Projekt geworden ist.
    gewaehlteOrdner.add(result.filePaths[0])
    return result.filePaths[0]
  })

  ipcMain.handle('app:info', () => ({ version: app.getVersion(), platform: process.platform }))
}
