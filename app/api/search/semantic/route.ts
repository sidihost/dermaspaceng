// ---------------------------------------------------------------------------
// /api/search/semantic
//
// Public semantic-search endpoint backed by Upstash Vector + the bge-m3
// embedding model. It's the runtime twin of `recommendByConcern` (the
// Derma AI tool) — same vector index, same scoring, just exposed as a
// plain JSON API so non-chat surfaces can use it too:
//
//   * The "treatments you might like" rail on /dashboard.
//   * A search bar on /services and the treatment detail pages.
//   * Future SDKs / partner integrations.
//
// We deliberately keep this OPEN (no auth) — the catalog and blog are
// already indexed in plain HTML on the public site, so exposing the
// vector ranking is no incremental data leak. We DO rate-limit
// implicitly via Upstash Vector's own quota.
//
// Request:
//   { "query": "I get spots before my period", "kinds": ["service","blog"], "limit": 6 }
//
// Response:
//   { results: [{ kind, title, summary, url, score, priceFrom, duration, tags }, ...] }
//
// Fail-soft: any vector outage returns `{ results: [] }` with status 200
// so client UIs can simply render "no matches" rather than handle a 5xx.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server"
import { z } from "zod"
import { semanticSearch, type VectorEntryType } from "@/lib/vector"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Generous-but-bounded input validation. We hard-cap `limit` at 12 so a
// crawler can't ask Upstash for 1000 results per request.
const Body = z.object({
  query: z.string().trim().min(2).max(300),
  kinds: z
    .array(z.enum(["service", "service-category", "blog", "faq"]))
    .optional(),
  limit: z.number().int().min(1).max(12).optional(),
})

export async function POST(req: Request) {
  let parsed: z.infer<typeof Body>
  try {
    const json = await req.json()
    parsed = Body.parse(json)
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof z.ZodError ? err.flatten() : "Invalid JSON body.",
      },
      { status: 400 },
    )
  }

  const types: VectorEntryType[] | undefined =
    parsed.kinds && parsed.kinds.length > 0 ? parsed.kinds : undefined

  const hits = await semanticSearch({
    query: parsed.query,
    topK: parsed.limit ?? 8,
    types,
  })

  // Shape the response for direct consumption by the UI — round the
  // score so we don't bleed full-precision floats into JSX, and format
  // the price the same way the rest of the site does (whole Naira).
  const results = hits.map((h) => ({
    kind: h.type,
    title: h.title,
    summary: h.summary ?? null,
    url: h.url,
    score: Math.round(h.score * 100) / 100,
    tags: h.tags ?? [],
    priceFrom:
      typeof h.priceFrom === "number"
        ? new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(h.priceFrom)
        : null,
    duration: h.duration ?? null,
  }))

  return NextResponse.json({ ok: true, results })
}
