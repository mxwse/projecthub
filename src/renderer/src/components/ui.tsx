import { X } from 'lucide-react'
import type { Priority, ProjectStatus } from '@shared/types'
import type { ReactNode } from 'react'
import { PRIORITY_META, STATUS_META } from '@/utils'

export function StatusBadge({ status, archived }: { status: ProjectStatus; archived?: boolean }): React.JSX.Element {
  const meta = archived ? STATUS_META.archiviert : STATUS_META[status]
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`h-2 w-2 rounded-full ${status === 'aktiv' && !archived ? 'dot-pulse' : ''}`}
        style={{ backgroundColor: meta.color, color: meta.color }}
      />
      <span className="t-mono" style={{ color: meta.color }}>
        {meta.label}
      </span>
    </span>
  )
}

export function PriorityTag({ priority }: { priority: Priority }): React.JSX.Element {
  const meta = PRIORITY_META[priority]
  return (
    <span
      className="t-mono rounded px-1.5 py-0.5"
      style={{ color: meta.color, backgroundColor: `color-mix(in srgb, ${meta.color} 12%, transparent)` }}
    >
      {meta.label}
    </span>
  )
}

export function TechChip({ name }: { name: string }): React.JSX.Element {
  return (
    <span className="t-mono rounded border border-line bg-raised px-1.5 py-0.5 text-dim">{name}</span>
  )
}

export function ProgressBar({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' }): React.JSX.Element {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className={`w-full overflow-hidden rounded-[3px] bg-raised ${size === 'sm' ? 'h-1' : 'h-1.5'}`}>
      <div
        className="h-full rounded-[3px] bg-accent transition-all duration-500"
        style={{ width: `${clamped}%`, opacity: clamped === 0 ? 0 : 1 }}
      />
    </div>
  )
}

export function Modal({
  title,
  onClose,
  children,
  wide
}: {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}): React.JSX.Element {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={`anim-pop flex max-h-[90vh] w-full flex-col rounded-xl border border-line-strong bg-panel shadow-2xl ${wide ? 'max-w-2xl' : 'max-w-lg'}`}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-faint transition-colors hover:bg-hover hover:text-ink"
            aria-label="Schließen"
          >
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Löschen',
  onConfirm,
  onCancel
}: {
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}): React.JSX.Element {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm text-dim">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled,
  title
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'danger' | 'outline'
  type?: 'button' | 'submit'
  disabled?: boolean
  title?: string
}): React.JSX.Element {
  const base =
    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none'
  const variants = {
    primary: 'bg-accent text-accent-ink hover:brightness-110 active:scale-[0.98]',
    ghost: 'text-dim hover:bg-hover hover:text-ink',
    outline: 'border border-line-strong text-ink hover:border-faint hover:bg-hover',
    danger: 'bg-err/10 text-err hover:bg-err/20'
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} title={title} className={`${base} ${variants[variant]}`}>
      {children}
    </button>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }): React.JSX.Element {
  return (
    <label className="block">
      <span className="t-label mb-1.5 block">{label}</span>
      {children}
    </label>
  )
}

export const inputClass =
  'w-full rounded-lg border border-line bg-raised px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none transition-colors'

export function EmptyState({ icon, title, hint, action }: { icon: ReactNode; title: string; hint?: string; action?: ReactNode }): React.JSX.Element {
  return (
    <div className="anim-rise flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line py-16 text-center">
      <div className="text-faint">{icon}</div>
      <p className="text-sm font-medium text-dim">{title}</p>
      {hint && <p className="t-mono max-w-sm text-faint">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function SectionLabel({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span className="t-label">{children}</span>
      <div className="h-px flex-1 bg-line" />
    </div>
  )
}
