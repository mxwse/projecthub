import { CalendarDays, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { Task, TaskStatus } from '@shared/types'
import { useApp } from '@/store'
import { PRIORITY_META, TASK_COLUMNS, formatDate, isOverdue } from '@/utils'
import { TaskFormModal } from '@/components/TaskFormModal'

export function Kanban({ projectId }: { projectId?: string }): React.JSX.Element {
  const { tasks, projects, updateTask, deleteTask } = useApp()
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus | null>(null)

  const scoped = projectId ? tasks.filter((t) => t.projectId === projectId) : tasks
  const projectName = (id: string): string => projects.find((p) => p.id === id)?.name ?? '?'

  const drop = (status: TaskStatus): void => {
    setDragOver(null)
    if (!dragId) return
    const task = scoped.find((t) => t.id === dragId)
    if (task && task.status !== status) {
      void updateTask(dragId, { status, position: scoped.filter((t) => t.status === status).length })
    }
    setDragId(null)
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-4 gap-3">
      {TASK_COLUMNS.map((col) => {
        const colTasks = scoped
          .filter((t) => t.status === col.id)
          .sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt))
        return (
          <div
            key={col.id}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(col.id)
            }}
            onDragLeave={() => setDragOver((s) => (s === col.id ? null : s))}
            onDrop={() => drop(col.id)}
            className={`flex min-h-0 flex-col rounded-xl border bg-panel/60 transition-colors ${
              dragOver === col.id ? 'border-accent/60 bg-raised' : 'border-line'
            }`}
          >
            <div className="flex items-center justify-between px-3 pb-2 pt-3">
              <div className="flex items-center gap-2">
                <span className="t-label" style={{ color: col.id === 'done' ? 'var(--accent)' : undefined }}>
                  {col.label}
                </span>
                <span className="t-mono rounded bg-raised px-1.5 py-0.5 text-faint">{colTasks.length}</span>
              </div>
              <button
                onClick={() => setNewTaskStatus(col.id)}
                className="rounded-md p-1 text-faint transition-colors hover:bg-hover hover:text-accent"
                title="Aufgabe hinzufügen"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto px-2.5 pb-3">
              {colTasks.map((task) => {
                const overdue = task.status !== 'done' && isOverdue(task.deadline)
                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => setDragId(task.id)}
                    onDragEnd={() => setDragId(null)}
                    className={`group cursor-grab rounded-lg border border-line bg-raised p-3 transition-all hover:border-line-strong active:cursor-grabbing ${
                      dragId === task.id ? 'opacity-40' : ''
                    } ${task.status === 'done' ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <p className={`text-[13px] font-medium leading-snug ${task.status === 'done' ? 'line-through' : ''}`}>
                        {task.title}
                      </p>
                      <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => setEditTask(task)}
                          className="rounded p-0.5 text-faint hover:text-ink"
                          title="Bearbeiten"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => void deleteTask(task.id)}
                          className="rounded p-0.5 text-faint hover:text-err"
                          title="Löschen"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    {task.description && <p className="mt-1 line-clamp-2 text-xs text-dim">{task.description}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: PRIORITY_META[task.priority].color }}
                        title={`Priorität: ${PRIORITY_META[task.priority].label}`}
                      />
                      {!projectId && <span className="t-mono text-faint">{projectName(task.projectId)}</span>}
                      {task.deadline && (
                        <span
                          className={`t-mono inline-flex items-center gap-1 ${overdue ? 'text-err' : 'text-faint'}`}
                          title={overdue ? 'Überfällig' : 'Deadline'}
                        >
                          <CalendarDays size={11} />
                          {formatDate(task.deadline)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
              {colTasks.length === 0 && (
                <div className="rounded-lg border border-dashed border-line py-6 text-center">
                  <span className="t-mono text-faint">leer</span>
                </div>
              )}
            </div>
          </div>
        )
      })}

      {editTask && <TaskFormModal task={editTask} onClose={() => setEditTask(null)} />}
      {newTaskStatus && (
        <TaskFormModal task={null} defaultStatus={newTaskStatus} defaultProjectId={projectId} onClose={() => setNewTaskStatus(null)} />
      )}
    </div>
  )
}
