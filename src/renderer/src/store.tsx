import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Project, ProjectInput, Task, TaskInput } from '@shared/types'
import type { ReactNode } from 'react'

export type View =
  | 'dashboard'
  | 'projects'
  | 'favorites'
  | 'archive'
  | 'tasks'
  | 'roadmap'
  | 'stats'
  | 'terminal'
  | 'settings'
  | 'detail'

export interface Toast {
  id: number
  kind: 'success' | 'error' | 'info'
  text: string
}

interface AppState {
  view: View
  selectedProjectId: string | null
  projects: Project[]
  tasks: Task[]
  settings: Record<string, string>
  loading: boolean
  toasts: Toast[]
  navigate: (view: View) => void
  openProject: (id: string) => void
  refreshProjects: () => Promise<void>
  refreshTasks: () => Promise<void>
  createProject: (input: ProjectInput) => Promise<Project>
  updateProject: (id: string, patch: Partial<ProjectInput>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  duplicateProject: (id: string) => Promise<void>
  createTask: (input: TaskInput) => Promise<void>
  updateTask: (id: string, patch: Partial<TaskInput>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  setSetting: (key: string, value: string) => Promise<void>
  toast: (kind: Toast['kind'], text: string) => void
  theme: 'dark' | 'light'
  toggleTheme: () => void
}

const Ctx = createContext<AppState | null>(null)

let toastId = 0

export function AppProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [view, setView] = useState<View>('dashboard')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [toasts, setToasts] = useState<Toast[]>([])

  const theme = (settings['theme'] === 'light' ? 'light' : 'dark') as 'dark' | 'light'

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
  }, [theme])

  const toast = useCallback((kind: Toast['kind'], text: string) => {
    const id = ++toastId
    setToasts((t) => [...t, { id, kind, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800)
  }, [])

  const refreshProjects = useCallback(async () => {
    setProjects(await window.api.projects.list())
  }, [])

  const refreshTasks = useCallback(async () => {
    setTasks(await window.api.tasks.list())
  }, [])

  useEffect(() => {
    void (async () => {
      const [p, t, s] = await Promise.all([
        window.api.projects.list(),
        window.api.tasks.list(),
        window.api.settings.getAll()
      ])
      setProjects(p)
      setTasks(t)
      setSettings(s)
      setLoading(false)

      const overdue = t.filter((task) => task.status !== 'done' && task.deadline && new Date(task.deadline) < new Date())
      if (overdue.length > 0) {
        toast('info', `${overdue.length} Aufgabe${overdue.length === 1 ? '' : 'n'} überfällig`)
      }
    })()
  }, [toast])

  const navigate = useCallback((v: View) => {
    setView(v)
    if (v !== 'detail') setSelectedProjectId(null)
  }, [])

  const openProject = useCallback((id: string) => {
    setSelectedProjectId(id)
    setView('detail')
  }, [])

  /**
   * Meldet einen fehlgeschlagenen Schreibzugriff sichtbar und wirft weiter.
   *
   * Vorher hatte keine der CRUD-Mutationen ein catch: schlug der IPC-Aufruf
   * fehl (DB-Fehler, Pfad ausserhalb der Projektordner, kaputte Datei), blieb
   * das UI stumm auf dem alten Stand stehen und der Nutzer hielt ihn fuer
   * aktuell. Weitergeworfen wird bewusst, damit ein Formular nicht schliesst,
   * als waere gespeichert worden.
   */
  const melden = useCallback(
    (was: string, err: unknown): void => {
      const grund = err instanceof Error ? err.message : String(err)
      console.error(`[store] ${was} fehlgeschlagen`, err)
      toast('error', `${was} fehlgeschlagen: ${grund}`)
    },
    [toast]
  )

  const createProject = useCallback(
    async (input: ProjectInput) => {
      try {
        const project = await window.api.projects.create(input)
        await refreshProjects()
        toast('success', `Projekt „${project.name}" erstellt`)
        return project
      } catch (err) {
        melden('Projekt anlegen', err)
        throw err
      }
    },
    [refreshProjects, toast, melden]
  )

  const updateProject = useCallback(
    async (id: string, patch: Partial<ProjectInput>) => {
      try {
        await window.api.projects.update(id, patch)
        await refreshProjects()
      } catch (err) {
        melden('Projekt speichern', err)
        throw err
      }
    },
    [refreshProjects, melden]
  )

  const deleteProject = useCallback(
    async (id: string) => {
      try {
        await window.api.projects.remove(id)
        await Promise.all([refreshProjects(), refreshTasks()])
        toast('success', 'Projekt gelöscht')
      } catch (err) {
        melden('Projekt löschen', err)
        throw err
      }
    },
    [refreshProjects, refreshTasks, toast, melden]
  )

  const duplicateProject = useCallback(
    async (id: string) => {
      try {
        const copy = await window.api.projects.duplicate(id)
        await Promise.all([refreshProjects(), refreshTasks()])
        if (copy) toast('success', `Projekt dupliziert: „${copy.name}"`)
      } catch (err) {
        melden('Projekt duplizieren', err)
        throw err
      }
    },
    [refreshProjects, refreshTasks, toast, melden]
  )

  const createTask = useCallback(
    async (input: TaskInput) => {
      try {
        await window.api.tasks.create(input)
        await Promise.all([refreshTasks(), refreshProjects()])
      } catch (err) {
        melden('Aufgabe anlegen', err)
        throw err
      }
    },
    [refreshTasks, refreshProjects, melden]
  )

  const updateTask = useCallback(
    async (id: string, patch: Partial<TaskInput>) => {
      try {
        await window.api.tasks.update(id, patch)
        await refreshTasks()
      } catch (err) {
        melden('Aufgabe speichern', err)
        throw err
      }
    },
    [refreshTasks, melden]
  )

  const deleteTask = useCallback(
    async (id: string) => {
      try {
        await window.api.tasks.remove(id)
        await refreshTasks()
      } catch (err) {
        melden('Aufgabe löschen', err)
        throw err
      }
    },
    [refreshTasks, melden]
  )

  const setSetting = useCallback(
    async (key: string, value: string) => {
      try {
        await window.api.settings.set(key, value)
        setSettings((s) => ({ ...s, [key]: value }))
      } catch (err) {
        melden('Einstellung speichern', err)
        throw err
      }
    },
    [melden]
  )

  const toggleTheme = useCallback(() => {
    void setSetting('theme', theme === 'dark' ? 'light' : 'dark')
  }, [setSetting, theme])

  const value = useMemo<AppState>(
    () => ({
      view,
      selectedProjectId,
      projects,
      tasks,
      settings,
      loading,
      toasts,
      navigate,
      openProject,
      refreshProjects,
      refreshTasks,
      createProject,
      updateProject,
      deleteProject,
      duplicateProject,
      createTask,
      updateTask,
      deleteTask,
      setSetting,
      toast,
      theme,
      toggleTheme
    }),
    [
      view,
      selectedProjectId,
      projects,
      tasks,
      settings,
      loading,
      toasts,
      navigate,
      openProject,
      refreshProjects,
      refreshTasks,
      createProject,
      updateProject,
      deleteProject,
      duplicateProject,
      createTask,
      updateTask,
      deleteTask,
      setSetting,
      toast,
      theme,
      toggleTheme
    ]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp(): AppState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp muss innerhalb von AppProvider verwendet werden')
  return ctx
}
