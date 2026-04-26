// ---------------------------------------------------------------------------
// /api/blog/posts
//
// Authoring surface for blog posts. Used by both the admin (/admin/blog)
// and staff (/staff/blog) editors. The browser POSTs JSON; the server is
// the only place we trust to enforce role + per-staff permissions.
//
//   POST  /api/blog/posts          create OR update (id optional)
//
// Permissions:
//   * admin           — full access
//   * staff with row  — bounded by their blog_permissions flags
//   * everyone else   — 403
// ---------------------------------------------------------------------------

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { rateLimit } from '@/lib/redis'
import {
  getBlogPermissions,
  getPostById,
  upsertPost,
  slugify,
  type PostStatus,
} from '@/lib/blog'

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  if (user.role !== 'admin' && user.role !== 'staff') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Per-user write rate limit (Upstash Redis). 30 saves / minute is plenty
  // for a real human typing in the editor — anything beyond that is most
  // likely a runaway autosave loop or someone scripting against us.
  const rl = await rateLimit('blog:write', user.id, 30, 60)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many save attempts. Please wait a minute and try again.' },
      { status: 429 },
    )
  }

  const perms = await getBlogPermissions(user)
  const body = (await req.json()) as Record<string, unknown>

  // Field-by-field validation. We don't trust any of the strings until
  // we've proved title/content are present and the status is known.
  const id = typeof body.id === 'string' && body.id.length > 0 ? body.id : undefined
  const title = (typeof body.title === 'string' ? body.title : '').trim()
  const content_md = (typeof body.content_md === 'string' ? body.content_md : '').trim()
  const requestedStatus = (typeof body.status === 'string' ? body.status : 'draft') as PostStatus
  // 'scheduled' is the new fourth status — guarded the same way as
  // 'published' below (needs can_publish, otherwise it silently demotes
  // to a draft so a staff member without permission never accidentally
  // publishes via the future-dated path either).
  const status: PostStatus = ['draft', 'scheduled', 'published', 'archived'].includes(requestedStatus)
    ? requestedStatus
    : 'draft'

  // Optional ISO-8601 timestamp. Only meaningful when status === 'scheduled'.
  const scheduled_for =
    typeof body.scheduled_for === 'string' && body.scheduled_for ? body.scheduled_for : null

  if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  if (!content_md) return NextResponse.json({ error: 'Content is required' }, { status: 400 })

  // Permission gate per action.
  if (id) {
    if (!perms.can_edit) {
      return NextResponse.json({ error: 'You don\'t have permission to edit posts' }, { status: 403 })
    }
    // Staff can only edit their own posts unless they're an admin.
    if (user.role === 'staff') {
      const existing = await getPostById(id)
      if (!existing) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
      if (existing.author_id && existing.author_id !== user.id) {
        return NextResponse.json({ error: 'You can only edit your own posts' }, { status: 403 })
      }
    }
  } else if (!perms.can_create) {
    return NextResponse.json({ error: 'You don\'t have permission to create posts' }, { status: 403 })
  }

  // Block staff from publishing without the publish flag — they can save
  // drafts but the status drops back to "draft" silently if they try.
  // 'scheduled' is treated as a deferred publish, so it needs the same
  // permission and falls back to draft when missing.
  let effectiveStatus: PostStatus = status
  if ((status === 'published' || status === 'scheduled') && !perms.can_publish) {
    effectiveStatus = 'draft'
  }

  // Validate the future timestamp on the server too — never trust the
  // client to enforce its own UI guardrails.
  if (effectiveStatus === 'scheduled') {
    if (!scheduled_for) {
      return NextResponse.json({ error: 'A scheduled time is required' }, { status: 400 })
    }
    const when = new Date(scheduled_for)
    if (Number.isNaN(when.getTime()) || when.getTime() < Date.now()) {
      return NextResponse.json({ error: 'Schedule time must be in the future' }, { status: 400 })
    }
  }

  // Slug — accept user-provided when they tweak it in the SEO box,
  // otherwise derive from the title.
  const rawSlug = typeof body.slug === 'string' && body.slug.trim() ? body.slug : title
  const slug = slugify(rawSlug)

  const post = await upsertPost(user, {
    id,
    slug,
    title,
    excerpt: typeof body.excerpt === 'string' ? body.excerpt : null,
    content_md,
    cover_image_url: typeof body.cover_image_url === 'string' ? body.cover_image_url : null,
    cover_image_alt: typeof body.cover_image_alt === 'string' ? body.cover_image_alt : null,
    category_id: typeof body.category_id === 'string' && body.category_id ? body.category_id : null,
    status: effectiveStatus,
    scheduled_for: effectiveStatus === 'scheduled' ? scheduled_for : null,
    featured: Boolean(body.featured),
    seo_title: typeof body.seo_title === 'string' ? body.seo_title : null,
    seo_description: typeof body.seo_description === 'string' ? body.seo_description : null,
    seo_keywords: Array.isArray(body.seo_keywords) ? (body.seo_keywords as string[]) : null,
    tags: Array.isArray(body.tags) ? (body.tags as string[]) : null,
  })

  // The editor uses `demoted` to show "Saved as draft — you don't have
  // permission to publish." We trip it for both 'published' and the new
  // deferred-publish 'scheduled' so the messaging is identical.
  const demoted =
    (status === 'published' || status === 'scheduled') && effectiveStatus !== status
  return NextResponse.json({ ok: true, post, demoted })
}
