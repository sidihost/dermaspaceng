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
        className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-xl p-5"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grabber — little indicator at the top of the sheet on
            mobile so users instinctively know it's a bottom sheet.
            Tinted in brand purple at low opacity instead of plain
            gray so the dialog reads as part of the Dermaspace
            visual system, not a generic system sheet. */}
        <div className="flex justify-center sm:hidden -mt-1.5 mb-2.5">
          <span className="block w-10 h-1 rounded-full bg-[#7B2D8E]/15" />
        </div>

        <div className="flex items-start gap-3">
          <div
            className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${iconTint}`}
          >
            {icon ?? <AlertTriangle className="w-5 h-5" />}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h3
              id="confirm-title"
              className="text-[15px] sm:text-base font-semibold text-[#1a0d1f] leading-tight text-balance"
            >
              {title}
            </h3>
            {description && (
              <p className="mt-1 text-[12.5px] sm:text-[13px] text-[#7B2D8E]/70 leading-relaxed text-pretty">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="w-full h-11 rounded-full bg-[#7B2D8E] text-white text-[13.5px] font-semibold hover:bg-[#6B2278] disabled:opacity-70 disabled:cursor-wait transition-colors"
          >
            {loading ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="w-4 h-4 animate-spin" />
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
            className="w-full h-11 rounded-full bg-white text-[#7B2D8E] text-[13.5px] font-semibold border border-[#7B2D8E]/20 hover:bg-[#7B2D8E]/[0.04] disabled:opacity-60 transition-colors"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
