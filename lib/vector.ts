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
// Status / health
// ---------------------------------------------------------------------------
//
// `info()` is cheap on Upstash Vector and returns the total vector
// count, dimension, and similarity function. We surface it both for
// the admin "vector health" panel and for the auto-bootstrap logic
// in `semanticSearch` — if the index has zero vectors AND the
// caller asked for services/categories, we kick off a one-shot
// `reindexServicesCatalog()` so the very first query of the deploy
// fills the catalog instead of returning empty.

export interface VectorIndexStatus {
  configured: boolean
  vectorCount: number | null
  dimension: number | null
  similarityFunction: string | null
  error?: string
}

export async function getVectorStatus(): Promise<VectorIndexStatus> {
  const url = process.env.UPSTASH_VECTOR_REST_URL
  const token = process.env.UPSTASH_VECTOR_REST_TOKEN
  if (!url || !token) {
    return {
      configured: false,
      vectorCount: null,
      dimension: null,
      similarityFunction: null,
      error: "UPSTASH_VECTOR_REST_URL / UPSTASH_VECTOR_REST_TOKEN not set",
    }
  }
  try {
    const idx = getVectorIndex()
    // The Upstash JS client returns this shape from `info()`. We
    // cast loosely because the precise field names vary between
    // SDK versions; we only need the count for our purposes.
    const info = (await idx.info()) as {
      vectorCount?: number
      dimension?: number
      similarityFunction?: string
    }
    return {
      configured: true,
      vectorCount: info.vectorCount ?? 0,
      dimension: info.dimension ?? null,
      similarityFunction: info.similarityFunction ?? null,
    }
  } catch (err) {
    return {
      configured: true,
      vectorCount: null,
      dimension: null,
      similarityFunction: null,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

// ---------------------------------------------------------------------------
// Auto-bootstrap state
// ---------------------------------------------------------------------------
//
// In-memory flag that ensures we only attempt one services-catalog
// auto-seed per server process, even if many concurrent search
// requests all observe an empty index simultaneously. Resets on
// cold-start, which is the right behaviour: a freshly redeployed
// container should be allowed to re-confirm.
//
// We deliberately do NOT persist this across instances — a stale
// "we already seeded" flag in Redis would block legitimate seeds
// after an index reset. The cost of the rare double-seed is one
// idempotent upsert.
let _autoSeedAttempted = false
export function _resetAutoSeedForTests() {
  _autoSeedAttempted = false
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

  let idx: Index
  try {
    idx = getVectorIndex()
  } catch (err) {
    // Env vars missing — fail soft so the literal-substring fallback
    // in the route handler can still serve the user.
    console.warn(`[vector] semanticSearch: index not configured —`, err)
    return []
  }

  const filter =
    types && types.length > 0
      // Upstash filter DSL: `type IN ("service","blog")`.
      ? `type IN (${types.map((t) => `"${t}"`).join(",")})`
      : undefined

  let results: Awaited<ReturnType<Index["query"]>>
  try {
    results = await idx.query({
      data: trimmed,
      topK,
      includeMetadata,
      filter,
    })
  } catch (err) {
    // Common causes (logged so we can see them in the v0 console):
    //   * Index has no embedding model configured — `data:` requires
    //     a model on the index (e.g. BAAI/bge-m3). The error message
    //     from Upstash will say "no embedding model".
    //   * Token doesn't have query permission.
    //   * Filter syntax mismatch with index.
    console.warn(`[vector] semanticSearch query failed (${types?.join(",") ?? "all"}):`, err)
    return []
  }

  const hits = (results ?? []).flatMap((r) => {
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

  // -------------------------------------------------------------------
  // Auto-bootstrap the services catalog.
  //
  // First-run failure mode the user reported: env vars configured,
  // but searching "wax" / "facial" returned nothing because nobody
  // had ever called `/api/internal/vector/reindex-services`. The
  // catalog is a static, in-code fixture — there's no good reason
  // a query should ever return empty for it.
  //
  // So: if THIS query asked about services/categories and we got
  // zero hits AND we haven't yet attempted a seed in this process,
  // fire-and-forget a `reindexServicesCatalog()` in the background.
  // The current request still returns whatever it has (the route
  // handler will fall through to the literal-catalog fallback), but
  // the very next query lands on a populated index.
  // -------------------------------------------------------------------
  const askedAboutServices =
    !types ||
    types.includes("service") ||
    types.includes("service-category")
  if (
    hits.length === 0 &&
    askedAboutServices &&
    !_autoSeedAttempted &&
    process.env.VECTOR_AUTO_SEED !== "0"
  ) {
    _autoSeedAttempted = true
    // Don't await — the user shouldn't pay for a 30-entry batch
    // upsert on every cold-start search.
    reindexServicesCatalog()
      .then((s) =>
        console.info(
          `[vector] auto-seeded services catalog: ${s.categories} categories + ${s.treatments} treatments`,
        ),
      )
      .catch((err) => {
        // Reset so a transient failure doesn't permanently disable
        // auto-seed for this process — next empty query gets to try
        // again.
        _autoSeedAttempted = false
        console.warn("[vector] auto-seed failed:", err)
      })
  }

  return hits
}

// ---------------------------------------------------------------------------
// Services catalog → vector entries
// ---------------------------------------------------------------------------
// We index the services catalog as TWO entry types:
//
//   * `service-category`  → one entry per top-level category page
//                           ("Facial Treatments", "Body Treatments", …).
//                           Embedding text is the category title +
//                           tagline + description so a query like
//                           "I want to relax my back" lands on
//                           "Body Treatments".
//
//   * `service`           → one entry per individual treatment
//                           ("Hydra Facial", "Brazilian Wax", …) inside
//                           a category. Embedding text concatenates
//                           the treatment name + duration + price + the
//                           category context + the curated `concerns`
//                           array, so a query like "what helps with
//                           melasma?" lands on Chemical Peel /
//                           Vitamin C Facial / Microneedling rather
//                           than on the Facial Treatments category page.
//
// We deliberately don't dedupe across categories — the same id would
// only ever clash if two categories declared the same `treatment.id`,
// which the catalog file structure makes impossible.
// ---------------------------------------------------------------------------

import { SERVICES_CATALOG, formatNaira } from "@/lib/services-catalog"

export async function reindexServicesCatalog(): Promise<{
  categories: number
  treatments: number
}> {
  const entries: UpsertVectorEntry[] = []

  for (const category of SERVICES_CATALOG) {
    // -- Category-level entry ---------------------------------------------
    entries.push({
      type: "service-category",
      sourceId: category.slug,
      title: category.title,
      summary: category.tagline,
      url: `/services/${category.slug}`,
      tags: [category.slug],
      // Roll up every treatment inside the category so a vague query
      // ("something for my hands") still surfaces the category page,
      // and a specific query ("a facial that won't break me out")
      // bumps the matching treatment up alongside.
      text: [
        category.title,
        category.tagline,
        category.description,
        `Treatments in this category: ${category.treatments
          .map((t) => t.name)
          .join(", ")}.`,
      ].join("\n"),
    })

    // -- Treatment-level entries ------------------------------------------
    for (const treatment of category.treatments) {
      const concernText =
        treatment.concerns && treatment.concerns.length > 0
          ? `Helps with: ${treatment.concerns.join(", ")}.`
          : ""
      entries.push({
        type: "service",
        // Compose the source id from the slug + treatment id so each
        // entry is globally unique even if two categories ever ship a
        // treatment with the same kebab id.
        sourceId: `${category.slug}/${treatment.id}`,
        title: treatment.name,
        summary: treatment.description,
        // The service detail page uses an in-page anchor for the
        // specific treatment card; deep-link straight to it so the
        // user lands on the row they were looking at.
        url: `/services/${category.slug}#${treatment.id}`,
        tags: [
          category.slug,
          ...(treatment.concerns ?? []),
          ...(treatment.popular ? ["popular"] : []),
        ],
        priceFrom: treatment.priceFrom,
        duration: treatment.duration,
        text: [
          `${treatment.name} (${category.title})`,
          treatment.description,
          `Duration: ${treatment.duration}.`,
          `Starts at ${formatNaira(treatment.priceFrom)}.`,
          concernText,
        ]
          .filter(Boolean)
          .join("\n"),
      })
    }
  }

  // One round-trip — Upstash chunks internally and bge-m3 embeds in
  // batches, so even ~50 entries finishes in well under a second.
  await upsertEntries(entries)

  return {
    categories: SERVICES_CATALOG.length,
    treatments: entries.length - SERVICES_CATALOG.length,
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
