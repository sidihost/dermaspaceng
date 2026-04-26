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
      {/*
        Compact action sheet — pulled in from the previous size after
        feedback that the dialog felt oversized on mobile. Specifically:
          • Width capped at ~320px on desktop (was 384px / max-w-sm).
          • Vertical padding reduced from p-5 → p-4.
          • Icon tile shrunk from 40×40 → 36×36, radius from xl → lg.
          • Title 15px → 14px, body 13px → 12px.
          • Buttons 44 → 40 high; primary text 13.5 → 13.
        Keeps the same hierarchy and palette, just denser.
      */}
      <div
        className="bg-white w-full sm:max-w-[320px] rounded-t-3xl sm:rounded-2xl shadow-xl p-4"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grabber — little indicator at the top of the sheet on
            mobile so users instinctively know it's a bottom sheet.
            Tinted in brand purple at low opacity instead of plain
            gray so the dialog reads as part of the Dermaspace
            visual system, not a generic system sheet. */}
        <div className="flex justify-center sm:hidden -mt-1 mb-2">
          <span className="block w-9 h-1 rounded-full bg-[#7B2D8E]/15" />
        </div>

        <div className="flex items-start gap-2.5">
          <div
            className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${iconTint}`}
          >
            {icon ?? <AlertTriangle className="w-[18px] h-[18px]" />}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h3
              id="confirm-title"
              className="text-[14px] font-semibold text-[#1a0d1f] leading-tight text-balance"
            >
              {title}
            </h3>
            {description && (
              <p className="mt-0.5 text-[12px] text-[#1a0d1f]/65 leading-relaxed text-pretty">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="mt-3.5 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="w-full h-10 rounded-full bg-[#7B2D8E] text-white text-[13px] font-semibold hover:bg-[#6B2278] disabled:opacity-70 disabled:cursor-wait transition-colors"
          >
            {loading ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
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
            className="w-full h-10 rounded-full bg-white text-[#7B2D8E] text-[13px] font-semibold border border-[#7B2D8E]/25 hover:bg-[#7B2D8E]/[0.06] disabled:opacity-60 transition-colors"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
