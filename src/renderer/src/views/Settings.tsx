import { AlertTriangle, Database, Download, FolderOpen, HardDrive, Moon, Sun, Upload, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useApp } from '@/store'
import { Button, ConfirmDialog, Field, SectionLabel, inputClass } from '@/components/ui'

export function SettingsView(): React.JSX.Element {
  const { settings, setSetting, theme, toggleTheme, toast, refreshProjects, refreshTasks } = useApp()
  const [name, setName] = useState(settings['userName'] ?? '')
  const [dbPath, setDbPath] = useState('')
  const [appVersion, setAppVersion] = useState('')
  const [confirmWipe, setConfirmWipe] = useState(false)

  useEffect(() => {
    void window.api.data.getDbPath().then(setDbPath)
    void window.api.appInfo().then((info) => setAppVersion(info.version))
  }, [])

  useEffect(() => setName(settings['userName'] ?? ''), [settings])

  return (
    <div className="h-full overflow-y-auto px-8 py-7">
      <h1 className="text-xl font-bold tracking-tight">Einstellungen</h1>
      <p className="t-mono mt-1 text-faint">ProjectHub v{appVersion} · lokale Installation</p>

      <div className="mt-7 max-w-2xl space-y-8">
        {/* Profil */}
        <section className="anim-rise">
          <SectionLabel>
            <span className="inline-flex items-center gap-1.5">
              <User size={11} /> Profil
            </span>
          </SectionLabel>
          <div className="rounded-xl border border-line bg-panel p-4">
            <Field label="Anzeigename">
              <div className="flex gap-2">
                <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Dein Name" />
                <Button
                  onClick={() => {
                    void setSetting('userName', name.trim())
                    toast('success', 'Name gespeichert')
                  }}
                >
                  Speichern
                </Button>
              </div>
            </Field>
          </div>
        </section>

        {/* Darstellung */}
        <section className="anim-rise" style={{ animationDelay: '60ms' }}>
          <SectionLabel>Darstellung</SectionLabel>
          <div className="flex items-center justify-between rounded-xl border border-line bg-panel p-4">
            <div>
              <p className="text-sm font-medium">Design</p>
              <p className="t-mono mt-0.5 text-faint">{theme === 'dark' ? 'Dunkel (Standard)' : 'Hell'}</p>
            </div>
            <Button variant="outline" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              {theme === 'dark' ? 'Zu Hell wechseln' : 'Zu Dunkel wechseln'}
            </Button>
          </div>
        </section>

        {/* Daten */}
        <section className="anim-rise" style={{ animationDelay: '120ms' }}>
          <SectionLabel>
            <span className="inline-flex items-center gap-1.5">
              <Database size={11} /> Daten
            </span>
          </SectionLabel>
          <div className="space-y-3 rounded-xl border border-line bg-panel p-4">
            <div>
              <p className="t-label mb-1">Speicherort der Datenbank</p>
              <p className="t-mono break-all rounded-lg bg-raised px-3 py-2 text-dim">{dbPath}</p>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                variant="outline"
                onClick={async () => {
                  const res = await window.api.data.backup()
                  toast(res.ok ? 'success' : 'error', res.ok ? 'Backup erstellt' : 'Backup fehlgeschlagen')
                }}
              >
                <HardDrive size={14} /> Backup erstellen
              </Button>
              <Button variant="outline" onClick={() => void window.api.data.openBackupFolder()}>
                <FolderOpen size={14} /> Backup-Ordner öffnen
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  const res = await window.api.data.exportJson()
                  if (res.ok) toast('success', `Export gespeichert: ${res.path}`)
                }}
              >
                <Download size={14} /> Als JSON exportieren
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  const res = await window.api.data.importJson()
                  if (res.ok) {
                    await Promise.all([refreshProjects(), refreshTasks()])
                    toast('success', res.message)
                  } else if (res.message !== 'Abgebrochen') {
                    toast('error', res.message)
                  }
                }}
              >
                <Upload size={14} /> JSON importieren
              </Button>
            </div>
            <p className="t-mono pt-1 text-faint">
              Beim App-Start wird automatisch ein Backup angelegt (die letzten 14 werden behalten). Importe führen eine
              Zusammenführung anhand der IDs durch.
            </p>
          </div>
        </section>

        {/* Gefahrenzone */}
        <section className="anim-rise" style={{ animationDelay: '180ms' }}>
          <SectionLabel>
            <span className="inline-flex items-center gap-1.5 text-err">
              <AlertTriangle size={11} /> Gefahrenzone
            </span>
          </SectionLabel>
          <div className="flex items-center justify-between rounded-xl border border-err/30 bg-err/5 p-4">
            <div>
              <p className="text-sm font-medium">Alle Daten löschen</p>
              <p className="t-mono mt-0.5 text-faint">Vorher wird automatisch ein Backup erstellt.</p>
            </div>
            <Button variant="danger" onClick={() => setConfirmWipe(true)}>
              Alles löschen
            </Button>
          </div>
        </section>
      </div>

      {confirmWipe && (
        <ConfirmDialog
          title="Alle Daten löschen"
          message="Sämtliche Projekte, Aufgaben, Notizen, Versionen und Meilensteine werden gelöscht. Ein Backup wird vorher automatisch erstellt."
          confirmLabel="Endgültig löschen"
          onConfirm={async () => {
            setConfirmWipe(false)
            await window.api.data.wipe()
            await Promise.all([refreshProjects(), refreshTasks()])
            toast('success', 'Alle Daten gelöscht (Backup erstellt)')
          }}
          onCancel={() => setConfirmWipe(false)}
        />
      )}
    </div>
  )
}
