import { contextBridge, ipcRenderer } from 'electron'
import type { Api } from '../shared/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const invoke = (channel: string, ...args: unknown[]): Promise<any> => ipcRenderer.invoke(channel, ...args)

const api: Api = {
  projects: {
    list: () => invoke('projects:list'),
    get: (id) => invoke('projects:get', id),
    create: (input) => invoke('projects:create', input),
    update: (id, patch) => invoke('projects:update', id, patch),
    remove: (id) => invoke('projects:remove', id),
    duplicate: (id) => invoke('projects:duplicate', id)
  },
  tasks: {
    list: () => invoke('tasks:list'),
    create: (input) => invoke('tasks:create', input),
    update: (id, patch) => invoke('tasks:update', id, patch),
    remove: (id) => invoke('tasks:remove', id)
  },
  notes: {
    list: (projectId) => invoke('notes:list', projectId),
    create: (projectId, title) => invoke('notes:create', projectId, title),
    update: (id, patch) => invoke('notes:update', id, patch),
    remove: (id) => invoke('notes:remove', id)
  },
  versions: {
    list: (projectId) => invoke('versions:list', projectId),
    create: (input) => invoke('versions:create', input),
    remove: (id) => invoke('versions:remove', id)
  },
  milestones: {
    list: (projectId) => invoke('milestones:list', projectId),
    listAll: () => invoke('milestones:listAll'),
    create: (input) => invoke('milestones:create', input),
    update: (id, patch) => invoke('milestones:update', id, patch),
    remove: (id) => invoke('milestones:remove', id)
  },
  settings: {
    getAll: () => invoke('settings:getAll'),
    set: (key, value) => invoke('settings:set', key, value)
  },
  data: {
    exportJson: () => invoke('data:export'),
    importJson: () => invoke('data:import'),
    backup: () => invoke('data:backup'),
    openBackupFolder: () => invoke('data:openBackupFolder'),
    getDbPath: () => invoke('data:getDbPath'),
    wipe: () => invoke('data:wipe')
  },
  files: {
    listDir: (dirPath) => invoke('files:listDir', dirPath),
    readFile: (filePath) => invoke('files:readFile', filePath),
    writeFile: (filePath, content) => invoke('files:writeFile', filePath, content),
    openPath: (p) => invoke('files:openPath', p),
    openExternal: (url) => invoke('files:openExternal', url),
    pickFolder: () => invoke('files:pickFolder'),
    vscodeAvailable: () => invoke('files:vscodeAvailable'),
    openInVSCode: (target) => invoke('files:openInVSCode', target)
  },
  terminal: {
    create: (id, cwd, cols, rows) => invoke('terminal:create', id, cwd, cols, rows),
    write: (id, data) => invoke('terminal:write', id, data),
    resize: (id, cols, rows) => invoke('terminal:resize', id, cols, rows),
    kill: (id) => invoke('terminal:kill', id),
    openExternal: (cwd) => invoke('terminal:openExternal', cwd),
    onData: (cb) => {
      const listener = (_e: Electron.IpcRendererEvent, payload: { id: string; data: string }): void => cb(payload)
      ipcRenderer.on('terminal:data', listener)
      return () => ipcRenderer.removeListener('terminal:data', listener)
    },
    onExit: (cb) => {
      const listener = (_e: Electron.IpcRendererEvent, payload: { id: string; code: number }): void => cb(payload)
      ipcRenderer.on('terminal:exit', listener)
      return () => ipcRenderer.removeListener('terminal:exit', listener)
    }
  },
  appInfo: () => invoke('app:info')
}

contextBridge.exposeInMainWorld('api', api)
