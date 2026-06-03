'use client'

import { FileText, Download } from 'lucide-react'
import {
  type ReplyAttachment,
  isImageAttachment,
  formatFileSize,
} from '@/lib/attachments'

/**
 * Renders attachments inside a conversation bubble (read-only).
 * Images show as a tappable thumbnail grid; other files (PDFs) show as a
 * compact download row. Used on both the admin and customer surfaces.
 *
 * `tone` controls contrast: 'light' for light/white bubbles, 'dark' for the
 * filled purple "your reply" bubbles on the customer side.
 */
export function AttachmentList({
  attachments,
  tone = 'light',
}: {
  attachments: ReplyAttachment[] | null | undefined
  tone?: 'light' | 'dark'
}) {
  if (!attachments || attachments.length === 0) return null

  const images = attachments.filter((a) => isImageAttachment(a.type))
  const files = attachments.filter((a) => !isImageAttachment(a.type))

  const fileChip =
    tone === 'dark'
      ? 'border-white/25 bg-white/10 text-white hover:bg-white/20'
      : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
  const fileIcon = tone === 'dark' ? 'text-white' : 'text-[#7B2D8E]'
  const fileMeta = tone === 'dark' ? 'text-white/70' : 'text-gray-400'

  return (
    <div className="mt-2 flex flex-col gap-2">
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {images.map((a, i) => (
            <a
              key={`${a.url}-${i}`}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative block overflow-hidden rounded-xl border border-black/5 bg-black/5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.url || '/placeholder.svg'}
                alt={a.name || 'attachment'}
                className="h-24 w-full object-cover transition-transform duration-200 group-hover:scale-105"
                loading="lazy"
              />
            </a>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {files.map((a, i) => (
            <a
              key={`${a.url}-${i}`}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${fileChip}`}
            >
              <FileText className={`h-4 w-4 flex-shrink-0 ${fileIcon}`} />
              <span className="min-w-0 flex-1 truncate">{a.name || 'Attachment'}</span>
              {a.size > 0 && (
                <span className={`flex-shrink-0 ${fileMeta}`}>
                  {formatFileSize(a.size)}
                </span>
              )}
              <Download className={`h-3.5 w-3.5 flex-shrink-0 ${fileIcon}`} />
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
