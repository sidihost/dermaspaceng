'use client'

/**
 * ConfirmDialog — the shared flat Dermaspace confirmation card/sheet for
 * staff, live-chat, consultation, ticket, and booking actions.
 *
 * Design system rules:
 *   • Bottom sheet on mobile (`rounded-t-3xl` + top drag handle), centered
 *     card on desktop (`sm:rounded-2xl`), crisp `border border-gray-200`,
 *     flat backdrop (`bg-gray-900/35`) with zero shadows and zero gradients.
 *   • Brand-purple icon badge (`bg-[#FAF6FB] text-[#7B2D8E] border border-[#7B2D8E]/15`)
 *     and brand-purple primary pill button (`bg-[#7B2D8E] hover:bg-[#5A1D6A]`)
 *     across ALL actions — zero red/rose buttons.
 *   • Stacked full-width pill actions (`rounded-full`) for effortless mobile
 *     and desktop tapping, matching our confirmation sheet pattern.
 */

import * as React from 'react'
import { Loader2, Trash2, TriangleAlert, X } from 'lucide-react'

type Variant = 'danger' | 'brand'

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
  /** Icon shown in the badge. Defaults to a trash glyph for danger. */
  icon?: React.ReactNode
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
  onConfirm: () => void
  onCancel: () => void
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
  reasonValue = '',
  onReasonChange,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, loading, onCancel])

  if (!open) return null

  const isDanger = variant === 'danger'
  const showReason = requireReason || optionalReason
  const disabled = loading || (requireReason && !reasonValue.trim())

  return (
    <div
      className="fixed inset-0 z-[150] flex items-end sm:items-center sm:justify-center animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Flat translucent backdrop — zero blur, zero shadow */}
      <button
        type="button"
        aria-label="Close"
        onClick={() => !loading && onCancel()}
        className="absolute inset-0 bg-gray-900/35"
      />

      {/* Flat sheet/card */}
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl border border-gray-200 animate-scale-in">
        {/* Mobile grab handle */}
        <div
          aria-hidden="true"
          className="sm:hidden mx-auto mt-3 h-1 w-10 rounded-full bg-gray-200"
        />

        <button
          type="button"
          onClick={() => !loading && onCancel()}
          aria-label="Close"
          className="absolute right-3.5 top-3.5 grid h-8 w-8 place-items-center rounded-full text-gray-400 transition-colors hover:bg-[#FAF6FB] hover:text-[#7B2D8E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2D8E]/30 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-5 pb-[max(1.35rem,env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:pb-6">
          <div className="flex items-start gap-3.5 pr-6">
            <span
              aria-hidden="true"
              className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl bg-[#FAF6FB] text-[#7B2D8E] border border-[#7B2D8E]/15"
            >
              {icon ??
                (isDanger ? (
                  <Trash2 className="h-5 w-5" />
                ) : (
                  <TriangleAlert className="h-5 w-5" />
                ))}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <h2 className="text-[16px] font-semibold text-gray-900 leading-snug text-pretty">
                {title}
              </h2>
              {description && (
                <div className="mt-1.5 text-[13.5px] leading-relaxed text-gray-500">
                  {description}
                </div>
              )}
            </div>
          </div>

          {showReason && (
            <label className="mt-4 block">
              <span className="text-xs font-semibold text-gray-700">
                {reasonLabel}
              </span>
              <textarea
                value={reasonValue}
                onChange={(e) => onReasonChange?.(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder={reasonPlaceholder}
                autoFocus
                className="mt-1.5 w-full resize-none rounded-xl border border-gray-200 bg-[#FBF9FC] px-3.5 py-2.5 text-base sm:text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:bg-white focus:border-[#7B2D8E]"
              />
            </label>
          )}

          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={onConfirm}
              disabled={disabled}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#7B2D8E] hover:bg-[#5A1D6A] px-5 py-3 text-[14px] font-semibold text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2D8E]/40 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {confirmLabel}
            </button>
            <button
              type="button"
              onClick={() => !loading && onCancel()}
              disabled={loading}
              className="w-full inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-5 py-3 text-[14px] font-semibold text-gray-700 transition-colors hover:bg-[#FAF6FB] hover:border-[#7B2D8E]/30 hover:text-[#5A1D6A] disabled:opacity-50 cursor-pointer"
            >
              {cancelLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
