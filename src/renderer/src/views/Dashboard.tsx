import { ArrowRight, CalendarDays, FolderKanban, ListTodo, Plus, TrendingUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useApp } from '@/store'
import { PRIORITY_META, STATUS_META, formatDate, greeting, isOverdue, relativeTime } from '@/utils'
import { Button, ProgressBar, SectionLabel, StatusBadge } from '@/components/ui'
import { ProjectFormModal } from '@/components/ProjectFormModal'

export function Dashboard(): React.JSX.Element {
  const { projects, tasks, settings, openProject, navigate } = useApp()
  const [formOpen, setFormOpen] = useState(false)

  const active = projects.filter((p) => !p.archived)
  const openTasks = tasks.filter((t) => t.status !== 'done')
  const avgProgress = active.length ? Math.round(active.reduce((s, p) => s + p.progress, 0) / active.length) : 0
  const userName = settings['userName'] || 'Entwickler'

  const recent = useMemo(
    () => [...active].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4),
    [active]
  )

  const upcoming = useMemo(
    () =>
      tasks
        .filter((t) => t.status !== 'done' && t.deadline)
        .sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''))
        .slice(0, 6),
    [tasks]
  )

  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of active) counts.set(p.status, (counts.get(p.status) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [active])

  const stats = [
    { label: 'Projekte', value: active.length, icon: <FolderKanban size={16} /> },
    { label: 'Aktiv', value: active.filter((p) => p.status === 'aktiv').length, icon: <TrendingUp size={16} /> },
    { label: 'Offene Aufgaben', value: openTasks.length, icon: <ListTodo size={16} /> },
    { label: 'Ø Fortschritt', value: `${avgProgress}%`, icon: <TrendingUp size={16} /> }
  ]

  const projectName = (id: string): string => projects.find((p) => p.id === id)?.name ?? '?'

  return (
    <div className="h-full overflow-y-auto px-8 py-7">
      {/* Begrüßung */}
      <div className="anim-rise flex items-end justify-between">
        <div>
          <p className="t-label">
            {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            {greeting()}, <span className="text-accent">{userName}</span>
          </h1>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus size={15} /> Neues Projekt
        </Button>
      </div>

      {/* Kennzahlen */}
      <div className="mt-6 grid grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className="anim-rise rounded-xl border border-line bg-panel p-4"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center justify-between">
              <span className="t-label">{s.label}</span>
              <span className="text-faint">{s.icon}</span>
            </div>
            <div className="mt-2 font-mono text-2xl font-semibold tracking-tight text-ink">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-5 gap-6">
        {/* Zuletzt bearbeitet */}
        <div className="col-span-3">
          <SectionLabel>Zuletzt bearbeitet</SectionLabel>
          {recent.length === 0 ? (
            <p className="t-mono py-8 text-center text-faint">Noch keine Projekte vorhanden.</p>
          ) : (
            <div className="space-y-2">
              {recent.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => openProject(p.id)}
                  className="anim-rise group flex w-full items-center gap-4 rounded-xl border border-line bg-panel p-3.5 text-left transition-all hover:border-line-strong hover:bg-raised"
                  style={{ animationDelay: `${120 + i * 50}ms` }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="truncate text-sm font-semibold group-hover:text-accent">{p.name}</span>
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="mt-1.5 flex items-center gap-3">
                      <div className="w-40">
                        <ProgressBar value={p.progress} size="sm" />
                      </div>
                      <span className="t-mono text-faint">{p.progress}%</span>
                      <span className="t-mono text-faint">{relativeTime(p.updatedAt)}</span>
                    </div>
                  </div>
                  <ArrowRight size={15} className="shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                </button>
              ))}
            </div>
          )}
          <button onClick={() => navigate('projects')} className="t-mono mt-3 text-faint transition-colors hover:text-accent">
            Alle Projekte ansehen →
          </button>
        </div>

        {/* Rechte Spalte */}
        <div className="col-span-2 space-y-7">
          <div>
            <SectionLabel>Anstehende Deadlines</SectionLabel>
            {upcoming.length === 0 ? (
              <p className="t-mono py-4 text-faint">Keine Deadlines geplant.</p>
            ) : (
              <ul className="space-y-1.5">
                {upcoming.map((t) => {
                  const overdue = isOverdue(t.deadline)
                  return (
                    <li key={t.id} className="flex items-center gap-2.5 rounded-lg border border-line bg-panel px-3 py-2">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: PRIORITY_META[t.priority].color }} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium">{t.title}</p>
                        <p className="t-mono mt-0.5 text-faint">{projectName(t.projectId)}</p>
                      </div>
                      <span className={`t-mono inline-flex shrink-0 items-center gap-1 ${overdue ? 'text-err' : 'text-dim'}`}>
                        <CalendarDays size={11} />
                        {formatDate(t.deadline)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div>
            <SectionLabel>Projektstatus</SectionLabel>
            {statusCounts.length === 0 ? (
              <p className="t-mono py-4 text-faint">Keine Daten.</p>
            ) : (
              <ul className="space-y-2">
                {statusCounts.map(([status, count]) => {
                  const meta = STATUS_META[status as keyof typeof STATUS_META] ?? STATUS_META.planung
                  const pct = active.length ? Math.round((count / active.length) * 100) : 0
                  return (
                    <li key={status} className="flex items-center gap-3">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} />
                      <span className="w-28 text-[13px] text-dim">{meta.label}</span>
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-raised">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: meta.color }} />
                      </div>
                      <span className="t-mono w-6 text-right text-faint">{count}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {formOpen && <ProjectFormModal project={null} onClose={() => setFormOpen(false)} />}
    </div>
  )
}
