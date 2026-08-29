import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '@/store'
import { Button, inputClass } from '@/components/ui'
import { Kanban } from '@/components/Kanban'
import { TaskFormModal } from '@/components/TaskFormModal'

export function TasksBoard(): React.JSX.Element {
  const { projects, tasks } = useApp()
  const [projectFilter, setProjectFilter] = useState('')
  const [newOpen, setNewOpen] = useState(false)

  const open = tasks.filter((t) => t.status !== 'done').length
  const activeProjects = projects.filter((p) => !p.archived)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-4 px-8 pt-7">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Aufgaben</h1>
          <p className="t-mono mt-1 text-faint">
            {open} offen · {tasks.length} gesamt
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <select className={`${inputClass} w-auto py-1.5 text-[13px]`} value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            <option value="">Projekt: Alle</option>
            {activeProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <Button onClick={() => setNewOpen(true)} disabled={activeProjects.length === 0}>
            <Plus size={15} /> Neue Aufgabe
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 px-8 pb-8 pt-5">
        <Kanban projectId={projectFilter || undefined} />
      </div>

      {newOpen && <TaskFormModal task={null} defaultProjectId={projectFilter || undefined} onClose={() => setNewOpen(false)} />}
    </div>
  )
}
