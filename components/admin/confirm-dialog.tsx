'use client'

/**
 * ConfirmDialog — compact flat Dermaspace action prompt (bottom sheet on mobile,
 * sleek compact card on desktop) used for staff, live-chat, consultation,
 * ticket, and booking actions.
 *
 * Design system rules:
 *   • Compact sizing: `sm:max-w-[328px]`, `p-4`, `w-9 h-9` icon tile,
 *     `text-[14px]` title, `text-[12px]` body, `h-10` stacked pill buttons.
 *   • Bottom sheet on mobile (`rounded-t-3xl` + brand-purple grabber),
 *     centered compact prompt on desktop (`sm:rounded-2xl`), crisp
 *     `border border-gray-200`, flat backdrop (`bg-gray-900/35`) with
 *     ZERO shadows, ZERO gradients, and ZERO red/rose buttons.
 */

import * as React from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Trash2, TriangleAlert, X } from 'lucide-react'

type Variant = 'danger' | 'brand'
type IconComponent = React.ComponentType<{ className?: string }>

export interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: React.ReactNode
  /** Confirm button label. Defaults to "Confirm". */
  confirmLabel?: string
  /** Cancel button label. Defaults to "Cancel". */
  cancelLabel?: string
  /** Both variants use Dermaspace brand purple; 'danger' defaults to Trash2 icon. */
  variant?: Variant
  /** Icon shown in the badge (JSX element or Lucide icon component). */
  icon?: React.ReactNode | IconComponent
  /** When true, shows a textarea and blocks confirm until it's filled. */
  requireReason?: boolean
  /** When true, shows an optional textarea without blocking confirm. */
  optionalReason?: boolean
  /** Label above the reason field. */
  reasonLabel?: React.ReactNode
  reasonPlaceholder?: string
  reasonValue?: string
  onReasonChange?: (value: string) => void
  /** Disables the confirm action + shows a spinner. */
  loading?: boolean
  /** Alias for `loading` used by some admin/staff callers. */
  busy?: boolean
  onConfirm: (reason?: string) => void | Promise<void>
  onCancel?: () => void
  /** Alias for `onCancel` (`(open: boolean) => void`). */
  onOpenChange?: (open: boolean) => void
}

function renderPromptIcon(
  icon: React.ReactNode | IconComponent | undefined,
  isDanger: boolean,
): React.ReactNode {
  if (!icon) {
    return isDanger ? (
      <Trash2 className="h-[18px] w-[18px]" />
    ) : (
      <TriangleAlert className="h-[18px] w-[18px]" />
    )
  }
  if (React.isValidElement(icon)) {
    return icon
  }
  if (
    typeof icon === 'function' ||
    (typeof icon === 'object' && icon !== null && '$$typeof' in icon)
  ) {
    const Comp = icon as IconComponent
    return <Comp className="h-[18px] w-[18px]" />
  }
  return icon as React.ReactNode
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'brand',
  icon,
  requireReason = false,
  optionalReason = false,
  reasonLabel = 'Reason',
  reasonPlaceholder,
  reasonValue,
  onReasonChange,
  loading = false,
  busy = false,
  onConfirm,
  onCancel,
  onOpenChange,
}: ConfirmDialogProps) {
  const isBusy = Boolean(loading || busy)
  const [internalReason, setInternalReason] = React.useState('')

  const isControlledReason = reasonValue !== undefined
  const currentReason = isControlledReason ? reasonValue : internalReason

  const handleClose = React.useCallback(() => {
    if (isBusy) return
    onCancel?.()
    onOpenChange?.(false)
  }, [isBusy, onCancel, onOpenChange])

  // Reset uncontrolled reason whenever the prompt opens/closes
  React.useEffect(() => {
    if (!open && !isControlledReason) {
      setInternalReason('')
    }
  }, [open, isControlledReason])

  // Lock background scroll while prompt is open
  React.useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // Close on Escape
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isBusy) handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, isBusy, handleClose])

  if (!open || typeof document === 'undefined') return null

  const isDanger = variant === 'danger'
  const showReason = requireReason || optionalReason
  const disabled = isBusy || (requireReason && !currentReason.trim())

  const handleReasonInput = (val: string) => {
    if (!isControlledReason) {
      setInternalReason(val)
    }
    onReasonChange?.(val)
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center sm:justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-testid="derma-action-prompt"
    >
      {/* Flat translucent backdrop — zero blur, zero shadow */}
      <button
        type="button"
        aria-label="Close"
        onClick={handleClose}
        className="absolute inset-0 bg-gray-900/45"
      />

      {/* Compact flat action prompt */}
      <div className="relative z-10 w-full sm:max-w-[320px] bg-white rounded-t-3xl sm:rounded-2xl border border-gray-200">
        {/* Mobile grabber */}
        <div
          aria-hidden="true"
          className="sm:hidden mx-auto mt-2.5 h-1 w-9 rounded-full bg-[#7B2D8E]/20"
        />

        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full text-gray-400 transition-colors hover:bg-[#FAF6FB] hover:text-[#7B2D8E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2D8E]/30 cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3.5 sm:p-4">
          <div className="flex items-start gap-2.5 pr-6">
            <span
              aria-hidden="true"
              className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-[#FAF6FB] text-[#7B2D8E] border border-[#7B2D8E]/15"
            >
              {renderPromptIcon(icon, isDanger)}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <h2 className="text-[14px] font-semibold text-gray-900 leading-snug text-pretty">
                {title}
              </h2>
              {description && (
                <div className="mt-0.5 text-[12px] leading-relaxed text-gray-500">
                  {description}
                </div>
              )}
            </div>
          </div>

          {showReason && (
            <label className="mt-3 block">
              <span className="text-[11px] font-semibold text-gray-700">
                {reasonLabel}
              </span>
              <textarea
                value={currentReason}
                onChange={(e) => handleReasonInput(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder={reasonPlaceholder}
                autoFocus
                className="mt-1 w-full resize-none rounded-xl border border-gray-200 bg-[#FBF9FC] px-3 py-2 text-base sm:text-[12.5px] text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:bg-white focus:border-[#7B2D8E]"
              />
            </label>
          )}

          <div className="mt-3.5 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => onConfirm(showReason ? currentReason.trim() : undefined)}
              disabled={disabled}
              className="w-full h-9 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#7B2D8E] hover:bg-[#5A1D6A] px-4 text-[13px] font-semibold text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2D8E]/40 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {isBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {confirmLabel}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={isBusy}
              className="w-full h-9 inline-flex items-center justify-center rounded-full border border-[#7B2D8E]/25 bg-white px-4 text-[13px] font-semibold text-[#7B2D8E] transition-colors hover:bg-[#FAF6FB] hover:border-[#7B2D8E]/40 hover:text-[#5A1D6A] disabled:opacity-50 cursor-pointer"
            >
              {cancelLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default ConfirmDialog
