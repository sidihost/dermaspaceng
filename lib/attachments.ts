/**
 * Shared file-attachment helpers for support tickets & consultations.
 *
 * Files are uploaded to Cloudflare R2 (via /api/upload/r2) BEFORE a reply is
 * sent; the resulting public URLs are stored as a small JSONB array on the
 * reply/message row. This keeps the conversation payload light and lets both
 * the admin and customer surfaces render the same attachment chips.
 */

export type ReplyAttachment = {
  url: string
  name: string
  type: string
  size: number
}

/** Files we accept on the support / consultation composers. */
export const ATTACHMENT_ACCEPT =
  'image/png,image/jpeg,image/jpg,image/webp,image/gif,application/pdf'

/** Max size per file (10 MB) and max files per reply. */
export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024
export const MAX_ATTACHMENTS = 6

/**
 * Normalise an untrusted `attachments` payload from the client into a safe,
 * bounded array. Anything malformed is dropped.
 */
export function sanitizeReplyAttachments(input: unknown): ReplyAttachment[] {
  if (!Array.isArray(input)) return []
  const out: ReplyAttachment[] = []
  for (const item of input) {
    if (!item || typeof item !== 'object') continue
    const a = item as Record<string, unknown>
    const url = typeof a.url === 'string' ? a.url.trim() : ''
    if (!url || !/^https?:\/\//i.test(url)) continue
    out.push({
      url,
      name: typeof a.name === 'string' ? a.name.slice(0, 200) : 'attachment',
      type:
        typeof a.type === 'string'
          ? a.type.slice(0, 100)
          : 'application/octet-stream',
      size:
        typeof a.size === 'number' && Number.isFinite(a.size) ? a.size : 0,
    })
    if (out.length >= MAX_ATTACHMENTS) break
  }
  return out
}

/** True when the mime type is a previewable image. */
export function isImageAttachment(type: string | undefined | null): boolean {
  return typeof type === 'string' && type.startsWith('image/')
}

/** Human-readable file size, e.g. "1.2 MB". */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const value = bytes / Math.pow(1024, i)
  return `${value >= 10 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`
}
