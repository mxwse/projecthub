import { FolderKanban, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Project } from '@shared/types'
import { useApp } from '@/store'
import { PRIORITIES, PRIORITY_META, PROJECT_STATUSES, STATUS_META } from '@/utils'
import { Button, EmptyState, inputClass } from '@/components/ui'
import { ProjectCard } from '@/components/ProjectCard'
import { ProjectFormModal } from '@/components/ProjectFormModal'

type SortKey = 'updated' | 'name' | 'progress' | 'created' | 'priority'

export function Projects({ mode }: { mode: 'all' | 'favorites' | 'archive' }): React.JSX.Element {
  const { projects } = useApp()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [techFilter, setTechFilter] = useState('')
  const [prioFilter, setPrioFilter] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('updated')
  const [formProject, setFormProject] = useState<Project | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const base = useMemo(() => {
    if (mode === 'archive') return projects.filter((p) => p.archived)
    if (mode === 'favorites') return projects.filter((p) => p.favorite && !p.archived)
    return projects.filter((p) => !p.archived)
  }, [projects, mode])

  const allTechs = useMemo(() => [...new Set(base.flatMap((p) => p.technologies))].sort(), [base])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = base.filter((p) => {
      if (q && !`${p.name} ${p.description} ${p.category} ${p.technologies.join(' ')}`.toLowerCase().includes(q)) return false
      if (statusFilter && p.status !== statusFilter) return false
      if (techFilter && !p.technologies.includes(techFilter)) return false
      if (prioFilter && p.priority !== prioFilter) return false
      return true
    })
    const sorters: Record<SortKey, (a: Project, b: Project) => number> = {
      updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
      created: (a, b) => b.createdAt.localeCompare(a.createdAt),
      name: (a, b) => a.name.localeCompare(b.name, 'de'),
      progress: (a, b) => b.progress - a.progress,
      priority: (a, b) => PRIORITY_META[b.priority].rank - PRIORITY_META[a.priority].rank
    }
    return [...list].sort(sorters[sortKey])
  }, [base, search, statusFilter, techFilter, prioFilter, sortKey])

  const titles = { all: 'Meine Projekte', favorites: 'Favoriten', archive: 'Archiv' }
  const selectClass = `${inputClass} w-auto py-1.5 text-[13px]`

  return (
    <div className="flex h-full flex-col">
      {/* Kopfbereich */}
      <div className="flex items-center gap-4 px-8 pt-7">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{titles[mode]}</h1>
          <p className="t-mono mt-1 text-faint">
            {filtered.length} von {base.length} Projekten
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input
              className={`${inputClass} w-64 pl-8`}
              placeholder="Projekte durchsuchen…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {mode !== 'archive' && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus size={15} /> Neues Projekt
            </Button>
          )}
        </div>
      </div>

      {/* Filterleiste */}
      <div className="flex items-center gap-2 px-8 pt-4">
        <span className="t-label">Filter</span>
        <select className={selectClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Status: Alle</option>
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </select>
        <select className={selectClass} value={techFilter} onChange={(e) => setTechFilter(e.target.value)}>
          <option value="">Technologie: Alle</option>
          {allTechs.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select className={selectClass} value={prioFilter} onChange={(e) => setPrioFilter(e.target.value)}>
          <option value="">Priorität: Alle</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_META[p].label}
            </option>
          ))}
        </select>
        <div className="ml-auto flex items-center gap-2">
          <span className="t-label">Sortierung</span>
          <select className={selectClass} value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
            <option value="updated">Letzte Änderung</option>
            <option value="created">Erstellt</option>
            <option value="name">Name</option>
            <option value="progress">Fortschritt</option>
            <option value="priority">Priorität</option>
          </select>
        </div>
      </div>

      {/* Kartenraster */}
      <div className="flex-1 overflow-y-auto px-8 pb-8 pt-5">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<FolderKanban size={32} strokeWidth={1.5} />}
            title={base.length === 0 ? 'Noch keine Projekte' : 'Keine Treffer'}
            hint={
              base.length === 0
                ? mode === 'all'
                  ? 'Lege dein erstes Projekt an, um loszulegen.'
                  : mode === 'favorites'
                    ? 'Markiere Projekte mit dem Stern, um sie hier zu sehen.'
                    : 'Archivierte Projekte landen hier.'
                : 'Passe Suche oder Filter an.'
            }
            action={
              base.length === 0 && mode === 'all' ? (
                <Button onClick={() => setFormOpen(true)}>
                  <Plus size={15} /> Erstes Projekt erstellen
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
            {filtered.map((p, i) => (
              <ProjectCard
                key={p.id}
                project={p}
                index={i}
                onEdit={(proj) => {
                  setFormProject(proj)
                  setFormOpen(true)
                }}
              />
            ))}
          </div>
        )}
      </div>

      {formOpen && (
        <ProjectFormModal
          project={formProject}
          onClose={() => {
            setFormOpen(false)
            setFormProject(null)
          }}
        />
      )}
    </div>
  )
}
