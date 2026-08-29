export type ProjectStatus = 'aktiv' | 'planung' | 'pausiert' | 'fehler' | 'abgeschlossen'
export type Priority = 'niedrig' | 'mittel' | 'hoch' | 'kritisch'
export type TaskStatus = 'todo' | 'in_progress' | 'testing' | 'done'

export interface Project {
  id: string
  name: string
  description: string
  category: string
  status: ProjectStatus
  priority: Priority
  technologies: string[]
  repoUrl: string
  localPath: string
  version: string
  progress: number
  favorite: boolean
  archived: boolean
  docs: string
  createdAt: string
  updatedAt: string
}

export interface Task {
  id: string
  projectId: string
  title: string
  description: string
  priority: Priority
  deadline: string | null
  status: TaskStatus
  position: number
  createdAt: string
  updatedAt: string
}

export interface Note {
  id: string
  projectId: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface Version {
  id: string
  projectId: string
  version: string
  title: string
  notes: string
  releasedAt: string
}

export interface Milestone {
  id: string
  projectId: string
  title: string
  description: string
  dueDate: string | null
  done: boolean
  createdAt: string
}

export interface FileEntry {
  name: string
  isDirectory: boolean
  size: number
}

export type ProjectInput = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>
export type TaskInput = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>

export interface ExportBundle {
  app: 'projecthub'
  schemaVersion: 1
  exportedAt: string
  projects: Project[]
  tasks: Task[]
  notes: Note[]
  versions: Version[]
  milestones: Milestone[]
}

export interface ImportResult {
  ok: boolean
  message: string
  counts?: { projects: number; tasks: number; notes: number; versions: number; milestones: number }
}

export interface Api {
  projects: {
    list(): Promise<Project[]>
    get(id: string): Promise<Project | null>
    create(input: ProjectInput): Promise<Project>
    update(id: string, patch: Partial<ProjectInput>): Promise<Project | null>
    remove(id: string): Promise<void>
    duplicate(id: string): Promise<Project | null>
  }
  tasks: {
    list(): Promise<Task[]>
    create(input: TaskInput): Promise<Task>
    update(id: string, patch: Partial<TaskInput>): Promise<Task | null>
    remove(id: string): Promise<void>
  }
  notes: {
    list(projectId: string): Promise<Note[]>
    create(projectId: string, title: string): Promise<Note>
    update(id: string, patch: { title?: string; content?: string }): Promise<void>
    remove(id: string): Promise<void>
  }
  versions: {
    list(projectId: string): Promise<Version[]>
    create(input: Omit<Version, 'id'>): Promise<Version>
    remove(id: string): Promise<void>
  }
  milestones: {
    list(projectId: string): Promise<Milestone[]>
    listAll(): Promise<Milestone[]>
    create(input: Omit<Milestone, 'id' | 'createdAt'>): Promise<Milestone>
    update(id: string, patch: Partial<Omit<Milestone, 'id' | 'projectId' | 'createdAt'>>): Promise<void>
    remove(id: string): Promise<void>
  }
  settings: {
    getAll(): Promise<Record<string, string>>
    set(key: string, value: string): Promise<void>
  }
  data: {
    exportJson(): Promise<{ ok: boolean; path?: string }>
    importJson(): Promise<ImportResult>
    backup(): Promise<{ ok: boolean; path?: string }>
    openBackupFolder(): Promise<void>
    getDbPath(): Promise<string>
    wipe(): Promise<void>
  }
  files: {
    listDir(dirPath: string): Promise<{ ok: boolean; entries: FileEntry[]; error?: string }>
    readFile(filePath: string): Promise<{ ok: boolean; content?: string; error?: string }>
    writeFile(filePath: string, content: string): Promise<{ ok: boolean; error?: string }>
    openPath(p: string): Promise<void>
    openExternal(url: string): Promise<void>
    pickFolder(): Promise<string | null>
    vscodeAvailable(): Promise<boolean>
    openInVSCode(target: string): Promise<{ ok: boolean; error?: string }>
  }
  terminal: {
    create(id: string, cwd: string, cols: number, rows: number): Promise<{ ok: boolean; error?: string }>
    write(id: string, data: string): Promise<void>
    resize(id: string, cols: number, rows: number): Promise<void>
    kill(id: string): Promise<void>
    openExternal(cwd: string): Promise<void>
    onData(cb: (e: { id: string; data: string }) => void): () => void
    onExit(cb: (e: { id: string; code: number }) => void): () => void
  }
  appInfo(): Promise<{ version: string; platform: string }>
}
