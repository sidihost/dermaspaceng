// ---------------------------------------------------------------------------
// /api/internal/vector/status
//
// Admin-only health probe for Upstash Vector. Returns the live row
// count, dimension, and similarity function as reported by the index.
// Pair with /api/internal/vector/reindex-all to bootstrap an empty
// index in one round-trip.
//
// Why this matters
// ----------------
// The single biggest failure mode of "semantic search returns nothing"
// is "the index has zero vectors" — i.e. the catalog reindex was
// never run after the env vars were connected. This endpoint makes
// that condition observable in two seconds without dropping into the
// Upstash console.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getVectorStatus } from "@/lib/vector"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  await requireAdmin()
  const status = await getVectorStatus()
  return NextResponse.json({ ok: true, ...status })
}
