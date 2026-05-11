'use client'

// ---------------------------------------------------------------------------
// components/blog/post-editor.tsx
//
// One editor used by both /admin/blog and /staff/blog. The parent server
// component preloads the existing post (if any) plus categories and the
// caller's permissions, so this component focuses purely on:
//
//   * Letting the author edit title, excerpt, body (Markdown), cover, and
//     SEO fields.
//   * Showing a live HTML preview rendered by the same lib/markdown.ts the
//     server uses, so what the author sees IS what readers will get.
//   * Saving as draft, publishing, archiving — disabled buttons when the
//     user lacks the relevant permission.
// ---------------------------------------------------------------------------

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Save,
  Send,
  PenSquare,
  Trash2,
  Star,
  Image as ImageIcon,
  Loader2,
  CalendarClock,
  Upload,
  X,
} from 'lucide-react'
import { WysiwygEditor } from '@/components/blog/wysiwyg-editor'
import type { BlogCategory, BlogPermissions, BlogPost, PostStatus } from '@/lib/blog'

interface Props {
  initialPost?: BlogPost | null
  categories: BlogCategory[]
  permissions: BlogPermissions
  // Where to send the user after saving — admin and staff sections live at
  // different paths, so the parent injects the right return URL.
  returnPath: string
}

/**
 * Convert a Date to the value format expected by `<input type="datetime-local">`
 * — i.e. "YYYY-MM-DDTHH:mm" in the browser's local timezone. We do this
 * by hand instead of `toISOString` because ISO strings are UTC.
 */
