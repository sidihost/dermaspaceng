'use client'

/**
 * <ImageUploadField>
 *
 * A self-contained, dual-mode image input for the admin surface.
 * One field that the admin can either:
 *
 *   • drop / pick an image into  -> uploads to /api/upload/r2 and
 *     fills the URL automatically, or
 *   • paste a public URL into directly (e.g. an existing CDN
 *     asset, a Vercel Blob URL the admin already has, or any
 *     externally hosted image).
 *
 * Both flows produce the same plain-string URL via the
 * `onChange(url)` contract, so callers don't need to care which
 * path the admin took. This means we can drop it into any place
 * we previously had a "https://… image URL" input without changing
 * how the URL is persisted on the server.
 *
 * Visual treatment matches the rest of the admin surface:
 *   - flat white card with a hairline border (no shadow, no
 *     gradient),
 *   - brand purple #7B2D8E for the active / focus state,
 *   - 4:3 preview thumbnail when a value exists,
 *   - dropzone shows a soft brand tint while a file is dragging,
 *   - inline error states (oversize / wrong type / upload failure)
 *     so the admin can recover without losing context.
 *
 * The component is intentionally headless about the surrounding
 * form layout — callers wrap it in their existing <Field> /
 * <label> structure.
 */

import { useCallback, useId, useRef, useState } from 'react'
import { Upload, Loader2, X, Link2, ImageIcon, AlertCircle } from 'lucide-react'

interface ImageUploadFieldProps {
  /** Current image URL ('' / null when empty). */
  value: string | null | undefined
  /** Fires with the new URL whenever the admin uploads or pastes. */
  onChange: (url: string) => void
  /**
   * R2 folder prefix — keeps uploaded assets organised by feature
   * area (e.g. 'services', 'broadcasts', 'banners'). Defaults to
   * 'admin' so we don't crowd the bucket root.
   */
  folder?: string
  /** Placeholder for the URL input. */
  placeholder?: string
  /**
   * Restrict the visible preview aspect ratio. Defaults to 4:3
   * which matches our category / hero cards. Pass 'square' for
   * avatar-style fields.
   */
  aspect?: '4/3' | '16/9' | 'square'
  /** Disable both flows (e.g. while saving the parent form). */
  disabled?: boolean
}

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
])
const MAX_SIZE_BYTES = 8 * 1024 * 1024 // 8 MB — server allows 10, we
                                       // refuse a little earlier so the
                                       // admin gets a friendly client-
                                       // side error instead of waiting
                                       // for a 400.

export function ImageUploadField({
  value,
  onChange,
  folder = 'admin',
  placeholder = 'https://… or upload below',
  aspect = '4/3',
  disabled,
}: ImageUploadFieldProps) {
  const inputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasValue = !!value && value.trim() !== ''

  const aspectClass =
    aspect === 'square'
      ? 'aspect-square'
      : aspect === '16/9'
        ? 'aspect-video'
        : 'aspect-[4/3]'

  const handleFile = useCallback(
    async (file: File) => {
      setError(null)

      if (!ALLOWED_TYPES.has(file.type)) {
        setError('Use a JPEG, PNG, GIF, WebP, or SVG image.')
        return
      }
      if (file.size > MAX_SIZE_BYTES) {
        setError('That image is over 8 MB — try a smaller file.')
        return
      }

      setUploading(true)
      try {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('folder', folder)
        const res = await fetch('/api/upload/r2', { method: 'POST', body: fd })
        const data = (await res.json().catch(() => null)) as
          | { success?: boolean; url?: string; error?: string }
          | null
        if (!res.ok || !data?.url) {
          setError(data?.error || 'Upload failed. Try again.')
          return
        }
        onChange(data.url)
      } catch {
        setError('Upload failed. Check your connection and try again.')
      } finally {
        setUploading(false)
      }
    },
    [folder, onChange],
  )

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragOver(false)
      if (disabled || uploading) return
      const file = e.dataTransfer.files?.[0]
      if (file) void handleFile(file)
    },
    [disabled, uploading, handleFile],
  )

  return (
    <div className="space-y-2">
      {/* Preview / dropzone — clicking either opens the file
          picker, dragging an image highlights the brand-tinted
          drop state. When a value exists we show a thumbnail
          with a remove-X overlay so the admin can clear it
          without first emptying the URL field by hand. */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled && !uploading) setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => {
          if (disabled || uploading) return
          fileInputRef.current?.click()
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled && !uploading) {
            e.preventDefault()
            fileInputRef.current?.click()
          }
        }}
        className={[
          'relative w-full overflow-hidden rounded-xl border transition-colors cursor-pointer select-none',
          aspectClass,
          dragOver
            ? 'border-[#7B2D8E] bg-[#7B2D8E]/[0.06]'
            : hasValue
              ? 'border-gray-200 bg-gray-50'
              : 'border-dashed border-gray-300 hover:border-[#7B2D8E]/40 hover:bg-[#7B2D8E]/[0.03]',
          (disabled || uploading) && 'cursor-wait opacity-80',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {hasValue ? (
          // Existing image preview. We use a plain <img> instead of
          // next/image because the URL can be on R2, an external CDN,
          // or even a data URL — next/image's allow-list would reject
          // anything we haven't pre-registered.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value!}
            alt="Selected image preview"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-center px-4">
            {uploading ? (
              <>
                <Loader2 className="h-5 w-5 text-[#7B2D8E] animate-spin" />
                <p className="text-xs text-gray-600">Uploading…</p>
              </>
            ) : (
              <>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E]">
                  <Upload className="h-4 w-4" />
                </span>
                <p className="text-xs font-medium text-gray-700">
                  Click to upload or drag an image here
                </p>
                <p className="text-[11px] text-gray-500">
                  PNG, JPG, GIF, WebP, or SVG · up to 8 MB
                </p>
              </>
            )}
          </div>
        )}

        {/* Upload-in-progress overlay shown over the existing
            preview, so the admin sees instant feedback when they
            replace an existing image. */}
        {hasValue && uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <Loader2 className="h-5 w-5 text-[#7B2D8E] animate-spin" />
          </div>
        )}

        {/* Remove-button overlay — only for non-empty state.
            stopPropagation so clicking it doesn't also re-open
            the file picker. */}
        {hasValue && !uploading && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onChange('')
              setError(null)
            }}
            className="absolute top-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-gray-700 hover:bg-white hover:text-[#7B2D8E] border border-gray-200"
            aria-label="Remove image"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Hidden native file input — we drive it from the dropzone
          click handler so the visible UI stays large + custom. */}
      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept={Array.from(ALLOWED_TYPES).join(',')}
        className="hidden"
        disabled={disabled || uploading}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
          // Reset so the same file can be re-picked after a remove.
          e.target.value = ''
        }}
      />

      {/* URL input — paste path. Kept as a sibling so admins who
          already have a hosted asset don't need to download it
          just to re-upload. */}
      <div className="relative">
        <Link2 className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
        <input
          type="url"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled || uploading}
          className="w-full h-9 pl-8 pr-3 text-sm rounded-lg border border-gray-200 bg-white focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none disabled:bg-gray-50"
        />
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-[11.5px] text-[#7B2D8E]">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}

      {/* Tiny helper line so admins know the two flows produce the
          same outcome — pasting a URL works just as well. */}
      {!hasValue && !error && (
        <p className="flex items-center gap-1.5 text-[11px] text-gray-500">
          <ImageIcon className="h-3 w-3" />
          Either upload a file or paste a public image URL.
        </p>
      )}
    </div>
  )
}
