// ---------------------------------------------------------------------------
// /api/blog/publish-scheduled
//
// Inbound webhook from Upstash QStash. Fires at the timestamp the author
// picked when they set a post's status to 'scheduled'. Verifies the QStash
// signature so the URL can be public without anyone being able to
// hand-trigger a publish, then flips the post atomically and invalidates
// every blog cache family (handled inside markScheduledAsPublished).
//
// Idempotency
// -----------
// `markScheduledAsPublished` only updates rows whose status is still
// 'scheduled'. If QStash retries the message (e.g. a 5xx during delivery)
// or if an admin manually published in the meantime, the second call is
// a no-op rather than a duplicate publish.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server"
import { verifyQStash } from "@/lib/qstash"
import { markScheduledAsPublished } from "@/lib/blog"

// Force the Node.js runtime — `@upstash/qstash`'s `Receiver.verify` uses
// Node's crypto for HMAC, which the edge runtime doesn't expose.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  // We must read the raw body BEFORE parsing so the signature check
  // works against the exact bytes QStash signed.
  const rawBody = await request.text()

  const ok = await verifyQStash(request, rawBody)
  if (!ok) {
    return NextResponse.json(
      { error: "Invalid QStash signature" },
      { status: 401 },
    )
  }

  let payload: { postId?: string; slug?: string }
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 })
  }

  if (!payload.postId) {
    return NextResponse.json({ error: "Missing postId" }, { status: 400 })
  }

  const post = await markScheduledAsPublished(payload.postId)
  if (!post) {
    // Either the post was deleted, manually published, or moved back to
    // draft. Return 200 so QStash doesn't retry.
    return NextResponse.json({ ok: true, noop: true })
  }

  return NextResponse.json({ ok: true, slug: post.slug })
}
