// ---------------------------------------------------------------------------
// /api/internal/vector/reindex-post
//
// Inbound QStash webhook. Fires whenever a blog post is created,
// updated, or deleted so the Upstash Vector index stays in sync with
// the canonical Postgres rows. The blog editor enqueues one of these
// messages on every save (see `lib/blog.ts → upsertPost`) — that
// keeps the reindex off the request path so authors aren't punished
// with extra latency just to keep search fresh.
//
// Payload shape
// -------------
//   { op: "upsert", postId: "<uuid>" }
//   { op: "delete", postId: "<uuid>" }
//
// The handler verifies the QStash signature so an attacker can't
// trigger arbitrary reindex work by guessing the URL — and it's
// idempotent: re-running the same op produces the same vector state.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server"
import { verifyQStash } from "@/lib/qstash"
import { sql } from "@/lib/db"
import { buildVectorId, deleteEntries, upsertEntries } from "@/lib/vector"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface ReindexPayload {
  op: "upsert" | "delete"
  postId: string
}

export async function POST(req: Request) {
  // Read raw body BEFORE parsing so signature verification works on
  // the exact bytes QStash signed.
  const raw = await req.text()
  const ok = await verifyQStash(req, raw)
  if (!ok) {
    return NextResponse.json({ error: "Invalid QStash signature" }, { status: 401 })
  }

  let payload: ReindexPayload
  try {
    payload = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 })
  }
  if (!payload.postId) {
    return NextResponse.json({ error: "Missing postId" }, { status: 400 })
  }

  if (payload.op === "delete") {
    await deleteEntries([buildVectorId("blog", payload.postId)])
    return NextResponse.json({ ok: true, op: "delete" })
  }

  // Default to upsert. Look up the row directly — we deliberately do
  // NOT use the cached blog helpers here so a write that just bumped
  // the row hits the freshest data on Postgres rather than a stale
  // Redis cache.
  const rows = (await sql`
    SELECT
      p.id,
      p.slug,
      p.title,
      p.excerpt,
      p.content_md,
      p.tags,
      p.status,
      p.published_at,
      c.name AS category_name,
      c.slug AS category_slug
    FROM blog_posts p
    LEFT JOIN blog_categories c ON c.id = p.category_id
    WHERE p.id = ${payload.postId}
    LIMIT 1
  `) as Array<{
    id: string
    slug: string
    title: string
    excerpt: string | null
    content_md: string
    tags: string[] | null
    status: string
    published_at: Date | null
    category_name: string | null
    category_slug: string | null
  }>

  const post = rows[0]
  if (!post) {
    // Row was deleted between enqueue and execution — clean up the
    // index entry too. Idempotent: if we never indexed it, this is a
    // cheap no-op.
    await deleteEntries([buildVectorId("blog", payload.postId)])
    return NextResponse.json({ ok: true, op: "auto-delete" })
  }

  // Only index posts that are actually visible to the public — drafts,
  // archived, or future-scheduled posts must NOT show up in semantic
  // search results. Yank them from the index defensively so an
  // unpublish/archive transition immediately removes the entry.
  const visible =
    post.status === "published" &&
    (!post.published_at || new Date(post.published_at).getTime() <= Date.now())

  if (!visible) {
    await deleteEntries([buildVectorId("blog", payload.postId)])
    return NextResponse.json({ ok: true, op: "hidden", status: post.status })
  }

  // Build the embedding text. We deliberately concatenate title +
  // category + tags + excerpt + a chunk of the body. The bge-m3 model
  // accepts up to ~8K tokens so we don't need fancy chunking yet —
  // just clip the body to a few thousand characters so the embedding
  // stays focused on the lede.
  const bodyExcerpt = post.content_md.replace(/\s+/g, " ").trim().slice(0, 4000)
  const tagText = post.tags && post.tags.length ? `Tags: ${post.tags.join(", ")}.` : ""
  const categoryText = post.category_name ? `Category: ${post.category_name}.` : ""
  const embedText = [
    post.title,
    post.excerpt ?? "",
    categoryText,
    tagText,
    bodyExcerpt,
  ]
    .filter(Boolean)
    .join("\n")

  await upsertEntries([
    {
      type: "blog",
      sourceId: post.id,
      title: post.title,
      summary: post.excerpt ?? undefined,
      url: `/blog/${post.slug}`,
      tags: [
        ...(post.tags ?? []),
        ...(post.category_slug ? [`category:${post.category_slug}`] : []),
      ],
      text: embedText,
    },
  ])

  return NextResponse.json({ ok: true, op: "upsert", slug: post.slug })
}
