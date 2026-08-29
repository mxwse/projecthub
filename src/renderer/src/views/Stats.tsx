import { BarChart3 } from 'lucide-react'
import { useMemo } from 'react'
import { useApp } from '@/store'
import { STATUS_META, TASK_COLUMNS } from '@/utils'
import { EmptyState, SectionLabel } from '@/components/ui'

export function Stats(): React.JSX.Element {
  const { projects, tasks } = useApp()
  const active = projects.filter((p) => !p.archived)

  const kpis = [
    { label: 'Projekte gesamt', value: projects.length },
    { label: 'Aktiv', value: active.filter((p) => p.status === 'aktiv').length },
    { label: 'Abgeschlossen', value: projects.filter((p) => p.status === 'abgeschlossen').length },
    { label: 'Archiviert', value: projects.filter((p) => p.archived).length },
    { label: 'Offene Aufgaben', value: tasks.filter((t) => t.status !== 'done').length },
    {
      label: 'Ø Fortschritt',
      value: active.length ? `${Math.round(active.reduce((s, p) => s + p.progress, 0) / active.length)}%` : '0%'
    }
  ]

  // Status-Verteilung (Donut)
  const statusData = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of active) counts.set(p.status, (counts.get(p.status) ?? 0) + 1)
    return [...counts.entries()]
      .map(([status, count]) => ({
        status,
        count,
        meta: STATUS_META[status as keyof typeof STATUS_META] ?? STATUS_META.planung
      }))
      .sort((a, b) => b.count - a.count)
  }, [active])

  // Technologie-Verteilung
  const techData = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of active) for (const t of p.technologies) counts.set(t, (counts.get(t) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
  }, [active])

  const maxTech = techData[0]?.[1] ?? 1

  // Aufgaben pro Spalte
  const taskData = TASK_COLUMNS.map((c) => ({ ...c, count: tasks.filter((t) => t.status === c.id).length }))
  const maxTask = Math.max(1, ...taskData.map((t) => t.count))

  // Donut-Segmente
  const total = statusData.reduce((s, d) => s + d.count, 0)
  let offset = 0
  const segments = statusData.map((d) => {
    const frac = total ? d.count / total : 0
    const seg = { ...d, start: offset, frac }
    offset += frac
    return seg
  })

  const R = 56
  const CIRC = 2 * Math.PI * R

  if (projects.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-8">
        <EmptyState
          icon={<BarChart3 size={32} strokeWidth={1.5} />}
          title="Noch keine Daten"
          hint="Sobald Projekte angelegt sind, erscheinen hier Auswertungen."
        />
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto px-8 py-7">
      <h1 className="text-xl font-bold tracking-tight">Statistiken</h1>
      <p className="t-mono mt-1 text-faint">Auswertung über alle Projekte und Aufgaben</p>

      {/* KPI-Reihe */}
      <div className="mt-6 grid grid-cols-6 gap-3">
        {kpis.map((k, i) => (
          <div key={k.label} className="anim-rise rounded-xl border border-line bg-panel p-4" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="t-label">{k.label}</div>
            <div className="mt-2 font-mono text-2xl font-semibold tracking-tight">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-6">
        {/* Status-Donut */}
        <div className="anim-rise rounded-xl border border-line bg-panel p-5" style={{ animationDelay: '150ms' }}>
          <SectionLabel>Status-Verteilung</SectionLabel>
          <div className="flex items-center gap-8">
            <svg width="150" height="150" viewBox="0 0 150 150" className="-rotate-90 shrink-0">
              <circle cx="75" cy="75" r={R} fill="none" stroke="var(--raised)" strokeWidth="14" />
              {segments.map((s) => (
                <circle
                  key={s.status}
                  cx="75"
                  cy="75"
                  r={R}
                  fill="none"
                  stroke={s.meta.color}
                  strokeWidth="14"
                  strokeDasharray={`${Math.max(0, s.frac * CIRC - 2)} ${CIRC}`}
                  strokeDashoffset={-s.start * CIRC}
                  strokeLinecap="butt"
                />
              ))}
              <text
                x="75"
                y="75"
                textAnchor="middle"
                dominantBaseline="central"
                className="rotate-90 fill-[var(--ink)] font-mono text-xl font-semibold"
                transform="rotate(90 75 75)"
              >
                {total}
              </text>
            </svg>
            <ul className="flex-1 space-y-2">
              {segments.map((s) => (
                <li key={s.status} className="flex items-center gap-2.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.meta.color }} />
                  <span className="flex-1 text-[13px] text-dim">{s.meta.label}</span>
                  <span className="t-mono text-faint">
                    {s.count} · {Math.round(s.frac * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Technologien */}
        <div className="anim-rise rounded-xl border border-line bg-panel p-5" style={{ animationDelay: '200ms' }}>
          <SectionLabel>Technologien</SectionLabel>
          {techData.length === 0 ? (
            <p className="t-mono py-6 text-center text-faint">Keine Technologien hinterlegt</p>
          ) : (
            <ul className="space-y-2.5">
              {techData.map(([tech, count]) => (
                <li key={tech} className="flex items-center gap-3">
                  <span className="t-mono w-28 truncate text-dim">{tech}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-raised">
                    <div
                      className="h-full rounded-full bg-accent transition-all duration-700"
                      style={{ width: `${(count / maxTech) * 100}%`, opacity: 0.45 + 0.55 * (count / maxTech) }}
                    />
                  </div>
                  <span className="t-mono w-5 text-right text-faint">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Fortschritt pro Projekt */}
        <div className="anim-rise rounded-xl border border-line bg-panel p-5" style={{ animationDelay: '250ms' }}>
          <SectionLabel>Fortschritt pro Projekt</SectionLabel>
          <ul className="space-y-2.5">
            {[...active]
              .sort((a, b) => b.progress - a.progress)
              .slice(0, 10)
              .map((p) => (
                <li key={p.id} className="flex items-center gap-3">
                  <span className="w-36 truncate text-[13px] text-dim">{p.name}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-raised">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${p.progress}%`,
                        backgroundColor: STATUS_META[p.status]?.color ?? 'var(--accent)'
                      }}
                    />
                  </div>
                  <span className="t-mono w-9 text-right text-faint">{p.progress}%</span>
                </li>
              ))}
          </ul>
        </div>

        {/* Aufgaben nach Status */}
        <div className="anim-rise rounded-xl border border-line bg-panel p-5" style={{ animationDelay: '300ms' }}>
          <SectionLabel>Aufgaben nach Status</SectionLabel>
          <div className="flex h-44 items-end justify-around gap-4 px-4 pt-2">
            {taskData.map((t) => (
              <div key={t.id} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <span className="t-mono text-dim">{t.count}</span>
                <div
                  className="w-full rounded-t-md bg-accent transition-all duration-700"
                  style={{
                    height: `${(t.count / maxTask) * 100}%`,
                    minHeight: t.count > 0 ? 6 : 2,
                    opacity: t.id === 'done' ? 1 : 0.55
                  }}
                />
                <span className="t-label">{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
