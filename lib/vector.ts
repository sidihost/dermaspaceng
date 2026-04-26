// ---------------------------------------------------------------------------
// lib/vector.ts
//
// Upstash Vector — semantic search engine that powers the entire
// Dermaspace knowledge surface:
//
//   • Services & treatments lookup    → "what helps with melasma?"
//   • Blog post recommendations       → "more like this" beyond category
//   • Derma AI knowledge retrieval    → grounded answers with citations
//   • Future: FAQ matching, voucher
//     intent matching, internal staff
//     handbook search.
//
// Why Upstash Vector
// ------------------
// The DermaAI index was created with the BAAI/bge-m3 hosted embedding
// model — meaning we send raw TEXT to Upstash and the embedding happens
// on their side. That's a huge architectural win: we don't ship vectors
// over the wire, don't manage tokenisation, and don't pay OpenAI for
// embeddings. The model is also multilingual + 8K-token, so it copes
// well with the mix of English / Pidgin / Yoruba phrasing real Lagos
// users actually type ("wahala with my skin", "abeg book me a facial").
//
// Index layout
// ------------
// All entries live in ONE index, partitioned by a `type` field on the
// metadata so we can filter at query time. We use deterministic ids
// of the form `<type>:<sourceId>` so re-upserts replace cleanly.
//
//   service:hydra-facial            → a single treatment
//   service-category:facial         → a category page
//   blog:my-skincare-routine        → a published blog post
//   faq:opening-hours               → curated FAQ entry (future)
//
// Every helper here is **fail-soft**: vector outages must never break a
// real user request. Search returns an empty array, upserts are
// swallowed and logged, and we leave it to QStash retries to recover.
// ---------------------------------------------------------------------------

import { Index } from "@upstash/vector"

let _index: Index | null = null

export function getVectorIndex(): Index {
  if (_index) return _index
  const url = process.env.UPSTASH_VECTOR_REST_URL
  const token = process.env.UPSTASH_VECTOR_REST_TOKEN
  if (!url || !token) {
    throw new Error(
      "[vector] UPSTASH_VECTOR_REST_URL / UPSTASH_VECTOR_REST_TOKEN are not set. " +
        "Add them in Project → Settings → Environment Variables.",
    )
  }
  // We use the default namespace — single tenant for now. Switch to
  // namespaces when we add staff-only handbook content that must not
  // leak into public Derma AI answers.
  _index = new Index({ url, token })
  return _index
}

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export type VectorEntryType =
  | "service"
  | "service-category"
  | "blog"
  | "faq"

export interface VectorMetadata {
  type: VectorEntryType
  /** Source-table id or slug. Used to dedupe and to point users back
   *  at the canonical page (`url`). */
  sourceId: string
  /** Human-readable title — what we surface in search-result chips
   *  and in Derma AI citations. */
  title: string
  /** Optional 1-line summary. Shown under the title in result lists. */
  summary?: string
  /** Canonical URL on dermaspaceng.com. Always relative (e.g.
   *  "/services/facial-treatments") so we can swap domains in dev /
   *  staging without re-indexing. */
  url: string
  /** Free-form tags (category, body area, concern, skin type). Used
   *  for analytics and for client-side re-ranking. */
  tags?: string[]
  /** Optional starting price in NGN — shows up directly under
   *  treatment search results. */
  priceFrom?: number | null
  /** Optional duration string ("60 mins"). */
  duration?: string | null
}

export interface VectorSearchHit extends VectorMetadata {
  /** 0…1 similarity score. We threshold around 0.55 in the UI for
   *  "strong" matches but always return the raw score so callers can
   *  tune their own cutoffs. */
  score: number
}

// Build the deterministic id we use everywhere. Keeping it stable
// means re-running the seed script never duplicates entries — Upstash
// upserts replace by id.
export function buildVectorId(type: VectorEntryType, sourceId: string): string {
  return `${type}:${sourceId}`
}

// ---------------------------------------------------------------------------
// Upsert
// ---------------------------------------------------------------------------

