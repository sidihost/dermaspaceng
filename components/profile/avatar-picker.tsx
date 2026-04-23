'use client'

import { useEffect, useState } from 'react'
import { Check, X as XIcon, Upload, Loader2, Sparkles } from 'lucide-react'
import { SPA_AVATARS, isSpaAvatarUrl } from '@/lib/spa-avatars'

interface AvatarPickerProps {
  open: boolean
  onClose: () => void
  // Current avatar URL (or null if the user is still showing initials).
  // We use this to mark the matching preset with a check mark and to
  // show the current selection inside the big preview tile.
  currentUrl: string | null
  // Fires when the user taps a preset tile. The parent is responsible
  // for persisting the change (so we don't have to know anything about
  // the auth/API flow here).
  onSelect: (url: string) => void | Promise<void>
  // Optional hook to keep the existing upload-from-device flow. When
  // provided, the picker renders an "Upload your own" tile as the
  // first grid item.
  onUploadClick?: () => void
  uploading?: boolean
  // Initials shown in the preview tile when no avatar is set yet —
  // keeps the modal useful for brand-new accounts that haven't even
  // seen their initials chip before.
  initials?: string
}

export function AvatarPicker({
  open,
  onClose,
  currentUrl,
  onSelect,
  onUploadClick,
  uploading = false,
  initials = '',
}: AvatarPickerProps) {
  // Track the locally selected preset so the tile shows an immediate
  // check mark before the network round-trip finishes. `saving` is
  // scoped per slug so mashing between tiles doesn't show a spinner
  // on a tile you're no longer looking at.
  const [savingSlug, setSavingSlug] = useState<string | null>(null)

  // Lock body scroll while the modal is open so the page behind the
  // sheet doesn't scroll when the user drags inside the grid on
  // mobile. Cleanup restores the previous overflow so other modals
  // (preferences, AI welcome, 2FA setup, etc.) keep working.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  // Escape-to-close — standard modal affordance. We attach this
  // regardless of open state but bail fast when closed so we don't
  // do work on every keystroke for a hidden modal.
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const handleSelect = async (url: string, slug: string) => {
    setSavingSlug(slug)
    try {
      await onSelect(url)
    } finally {
      setSavingSlug(null)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-2xl shadow-xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-5 sm:px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-[#7B2D8E]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 leading-tight">
                Choose your avatar
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 leading-snug">
                Pick a spa-inspired look or upload your own photo.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close avatar picker"
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 flex-shrink-0"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Preview strip — big current avatar with the name of the
            selected preset (or "Custom photo" for uploads). This
            gives the user a clear "before" reference while they
            scroll through the grid below. */}
        <div className="flex-shrink-0 px-5 sm:px-6 py-4 bg-gradient-to-b from-[#7B2D8E]/5 to-transparent border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-white shadow-sm flex-shrink-0 bg-[#7B2D8E] flex items-center justify-center">
              {currentUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentUrl}
                  alt="Current avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-lg sm:text-2xl font-semibold">
                  {initials || '?'}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-gray-500 font-medium">
                Currently showing
              </p>
              <p className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                {currentUrl
                  ? isSpaAvatarUrl(currentUrl)
                    ? SPA_AVATARS.find((a) => a.url === currentUrl)?.label ||
                      'Spa avatar'
                    : 'Custom photo'
                  : 'Your initials'}
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable picker grid */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3 px-1">
            Spa collection
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4">
            {onUploadClick && (
              <button
                type="button"
                onClick={onUploadClick}
                disabled={uploading}
                className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 hover:border-[#7B2D8E] hover:bg-[#7B2D8E]/5 transition-colors flex flex-col items-center justify-center gap-1.5 text-gray-500 hover:text-[#7B2D8E] disabled:opacity-60 disabled:cursor-not-allowed"
                aria-label="Upload your own photo"
              >
                {uploading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Upload className="w-6 h-6" />
                )}
                <span className="text-[11px] font-medium">
                  {uploading ? 'Uploading…' : 'Upload'}
                </span>
              </button>
            )}

            {SPA_AVATARS.map((avatar) => {
              const isSelected = currentUrl === avatar.url
              const isSaving = savingSlug === avatar.slug
              return (
                <button
                  key={avatar.slug}
                  type="button"
                  onClick={() => handleSelect(avatar.url, avatar.slug)}
                  disabled={isSaving}
                  className={`group relative aspect-square rounded-2xl overflow-hidden border-2 transition-all focus:outline-none focus:ring-2 focus:ring-[#7B2D8E] focus:ring-offset-2 ${
                    isSelected
                      ? 'border-[#7B2D8E] shadow-md scale-[1.02]'
                      : 'border-transparent hover:border-[#7B2D8E]/40 hover:shadow-sm'
                  }`}
                  style={{ backgroundColor: avatar.tint }}
                  aria-label={`Choose ${avatar.label} avatar`}
                  aria-pressed={isSelected}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatar.url}
                    alt=""
                    aria-hidden="true"
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                  {/* Selection indicator */}
                  {isSelected && !isSaving && (
                    <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-[#7B2D8E] text-white flex items-center justify-center shadow-md">
                      <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    </span>
                  )}
                  {isSaving && (
                    <span className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-[#7B2D8E] animate-spin" />
                    </span>
                  )}
                  {/* Label on hover */}
                  <span className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 to-transparent text-white text-[10px] sm:text-xs font-medium text-center py-1.5 pt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    {avatar.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 sm:px-6 py-3 border-t border-gray-100 flex items-center justify-between bg-white">
          <p className="text-[11px] sm:text-xs text-gray-500">
            Changes save instantly.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
