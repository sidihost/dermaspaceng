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

  const perms = await getBlogPermissions(user)
  const body = (await req.json()) as Record<string, unknown>

  // Field-by-field validation. We don't trust any of the strings until
  // we've proved title/content are present and the status is known.
  const id = typeof body.id === 'string' && body.id.length > 0 ? body.id : undefined
  const title = (typeof body.title === 'string' ? body.title : '').trim()
  const content_md = (typeof body.content_md === 'string' ? body.content_md : '').trim()
  const requestedStatus = (typeof body.status === 'string' ? body.status : 'draft') as PostStatus
  const status: PostStatus = ['draft', 'published', 'archived'].includes(requestedStatus)
    ? requestedStatus
    : 'draft'

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
  let effectiveStatus: PostStatus = status
  if (status === 'published' && !perms.can_publish) {
    effectiveStatus = 'draft'
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
    featured: Boolean(body.featured),
    seo_title: typeof body.seo_title === 'string' ? body.seo_title : null,
    seo_description: typeof body.seo_description === 'string' ? body.seo_description : null,
    seo_keywords: Array.isArray(body.seo_keywords) ? (body.seo_keywords as string[]) : null,
    tags: Array.isArray(body.tags) ? (body.tags as string[]) : null,
  })

  return NextResponse.json({ ok: true, post, demoted: status === 'published' && effectiveStatus !== 'published' })
}
