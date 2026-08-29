import { useState } from 'react'
import type { Task, TaskInput, TaskStatus } from '@shared/types'
import { useApp } from '@/store'
import { PRIORITIES, PRIORITY_META, TASK_COLUMNS } from '@/utils'
import { Button, Field, Modal, inputClass } from '@/components/ui'

export function TaskFormModal({
  task,
  defaultStatus = 'todo',
  defaultProjectId,
  onClose
}: {
  task: Task | null
  defaultStatus?: TaskStatus
  defaultProjectId?: string
  onClose: () => void
}): React.JSX.Element {
  const { projects, tasks, createTask, updateTask, toast } = useApp()
  const activeProjects = projects.filter((p) => !p.archived)

  const [form, setForm] = useState<TaskInput>(() =>
    task
      ? { ...task }
      : {
          projectId: defaultProjectId ?? activeProjects[0]?.id ?? '',
          title: '',
          description: '',
          priority: 'mittel',
          deadline: null,
          status: defaultStatus,
          position: tasks.length
        }
  )
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof TaskInput>(key: K, value: TaskInput[K]): void => setForm((f) => ({ ...f, [key]: value }))

  const submit = async (): Promise<void> => {
    if (!form.title.trim()) {
      toast('error', 'Bitte einen Titel angeben')
      return
    }
    if (!form.projectId) {
      toast('error', 'Bitte ein Projekt zuordnen')
      return
    }
    setSaving(true)
    try {
      if (task) {
        await updateTask(task.id, form)
        toast('success', 'Aufgabe aktualisiert')
      } else {
        await createTask(form)
        toast('success', 'Aufgabe erstellt')
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={task ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
        className="space-y-4"
      >
        <Field label="Titel *">
          <input
            autoFocus
            className={inputClass}
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="Was ist zu tun?"
          />
        </Field>

        <Field label="Beschreibung">
          <textarea
            className={`${inputClass} min-h-[64px] resize-y`}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </Field>

        <Field label="Projekt *">
          <select className={inputClass} value={form.projectId} onChange={(e) => set('projectId', e.target.value)}>
            {activeProjects.length === 0 && <option value="">Kein Projekt vorhanden</option>}
            {activeProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Status">
            <select className={inputClass} value={form.status} onChange={(e) => set('status', e.target.value as TaskStatus)}>
              {TASK_COLUMNS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Priorität">
            <select
              className={inputClass}
              value={form.priority}
              onChange={(e) => set('priority', e.target.value as TaskInput['priority'])}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_META[p].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Deadline">
            <input
              type="date"
              className={inputClass}
              value={form.deadline ?? ''}
              onChange={(e) => set('deadline', e.target.value || null)}
            />
          </Field>
        </div>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={saving}>
            {task ? 'Speichern' : 'Aufgabe erstellen'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
