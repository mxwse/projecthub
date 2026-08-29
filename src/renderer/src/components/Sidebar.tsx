import {
  Archive,
  BarChart3,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  Map,
  Moon,
  Settings,
  SquareTerminal,
  Star,
  Sun
} from 'lucide-react'
import { useApp } from '@/store'
import type { View } from '@/store'
import type { ReactNode } from 'react'

interface NavItem {
  view: View
  label: string
  icon: ReactNode
  count?: number
}

export function Sidebar(): React.JSX.Element {
  const { view, navigate, projects, tasks, settings, theme, toggleTheme } = useApp()

  const activeProjects = projects.filter((p) => !p.archived)
  const openTasks = tasks.filter((t) => t.status !== 'done')
  const favorites = projects.filter((p) => p.favorite && !p.archived)
  const archived = projects.filter((p) => p.archived)
  const userName = settings['userName'] || 'Entwickler'

  const groups: { label: string; items: NavItem[] }[] = [
    {
      label: 'Übersicht',
      items: [
        { view: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
        { view: 'projects', label: 'Meine Projekte', icon: <FolderKanban size={16} />, count: activeProjects.length },
        { view: 'favorites', label: 'Favoriten', icon: <Star size={16} />, count: favorites.length },
        { view: 'archive', label: 'Archiv', icon: <Archive size={16} />, count: archived.length }
      ]
    },
    {
      label: 'Planung',
      items: [
        { view: 'tasks', label: 'Aufgaben', icon: <ListTodo size={16} />, count: openTasks.length },
        { view: 'roadmap', label: 'Roadmap', icon: <Map size={16} /> },
        { view: 'stats', label: 'Statistiken', icon: <BarChart3 size={16} /> }
      ]
    },
    {
      label: 'Werkzeuge',
      items: [{ view: 'terminal', label: 'Terminal', icon: <SquareTerminal size={16} /> }]
    },
    {
      label: 'System',
      items: [{ view: 'settings', label: 'Einstellungen', icon: <Settings size={16} /> }]
    }
  ]

  return (
    <aside className="flex w-[250px] shrink-0 flex-col border-r border-line bg-panel">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 pb-6 pt-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent font-bold text-accent-ink shadow-[0_0_24px_var(--glow)]">
          <span className="text-lg leading-none">▞</span>
        </div>
        <div>
          <div className="text-[15px] font-bold leading-tight tracking-tight">ProjectHub</div>
          <div className="t-label mt-0.5">Project OS · v1.0</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3">
        {groups.map((group) => (
          <div key={group.label} className="mb-5">
            <div className="t-label px-2 pb-2">{group.label}</div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = view === item.view || (item.view === 'projects' && view === 'detail')
                return (
                  <li key={item.view}>
                    <button
                      onClick={() => navigate(item.view)}
                      className={`group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-all duration-150 ${
                        active
                          ? 'bg-raised font-medium text-ink'
                          : 'text-dim hover:translate-x-0.5 hover:bg-hover hover:text-ink'
                      }`}
                    >
                      {active && (
                        <span className="absolute -left-3 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-accent" />
                      )}
                      <span className={active ? 'text-accent' : 'text-faint transition-colors group-hover:text-dim'}>
                        {item.icon}
                      </span>
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.count !== undefined && item.count > 0 && (
                        <span className="t-mono rounded bg-raised px-1.5 py-0.5 text-faint">{item.count}</span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer: Profil + Theme */}
      <div className="border-t border-line px-3 py-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-line-strong bg-raised text-xs font-bold text-accent">
            {userName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium leading-tight">{userName}</div>
            <div className="t-label mt-0.5">Lokal angemeldet</div>
          </div>
          <button
            onClick={toggleTheme}
            className="rounded-md p-1.5 text-faint transition-colors hover:bg-hover hover:text-accent"
            title={theme === 'dark' ? 'Helles Design' : 'Dunkles Design'}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button
            onClick={() => navigate('settings')}
            className="rounded-md p-1.5 text-faint transition-colors hover:bg-hover hover:text-ink"
            title="Einstellungen"
          >
            <Settings size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}
