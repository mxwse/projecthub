import { FolderOpen, X } from 'lucide-react'
import { useState } from 'react'
import type { Project, ProjectInput } from '@shared/types'
import { useApp } from '@/store'
import { PRIORITIES, PRIORITY_META, PROJECT_STATUSES, STATUS_META } from '@/utils'
import { Button, Field, Modal, inputClass } from '@/components/ui'

export function ProjectFormModal({
  project,
  onClose
}: {
  project: Project | null
  onClose: () => void
}): React.JSX.Element {
  const { createProject, updateProject, toast } = useApp()
  const [form, setForm] = useState<ProjectInput>(() =>
    project
      ? { ...project }
      : {
          name: '',
          description: '',
          category: '',
          status: 'planung',
          priority: 'mittel',
          technologies: [],
          repoUrl: '',
          localPath: '',
          version: '0.1.0',
          progress: 0,
          favorite: false,
          archived: false,
          docs: ''
        }
  )
  const [techInput, setTechInput] = useState('')
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof ProjectInput>(key: K, value: ProjectInput[K]): void =>
    setForm((f) => ({ ...f, [key]: value }))

  const addTech = (): void => {
    const t = techInput.trim()
    if (t && !form.technologies.includes(t)) {
      set('technologies', [...form.technologies, t])
    }
    setTechInput('')
  }

  const submit = async (): Promise<void> => {
    if (!form.name.trim()) {
      toast('error', 'Bitte einen Projektnamen angeben')
      return
    }
    setSaving(true)
    try {
      if (project) {
        await updateProject(project.id, form)
        toast('success', 'Projekt aktualisiert')
      } else {
        await createProject(form)
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={project ? 'Projekt bearbeiten' : 'Neues Projekt'} onClose={onClose} wide>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
        className="space-y-4"
      >
        <Field label="Name *">
          <input
            autoFocus
            className={inputClass}
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="z. B. Website Builder"
          />
        </Field>

        <Field label="Beschreibung">
          <textarea
            className={`${inputClass} min-h-[72px] resize-y`}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Worum geht es in diesem Projekt?"
          />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Kategorie">
            <input
              className={inputClass}
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              placeholder="z. B. Web App"
            />
          </Field>
          <Field label="Status">
            <select className={inputClass} value={form.status} onChange={(e) => set('status', e.target.value as ProjectInput['status'])}>
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s} style={{ color: STATUS_META[s].color }}>
                  {STATUS_META[s].marker} {STATUS_META[s].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Priorität">
            <select
              className={inputClass}
              value={form.priority}
              onChange={(e) => set('priority', e.target.value as ProjectInput['priority'])}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_META[p].label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Technologien">
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-line bg-raised px-2 py-1.5">
            {form.technologies.map((t) => (
              <span key={t} className="t-mono inline-flex items-center gap-1 rounded border border-line bg-panel px-1.5 py-0.5 text-dim">
                {t}
                <button
                  type="button"
                  onClick={() => set('technologies', form.technologies.filter((x) => x !== t))}
                  className="text-faint hover:text-err"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
            <input
              className="min-w-[120px] flex-1 bg-transparent px-1 py-0.5 text-sm text-ink placeholder:text-faint focus:outline-none"
              value={techInput}
              onChange={(e) => setTechInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault()
                  addTech()
                }
              }}
              onBlur={addTech}
              placeholder={form.technologies.length === 0 ? 'React, Python, … (Enter)' : ''}
            />
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Repository URL">
            <input
              className={inputClass}
              value={form.repoUrl}
              onChange={(e) => set('repoUrl', e.target.value)}
              placeholder="https://github.com/…"
            />
          </Field>
          <Field label="Lokaler Pfad">
            <div className="flex gap-1.5">
              <input
                className={inputClass}
                value={form.localPath}
                onChange={(e) => set('localPath', e.target.value)}
                placeholder="D:\Projekte\…"
              />
              <button
                type="button"
                onClick={async () => {
                  const dir = await window.api.files.pickFolder()
                  if (dir) set('localPath', dir)
                }}
                className="shrink-0 rounded-lg border border-line bg-raised px-2.5 text-dim transition-colors hover:border-faint hover:text-ink"
                title="Ordner wählen"
              >
                <FolderOpen size={15} />
              </button>
            </div>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Version">
            <input className={inputClass} value={form.version} onChange={(e) => set('version', e.target.value)} placeholder="0.1.0" />
          </Field>
          <Field label={`Fortschritt · ${form.progress}%`}>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={form.progress}
              onChange={(e) => set('progress', Number(e.target.value))}
              className="mt-3 w-full"
            />
          </Field>
        </div>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={saving}>
            {project ? 'Speichern' : 'Projekt erstellen'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