function toLocalDatetime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function PostEditor({ initialPost, categories, permissions, returnPath }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const [title, setTitle] = useState(initialPost?.title ?? '')
  const [excerpt, setExcerpt] = useState(initialPost?.excerpt ?? '')
  const [body, setBody] = useState(initialPost?.content_md ?? '')
  const [cover, setCover] = useState(initialPost?.cover_image_url ?? '')
  const [coverAlt, setCoverAlt] = useState(initialPost?.cover_image_alt ?? '')
  const [categoryId, setCategoryId] = useState(initialPost?.category_id ?? '')
  const [featured, setFeatured] = useState(Boolean(initialPost?.featured))
  const [seoTitle, setSeoTitle] = useState(initialPost?.seo_title ?? '')
  const [seoDescription, setSeoDescription] = useState(initialPost?.seo_description ?? '')
  const [seoKeywords, setSeoKeywords] = useState((initialPost?.seo_keywords ?? []).join(', '))

  // Scheduled publish — stored as a datetime-local string ("YYYY-MM-DDTHH:mm")
  // because that's what the native <input type="datetime-local"> emits and
  // expects. We translate to a real Date on submit. Pre-fills with the
  // existing scheduled time so editors can see / change it.
  const initialScheduled =
    initialPost?.status === 'scheduled' && initialPost.published_at
      ? toLocalDatetime(new Date(initialPost.published_at))
      : ''
  const [scheduledFor, setScheduledFor] = useState(initialScheduled)

  // Cover image upload — admins kept asking how to set the cover when
  // they don't already have a public URL on hand. We now hand them a
  // proper "Upload" button that POSTs to /api/upload/r2 (the same
  // endpoint the WYSIWYG body editor uses for inline images), then
  // drops the returned R2 URL into the cover field. We hold the file
  // input in a ref so the user clicks the styled button instead of the
  // browser's default <input type="file"> chrome.
  const coverFileRef = useRef<HTMLInputElement>(null)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [coverError, setCoverError] = useState<string | null>(null)

  const onCoverFile = async (file: File | null) => {
    if (!file) return
    setCoverError(null)
    // Hard cap mirrors the server's 10MB ceiling — fail fast so the
    // author isn't waiting on a 6-second upload only to get a 400.
    if (file.size > 10 * 1024 * 1024) {
      setCoverError('Image is over 10MB — please use a smaller file.')
      return
    }
    setUploadingCover(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', 'blog')
      const res = await fetch('/api/upload/r2', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.url) {
        setCoverError(data?.error || 'Upload failed. Please try again.')
        return
      }
      setCover(data.url as string)
      // If the author didn't supply alt text and the file has a
      // recognisable name, seed a sensible default. They can still
      // edit it inline.
      if (!coverAlt && file.name) {
        const base = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim()
        if (base) setCoverAlt(base)
      }
    } catch (err) {
      setCoverError('Network error — please try again.')
    } finally {
      setUploadingCover(false)
      // Reset the file input so picking the same file twice still fires onChange.
      if (coverFileRef.current) coverFileRef.current.value = ''
    }
  }

  // The WYSIWYG editor renders formatting effects live, so we no longer
  // need a separate "preview" tab — what you see while typing IS the
  // rendered post. The Preview tab is kept for backwards compatibility
  // with admins used to the old layout, but it now just mirrors the
  // editor surface (TipTap renders to the same HTML the public renderer
  // would emit from the stored Markdown).

  const save = (status: PostStatus) => {
    setError(null)
    setInfo(null)

    if (!title.trim()) return setError('Add a title before saving.')
    if (!body.trim()) return setError('The post body can\'t be empty.')

    // Scheduling guardrails — make the client check explicit so the
    // editor sees a friendly inline error instead of a 400 from the API.
    if (status === 'scheduled') {
      if (!scheduledFor) return setError('Pick a date & time to schedule this post.')
      const when = new Date(scheduledFor)
      if (Number.isNaN(when.getTime())) return setError('That schedule date isn\'t valid.')
      if (when.getTime() < Date.now() + 60 * 1000) {
        return setError('Pick a time at least a minute in the future.')
      }
    }

    const payload = {
      id: initialPost?.id,
      title: title.trim(),
      excerpt: excerpt.trim() || null,
      content_md: body,
      cover_image_url: cover.trim() || null,
      cover_image_alt: coverAlt.trim() || null,
      category_id: categoryId || null,
      status,
      // Only forwarded when relevant — the API treats it as ignored
      // metadata for any other status anyway.
      scheduled_for: status === 'scheduled' ? new Date(scheduledFor).toISOString() : null,
      featured,
      seo_title: seoTitle.trim() || null,
      seo_description: seoDescription.trim() || null,
      seo_keywords: seoKeywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean),
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/blog/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error ?? 'Save failed')
          return
        }
        if (data.demoted) {
          setInfo('Saved as draft — you don\'t have permission to publish.')
        } else if (status === 'published') {
          setInfo('Published successfully.')
        } else {
          setInfo('Draft saved.')
        }
        // Push the user back to the list so they see their post in context.
        setTimeout(() => router.push(returnPath), 700)
      } catch {
        setError('Network error — please try again.')
      }
    })
  }

  const remove = () => {
    if (!initialPost?.id) return
    if (!confirm('Delete this post? This cannot be undone.')) return
    startTransition(async () => {
      const res = await fetch(`/api/blog/posts/${initialPost.id}`, { method: 'DELETE' })
      if (res.ok) router.push(returnPath)
      else setError('Could not delete the post.')
    })
  }

  return (
    <div className="space-y-4">
      {/* Header — shows post status and the four action buttons.
          The previous layout used `flex-wrap items-center` which on
          phones stacked the four buttons in one wrapped row that
          ran off-screen. We now stack the title row above a
          horizontal-scrollable action row on mobile, and keep the
          single-row layout for ≥sm. Disabled (rather than hidden)
          when permission is missing so the author always knows the
          action exists, just isn't theirs. */}
      <div className="border-b border-gray-200 pb-3 sm:pb-4 space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <PenSquare className="w-5 h-5 text-[#7B2D8E] flex-shrink-0" />
          <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
            {initialPost ? 'Edit post' : 'New post'}
          </h1>
          {initialPost && (
            <span
              className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full flex-shrink-0 ${
                initialPost.status === 'published'
                  ? 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
                  : initialPost.status === 'archived'
                    ? 'bg-gray-100 text-gray-700'
                    : initialPost.status === 'scheduled'
                      ? 'bg-[#7B2D8E]/20 text-[#7B2D8E]'
                      : 'bg-[#7B2D8E]/5 text-[#7B2D8E]'
              }`}
            >
              {initialPost.status}
            </span>
          )}
        </div>

        {/* Horizontal scrolling on phones (-mx-4 gutters cancel out the
            page padding so the row can swipe edge-to-edge) and
            normal flex layout on tablet+. The Publish button stays
            primary; everything else compresses to icon+label that
            won't wrap. */}
        <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto sm:overflow-visible">
          <div className="flex items-center gap-2 w-max sm:w-auto">
            <button
              type="button"
              onClick={() => save('draft')}
              disabled={pending || (!permissions.can_create && !initialPost) || (!permissions.can_edit && !!initialPost)}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white border border-gray-200 text-[13px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap"
            >
              {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save draft
            </button>
            <button
              type="button"
              onClick={() => save('scheduled')}
              disabled={pending || !permissions.can_publish}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white border border-[#7B2D8E]/30 text-[13px] font-semibold text-[#7B2D8E] hover:bg-[#7B2D8E]/5 disabled:opacity-50 whitespace-nowrap"
              title={
                !permissions.can_publish
                  ? 'You need publish permission to schedule a post'
                  : 'Schedule this post to publish automatically (powered by Upstash QStash)'
              }
            >
              <CalendarClock className="w-4 h-4" />
              Schedule
            </button>
            <button
              type="button"
              onClick={() => save('published')}
              disabled={pending || !permissions.can_publish}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#7B2D8E] text-white text-[13px] font-semibold hover:bg-[#5A1D6A] disabled:opacity-50 whitespace-nowrap"
              title={!permissions.can_publish ? 'You don\'t have permission to publish' : undefined}
            >
              <Send className="w-4 h-4" />
              Publish
            </button>
            {initialPost && (
              <button
                type="button"
                onClick={remove}
                disabled={pending || !permissions.can_delete}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white border border-gray-200 text-[13px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 whitespace-nowrap"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}
      {info && (
        <div className="rounded-lg bg-[#7B2D8E]/10 border border-[#7B2D8E]/20 px-3 py-2 text-sm text-[#7B2D8E]">
          {info}
        </div>
      )}

      {/* Two-column layout: editor on the left, sidebar on the right. On
          mobile the sidebar stacks below the editor — that's fine, the
          fields aren't time-critical and the editor needs the width.
          We widened the editor column substantially (sidebar shrinks
          from 320px → 280px, and only kicks in at xl: instead of lg:)
          so the WYSIWYG canvas gets the room admins kept asking for
          to actually see the text they're editing. */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-4 xl:gap-5">
        {/* Mobile: the editor card is bled past the layout's p-4
            gutters with `-mx-4` and the corner radius / vertical
            borders are dropped so the writing surface reads as a
            full-width canvas (this was the "narrow editor" complaint
            from authors — the doubled-up page+card padding was eating
            ~28px on either side of a 360px phone, which made the
            toolbar look stranded). On sm+ we restore the rounded
            card so the desktop two-column layout still feels framed.
            Internal padding stays generous (px-4 mobile, p-5/p-6
            tablet+) so the title and body never touch the edge. */}
        <div className="bg-white -mx-4 sm:mx-0 sm:rounded-2xl border-y sm:border border-gray-200 px-4 py-4 sm:p-5 lg:p-6 space-y-3 sm:space-y-4 min-w-0">
          {/* Title is a textarea (not <input>) so long headlines wrap
              onto a second line instead of clipping off the right edge
              of the viewport — that was the "Introducing Derma AI: M…"
              issue from the screenshots. The auto-resize ref grows the
              field as the author types so the row count never has to
              be guessed. We still treat Enter as a submit boundary by
              not allowing newlines in the stored title. */}
          <textarea
            ref={(el) => {
              if (!el) return
              el.style.height = 'auto'
              el.style.height = `${el.scrollHeight}px`
            }}
            value={title}
            onChange={(e) => {
              // Strip newlines — titles are a single semantic line
              // even when they wrap visually.
              const next = e.target.value.replace(/\n/g, '')
              setTitle(next)
              const ta = e.currentTarget
              ta.style.height = 'auto'
              ta.style.height = `${ta.scrollHeight}px`
            }}
            placeholder="Post title"
            rows={1}
            className="w-full text-2xl sm:text-3xl font-bold text-gray-900 placeholder:text-gray-300 bg-transparent border-0 outline-none px-0 resize-none leading-tight overflow-hidden"
          />
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="Short excerpt — shown on the listing card and used as the SEO description fallback."
            rows={2}
            className="w-full text-base text-gray-700 placeholder:text-gray-400 bg-transparent border-0 outline-none resize-none px-0 leading-relaxed"
          />

          {/* Real WYSIWYG editor — admins now see formatting effects live
              (rendered headings, bold, lists, links, images) instead of
              the raw markdown source. We still persist the document as
              Markdown so lib/markdown.ts and existing posts keep working
              unchanged. */}
          <WysiwygEditor
            value={body}
            onChange={setBody}
            placeholder="Start writing… select text and use the toolbar above for formatting."
          />
        </div>

        <aside className="space-y-4">
          {/* Cover image — supports two ways of setting the cover:
              upload a file (the easy path, runs through R2 like the
              inline editor images), or paste an existing URL. The
              preview reflects whichever value the input currently
              holds, so an author can preview a paste before saving. */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#7B2D8E]" />
              Cover image
            </h2>
            {cover ? (
              <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden bg-gray-100 group">
                <Image src={cover} alt={coverAlt || 'Cover preview'} fill className="object-cover" sizes="320px" />
                <button
                  type="button"
                  onClick={() => setCover('')}
                  className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[10.5px] font-semibold text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/70 group-hover:opacity-100 focus:opacity-100"
                  aria-label="Remove cover image"
                >
                  <X className="w-3 h-3" />
                  Remove
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => coverFileRef.current?.click()}
                disabled={uploadingCover}
                className="aspect-[16/9] w-full rounded-lg bg-[#7B2D8E]/[0.04] border border-dashed border-[#7B2D8E]/30 grid place-items-center text-xs text-[#7B2D8E] hover:bg-[#7B2D8E]/[0.08] hover:border-[#7B2D8E]/50 transition-colors disabled:opacity-60"
              >
                {uploadingCover ? (
                  <span className="flex items-center gap-1.5 font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Uploading…
                  </span>
                ) : (
                  <span className="flex flex-col items-center gap-1 font-medium">
                    <Upload className="w-4 h-4" />
                    Click to upload cover
                  </span>
                )}
              </button>
            )}

            {/* Hidden native file input — driven by the upload button
                above and the "Replace" button below the preview. */}
            <input
              ref={coverFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
              className="sr-only"
              onChange={(e) => onCoverFile(e.target.files?.[0] ?? null)}
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => coverFileRef.current?.click()}
                disabled={uploadingCover}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[#7B2D8E] text-white text-[12.5px] font-semibold hover:bg-[#5A1D6A] disabled:opacity-50"
              >
                {uploadingCover ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                {cover ? 'Replace' : 'Upload'}
              </button>
              <span className="text-[11px] text-gray-500">
                JPG · PNG · WebP, up to 10MB
              </span>
            </div>

            {coverError ? (
              <p className="text-[11px] font-medium text-red-600">
                {coverError}
              </p>
            ) : null}

            <input
              value={cover}
              onChange={(e) => setCover(e.target.value)}
              placeholder="…or paste an image URL"
              className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-[#7B2D8E]"
            />
            <input
              value={coverAlt}
              onChange={(e) => setCoverAlt(e.target.value)}
              placeholder="Alt text (for screen readers and SEO)"
              className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-[#7B2D8E]"
            />
          </div>

          {/* Category + featured */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Category</h2>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full h-9 rounded-lg border border-gray-200 px-2 text-sm outline-none focus:border-[#7B2D8E]"
            >
              <option value="">Uncategorised</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-gray-700 select-none">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="rounded border-gray-300 text-[#7B2D8E] focus:ring-[#7B2D8E]"
              />
              <Star className="w-4 h-4 text-[#7B2D8E]" />
              Feature on /blog
            </label>
          </div>

          {/* Schedule — picks the moment QStash will fire to flip this post
              from 'scheduled' to 'published'. Only meaningful when the
              author hits the "Schedule" action button above; we still keep
              it visible (and disabled when no publish permission) so
              authors discover the feature. */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-[#7B2D8E]" />
              Schedule
            </h2>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              disabled={!permissions.can_publish}
              className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-[#7B2D8E] disabled:bg-gray-50 disabled:text-gray-400"
            />
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Picks the exact time the post auto-publishes. Powered by Upstash
              QStash — survives redeploys and runs even if Vercel cron is down.
            </p>
          </div>

          {/* SEO */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">SEO</h2>
            <input
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              placeholder="SEO title (defaults to post title)"
              className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-[#7B2D8E]"
            />
            <textarea
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              placeholder="Meta description (~155 chars)"
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#7B2D8E] resize-none"
            />
            <input
              value={seoKeywords}
              onChange={(e) => setSeoKeywords(e.target.value)}
              placeholder="comma, separated, keywords"
              className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-[#7B2D8E]"
            />
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Keywords help us target Lagos / Nigeria spa searches. Suggested:
              "spa lagos", "best spa nigeria", "ai skincare lagos".
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