export interface UpsertVectorEntry extends VectorMetadata {
  /** Raw text to embed. The bge-m3 model handles up to 8K tokens, but
   *  we still keep this short — typically a concatenation of
   *  title + summary + body intro + tags so the semantic neighbourhood
   *  reflects the page, not the marketing fluff. */
  text: string
}

export async function upsertEntries(entries: UpsertVectorEntry[]): Promise<void> {
  if (entries.length === 0) return
  try {
    const idx = getVectorIndex()
    // Upstash supports passing `data: <string>` instead of a vector and
    // it'll embed server-side using the index's configured model
    // (bge-m3 in our case). One round-trip, no embedding bills.
    await idx.upsert(
      entries.map((e) => ({
        id: buildVectorId(e.type, e.sourceId),
        data: e.text,
        metadata: stripUndefined({
          type: e.type,
          sourceId: e.sourceId,
          title: e.title,
          summary: e.summary,
          url: e.url,
          tags: e.tags,
          priceFrom: e.priceFrom,
          duration: e.duration,
        }) as unknown as Record<string, string | number | boolean | string[]>,
      })),
    )
  } catch (err) {
    console.warn(`[vector] upsertEntries(${entries.length}) failed:`, err)
  }
}

export async function deleteEntries(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  try {
    const idx = getVectorIndex()
    await idx.delete(ids)
  } catch (err) {
    console.warn(`[vector] deleteEntries(${ids.length}) failed:`, err)
  }
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

export interface QueryOptions {
  /** Free-text search query. We forward it to Upstash via the `data`
   *  field so the same bge-m3 model is used for query embedding —
   *  guaranteeing the query and the indexed entries live in the same
   *  vector space. */
  query: string
  /** Cap on results. Defaults to 8; we tend to over-fetch and let the
   *  caller filter / re-rank by type. */
  topK?: number
  /** Optional `type` filter ("service", "blog", etc.) — pushes the
   *  narrowing down to Upstash so we don't pull blog posts only to
   *  throw them away in JS. */
  types?: VectorEntryType[]
  /** Whether to include metadata in the response. Almost always yes;
   *  it's how we recover the source URL + title. */
  includeMetadata?: boolean
}

export async function semanticSearch(opts: QueryOptions): Promise<VectorSearchHit[]> {
  const { query, topK = 8, types, includeMetadata = true } = opts
  const trimmed = query.trim()
  if (trimmed.length === 0) return []

  try {
    const idx = getVectorIndex()
    const filter =
      types && types.length > 0
        // Upstash filter DSL: `type IN ("service","blog")`.
        ? `type IN (${types.map((t) => `"${t}"`).join(",")})`
        : undefined

    const results = await idx.query({
      data: trimmed,
      topK,
      includeMetadata,
      filter,
    })

    return (results ?? []).flatMap((r) => {
      const meta = (r.metadata ?? {}) as Partial<VectorMetadata>
      // Defensive: if for some reason metadata is missing (e.g. an
      // old entry indexed without metadata), skip the row rather
      // than yield a half-formed hit to the UI.
      if (!meta.type || !meta.sourceId || !meta.title || !meta.url) return []
      return [
        {
          score: r.score ?? 0,
          type: meta.type,
          sourceId: meta.sourceId,
          title: meta.title,
          summary: meta.summary,
          url: meta.url,
          tags: meta.tags,
          priceFrom: meta.priceFrom ?? null,
          duration: meta.duration ?? null,
        },
      ]
    })
  } catch (err) {
    console.warn(`[vector] semanticSearch failed:`, err)
    return []
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Upstash's metadata accepts strings/numbers/bools/arrays but rejects
// `undefined`. Strip them out before sending to keep the payload clean.
function stripUndefined<T extends Record<string, unknown>>(o: T): Partial<T> {
  const out: Partial<T> = {}
  for (const k of Object.keys(o) as (keyof T)[]) {
    if (o[k] !== undefined) out[k] = o[k]
  }
  return out
}
