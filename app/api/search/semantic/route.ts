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
import { semanticSearch, type VectorEntryType, type VectorSearchHit } from "@/lib/vector"
import { SERVICES_CATALOG } from "@/lib/services-catalog"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// ---------------------------------------------------------------------------
// Literal-substring fallback over the in-memory services catalog.
//
// Why it exists
// -------------
// Upstash Vector is the primary search engine. But the index can be
// empty (fresh deploy, env vars not set, seed script not run), the
// service can be temporarily down, OR the user's query can land in a
// vector neighbourhood with no strong match — and in all three cases
// the UI was rendering "No matches yet" even when the literal query
// clearly maps to a treatment we offer ("Hair Removal", "Hydra
// Facial", "Wax").
//
// The fallback runs a very dumb but reliable scoring pass over the
// catalog: sum the number of query tokens that appear in
// {name, description, concerns, category} for each treatment, plus
// a bonus for treatments with a "popular" flag, and return the top
// matches above zero. It's intentionally narrow — semantic search
// still owns concern-style queries ("acne before my period"); this
// fallback owns name-style queries ("hydra", "wax", "facial").
//
// We always merge both result sets, dedupe by URL, and cap at
// `limit`. Vector hits sort first (they have real similarity
// scores) and literal hits fill in the tail.
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  'i', 'me', 'my', 'we', 'our', 'a', 'an', 'the', 'is', 'am', 'are',
  'was', 'were', 'be', 'been', 'do', 'does', 'did', 'have', 'has',
  'and', 'or', 'but', 'if', 'on', 'in', 'to', 'for', 'with', 'of',
  'at', 'by', 'from', 'as', 'so', 'too', 'very', 'just', 'not',
  'good', 'bad', 'feel', 'feeling', 'felt', 'help', 'helps', 'need',
  'want', 'looking', 'look', 'something', 'anything', 'some', 'any',
  'uhm', 'um', 'hmm', 'okay', 'ok', 'yes', 'no', 'please', 'thanks',
])

interface LiteralHit {
  kind: 'service' | 'service-category'
  title: string
  summary: string | null
  url: string
  score: number
  tags: string[]
  priceFromNumber: number | null
  duration: string | null
}

function literalCatalogSearch(rawQuery: string, limit: number): LiteralHit[] {
  const q = rawQuery.toLowerCase()
  // Tokenise on anything non-letter/digit so "I'm not feeling good"
  // becomes ["i", "m", "not", "feeling", "good"]; then strip stop
  // words so we score on actual content tokens.
  const tokens = q
    .split(/[^a-z0-9]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t))

  // If the user typed only stop-words ("I'm not feeling good") we
  // can't do a meaningful literal match — bail and let the vector
  // result (or empty state) speak for itself.
  if (tokens.length === 0) return []

  const hits: LiteralHit[] = []

  for (const category of SERVICES_CATALOG) {
    const catHaystack = [
      category.title,
      category.tagline,
      category.description,
      category.slug,
    ]
      .join(' ')
      .toLowerCase()

    let catScore = 0
    for (const t of tokens) if (catHaystack.includes(t)) catScore += 1

    if (catScore > 0) {
      hits.push({
        kind: 'service-category',
        title: category.title,
        summary: category.tagline,
        url: `/services/${category.slug}`,
        score: catScore,
        tags: [category.slug],
        priceFromNumber: null,
        duration: null,
      })
    }

    for (const t of category.treatments) {
      const tHaystack = [
        t.name,
        t.description,
        category.title,
        category.slug,
        ...(t.concerns ?? []),
      ]
        .join(' ')
        .toLowerCase()

      let tScore = 0
      for (const tok of tokens) if (tHaystack.includes(tok)) tScore += 1
      // Small bonus so popular treatments float to the top among
      // ties — same intent as the vector re-ranking elsewhere.
      if (tScore > 0 && t.popular) tScore += 0.25

      if (tScore > 0) {
        hits.push({
          kind: 'service',
          title: t.name,
          summary: t.description,
          url: `/services/${category.slug}#${t.id}`,
          score: tScore,
          tags: [category.slug, ...(t.concerns ?? [])],
          priceFromNumber: t.priceFrom,
          duration: t.duration,
        })
      }
    }
  }

  hits.sort((a, b) => b.score - a.score)
  return hits.slice(0, limit)
}

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
  const limit = parsed.limit ?? 8

  const hits = await semanticSearch({
    query: parsed.query,
    topK: limit,
    types,
  })

  // Whether the caller is OK with literal-catalog fallback. Always on
  // for the default kinds (we want users to find treatments by name);
  // we only suppress it when the caller explicitly asked for `blog`
  // or `faq` only — the literal pass doesn't know about those.
  const allowLiteralFallback =
    !types || types.includes('service') || types.includes('service-category')

  // Format helper, factored so vector + literal hits hit the same
  // shape on the wire. The UI doesn't care which engine produced a
  // hit.
  const naira = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
  const shapeVector = (h: VectorSearchHit) => ({
    kind: h.type,
    title: h.title,
    summary: h.summary ?? null,
    url: h.url,
    score: Math.round(h.score * 100) / 100,
    tags: h.tags ?? [],
    priceFrom: typeof h.priceFrom === 'number' ? naira.format(h.priceFrom) : null,
    duration: h.duration ?? null,
  })

  // 1. Vector results first — these are real semantic matches.
  const seenUrls = new Set<string>()
  const out: ReturnType<typeof shapeVector>[] = []
  for (const h of hits) {
    if (seenUrls.has(h.url)) continue
    seenUrls.add(h.url)
    out.push(shapeVector(h))
  }

  // 2. Literal-substring fallback — only kicks in when the vector
  //    returned nothing (or fewer than ~3 hits, in which case we
  //    still pad). Solves the "Vector index is empty / mis-seeded /
  //    down" failure mode that was leaving users on a "No matches"
  //    screen for queries we obviously cover.
  if (allowLiteralFallback && out.length < limit) {
    const literal = literalCatalogSearch(parsed.query, limit - out.length)
    for (const h of literal) {
      if (seenUrls.has(h.url)) continue
      seenUrls.add(h.url)
      out.push({
        kind: h.kind,
        title: h.title,
        summary: h.summary,
        url: h.url,
        // Stable score band below vector hits (which sit in 0…1).
        // Lets the client visually distinguish if it ever wants to
        // ("close match" vs "exact name match"), without relying
        // on us shipping a separate `source` field.
        score: Math.round((0.4 + Math.min(h.score, 4) * 0.05) * 100) / 100,
        tags: h.tags,
        priceFrom: h.priceFromNumber !== null ? naira.format(h.priceFromNumber) : null,
        duration: h.duration,
      })
    }
  }

  return NextResponse.json({ ok: true, results: out.slice(0, limit) })
}
