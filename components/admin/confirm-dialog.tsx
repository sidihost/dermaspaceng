'use client'

/**
 * ConfirmDialog — the shared "action card" the admin sees before a
 * destructive (or otherwise irreversible) action runs.
 *
 * Why this exists
 * ---------------
 * Destructive admin actions used to fire on a raw `window.confirm()`
 * (jarring, off-brand, un-styleable) or bespoke per-page bottom
 * sheets (drifting visual language). This component unifies them into
 * one calm, on-brand card so "are you sure?" always looks and behaves
 * the same wherever it appears — support tickets, consultations,
 * bookings, anywhere.
 *
 * Design language
 * ---------------
 *   • Centered modal on desktop, bottom sheet on mobile (the native
 *     pattern this codebase already leans on).
 *   • White card, hairline border, brand-purple accent. The
 *     destructive variant swaps the icon badge + confirm button to a
 *     restrained rose so "delete" reads instantly without dragging a
 *     loud red across the whole card.
 *   • A soft backdrop blur instead of a heavy drop-shadow — the brand
 *     rules ask us to avoid shadows, and no Sparkles / Zap glyphs are
 *     used anywhere.
 *   • Optional reason field: when `requireReason` is set the confirm
 *     button stays disabled until the admin types something, so the
 *     activity-log entry always has context to audit.
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
  /** 'danger' = rose accent (delete/remove), 'brand' = purple accent. */
  variant?: Variant
  /** Icon shown in the badge. Defaults to a trash glyph for danger. */
  icon?: React.ReactNode
  /** When true, shows a textarea and blocks confirm until it's filled. */
  requireReason?: boolean
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
  variant = 'danger',
  icon,
  requireReason = false,
  reasonLabel = 'Reason',
  reasonPlaceholder,
  reasonValue = '',
  onReasonChange,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Close on Escape — matches the native dialog affordance admins
  // expect. Guarded by `loading` so a mid-flight request can't be
  // abandoned by a stray keypress.
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
  const badge = isDanger
    ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-100'
    : 'bg-[#7B2D8E]/10 text-[#7B2D8E] ring-1 ring-[#7B2D8E]/15'
  const confirmBtn = isDanger
    ? 'bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-300'
    : 'bg-[#7B2D8E] hover:bg-[#5A1D6A] focus-visible:ring-[#7B2D8E]/40'

  const disabled = loading || (requireReason && !reasonValue.trim())

  return (
    <div
      className="fixed inset-0 z-[150] flex items-end sm:items-center sm:justify-center animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop — soft blur, no heavy shadow on the card itself. */}
      <button
        type="button"
        aria-label="Close"
        onClick={() => !loading && onCancel()}
        className="absolute inset-0 bg-gray-900/30 backdrop-blur-[2px]"
      />

      {/* Card */}
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
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2D8E]/30"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-5 pb-5 pt-6 sm:px-6 sm:pb-6">
          <div className="flex items-start gap-3.5">
            <span
              aria-hidden="true"
              className={`grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl ${badge}`}
            >
              {icon ?? (isDanger ? <Trash2 className="h-5 w-5" /> : <TriangleAlert className="h-5 w-5" />)}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <h2 className="text-base font-semibold text-gray-900 text-pretty">
                {title}
              </h2>
              {description && (
                <div className="mt-1 text-sm leading-relaxed text-gray-500">
                  {description}
                </div>
              )}
            </div>
          </div>

          {requireReason && (
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
                className="mt-1.5 w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-[#7B2D8E] focus:ring-2 focus:ring-[#7B2D8E]/15"
              />
            </label>
          )}

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => !loading && onCancel()}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 sm:py-2"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={disabled}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 sm:py-2 ${confirmBtn}`}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
