import {
  Archive,
  ArchiveRestore,
  CalendarDays,
  Check,
  ChevronLeft,
  Code2,
  Copy,
  ExternalLink,
  Folder,
  FolderOpen,
  GitBranch,
  Pencil,
  Plus,
  Star,
  Trash2
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Milestone, Note, Project, Version } from '@shared/types'
import { useApp } from '@/store'
import { formatDate, relativeTime } from '@/utils'
import { Button, ConfirmDialog, EmptyState, Field, PriorityTag, ProgressBar, SectionLabel, StatusBadge, TechChip, inputClass } from '@/components/ui'
import { Kanban } from '@/components/Kanban'
import { CodeWorkspace } from '@/components/CodeWorkspace'
import { ProjectFormModal } from '@/components/ProjectFormModal'

type Tab = 'uebersicht' | 'aufgaben' | 'notizen' | 'versionen' | 'dateien' | 'dokumentation'

const TABS: { id: Tab; label: string }[] = [
  { id: 'uebersicht', label: 'Übersicht' },
  { id: 'aufgaben', label: 'Aufgaben' },
  { id: 'notizen', label: 'Notizen' },
  { id: 'versionen', label: 'Versionen' },
  { id: 'dateien', label: 'Dateien' },
  { id: 'dokumentation', label: 'Dokumentation' }
]

