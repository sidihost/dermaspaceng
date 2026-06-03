'use client'

import { useRef, useState, useCallback } from 'react'
import { Paperclip, X, FileText, Loader2 } from 'lucide-react'
import {
  type ReplyAttachment,
  ATTACHMENT_ACCEPT,
  MAX_ATTACHMENT_SIZE,
  MAX_ATTACHMENTS,
  isImageAttachment,
  formatFileSize,
} from '@/lib/attachments'

/**
 * File-attachment composer used by the support ticket & consultation reply
 * boxes on both the admin and customer dashboards.
 *
 * Uploads each file to Cloudflare R2 via /api/upload/attachment as soon as it
 * is selected, then keeps the returned URLs in `value`. The parent owns the
 * attachment array (controlled component) so it can send them with the reply
 * and clear them after a successful send.
 */
export function AttachmentComposer({
  value,
  onChange,
  folder = 'support',
  disabled = false,
}: {
  value: ReplyAttachment[]
  onChange: (next: ReplyAttachment[]) => void
  folder?: string
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return
      setError(null)

      const remaining = MAX_ATTACHMENTS - value.length
      if (remaining <= 0) {
        setError(`You can attach up to ${MAX_ATTACHMENTS} files.`)
        return
      }

      const files = Array.from(fileList).slice(0, remaining)

      for (const file of files) {
        if (file.size > MAX_ATTACHMENT_SIZE) {
          setError(`"${file.name}" is larger than 10 MB.`)
          continue
        }

        setUploading((n) => n + 1)
        try {
          const fd = new FormData()
          fd.append('file', file)
          fd.append('folder', folder)
          const res = await fetch('/api/upload/attachment', {
            method: 'POST',
            body: fd,
          })
          const data = await res.json()
          if (!res.ok || !data?.url) {
            throw new Error(data?.error || 'Upload failed')
          }
          onChange([
            ...value,
            {
              url: data.url,
              name: data.name || file.name,
              type: data.type || file.type,
              size: data.size || file.size,
            },
          ])
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Upload failed')
        } finally {
          setUploading((n) => Math.max(0, n - 1))
        }
      }
    },
    [value, onChange, folder]
  )

  const removeAt = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const canAddMore = value.length < MAX_ATTACHMENTS

  return (
    <div className="flex flex-col gap-2">
      {/* Preview chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((a, i) => (
            <div
              key={`${a.url}-${i}`}
              className="group relative flex items-center gap-2 rounded-xl border border-gray-200 bg-white py-1.5 pl-1.5 pr-2"
            >
              {isImageAttachment(a.type) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.url || '/placeholder.svg'}
                  alt={a.name}
                  className="h-8 w-8 rounded-lg object-cover"
                />
              ) : (
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E]">
                  <FileText className="h-4 w-4" />
                </span>
              )}
              <span className="flex max-w-[140px] flex-col">
                <span className="truncate text-xs font-medium text-gray-800">
                  {a.name}
                </span>
                {a.size > 0 && (
                  <span className="text-[10px] text-gray-400">
                    {formatFileSize(a.size)}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => removeAt(i)}
                disabled={disabled}
                aria-label={`Remove ${a.name}`}
                className="grid h-5 w-5 place-items-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-500"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept={ATTACHMENT_ACCEPT}
          multiple
          className="hidden"
          disabled={disabled || !canAddMore}
          onChange={(e) => {
            handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || !canAddMore || uploading > 0}
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:border-[#7B2D8E]/30 hover:text-[#7B2D8E] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading > 0 ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Uploading…
            </>
          ) : (
            <>
              <Paperclip className="h-3.5 w-3.5" />
              Attach files
            </>
          )}
        </button>
        <span className="text-[11px] text-gray-400">
          Images or PDF · up to 10 MB
        </span>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
