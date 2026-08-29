import { ExternalLink, RotateCcw, SquareTerminal, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { useApp } from '@/store'
import { Button, inputClass } from '@/components/ui'

const FALLBACK_CWD = 'D:\\Projekte'

interface TermSession {
  id: string
  term: Terminal
  fit: FitAddon
  cwd: string
  exited: boolean
}

// Sessions überleben den View-Wechsel: xterm-Instanzen hier, PTY-Prozesse im Main-Prozess
const sessionCache = new Map<string, TermSession>()
let lastSelectedKey = '__root'
let listenersBound = false

function bindGlobalListeners(): void {
  if (listenersBound) return
  listenersBound = true
  window.api.terminal.onData(({ id, data }) => {
    for (const s of sessionCache.values()) {
      if (s.id === id) {
        s.term.write(data)
        break
      }
    }
  })
  window.api.terminal.onExit(({ id, code }) => {
    for (const s of sessionCache.values()) {
      if (s.id === id) {
        s.exited = true
        s.term.writeln(`\r\n\x1b[90m[Prozess beendet · Exit-Code ${code}] – „Neustart" startet eine neue Sitzung.\x1b[0m`)
        break
      }
    }
  })
}

function createSession(key: string, cwd: string): TermSession {
  const term = new Terminal({
    fontFamily: "'IBM Plex Mono', Consolas, monospace",
    fontSize: 12.5,
    lineHeight: 1.35,
    cursorBlink: true,
    scrollback: 8000,
    theme: {
      background: '#121210',
      foreground: '#f2f2ec',
      cursor: '#ff6a35',
      cursorAccent: '#121210',
      selectionBackground: '#3a3a30',
      black: '#24241c',
      brightBlack: '#8b8b80',
      green: '#55b585',
      brightGreen: '#55b585',
      yellow: '#d9a441',
      brightYellow: '#d9a441',
      red: '#ff6b5d',
      brightRed: '#ff6b5d',
      blue: '#7d9cc9',
      brightBlue: '#7d9cc9',
      cyan: '#6fbfb4',
      magenta: '#c792ea',
      white: '#f2f2ec',
      brightWhite: '#ffffff'
    }
  })
  const fit = new FitAddon()
  term.loadAddon(fit)
  const session: TermSession = { id: crypto.randomUUID(), term, fit, cwd, exited: false }
  term.onData((data) => void window.api.terminal.write(session.id, data))
  sessionCache.set(key, session)
  return session
}

export function TerminalView(): React.JSX.Element {
  const { projects } = useApp()
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedKey, setSelectedKey] = useState(lastSelectedKey)
  const [nonce, setNonce] = useState(0)

  const candidates = projects
    .filter((p) => !p.archived && p.localPath)
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))

  const selectedProject = candidates.find((p) => p.id === selectedKey)
  const cwd = selectedProject?.localPath ?? FALLBACK_CWD
  lastSelectedKey = selectedKey

  useEffect(() => {
    bindGlobalListeners()
    const el = containerRef.current
    if (!el) return

    let session = sessionCache.get(selectedKey)
    const isNew = !session
    if (!session) session = createSession(selectedKey, cwd)

    if (session.term.element) {
      el.appendChild(session.term.element)
    } else {
      session.term.open(el)
    }
    session.fit.fit()

    if (isNew) {
      void window.api.terminal.create(session.id, cwd, session.term.cols, session.term.rows).then((res) => {
        if (!res.ok) session!.term.writeln(`\x1b[31mTerminal konnte nicht gestartet werden: ${res.error}\x1b[0m`)
      })
    } else if (!session.exited) {
      void window.api.terminal.resize(session.id, session.term.cols, session.term.rows)
    }
    session.term.focus()

    const ro = new ResizeObserver(() => {
      const s = sessionCache.get(selectedKey)
      if (!s || s.exited) return
      try {
        s.fit.fit()
        void window.api.terminal.resize(s.id, s.term.cols, s.term.rows)
      } catch {
        /* Layout noch nicht bereit */
      }
    })
    ro.observe(el)

    return () => {
      ro.disconnect()
      const s = sessionCache.get(selectedKey)
      if (s?.term.element && s.term.element.parentElement === el) {
        el.removeChild(s.term.element)
      }
    }
  }, [selectedKey, cwd, nonce])

  const restart = (): void => {
    const s = sessionCache.get(selectedKey)
    if (s) {
      void window.api.terminal.kill(s.id)
      s.term.dispose()
      sessionCache.delete(selectedKey)
    }
    setNonce((n) => n + 1)
  }

  const killCurrent = (): void => {
    const s = sessionCache.get(selectedKey)
    if (s && !s.exited) void window.api.terminal.kill(s.id)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-4 px-8 pt-7">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Terminal</h1>
          <p className="t-mono mt-1 text-faint">cmd.exe · {cwd}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <select
            className={`${inputClass} w-auto py-1.5 text-[13px]`}
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
          >
            <option value="__root">Ordner: {FALLBACK_CWD}</option>
            {candidates.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <Button variant="outline" onClick={restart} title="Sitzung neu starten">
            <RotateCcw size={13} /> Neustart
          </Button>
          <Button variant="outline" onClick={killCurrent} title="Prozess beenden">
            <X size={13} />
          </Button>
          <Button
            variant="outline"
            onClick={() => void window.api.terminal.openExternal(cwd)}
            title="Externes cmd-Fenster öffnen"
          >
            <ExternalLink size={13} /> Extern
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 px-8 pb-8 pt-5">
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-bg">
          <div className="flex h-9 shrink-0 items-center gap-2 border-b border-line px-3">
            <SquareTerminal size={14} className="text-accent" />
            <span className="t-mono text-dim">{selectedProject ? selectedProject.name : 'Projekte-Stammordner'}</span>
            <span className="t-mono ml-auto text-faint">Sitzung bleibt beim Ansichtswechsel erhalten</span>
          </div>
          <div ref={containerRef} className="min-h-0 flex-1 p-2 [&_.xterm]:h-full" />
        </div>
      </div>
    </div>
  )
}
