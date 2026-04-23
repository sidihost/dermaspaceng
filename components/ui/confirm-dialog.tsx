'use client'

/**
 * ConfirmDialog
 *
 * A reusable confirmation prompt modeled after the "Disconnect from
 * Derma AI?" card shown in the chat assistant: a rounded-square
 * icon tile on the left, a title + body, a primary solid pill, and
 * an outlined pill for "dismiss". Works as a bottom-sheet on mobile
 * and a centered card on desktop.
 *
 * Used for destructive actions on the user dashboard (delete passkey,
 * cancel invitation, remove payment method, etc.) so we never fall
 * back to the native window.confirm() — which looks like a system
 * error and breaks the brand.
 *
 * Usage:
 *
 *   const [open, setOpen] = useState(false)
 *
 *   <ConfirmDialog
 *     open={open}
 *     onOpenChange={setOpen}
 *     icon={<Trash2 className="w-5 h-5" />}
 *     title="Delete this passkey?"
 *     description="You'll need another sign-in method the next time you come back."
 *     confirmLabel="Yes, delete"
 *     cancelLabel="Keep passkey"
 *     onConfirm={async () => { await deletePasskey() }}
 *   />
 */

import * as React from 'react'
import { Loader2, AlertTriangle } from 'lucide-react'

type ConfirmVariant = 'default' | 'destructive'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: React.ReactNode
  /** Icon shown in the rounded tile on the left. Defaults to a
   *  warning triangle. */
  icon?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: ConfirmVariant
  /** Fired when the user taps the primary button. May be async; the
   *  dialog shows a spinner and auto-closes when the promise
   *  resolves. Throw to keep the dialog open. */
  onConfirm: () => void | Promise<void>
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  icon,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
}: Props) {
  const [loading, setLoading] = React.useState(false)

  // Lock background scroll while the sheet is open, matching the
  // avatar picker's behavior. Keeps iOS Safari from bleeding through.
  React.useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // Close on Escape — a small nicety for keyboard users.
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onOpenChange(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, loading, onOpenChange])

  if (!open) return null

  const handleConfirm = async () => {
    if (loading) return
    setLoading(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch {
      // Let the caller surface their own error state; keep the dialog
      // open so the user can retry.
    } finally {
      setLoading(false)
    }
  }

  // Destructive variant only changes the icon tile tint — the primary
  // button stays brand purple to match the rest of the dashboard.
  // Using red there would clash with the overall palette.
  const iconTint =
    variant === 'destructive'
      ? 'bg-red-50 text-red-600'
      : 'bg-[#7B2D8E]/10 text-[#7B2D8E]'

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      onClick={() => !loading && onOpenChange(false)}
    >
      <div
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 sm:p-7"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grabber — little indicator at the top of the sheet on
            mobile so users instinctively know it's a bottom sheet. */}
        <div className="flex justify-center sm:hidden -mt-2 mb-2">
          <span className="block w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="flex items-start gap-4">
          <div
            className={`flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center ${iconTint}`}
          >
            {icon ?? <AlertTriangle className="w-6 h-6" />}
          </div>
          <div className="min-w-0 flex-1 pt-1">
            <h3
              id="confirm-title"
              className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight text-balance"
            >
              {title}
            </h3>
            {description && (
              <p className="mt-2 text-sm sm:text-base text-gray-500 leading-relaxed text-pretty">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="w-full h-14 rounded-full bg-[#7B2D8E] text-white text-base font-semibold hover:bg-[#6B2278] disabled:opacity-70 disabled:cursor-wait transition-colors shadow-lg shadow-[#7B2D8E]/20"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Please wait…
              </span>
            ) : (
              confirmLabel
            )}
          </button>
          <button
            type="button"
            onClick={() => !loading && onOpenChange(false)}
            disabled={loading}
            className="w-full h-14 rounded-full bg-white text-gray-900 text-base font-semibold border border-gray-200 hover:bg-gray-50 disabled:opacity-60 transition-colors"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
