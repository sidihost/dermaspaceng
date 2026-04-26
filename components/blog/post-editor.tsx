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

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Save,
  Send,
  Eye,
  PenSquare,
  Trash2,
  Star,
  Image as ImageIcon,
  Loader2,
  CalendarClock,
} from 'lucide-react'
import { markdownToHtml } from '@/lib/markdown'
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
  const [tab, setTab] = useState<'write' | 'preview'>('write')
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

  // Preview is computed from the raw markdown each render — render is
  // already cheap, no need to memoise on every keystroke.
  const previewHtml = useMemo(() => markdownToHtml(body), [body])

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
      {/* Header — shows post status and the four action buttons. We disable
          the buttons (rather than hide) when permission is missing so the
          author always knows the action exists, just isn't theirs. */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4">
        <div className="flex items-center gap-2">
          <PenSquare className="w-5 h-5 text-[#7B2D8E]" />
          <h1 className="text-lg font-semibold text-gray-900">
            {initialPost ? 'Edit post' : 'New post'}
          </h1>
          {initialPost && (
            <span
              className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                initialPost.status === 'published'
                  ? 'bg-green-100 text-green-800'
                  : initialPost.status === 'archived'
                    ? 'bg-gray-100 text-gray-700'
                    : initialPost.status === 'scheduled'
                      ? 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
                      : 'bg-amber-100 text-amber-800'
              }`}
            >
              {initialPost.status}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => save('draft')}
            disabled={pending || (!permissions.can_create && !initialPost) || (!permissions.can_edit && !!initialPost)}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save draft
          </button>
          <button
            type="button"
            onClick={() => save('scheduled')}
            disabled={pending || !permissions.can_publish}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-white border border-[#7B2D8E]/30 text-sm font-semibold text-[#7B2D8E] hover:bg-[#7B2D8E]/5 disabled:opacity-50"
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
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#7B2D8E] text-white text-sm font-semibold hover:bg-[#5A1D6A] disabled:opacity-50"
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
              className="inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-white border border-gray-200 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}
      {info && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800">
          {info}
        </div>
      )}

      {/* Two-column layout: editor on the left, sidebar on the right. On
          mobile the sidebar stacks below the editor — that's fine, the
          fields aren't time-critical and the editor needs the width. */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 space-y-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Post title"
            className="w-full text-2xl font-bold text-gray-900 placeholder:text-gray-300 bg-transparent border-0 outline-none px-0"
          />
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="Short excerpt — shown on the listing card and used as the SEO description fallback."
            rows={2}
            className="w-full text-sm text-gray-700 placeholder:text-gray-400 bg-transparent border-0 outline-none resize-none px-0"
          />

          <div className="flex items-center gap-1 border-b border-gray-200">
            {(['write', 'preview'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition ${
                  tab === t
                    ? 'border-[#7B2D8E] text-[#7B2D8E]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t === 'write' ? <PenSquare className="w-4 h-4 inline mr-1" /> : <Eye className="w-4 h-4 inline mr-1" />}
                {t === 'write' ? 'Write' : 'Preview'}
              </button>
            ))}
          </div>

          {tab === 'write' ? (
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={
                '## Heading\n\nWrite your post in Markdown. Use **bold**, *italic*, [links](https://example.com), bullet lists, and quotes.'
              }
              rows={20}
              className="w-full font-mono text-sm text-gray-800 placeholder:text-gray-400 bg-[#FAF8FC] border border-gray-200 rounded-lg p-3 outline-none focus:border-[#7B2D8E] focus:ring-2 focus:ring-[#7B2D8E]/10"
            />
          ) : (
            <div
              className="blog-prose"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: previewHtml || '<p class="text-gray-400">Nothing to preview yet.</p>' }}
            />
          )}
        </div>

        <aside className="space-y-4">
          {/* Cover image */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#7B2D8E]" />
              Cover image
            </h2>
            {cover ? (
              <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden bg-gray-100">
                <Image src={cover} alt={coverAlt || 'Cover preview'} fill className="object-cover" sizes="320px" />
              </div>
            ) : (
              <div className="aspect-[16/9] rounded-lg bg-gray-50 border border-dashed border-gray-200 grid place-items-center text-xs text-gray-400">
                No cover yet
              </div>
            )}
            <input
              value={cover}
              onChange={(e) => setCover(e.target.value)}
              placeholder="/covers/post.jpg or https://…"
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
