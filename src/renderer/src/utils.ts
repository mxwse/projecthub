import type { Priority, ProjectStatus, TaskStatus } from '@shared/types'

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'gerade eben'
  if (min < 60) return `vor ${min} Min.`
  const h = Math.floor(min / 60)
  if (h < 24) return `vor ${h} Std.`
  const d = Math.floor(h / 24)
  if (d === 1) return 'gestern'
  if (d < 7) return `vor ${d} Tagen`
  const w = Math.floor(d / 7)
  if (w < 5) return w === 1 ? 'vor 1 Woche' : `vor ${w} Wochen`
  const m = Math.floor(d / 30)
  if (m < 12) return m === 1 ? 'vor 1 Monat' : `vor ${m} Monaten`
  const y = Math.floor(d / 365)
  return y === 1 ? 'vor 1 Jahr' : `vor ${y} Jahren`
}

export function formatDate(iso: string | null): string {
  if (!iso) return '–'
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export function isOverdue(deadline: string | null): boolean {
  if (!deadline) return false
  const d = new Date(deadline)
  d.setHours(23, 59, 59)
  return d.getTime() < Date.now()
}

/**
 * Statusfarben und -beschriftungen.
 *
 * Der Marker ist bewusst ein geometrisches Zeichen und kein Emoji: das
 * Design-System verbietet Emoji als Icon, und ein Quadrat passt zur
 * Formensprache. In einem <option> laesst sich kein gestylter Punkt
 * rendern, deshalb ein Zeichen und die Farbe per style am Element.
 */
export const STATUS_META: Record<ProjectStatus | 'archiviert', { label: string; color: string; marker: string }> = {
  aktiv: { label: 'Aktiv', color: 'var(--ok)', marker: '■' },
  planung: { label: 'Planung', color: 'var(--warn)', marker: '■' },
  pausiert: { label: 'Pausiert', color: 'var(--info)', marker: '■' },
  fehler: { label: 'Fehler', color: 'var(--err)', marker: '■' },
  abgeschlossen: { label: 'Abgeschlossen', color: 'var(--accent)', marker: '■' },
  archiviert: { label: 'Archiviert', color: 'var(--faint)', marker: '■' }
}

export const PRIORITY_META: Record<Priority, { label: string; color: string; rank: number }> = {
  niedrig: { label: 'Niedrig', color: 'var(--faint)', rank: 0 },
  mittel: { label: 'Mittel', color: 'var(--info)', rank: 1 },
  hoch: { label: 'Hoch', color: 'var(--warn)', rank: 2 },
  kritisch: { label: 'Kritisch', color: 'var(--err)', rank: 3 }
}

export const TASK_COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'testing', label: 'Testing' },
  { id: 'done', label: 'Done' }
]

export const PROJECT_STATUSES: ProjectStatus[] = ['aktiv', 'planung', 'pausiert', 'fehler', 'abgeschlossen']
export const PRIORITIES: Priority[] = ['niedrig', 'mittel', 'hoch', 'kritisch']

export function greeting(): string {
  const h = new Date().getHours()
  if (h < 11) return 'Guten Morgen'
  if (h < 18) return 'Guten Tag'
  return 'Guten Abend'
}
