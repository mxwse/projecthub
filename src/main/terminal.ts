import { ipcMain } from 'electron'
import { spawn } from 'child_process'
import fs from 'fs'
import * as pty from '@homebridge/node-pty-prebuilt-multiarch'

interface Session {
  proc: pty.IPty
}

const sessions = new Map<string, Session>()

export function registerTerminalHandlers(): void {
  ipcMain.handle('terminal:create', (event, id: string, cwd: string, cols: number, rows: number) => {
    if (sessions.has(id)) return { ok: true }
    const dir = cwd && fs.existsSync(cwd) ? cwd : (process.env.USERPROFILE ?? 'C:\\')
    try {
      const proc = pty.spawn(process.env.COMSPEC ?? 'cmd.exe', [], {
        name: 'xterm-color',
        cwd: dir,
        cols: Math.max(20, cols || 80),
        rows: Math.max(5, rows || 24),
        env: process.env as Record<string, string>
      })
      const wc = event.sender
      proc.onData((data) => {
        if (!wc.isDestroyed()) wc.send('terminal:data', { id, data })
      })
      proc.onExit(({ exitCode }) => {
        sessions.delete(id)
        if (!wc.isDestroyed()) wc.send('terminal:exit', { id, code: exitCode })
      })
      sessions.set(id, { proc })
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('terminal:write', (_e, id: string, data: string) => {
    sessions.get(id)?.proc.write(data)
  })

  ipcMain.handle('terminal:resize', (_e, id: string, cols: number, rows: number) => {
    try {
      sessions.get(id)?.proc.resize(Math.max(20, cols), Math.max(5, rows))
    } catch {
      /* Resize auf beendete Session ignorieren */
    }
  })

  ipcMain.handle('terminal:kill', (_e, id: string) => {
    const s = sessions.get(id)
    if (!s) return
    sessions.delete(id)
    try {
      s.proc.kill()
    } catch {
      /* bereits beendet */
    }
  })

  ipcMain.handle('terminal:openExternal', (_e, cwd: string) => {
    const dir = cwd && fs.existsSync(cwd) ? cwd : (process.env.USERPROFILE ?? 'C:\\')
    // spawn mit cwd-Option statt exec mit Template-String: der Pfad wird nie
    // Teil einer Kommandozeile und damit auch nie vom Interpreter geparst.
    // detached plus windowsHide:false gibt dem Kind ein eigenes Konsolenfenster.
    const proc = spawn(process.env.COMSPEC ?? 'cmd.exe', ['/K'], {
      cwd: dir,
      detached: true,
      stdio: 'ignore',
      windowsHide: false
    })
    proc.unref()
  })
}

export function killAllTerminals(): void {
  for (const s of sessions.values()) {
    try {
      s.proc.kill()
    } catch {
      /* bereits beendet */
    }
  }
  sessions.clear()
}