export function ProjectDetail(): React.JSX.Element {
  const { selectedProjectId, projects, navigate, updateProject, deleteProject, duplicateProject, toast } = useApp()
  const [tab, setTab] = useState<Tab>('uebersicht')
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [vscode, setVscode] = useState(false)

  useEffect(() => {
    void window.api.files.vscodeAvailable().then(setVscode)
  }, [])

  const project = projects.find((p) => p.id === selectedProjectId)

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={<Folder size={32} strokeWidth={1.5} />}
          title="Projekt nicht gefunden"
          action={<Button onClick={() => navigate('projects')}>Zur Übersicht</Button>}
        />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-line px-8 pt-5">
        <button
          onClick={() => navigate('projects')}
          className="t-mono inline-flex items-center gap-1 text-faint transition-colors hover:text-accent"
        >
          <ChevronLeft size={13} /> Zurück zu Projekten
        </button>

        <div className="mt-3 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="truncate text-2xl font-bold tracking-tight">{project.name}</h1>
              <StatusBadge status={project.status} archived={project.archived} />
              <span className="t-mono rounded border border-line bg-raised px-2 py-1 text-accent">v{project.version}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-3">
              {project.category && <span className="t-mono text-dim">{project.category}</span>}
              <PriorityTag priority={project.priority} />
              <span className="t-mono text-faint">Geändert {relativeTime(project.updatedAt)}</span>
              <span className="t-mono text-faint">Erstellt {formatDate(project.createdAt)}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {vscode && project.localPath && (
              <Button
                variant="outline"
                onClick={async () => {
                  const res = await window.api.files.openInVSCode(project.localPath)
                  if (res.ok) toast('success', 'Projekt in VS Code geöffnet')
                  else toast('error', res.error ?? 'Öffnen fehlgeschlagen')
                }}
                title="Projektordner in VS Code öffnen"
              >
                <Code2 size={13} /> VS Code
              </Button>
            )}
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil size={13} /> Bearbeiten
            </Button>
            <button
              onClick={() => void updateProject(project.id, { favorite: !project.favorite })}
              className={`rounded-lg border border-line-strong p-2 transition-colors hover:bg-hover ${project.favorite ? 'text-warn' : 'text-faint'}`}
              title="Favorit"
            >
              <Star size={14} fill={project.favorite ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={() => void duplicateProject(project.id)}
              className="rounded-lg border border-line-strong p-2 text-faint transition-colors hover:bg-hover hover:text-ink"
              title="Duplizieren"
            >
              <Copy size={14} />
            </button>
            <button
              onClick={() => {
                void updateProject(project.id, { archived: !project.archived })
                toast('info', project.archived ? 'Projekt wiederhergestellt' : 'Projekt archiviert')
              }}
              className="rounded-lg border border-line-strong p-2 text-faint transition-colors hover:bg-hover hover:text-ink"
              title={project.archived ? 'Wiederherstellen' : 'Archivieren'}
            >
              {project.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="rounded-lg border border-line-strong p-2 text-faint transition-colors hover:bg-err/15 hover:text-err"
              title="Löschen"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-5 flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`t-mono relative rounded-t-lg px-3.5 py-2.5 uppercase tracking-widest transition-colors ${
                tab === t.id ? 'text-accent' : 'text-faint hover:text-dim'
              }`}
            >
              {t.label}
              {tab === t.id && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent" />}
            </button>
          ))}
        </div>
      </div>

      {/* Tab-Inhalt */}
      <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
        {tab === 'uebersicht' && <OverviewTab project={project} />}
        {tab === 'aufgaben' && (
          <div className="h-full min-h-[420px]">
            <Kanban projectId={project.id} />
          </div>
        )}
        {tab === 'notizen' && <NotesTab projectId={project.id} />}
        {tab === 'versionen' && <VersionsTab project={project} />}
        {tab === 'dateien' && <CodeWorkspace project={project} key={project.id} />}
        {tab === 'dokumentation' && <DocsTab project={project} />}
      </div>

      {editOpen && <ProjectFormModal project={project} onClose={() => setEditOpen(false)} />}
      {confirmDelete && (
        <ConfirmDialog
          title="Projekt löschen"
          message={`„${project.name}" wird mit allen zugehörigen Daten endgültig gelöscht.`}
          onConfirm={() => {
            setConfirmDelete(false)
            void deleteProject(project.id)
            navigate('projects')
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}

// ---------- Übersicht ----------

function OverviewTab({ project }: { project: Project }): React.JSX.Element {
  const { updateProject } = useApp()
  const [progress, setProgress] = useState(project.progress)

  useEffect(() => setProgress(project.progress), [project.id, project.progress])

  return (
    <div className="grid max-w-5xl grid-cols-5 gap-8">
      <div className="col-span-3 space-y-7">
        <div className="anim-rise">
          <SectionLabel>Beschreibung</SectionLabel>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-dim">
            {project.description || 'Keine Beschreibung hinterlegt.'}
          </p>
        </div>

        <div className="anim-rise" style={{ animationDelay: '60ms' }}>
          <SectionLabel>Fortschritt</SectionLabel>
          <div className="rounded-xl border border-line bg-panel p-4">
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                onMouseUp={() => void updateProject(project.id, { progress })}
                className="flex-1"
              />
              <span className="font-mono text-xl font-semibold text-accent">{progress}%</span>
            </div>
            <div className="mt-3">
              <ProgressBar value={progress} />
            </div>
          </div>
        </div>

        <MilestonesSection projectId={project.id} />
      </div>

      <div className="col-span-2 space-y-7">
        <div className="anim-rise" style={{ animationDelay: '90ms' }}>
          <SectionLabel>Technologien</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {project.technologies.length === 0 ? (
              <span className="t-mono text-faint">Keine angegeben</span>
            ) : (
              project.technologies.map((t) => <TechChip key={t} name={t} />)
            )}
          </div>
        </div>

        <div className="anim-rise space-y-3" style={{ animationDelay: '120ms' }}>
          <SectionLabel>Verknüpfungen</SectionLabel>
          {project.repoUrl ? (
            <button
              onClick={() => void window.api.files.openExternal(project.repoUrl)}
              className="flex w-full items-center gap-2.5 rounded-lg border border-line bg-panel px-3 py-2.5 text-left transition-colors hover:border-line-strong hover:bg-raised"
            >
              <GitBranch size={14} className="shrink-0 text-accent" />
              <span className="t-mono min-w-0 flex-1 truncate text-dim">{project.repoUrl}</span>
              <ExternalLink size={12} className="shrink-0 text-faint" />
            </button>
          ) : (
            <p className="t-mono text-faint">Kein Repository verknüpft</p>
          )}
          {project.localPath ? (
            <button
              onClick={() => void window.api.files.openPath(project.localPath)}
              className="flex w-full items-center gap-2.5 rounded-lg border border-line bg-panel px-3 py-2.5 text-left transition-colors hover:border-line-strong hover:bg-raised"
            >
              <FolderOpen size={14} className="shrink-0 text-accent" />
              <span className="t-mono min-w-0 flex-1 truncate text-dim">{project.localPath}</span>
              <ExternalLink size={12} className="shrink-0 text-faint" />
            </button>
          ) : (
            <p className="t-mono text-faint">Kein lokaler Pfad verknüpft</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------- Meilensteine ----------

function MilestonesSection({ projectId }: { projectId: string }): React.JSX.Element {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')

  const reload = useCallback(async () => {
    setMilestones(await window.api.milestones.list(projectId))
  }, [projectId])

  useEffect(() => {
    void reload()
  }, [reload])

  const add = async (): Promise<void> => {
    if (!title.trim()) return
    await window.api.milestones.create({ projectId, title: title.trim(), description: '', dueDate: dueDate || null, done: false })
    setTitle('')
    setDueDate('')
    await reload()
  }

  return (
    <div className="anim-rise" style={{ animationDelay: '150ms' }}>
      <SectionLabel>Meilensteine</SectionLabel>
      <div className="space-y-1.5">
        {milestones.map((m) => (
          <div key={m.id} className="group flex items-center gap-2.5 rounded-lg border border-line bg-panel px-3 py-2">
            <button
              onClick={async () => {
                await window.api.milestones.update(m.id, { done: !m.done })
                await reload()
              }}
              className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border transition-colors ${
                m.done ? 'border-accent bg-accent text-accent-ink' : 'border-line-strong hover:border-accent'
              }`}
              style={{ width: 18, height: 18 }}
            >
              {m.done && <Check size={12} />}
            </button>
            <span className={`flex-1 text-[13px] ${m.done ? 'text-faint line-through' : ''}`}>{m.title}</span>
            {m.dueDate && (
              <span className="t-mono inline-flex items-center gap-1 text-faint">
                <CalendarDays size={11} />
                {formatDate(m.dueDate)}
              </span>
            )}
            <button
              onClick={async () => {
                await window.api.milestones.remove(m.id)
                await reload()
              }}
              className="rounded p-0.5 text-faint opacity-0 transition-opacity hover:text-err group-hover:opacity-100"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        {milestones.length === 0 && <p className="t-mono py-2 text-faint">Noch keine Meilensteine.</p>}
      </div>
      <div className="mt-2.5 flex gap-1.5">
        <input
          className={inputClass}
          placeholder="Neuer Meilenstein…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void add()
          }}
        />
        <input type="date" className={`${inputClass} w-auto`} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <Button onClick={() => void add()}>
          <Plus size={14} />
        </Button>
      </div>
    </div>
  )
}

// ---------- Notizen ----------

function NotesTab({ projectId }: { projectId: string }): React.JSX.Element {
  const [notes, setNotes] = useState<Note[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftContent, setDraftContent] = useState('')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const active = notes.find((n) => n.id === activeId) ?? null

  const reload = useCallback(async (): Promise<Note[]> => {
    const list = await window.api.notes.list(projectId)
    setNotes(list)
    return list
  }, [projectId])

  useEffect(() => {
    void reload().then((list) => {
      if (list.length > 0) {
        setActiveId(list[0].id)
        setDraftTitle(list[0].title)
        setDraftContent(list[0].content)
      }
    })
  }, [reload])

  const select = (note: Note): void => {
    setActiveId(note.id)
    setDraftTitle(note.title)
    setDraftContent(note.content)
  }

  const scheduleSave = (title: string, content: string): void => {
    if (!activeId) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      await window.api.notes.update(activeId, { title, content })
      await reload()
    }, 600)
  }

  const create = async (): Promise<void> => {
    const note = await window.api.notes.create(projectId, 'Neue Notiz')
    await reload()
    select(note)
  }

  const remove = async (id: string): Promise<void> => {
    await window.api.notes.remove(id)
    const list = await reload()
    if (activeId === id) {
      if (list.length > 0) select(list[0])
      else setActiveId(null)
    }
  }

  return (
    <div className="grid h-full min-h-[420px] grid-cols-3 gap-4">
      <div className="flex min-h-0 flex-col rounded-xl border border-line bg-panel">
        <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
          <span className="t-label">Notizen · {notes.length}</span>
          <Button variant="ghost" onClick={() => void create()}>
            <Plus size={14} /> Neu
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-1.5">
          {notes.map((n) => (
            <div
              key={n.id}
              className={`group flex cursor-pointer items-center rounded-lg px-2.5 py-2 transition-colors ${
                n.id === activeId ? 'bg-raised' : 'hover:bg-hover'
              }`}
              onClick={() => select(n)}
            >
              <div className="min-w-0 flex-1">
                <p className={`truncate text-[13px] font-medium ${n.id === activeId ? 'text-accent' : ''}`}>
                  {n.title || 'Ohne Titel'}
                </p>
                <p className="t-mono mt-0.5 text-faint">{relativeTime(n.updatedAt)}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  void remove(n.id)
                }}
                className="rounded p-1 text-faint opacity-0 transition-opacity hover:text-err group-hover:opacity-100"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {notes.length === 0 && <p className="t-mono px-3 py-6 text-center text-faint">Keine Notizen</p>}
        </div>
      </div>

      <div className="col-span-2 flex min-h-0 flex-col rounded-xl border border-line bg-panel">
        {active ? (
          <>
            <input
              className="border-b border-line bg-transparent px-4 py-3 text-base font-semibold text-ink placeholder:text-faint focus:outline-none"
              value={draftTitle}
              placeholder="Titel"
              onChange={(e) => {
                setDraftTitle(e.target.value)
                scheduleSave(e.target.value, draftContent)
              }}
            />
            <textarea
              className="flex-1 resize-none bg-transparent px-4 py-3 text-sm leading-relaxed text-dim placeholder:text-faint focus:outline-none"
              value={draftContent}
              placeholder="Schreib etwas… (wird automatisch gespeichert)"
              onChange={(e) => {
                setDraftContent(e.target.value)
                scheduleSave(draftTitle, e.target.value)
              }}
            />
            <div className="border-t border-line px-4 py-2">
              <span className="t-mono text-faint">Automatische Speicherung aktiv · {draftContent.length} Zeichen</span>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState
              icon={<Pencil size={28} strokeWidth={1.5} />}
              title="Keine Notiz ausgewählt"
              action={
                <Button onClick={() => void create()}>
                  <Plus size={14} /> Notiz erstellen
                </Button>
              }
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ---------- Versionen ----------

function VersionsTab({ project }: { project: Project }): React.JSX.Element {
  const { refreshProjects, toast } = useApp()
  const [versions, setVersions] = useState<Version[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [vNum, setVNum] = useState('')
  const [vTitle, setVTitle] = useState('')
  const [vNotes, setVNotes] = useState('')

  const reload = useCallback(async () => {
    setVersions(await window.api.versions.list(project.id))
  }, [project.id])

  useEffect(() => {
    void reload()
  }, [reload])

  const add = async (): Promise<void> => {
    if (!vNum.trim()) {
      toast('error', 'Bitte eine Versionsnummer angeben')
      return
    }
    await window.api.versions.create({
      projectId: project.id,
      version: vNum.trim(),
      title: vTitle.trim(),
      notes: vNotes.trim(),
      releasedAt: new Date().toISOString()
    })
    await Promise.all([reload(), refreshProjects()])
    toast('success', `Version ${vNum.trim()} dokumentiert`)
    setFormOpen(false)
    setVNum('')
    setVTitle('')
    setVNotes('')
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-5 flex items-center justify-between">
        <SectionLabel>Versionshistorie · {versions.length}</SectionLabel>
        <Button onClick={() => setFormOpen(true)}>
          <Plus size={14} /> Version dokumentieren
        </Button>
      </div>

      {versions.length === 0 ? (
        <EmptyState
          icon={<GitBranch size={28} strokeWidth={1.5} />}
          title="Noch keine Versionen dokumentiert"
          hint={`Aktuelle Projektversion: v${project.version}`}
        />
      ) : (
        <div className="relative space-y-4 border-l border-line pl-6">
          {versions.map((v, i) => (
            <div key={v.id} className="anim-rise relative" style={{ animationDelay: `${i * 50}ms` }}>
              <span
                className={`absolute -left-[1.85rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 ${
                  i === 0 ? 'border-accent bg-accent' : 'border-line-strong bg-panel'
                }`}
              />
              <div className="rounded-xl border border-line bg-panel p-4">
                <div className="flex items-center gap-3">
                  <span className={`t-mono rounded px-2 py-0.5 ${i === 0 ? 'bg-accent text-accent-ink' : 'bg-raised text-dim'}`}>
                    v{v.version}
                  </span>
                  {v.title && <span className="text-sm font-semibold">{v.title}</span>}
                  <span className="t-mono ml-auto text-faint">{formatDate(v.releasedAt)}</span>
                  <button
                    onClick={async () => {
                      await window.api.versions.remove(v.id)
                      await reload()
                    }}
                    className="rounded p-1 text-faint hover:text-err"
                    title="Eintrag löschen"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                {v.notes && <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-dim">{v.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <div className="mt-5 space-y-3 rounded-xl border border-line-strong bg-panel p-4">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Version *">
              <input autoFocus className={inputClass} value={vNum} onChange={(e) => setVNum(e.target.value)} placeholder="1.2.0" />
            </Field>
            <div className="col-span-2">
              <Field label="Titel">
                <input className={inputClass} value={vTitle} onChange={(e) => setVTitle(e.target.value)} placeholder="z. B. Dark Mode Release" />
              </Field>
            </div>
          </div>
          <Field label="Änderungen">
            <textarea
              className={`${inputClass} min-h-[80px]`}
              value={vNotes}
              onChange={(e) => setVNotes(e.target.value)}
              placeholder={'- Neues Feature\n- Bugfix …'}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setFormOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={() => void add()}>Speichern</Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------- Dokumentation ----------

function DocsTab({ project }: { project: Project }): React.JSX.Element {
  const { updateProject } = useApp()
  const [draft, setDraft] = useState(project.docs)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => setDraft(project.docs), [project.id])

  const onChange = (value: string): void => {
    setDraft(value)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      await updateProject(project.id, { docs: value })
      setSavedAt(new Date())
    }, 700)
  }

  return (
    <div className="flex h-full min-h-[420px] flex-col rounded-xl border border-line bg-panel">
      <textarea
        className="flex-1 resize-none bg-transparent px-5 py-4 font-mono text-[13px] leading-relaxed text-dim placeholder:text-faint focus:outline-none"
        value={draft}
        onChange={(e) => onChange(e.target.value)}
        placeholder={'# Projektdokumentation\n\nArchitektur, Setup-Anleitung, API-Notizen, Entscheidungen …\n\nWird automatisch gespeichert.'}
      />
      <div className="flex items-center justify-between border-t border-line px-5 py-2">
        <span className="t-mono text-faint">{draft.length} Zeichen · automatische Speicherung</span>
        {savedAt && <span className="t-mono text-accent">Gespeichert {savedAt.toLocaleTimeString('de-DE')}</span>}
      </div>
    </div>
  )
}
