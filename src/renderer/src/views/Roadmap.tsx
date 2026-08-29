import { CalendarDays, Check, Map as MapIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { Milestone } from '@shared/types'
import { useApp } from '@/store'
import { formatDate } from '@/utils'
import { EmptyState, inputClass } from '@/components/ui'

export function Roadmap(): React.JSX.Element {
  const { projects, openProject } = useApp()
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [projectFilter, setProjectFilter] = useState('')
  const [showDone, setShowDone] = useState(false)

  useEffect(() => {
    void window.api.milestones.listAll().then(setMilestones)
  }, [])

  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])

  const visible = useMemo(
    () =>
      milestones.filter((m) => {
        if (projectFilter && m.projectId !== projectFilter) return false
        if (!showDone && m.done) return false
        return projectById.has(m.projectId) && !projectById.get(m.projectId)!.archived
      }),
    [milestones, projectFilter, showDone, projectById]
  )

  // Nach Monat gruppieren; Einträge ohne Datum ans Ende
  const groups = useMemo(() => {
    const map = new Map<string, Milestone[]>()
    for (const m of visible) {
      const key = m.dueDate ? m.dueDate.slice(0, 7) : 'zzz'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(m)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [visible])

  const monthLabel = (key: string): string => {
    if (key === 'zzz') return 'Ohne Termin'
    const [y, m] = key.split('-').map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
  }

  const nowMonth = new Date().toISOString().slice(0, 7)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-4 px-8 pt-7">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Roadmap</h1>
          <p className="t-mono mt-1 text-faint">{visible.length} geplante Meilensteine</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <label className="t-mono flex cursor-pointer items-center gap-1.5 text-dim">
            <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} className="accent-[var(--accent)]" />
            Erledigte anzeigen
          </label>
          <select className={`${inputClass} w-auto py-1.5 text-[13px]`} value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            <option value="">Projekt: Alle</option>
            {projects
              .filter((p) => !p.archived)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-8 pt-5">
        {groups.length === 0 ? (
          <EmptyState
            icon={<MapIcon size={32} strokeWidth={1.5} />}
            title="Keine Meilensteine geplant"
            hint="Lege Meilensteine in der Projekt-Übersicht an — sie erscheinen hier als Roadmap."
          />
        ) : (
          <div className="max-w-3xl space-y-8">
            {groups.map(([key, items], gi) => {
              const isPast = key !== 'zzz' && key < nowMonth
              const isCurrent = key === nowMonth
              return (
                <div key={key} className="anim-rise" style={{ animationDelay: `${gi * 60}ms` }}>
                  <div className="mb-3 flex items-center gap-3">
                    <span
                      className={`t-mono rounded px-2 py-1 uppercase tracking-widest ${
                        isCurrent ? 'bg-accent text-accent-ink' : isPast ? 'bg-err/15 text-err' : 'bg-raised text-dim'
                      }`}
                    >
                      {monthLabel(key)}
                    </span>
                    <div className="h-px flex-1 bg-line" />
                    <span className="t-mono text-faint">{items.length}</span>
                  </div>
                  <div className="relative space-y-2 border-l border-line pl-5">
                    {items.map((m) => {
                      const project = projectById.get(m.projectId)
                      const overdue = !m.done && m.dueDate && new Date(m.dueDate) < new Date()
                      return (
                        <div key={m.id} className="relative">
                          <span
                            className="absolute -left-[1.4rem] top-3.5 h-2 w-2 rounded-full"
                            style={{ backgroundColor: m.done ? 'var(--accent)' : overdue ? 'var(--err)' : 'var(--faint)' }}
                          />
                          <button
                            onClick={() => project && openProject(project.id)}
                            className="flex w-full items-center gap-3 rounded-xl border border-line bg-panel px-4 py-3 text-left transition-colors hover:border-line-strong hover:bg-raised"
                          >
                            {m.done && <Check size={14} className="shrink-0 text-accent" />}
                            <div className="min-w-0 flex-1">
                              <p className={`text-sm font-medium ${m.done ? 'text-faint line-through' : ''}`}>{m.title}</p>
                              <p className="t-mono mt-0.5 text-faint">{project?.name ?? 'Unbekanntes Projekt'}</p>
                            </div>
                            {m.dueDate && (
                              <span className={`t-mono inline-flex shrink-0 items-center gap-1 ${overdue ? 'text-err' : 'text-dim'}`}>
                                <CalendarDays size={11} />
                                {formatDate(m.dueDate)}
                              </span>
                            )}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
