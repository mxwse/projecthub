import { ChevronDown, ChevronRight, Code2, File, Folder, FolderOpen, RefreshCw, Save } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { FileEntry, Project } from '@shared/types'
import { useApp } from '@/store'
import { formatBytes } from '@/utils'
import { Button, EmptyState } from '@/components/ui'
import { languageForFile, monaco } from '@/monaco'

const DIMMED_DIRS = new Set([
  'node_modules', '.git', '.next', '.expo', '.venv', '__pycache__', 'out', 'dist', 'build',
  'release', 'Library', 'Logs', 'Temp', 'obj', 'bin', '.dart_tool', '.idea', '.vscode'
])

// ---------- Dateibaum ----------

function TreeDir({
  path: dirPath,
  name,
  depth,
  onOpenFile,
  selectedPath,
  initiallyOpen = false
}: {
  path: string
  name: string
  depth: number
  onOpenFile: (path: string, name: string) => void
  selectedPath: string | null
  initiallyOpen?: boolean
}): React.JSX.Element {
  const [open, setOpen] = useState(initiallyOpen)
  const [entries, setEntries] = useState<FileEntry[] | null>(null)
  const dimmed = DIMMED_DIRS.has(name)

  useEffect(() => {
    if (open && entries === null) {
      void window.api.files.listDir(dirPath).then((res) => setEntries(res.ok ? res.entries : []))
    }
  }, [open, entries, dirPath])

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-[12.5px] transition-colors hover:bg-hover ${
          dimmed ? 'text-faint' : 'text-dim'
        }`}
        style={{ paddingLeft: `${depth * 14 + 6}px` }}
      >
        {open ? <ChevronDown size={12} className="shrink-0" /> : <ChevronRight size={12} className="shrink-0" />}
        {open ? <FolderOpen size={13} className="shrink-0 text-accent/70" /> : <Folder size={13} className="shrink-0 text-accent/70" />}
        <span className="truncate">{name}</span>
      </button>
      {open && entries && (
        <div>
          {entries.map((e) =>
            e.isDirectory ? (
              <TreeDir
                key={e.name}
                path={`${dirPath}\\${e.name}`}
                name={e.name}
                depth={depth + 1}
                onOpenFile={onOpenFile}
                selectedPath={selectedPath}
              />
            ) : (
              <TreeFile
                key={e.name}
                entry={e}
                path={`${dirPath}\\${e.name}`}
                depth={depth + 1}
                onOpen={onOpenFile}
                selected={selectedPath === `${dirPath}\\${e.name}`}
              />
            )
          )}
          {entries.length === 0 && (
            <span className="t-mono block py-0.5 text-faint" style={{ paddingLeft: `${(depth + 1) * 14 + 24}px` }}>
              leer
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function TreeFile({
  entry,
  path: filePath,
  depth,
  onOpen,
  selected
}: {
  entry: FileEntry
  path: string
  depth: number
  onOpen: (path: string, name: string) => void
  selected: boolean
}): React.JSX.Element {
  return (
    <button
      onClick={() => onOpen(filePath, entry.name)}
      className={`flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-[12.5px] transition-colors ${
        selected ? 'bg-raised text-accent' : 'text-dim hover:bg-hover'
      }`}
      style={{ paddingLeft: `${depth * 14 + 20}px` }}
      title={`${entry.name}${entry.size ? ` · ${formatBytes(entry.size)}` : ''}`}
    >
      <File size={13} className={`shrink-0 ${selected ? 'text-accent' : 'text-faint'}`} />
      <span className="truncate">{entry.name}</span>
    </button>
  )
}

// ---------- Workspace (Baum + Monaco-Editor) ----------

export function CodeWorkspace({ project }: { project: Project }): React.JSX.Element {
  const { toast, theme } = useApp()
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const originalRef = useRef<string>('')
  const filePathRef = useRef<string | null>(null)

  const [filePath, setFilePath] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [dirty, setDirty] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [vscode, setVscode] = useState(false)
  const [treeKey, setTreeKey] = useState(0)

  useEffect(() => {
    void window.api.files.vscodeAvailable().then(setVscode)
  }, [])

  // Editor einmalig erzeugen
  useEffect(() => {
    if (!containerRef.current) return
    const editor = monaco.editor.create(containerRef.current, {
      value: '',
      language: 'plaintext',
      theme: theme === 'dark' ? 'projecthub-dark' : 'projecthub-light',
      automaticLayout: true,
      fontSize: 13,
      fontFamily: "'IBM Plex Mono', monospace",
      fontLigatures: false,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      padding: { top: 12 },
      renderWhitespace: 'none',
      smoothScrolling: true
    })
    editor.onDidChangeModelContent(() => {
      setDirty(editor.getValue() !== originalRef.current)
    })
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => void saveRef.current())
    editorRef.current = editor
    return () => {
      editor.getModel()?.dispose()
      editor.dispose()
      editorRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    monaco.editor.setTheme(theme === 'dark' ? 'projecthub-dark' : 'projecthub-light')
  }, [theme])

  const save = useCallback(async (): Promise<void> => {
    const editor = editorRef.current
    const target = filePathRef.current
    if (!editor || !target) return
    const content = editor.getValue()
    const res = await window.api.files.writeFile(target, content)
    if (res.ok) {
      originalRef.current = content
      setDirty(false)
      toast('success', 'Datei gespeichert')
    } else {
      toast('error', `Speichern fehlgeschlagen: ${res.error}`)
    }
  }, [toast])

  const saveRef = useRef(save)
  useEffect(() => {
    saveRef.current = save
  }, [save])

  const openFile = useCallback(
    async (path: string, name: string): Promise<void> => {
      const editor = editorRef.current
      if (!editor) return
      if (dirty && !window.confirm('Ungespeicherte Änderungen verwerfen?')) return
      const res = await window.api.files.readFile(path)
      if (!res.ok) {
        setLoadError(res.error ?? 'Datei konnte nicht geladen werden')
        setFilePath(path)
        filePathRef.current = null
        setFileName(name)
        setDirty(false)
        return
      }
      setLoadError(null)
      const language = languageForFile(name)
      editor.getModel()?.dispose()
      editor.setModel(monaco.editor.createModel(res.content ?? '', language))
      originalRef.current = res.content ?? ''
      filePathRef.current = path
      setFilePath(path)
      setFileName(name)
      setDirty(false)
      editor.focus()
    },
    [dirty]
  )

  if (!project.localPath) {
    return (
      <EmptyState
        icon={<Code2 size={28} strokeWidth={1.5} />}
        title="Kein lokaler Pfad hinterlegt"
        hint={'Hinterlege über „Bearbeiten" einen lokalen Ordner, um den Code hier zu sehen und zu bearbeiten.'}
      />
    )
  }

  return (
    <div className="flex h-full min-h-[460px] flex-col">
      {/* Werkzeugleiste */}
      <div className="mb-3 flex items-center gap-2">
        <span className="t-mono min-w-0 flex-1 truncate rounded-lg border border-line bg-panel px-3 py-2 text-dim">
          {project.localPath}
        </span>
        <Button variant="outline" onClick={() => setTreeKey((k) => k + 1)} title="Dateibaum neu laden">
          <RefreshCw size={13} />
        </Button>
        <Button variant="outline" onClick={() => void window.api.files.openPath(project.localPath)}>
          <FolderOpen size={14} /> Explorer
        </Button>
        {vscode && (
          <Button
            variant="outline"
            onClick={async () => {
              const res = await window.api.files.openInVSCode(project.localPath)
              if (res.ok) toast('success', 'Projekt in VS Code geöffnet')
              else toast('error', res.error ?? 'Öffnen fehlgeschlagen')
            }}
          >
            <Code2 size={14} /> In VS Code öffnen
          </Button>
        )}
      </div>

      {/* Split: Baum | Editor */}
      <div className="grid min-h-0 flex-1 grid-cols-[260px_1fr] gap-3">
        <div className="min-h-0 overflow-y-auto rounded-xl border border-line bg-panel p-2" key={treeKey}>
          <TreeDir
            path={project.localPath}
            name={project.name}
            depth={0}
            onOpenFile={(p, n) => void openFile(p, n)}
            selectedPath={filePath}
            initiallyOpen
          />
        </div>

        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-panel">
          {/* Editor-Kopf */}
          <div className="flex h-11 shrink-0 items-center gap-2 border-b border-line px-3">
            {filePath ? (
              <>
                <File size={13} className="shrink-0 text-accent" />
                <span className="truncate text-[13px] font-medium">{fileName}</span>
                {dirty && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warn" title="Ungespeicherte Änderungen" />}
                <span className="t-mono ml-2 text-faint">{languageForFile(fileName)}</span>
                <div className="ml-auto flex items-center gap-1.5">
                  {vscode && filePathRef.current && (
                    <Button variant="ghost" onClick={() => void window.api.files.openInVSCode(filePath)} title="Datei in VS Code öffnen">
                      <Code2 size={13} />
                    </Button>
                  )}
                  <Button onClick={() => void save()} disabled={!dirty || !!loadError} title="Strg+S">
                    <Save size={13} /> Speichern
                  </Button>
                </div>
              </>
            ) : (
              <span className="t-mono text-faint">Wähle links eine Datei aus, um sie zu bearbeiten</span>
            )}
          </div>

          {/* Editor / Fehler */}
          {loadError ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <p className="t-mono rounded-lg border border-warn/30 bg-warn/10 px-4 py-3 text-warn">{loadError}</p>
            </div>
          ) : null}
          <div ref={containerRef} className={`min-h-0 flex-1 ${loadError ? 'hidden' : ''}`} />

          {/* Statusleiste */}
          <div className="flex h-7 shrink-0 items-center justify-between border-t border-line px-3">
            <span className="t-mono truncate text-faint">{filePath ?? 'Keine Datei geöffnet'}</span>
            <span className="t-mono shrink-0 text-faint">{dirty ? 'geändert' : 'gespeichert'} · Strg+S</span>
          </div>
        </div>
      </div>
    </div>
  )
}
