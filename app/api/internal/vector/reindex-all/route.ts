// ---------------------------------------------------------------------------
// /api/internal/vector/reindex-all
//
// Admin-only one-shot bootstrap. Reindexes EVERYTHING the Derma AI
// knowledge surface knows about into Upstash Vector:
//
//   1. Every category + treatment in `lib/services-catalog.ts`
//      (synchronous — these embed in well under a second).
//   2. Every currently-published blog post (asynchronous — we enqueue
//      one QStash message per post via `enqueueVectorReindex` so the
//      embedding work spreads out across QStash workers and we don't
//      block the admin's HTTP request on `n × bge-m3` round-trips).
//
// Why split the two
// -----------------
// Services live in code so we have them in-memory and can upsert in a
// single batch. Blog posts live in Postgres + may grow indefinitely,
// so we let QStash handle the throughput + retries; each post then
// flows through the exact same `/api/internal/vector/reindex-post`
// route a save would have triggered, which keeps the codepaths
// identical and means a row that fails one retry still gets picked
// up by the next.
//
// Idempotency
// -----------
// Vector entry ids are deterministic (`<type>:<sourceId>`), so calling
// this endpoint twice produces the same final index — no duplicates,
// no partial state. Safe to re-run after a failed first attempt.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { sql } from "@/lib/db"
import { reindexServicesCatalog } from "@/lib/vector"
import { enqueueVectorReindex } from "@/lib/qstash"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST() {
  await requireAdmin()

  try {
    const services = await reindexServicesCatalog()

    // Pull only the ids we care about — the reindex route looks the
    // full row up itself, so passing more here would just be wasted
    // bytes on the QStash payload.
    const rows = (await sql`
      SELECT id
      FROM blog_posts
      WHERE status = 'published'
        AND (published_at IS NULL OR published_at <= NOW())
      ORDER BY published_at DESC NULLS LAST
    `) as Array<{ id: string }>

    let enqueued = 0
    for (const row of rows) {
      // `enqueueVectorReindex` is fail-soft so a transient QStash hiccup
      // on one post won't abort the whole bootstrap. We still log a
      // count so the admin sees how many actually shipped.
      try {
        await enqueueVectorReindex({ op: "upsert", postId: row.id })
        enqueued += 1
      } catch (err) {
        console.warn("[vector] reindex-all enqueue failed for post", row.id, err)
      }
    }

    return NextResponse.json({
      ok: true,
      services,
      blog: {
        total: rows.length,
        enqueued,
      },
      message: `Reindexed ${services.categories} categories + ${services.treatments} treatments synchronously, and enqueued ${enqueued}/${rows.length} blog posts via QStash.`,
    })
  } catch (err) {
    console.error("[vector] reindex-all failed:", err)
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : "Unknown error during full reindex.",
      },
      { status: 500 },
    )
  }
}
