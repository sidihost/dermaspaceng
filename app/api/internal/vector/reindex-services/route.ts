// ---------------------------------------------------------------------------
// /api/internal/vector/reindex-services
//
// Admin-only endpoint. Re-walks `lib/services-catalog.ts` and upserts
// every category + treatment into Upstash Vector. Use this:
//
//   * Once, after first connecting Upstash Vector to the project, to
//     bootstrap the service entries.
//   * Whenever someone edits the catalog — drop a new price, rename a
//     treatment, retire a category — and we want the index to reflect
//     the change immediately rather than waiting for the next deploy.
//
// Auth
// ----
// Gated behind `requireAdmin()` so only signed-in admins can trigger
// reindexes. We don't accept a static token here — the catalog reindex
// is rare enough that interactive admin auth is fine.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { reindexServicesCatalog } from "@/lib/vector"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST() {
  // Throws → 401/403 page in middleware; we don't catch here so the
  // standard auth redirect flow kicks in.
  await requireAdmin()

  try {
    const summary = await reindexServicesCatalog()
    return NextResponse.json({
      ok: true,
      ...summary,
      message: `Indexed ${summary.categories} categories and ${summary.treatments} treatments.`,
    })
  } catch (err) {
    console.error("[vector] reindex-services failed:", err)
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : "Unknown error reindexing services.",
      },
      { status: 500 },
    )
  }
}
