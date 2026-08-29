import { Archive, ArchiveRestore, Copy, Pencil, Star, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { Project } from '@shared/types'
import { useApp } from '@/store'
import { relativeTime } from '@/utils'
import { Button, ConfirmDialog, PriorityTag, ProgressBar, StatusBadge, TechChip } from '@/components/ui'

export function ProjectCard({
  project,
  index,
  onEdit
}: {
  project: Project
  index: number
  onEdit: (p: Project) => void
}): React.JSX.Element {
  const { openProject, updateProject, deleteProject, duplicateProject, toast } = useApp()
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div
      className="anim-rise group flex flex-col rounded-xl border border-line bg-panel p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong"
      style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}
    >
      {/* Kopfzeile: Status + Favorit */}
      <div className="mb-2.5 flex items-center justify-between">
        <StatusBadge status={project.status} archived={project.archived} />
        <button
          onClick={() => void updateProject(project.id, { favorite: !project.favorite })}
          className={`rounded-md p-1 transition-all ${
            project.favorite ? 'text-warn' : 'text-faint opacity-0 hover:text-warn group-hover:opacity-100'
          }`}
          title={project.favorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
        >
          <Star size={15} fill={project.favorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Name + Beschreibung */}
      <button onClick={() => openProject(project.id)} className="text-left">
        <h3 className="text-[15px] font-semibold leading-snug tracking-tight transition-colors group-hover:text-accent">
          {project.name}
        </h3>
      </button>
      <p className="mt-1 line-clamp-2 min-h-[2.4em] text-[13px] leading-snug text-dim">
        {project.description || 'Keine Beschreibung'}
      </p>

      {/* Technologien */}
      <div className="mt-3 flex min-h-[1.4rem] flex-wrap gap-1">
        {project.technologies.slice(0, 4).map((t) => (
          <TechChip key={t} name={t} />
        ))}
        {project.technologies.length > 4 && (
          <span className="t-mono px-1 py-0.5 text-faint">+{project.technologies.length - 4}</span>
        )}
      </div>

      {/* Fortschritt */}
      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="t-label">Fortschritt</span>
          <span className="t-mono text-accent">{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} />
      </div>

      {/* Fußzeile */}
      <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
        <div className="flex items-center gap-2">
          <PriorityTag priority={project.priority} />
          <span className="t-mono text-faint">v{project.version}</span>
        </div>
        <span className="t-mono text-faint">{relativeTime(project.updatedAt)}</span>
      </div>

      {/* Aktionen */}
      <div className="mt-3 flex items-center gap-1.5">
        <Button onClick={() => openProject(project.id)}>Öffnen</Button>
        <Button variant="outline" onClick={() => onEdit(project)}>
          <Pencil size={13} /> Bearbeiten
        </Button>
        <div className="ml-auto flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => void duplicateProject(project.id)}
            className="rounded-md p-1.5 text-faint hover:bg-hover hover:text-ink"
            title="Duplizieren"
          >
            <Copy size={14} />
          </button>
          <button
            onClick={() => {
              void updateProject(project.id, { archived: !project.archived })
              toast('info', project.archived ? 'Projekt wiederhergestellt' : 'Projekt archiviert')
            }}
            className="rounded-md p-1.5 text-faint hover:bg-hover hover:text-ink"
            title={project.archived ? 'Wiederherstellen' : 'Archivieren'}
          >
            {project.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="rounded-md p-1.5 text-faint hover:bg-err/15 hover:text-err"
            title="Löschen"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Projekt löschen"
          message={`„${project.name}" wird mit allen Aufgaben, Notizen, Versionen und Meilensteinen endgültig gelöscht.`}
          onConfirm={() => {
            setConfirmDelete(false)
            void deleteProject(project.id)
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}
