import { app } from 'electron'
import initSqlJs, { Database } from 'sql.js'
import fs from 'fs'
import path from 'path'
import type {
  ExportBundle,
  Milestone,
  Note,
  Project,
  ProjectInput,
  Task,
  TaskInput,
  Version
} from '../shared/types'

let db: Database
let saveTimer: NodeJS.Timeout | null = null

const dataDir = (): string => app.getPath('userData')
export const dbPath = (): string => path.join(dataDir(), 'projecthub.db')
export const backupDir = (): string => path.join(dataDir(), 'backups')

function resolveWasm(): ArrayBuffer {
  const candidates = [
    path.join(app.getAppPath(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
    path.join(process.resourcesPath ?? '', 'app.asar.unpacked', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
  ]
  for (const p of candidates) {
    if (p && fs.existsSync(p)) {
      const buf = fs.readFileSync(p)
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
    }
  }
  throw new Error('sql-wasm.wasm nicht gefunden')
}

export async function initDatabase(): Promise<void> {
  const SQL = await initSqlJs({ wasmBinary: resolveWasm() })
  if (fs.existsSync(dbPath())) {
    db = new SQL.Database(fs.readFileSync(dbPath()))
  } else {
    db = new SQL.Database()
  }
  migrate()
  autoBackupOnStart()
}

function migrate(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      category TEXT DEFAULT '',
      status TEXT DEFAULT 'planung',
      priority TEXT DEFAULT 'mittel',
      technologies TEXT DEFAULT '[]',
      repo_url TEXT DEFAULT '',
      local_path TEXT DEFAULT '',
      version TEXT DEFAULT '0.1.0',
      progress INTEGER DEFAULT 0,
      favorite INTEGER DEFAULT 0,
      archived INTEGER DEFAULT 0,
      docs TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      priority TEXT DEFAULT 'mittel',
      deadline TEXT,
      status TEXT DEFAULT 'todo',
      position INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT DEFAULT '',
      content TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS versions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      version TEXT NOT NULL,
      title TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      released_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS milestones (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      due_date TEXT,
      done INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `)
  persist()
}

// ---------- Persistenz ----------

function persist(): void {
  const data = Buffer.from(db.export())
  fs.mkdirSync(dataDir(), { recursive: true })
  fs.writeFileSync(dbPath(), data)
}

function scheduleSave(): void {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(persist, 400)
}

export function flush(): void {
  if (saveTimer) clearTimeout(saveTimer)
  persist()
}

export function createBackup(): string {
  flush()
  fs.mkdirSync(backupDir(), { recursive: true })
  const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19)
  const target = path.join(backupDir(), `projecthub-${stamp}.db`)
  fs.copyFileSync(dbPath(), target)
  pruneBackups()
  return target
}

function autoBackupOnStart(): void {
  try {
    if (fs.existsSync(dbPath())) createBackup()
  } catch {
    /* Backup darf den Start nicht verhindern */
  }
}

function pruneBackups(keep = 14): void {
  const files = fs
    .readdirSync(backupDir())
    .filter((f) => f.endsWith('.db'))
    .sort()
  while (files.length > keep) {
    const oldest = files.shift()
    if (oldest) fs.unlinkSync(path.join(backupDir(), oldest))
  }
}

// ---------- Query-Helfer ----------

type Row = Record<string, unknown>

function all(sql: string, params: unknown[] = []): Row[] {
  const stmt = db.prepare(sql)
  stmt.bind(params as never)
  const rows: Row[] = []
  while (stmt.step()) rows.push(stmt.getAsObject() as Row)
  stmt.free()
  return rows
}

function run(sql: string, params: unknown[] = []): void {
  db.run(sql, params as never)
  scheduleSave()
}

const now = (): string => new Date().toISOString()
const uid = (): string => crypto.randomUUID()

// ---------- Mapper ----------

function rowToProject(r: Row): Project {
  return {
    id: String(r.id),
    name: String(r.name),
    description: String(r.description ?? ''),
    category: String(r.category ?? ''),
    status: String(r.status) as Project['status'],
    priority: String(r.priority) as Project['priority'],
    technologies: JSON.parse(String(r.technologies ?? '[]')),
    repoUrl: String(r.repo_url ?? ''),
    localPath: String(r.local_path ?? ''),
    version: String(r.version ?? ''),
    progress: Number(r.progress ?? 0),
    favorite: Boolean(r.favorite),
    archived: Boolean(r.archived),
    docs: String(r.docs ?? ''),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at)
  }
}

function rowToTask(r: Row): Task {
  return {
    id: String(r.id),
    projectId: String(r.project_id),
    title: String(r.title),
    description: String(r.description ?? ''),
    priority: String(r.priority) as Task['priority'],
    deadline: r.deadline ? String(r.deadline) : null,
    status: String(r.status) as Task['status'],
    position: Number(r.position ?? 0),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at)
  }
}

function rowToNote(r: Row): Note {
  return {
    id: String(r.id),
    projectId: String(r.project_id),
    title: String(r.title ?? ''),
    content: String(r.content ?? ''),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at)
  }
}

function rowToVersion(r: Row): Version {
  return {
    id: String(r.id),
    projectId: String(r.project_id),
    version: String(r.version),
    title: String(r.title ?? ''),
    notes: String(r.notes ?? ''),
    releasedAt: String(r.released_at)
  }
}

function rowToMilestone(r: Row): Milestone {
  return {
    id: String(r.id),
    projectId: String(r.project_id),
    title: String(r.title),
    description: String(r.description ?? ''),
    dueDate: r.due_date ? String(r.due_date) : null,
    done: Boolean(r.done),
    createdAt: String(r.created_at)
  }
}

// ---------- Projekte ----------

export function listProjects(): Project[] {
  return all('SELECT * FROM projects ORDER BY updated_at DESC').map(rowToProject)
}

export function getProject(id: string): Project | null {
  const rows = all('SELECT * FROM projects WHERE id = ?', [id])
  return rows.length ? rowToProject(rows[0]) : null
}

export function createProject(input: ProjectInput): Project {
  const id = uid()
  const ts = now()
  run(
    `INSERT INTO projects (id, name, description, category, status, priority, technologies,
      repo_url, local_path, version, progress, favorite, archived, docs, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.name,
      input.description,
      input.category,
      input.status,
      input.priority,
      JSON.stringify(input.technologies),
      input.repoUrl,
      input.localPath,
      input.version,
      input.progress,
      input.favorite ? 1 : 0,
      input.archived ? 1 : 0,
      input.docs,
      ts,
      ts
    ]
  )
  return getProject(id)!
}

const projectColumns: Record<string, string> = {
  name: 'name',
  description: 'description',
  category: 'category',
  status: 'status',
  priority: 'priority',
  technologies: 'technologies',
  repoUrl: 'repo_url',
  localPath: 'local_path',
  version: 'version',
  progress: 'progress',
  favorite: 'favorite',
  archived: 'archived',
  docs: 'docs'
}

export function updateProject(id: string, patch: Partial<ProjectInput>): Project | null {
  const sets: string[] = []
  const params: unknown[] = []
  for (const [key, col] of Object.entries(projectColumns)) {
    if (!(key in patch)) continue
    const value = (patch as Record<string, unknown>)[key]
    sets.push(`${col} = ?`)
    if (key === 'technologies') params.push(JSON.stringify(value))
    else if (key === 'favorite' || key === 'archived') params.push(value ? 1 : 0)
    else params.push(value)
  }
  if (sets.length === 0) return getProject(id)
  sets.push('updated_at = ?')
  params.push(now(), id)
  run(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`, params)
  return getProject(id)
}

export function deleteProject(id: string): void {
  run('DELETE FROM tasks WHERE project_id = ?', [id])
  run('DELETE FROM notes WHERE project_id = ?', [id])
  run('DELETE FROM versions WHERE project_id = ?', [id])
  run('DELETE FROM milestones WHERE project_id = ?', [id])
  run('DELETE FROM projects WHERE id = ?', [id])
}

export function duplicateProject(id: string): Project | null {
  const source = getProject(id)
  if (!source) return null
  const copy = createProject({
    ...source,
    name: `${source.name} (Kopie)`,
    favorite: false,
    archived: false
  })
  for (const t of listTasks().filter((t) => t.projectId === id)) {
    createTask({ ...t, projectId: copy.id })
  }
  for (const n of listNotes(id)) {
    const note = createNote(copy.id, n.title)
    updateNote(note.id, { content: n.content })
  }
  for (const m of listMilestones(id)) {
    createMilestone({ projectId: copy.id, title: m.title, description: m.description, dueDate: m.dueDate, done: m.done })
  }
  return getProject(copy.id)
}

// ---------- Aufgaben ----------

export function listTasks(): Task[] {
  return all('SELECT * FROM tasks ORDER BY position ASC, created_at ASC').map(rowToTask)
}

export function createTask(input: TaskInput): Task {
  const id = uid()
  const ts = now()
  run(
    `INSERT INTO tasks (id, project_id, title, description, priority, deadline, status, position, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.projectId, input.title, input.description, input.priority, input.deadline, input.status, input.position, ts, ts]
  )
  touchProject(input.projectId)
  return all('SELECT * FROM tasks WHERE id = ?', [id]).map(rowToTask)[0]
}

const taskColumns: Record<string, string> = {
  projectId: 'project_id',
  title: 'title',
  description: 'description',
  priority: 'priority',
  deadline: 'deadline',
  status: 'status',
  position: 'position'
}

export function updateTask(id: string, patch: Partial<TaskInput>): Task | null {
  const sets: string[] = []
  const params: unknown[] = []
  for (const [key, col] of Object.entries(taskColumns)) {
    if (!(key in patch)) continue
    sets.push(`${col} = ?`)
    params.push((patch as Record<string, unknown>)[key])
  }
  if (sets.length === 0) return null
  sets.push('updated_at = ?')
  params.push(now(), id)
  run(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`, params)
  const rows = all('SELECT * FROM tasks WHERE id = ?', [id])
  return rows.length ? rowToTask(rows[0]) : null
}

export function deleteTask(id: string): void {
  run('DELETE FROM tasks WHERE id = ?', [id])
}

function touchProject(projectId: string): void {
  run('UPDATE projects SET updated_at = ? WHERE id = ?', [now(), projectId])
}

// ---------- Notizen ----------

export function listNotes(projectId: string): Note[] {
  return all('SELECT * FROM notes WHERE project_id = ? ORDER BY updated_at DESC', [projectId]).map(rowToNote)
}

export function createNote(projectId: string, title: string): Note {
  const id = uid()
  const ts = now()
  run('INSERT INTO notes (id, project_id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', [
    id,
    projectId,
    title,
    '',
    ts,
    ts
  ])
  return all('SELECT * FROM notes WHERE id = ?', [id]).map(rowToNote)[0]
}

export function updateNote(id: string, patch: { title?: string; content?: string }): void {
  const sets: string[] = []
  const params: unknown[] = []
  if (patch.title !== undefined) {
    sets.push('title = ?')
    params.push(patch.title)
  }
  if (patch.content !== undefined) {
    sets.push('content = ?')
    params.push(patch.content)
  }
  if (!sets.length) return
  sets.push('updated_at = ?')
  params.push(now(), id)
  run(`UPDATE notes SET ${sets.join(', ')} WHERE id = ?`, params)
}

export function deleteNote(id: string): void {
  run('DELETE FROM notes WHERE id = ?', [id])
}

// ---------- Versionen ----------

export function listVersions(projectId: string): Version[] {
  return all('SELECT * FROM versions WHERE project_id = ? ORDER BY released_at DESC', [projectId]).map(rowToVersion)
}

export function createVersion(input: Omit<Version, 'id'>): Version {
  const id = uid()
  run('INSERT INTO versions (id, project_id, version, title, notes, released_at) VALUES (?, ?, ?, ?, ?, ?)', [
    id,
    input.projectId,
    input.version,
    input.title,
    input.notes,
    input.releasedAt
  ])
  // Projektversion auf die neueste heben
  run('UPDATE projects SET version = ?, updated_at = ? WHERE id = ?', [input.version, now(), input.projectId])
  return all('SELECT * FROM versions WHERE id = ?', [id]).map(rowToVersion)[0]
}

export function deleteVersion(id: string): void {
  run('DELETE FROM versions WHERE id = ?', [id])
}

// ---------- Meilensteine ----------

export function listMilestones(projectId: string): Milestone[] {
  return all('SELECT * FROM milestones WHERE project_id = ? ORDER BY due_date IS NULL, due_date ASC', [projectId]).map(
    rowToMilestone
  )
}

export function listAllMilestones(): Milestone[] {
  return all('SELECT * FROM milestones ORDER BY due_date IS NULL, due_date ASC').map(rowToMilestone)
}

export function createMilestone(input: Omit<Milestone, 'id' | 'createdAt'>): Milestone {
  const id = uid()
  run('INSERT INTO milestones (id, project_id, title, description, due_date, done, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [
    id,
    input.projectId,
    input.title,
    input.description,
    input.dueDate,
    input.done ? 1 : 0,
    now()
  ])
  return all('SELECT * FROM milestones WHERE id = ?', [id]).map(rowToMilestone)[0]
}

export function updateMilestone(
  id: string,
  patch: Partial<{ title: string; description: string; dueDate: string | null; done: boolean }>
): void {
  const sets: string[] = []
  const params: unknown[] = []
  if (patch.title !== undefined) {
    sets.push('title = ?')
    params.push(patch.title)
  }
  if (patch.description !== undefined) {
    sets.push('description = ?')
    params.push(patch.description)
  }
  if (patch.dueDate !== undefined) {
    sets.push('due_date = ?')
    params.push(patch.dueDate)
  }
  if (patch.done !== undefined) {
    sets.push('done = ?')
    params.push(patch.done ? 1 : 0)
  }
  if (!sets.length) return
  params.push(id)
  run(`UPDATE milestones SET ${sets.join(', ')} WHERE id = ?`, params)
}

export function deleteMilestone(id: string): void {
  run('DELETE FROM milestones WHERE id = ?', [id])
}

// ---------- Einstellungen ----------

export function getAllSettings(): Record<string, string> {
  const result: Record<string, string> = {}
  for (const row of all('SELECT key, value FROM settings')) {
    result[String(row.key)] = String(row.value ?? '')
  }
  return result
}

export function setSetting(key: string, value: string): void {
  run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, value])
}

// ---------- Export / Import / Wipe ----------

export function exportBundle(): ExportBundle {
  return {
    app: 'projecthub',
    schemaVersion: 1,
    exportedAt: now(),
    projects: listProjects(),
    tasks: listTasks(),
    notes: all('SELECT * FROM notes').map(rowToNote),
    versions: all('SELECT * FROM versions').map(rowToVersion),
    milestones: listAllMilestones()
  }
}

export function importBundle(bundle: ExportBundle): { projects: number; tasks: number; notes: number; versions: number; milestones: number } {
  let counts = { projects: 0, tasks: 0, notes: 0, versions: 0, milestones: 0 }
  for (const p of bundle.projects ?? []) {
    run(
      `INSERT INTO projects (id, name, description, category, status, priority, technologies, repo_url, local_path,
        version, progress, favorite, archived, docs, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name, description=excluded.description, category=excluded.category,
        status=excluded.status, priority=excluded.priority, technologies=excluded.technologies, repo_url=excluded.repo_url,
        local_path=excluded.local_path, version=excluded.version, progress=excluded.progress, favorite=excluded.favorite,
        archived=excluded.archived, docs=excluded.docs, updated_at=excluded.updated_at`,
      [
        p.id, p.name, p.description, p.category, p.status, p.priority, JSON.stringify(p.technologies),
        p.repoUrl, p.localPath, p.version, p.progress, p.favorite ? 1 : 0, p.archived ? 1 : 0, p.docs,
        p.createdAt, p.updatedAt
      ]
    )
    counts.projects++
  }
  for (const t of bundle.tasks ?? []) {
    run(
      `INSERT INTO tasks (id, project_id, title, description, priority, deadline, status, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET title=excluded.title, description=excluded.description, priority=excluded.priority,
        deadline=excluded.deadline, status=excluded.status, position=excluded.position, updated_at=excluded.updated_at`,
      [t.id, t.projectId, t.title, t.description, t.priority, t.deadline, t.status, t.position, t.createdAt, t.updatedAt]
    )
    counts.tasks++
  }
  for (const n of bundle.notes ?? []) {
    run(
      `INSERT INTO notes (id, project_id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET title=excluded.title, content=excluded.content, updated_at=excluded.updated_at`,
      [n.id, n.projectId, n.title, n.content, n.createdAt, n.updatedAt]
    )
    counts.notes++
  }
  for (const v of bundle.versions ?? []) {
    run(
      `INSERT INTO versions (id, project_id, version, title, notes, released_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET version=excluded.version, title=excluded.title, notes=excluded.notes`,
      [v.id, v.projectId, v.version, v.title, v.notes, v.releasedAt]
    )
    counts.versions++
  }
  for (const m of bundle.milestones ?? []) {
    run(
      `INSERT INTO milestones (id, project_id, title, description, due_date, done, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET title=excluded.title, description=excluded.description, due_date=excluded.due_date, done=excluded.done`,
      [m.id, m.projectId, m.title, m.description, m.dueDate, m.done ? 1 : 0, m.createdAt]
    )
    counts.milestones++
  }
  flush()
  return counts
}

export function wipeAll(): void {
  createBackup()
  db.exec('DELETE FROM projects; DELETE FROM tasks; DELETE FROM notes; DELETE FROM versions; DELETE FROM milestones;')
  flush()
}
