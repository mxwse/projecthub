import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { useApp } from '@/store'
import { Sidebar } from '@/components/Sidebar'
import { Dashboard } from '@/views/Dashboard'
import { Projects } from '@/views/Projects'
import { ProjectDetail } from '@/views/ProjectDetail'
import { TasksBoard } from '@/views/TasksBoard'
import { Roadmap } from '@/views/Roadmap'
import { Stats } from '@/views/Stats'
import { TerminalView } from '@/views/TerminalView'
import { SettingsView } from '@/views/Settings'

export default function App(): React.JSX.Element {
  const { view, loading, toasts } = useApp()

  if (loading) {
    return (
      <div className="app-surface flex h-full items-center justify-center bg-bg">
        <div className="anim-pop flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-xl font-bold text-accent-ink">▞</div>
          <span className="t-mono text-faint">ProjectHub wird geladen…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full bg-bg">
      <Sidebar />
      <main className="app-surface min-w-0 flex-1">
        {view === 'dashboard' && <Dashboard />}
        {view === 'projects' && <Projects mode="all" key="all" />}
        {view === 'favorites' && <Projects mode="favorites" key="fav" />}
        {view === 'archive' && <Projects mode="archive" key="arc" />}
        {view === 'detail' && <ProjectDetail />}
        {view === 'tasks' && <TasksBoard />}
        {view === 'roadmap' && <Roadmap />}
        {view === 'stats' && <Stats />}
        {view === 'terminal' && <TerminalView />}
        {view === 'settings' && <SettingsView />}
      </main>

      {/* Toast-Benachrichtigungen */}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="anim-toast pointer-events-auto flex items-center gap-2.5 rounded-xl border border-line-strong bg-raised px-4 py-3 shadow-2xl"
          >
            {t.kind === 'success' && <CheckCircle2 size={16} className="shrink-0 text-accent" />}
            {t.kind === 'error' && <AlertCircle size={16} className="shrink-0 text-err" />}
            {t.kind === 'info' && <Info size={16} className="shrink-0 text-info" />}
            <span className="text-[13px] leading-snug">{t.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
