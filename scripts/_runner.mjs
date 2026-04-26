// ---------------------------------------------------------------------------
// Database migration runner — invoked from `pnpm build` on Vercel.
// ---------------------------------------------------------------------------
// What this does
//   1. Connects to DATABASE_URL using the same Neon driver the app uses.
//   2. Ensures a `_migrations(filename, applied_at)` tracking table.
//   3. On the FIRST run against an existing database (tracking table
//      empty but `scripts/*.sql` already populated), it BOOTSTRAPS by
//      marking every existing file as applied WITHOUT executing it.
//      This is the only sane thing to do — those scripts have already
//      been applied to prod manually, and re-running them would risk
//      double-inserts in any non-idempotent seed file.
//   4. On every subsequent run, it executes any new SQL file in
//      lexicographic order (each one inside its own transaction so
//      a partial failure rolls back cleanly) and records it.
//
// What this DOES NOT do
//   - It will not run on a local `pnpm build` unless you set
//     RUN_MIGRATIONS=true. The `VERCEL` env var only exists on
//     Vercel build hosts, so localhost stays inert.
//   - It will not run on Vercel preview deploys by default. Preview
//     branches usually share the prod DB on this project, and
//     accidentally migrating prod from a feature branch is exactly
//     the failure mode we want to prevent. Override with
//     RUN_MIGRATIONS=true on a specific preview if you need to.
//   - It will not silently swallow a migration failure. A failed
//     migration aborts the build, which means the broken code is
//     never deployed against the un-migrated schema.
//
// One-time bootstrap responsibility for *this* deploy
//   ── If 213-per-event-reminders.sql has NOT been applied to prod
//      yet, run it manually via the v0 SQL panel BEFORE merging.
//      Otherwise the bootstrap step here will mark it as applied
//      without running it, and the per-event reminder code paths
//      will silently no-op (they're fail-soft, so nothing breaks
//      visibly — you just won't get reminders).
// ---------------------------------------------------------------------------

import { Pool } from '@neondatabase/serverless'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url))

function shouldRun() {
  // Explicit override always wins — useful for one-off `vercel env
  // pull && RUN_MIGRATIONS=true pnpm build` reproductions.
  if (process.env.RUN_MIGRATIONS === 'true') return true
  // Skip on local builds. `VERCEL=1` is set on every Vercel build.
  if (!process.env.VERCEL) return false
  // On Vercel, run only against production. VERCEL_ENV is one of
  // 'production' | 'preview' | 'development'.
  return process.env.VERCEL_ENV === 'production'
}

async function main() {
  if (!shouldRun()) {
    const reason = !process.env.VERCEL
      ? 'local build'
      : `VERCEL_ENV=${process.env.VERCEL_ENV ?? 'unset'}`
    console.log(
      `[migrations] skipping (${reason}) — set RUN_MIGRATIONS=true to force`,
    )
    return
  }

  const url = process.env.DATABASE_URL
  if (!url) {
    // Don't block a build over a missing env var. If DATABASE_URL is
    // genuinely missing, the app itself will fail at runtime with a
    // clearer error than anything we'd produce here.
    console.warn('[migrations] no DATABASE_URL — skipping')
    return
  }

  const pool = new Pool({ connectionString: url })
  const client = await pool.connect()

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        filename   TEXT        PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    const { rows } = await client.query('SELECT filename FROM _migrations')
    const applied = new Set(rows.map((r) => r.filename))

    const allFiles = (await readdir(SCRIPTS_DIR))
      .filter((f) => f.endsWith('.sql'))
      .sort() // lexicographic — file naming uses numeric prefixes (034-, 213-, etc.)

    // ---- BOOTSTRAP -----------------------------------------------------
    // First-ever run: tracking table empty AND files already exist on
    // disk. The DB is already populated from manual applies, so just
    // record every existing filename without executing.
    if (applied.size === 0 && allFiles.length > 0) {
      console.log(
        `[migrations] bootstrap: marking ${allFiles.length} existing files as applied`,
      )
      // Bulk-insert in one statement — much faster than a loop on a
      // cold connection.
      await client.query(
        `INSERT INTO _migrations (filename) SELECT unnest($1::text[])
         ON CONFLICT (filename) DO NOTHING`,
        [allFiles],
      )
      console.log('[migrations] bootstrap complete — future deploys auto-apply')
      return
    }

    // ---- INCREMENTAL APPLY ---------------------------------------------
    const pending = allFiles.filter((f) => !applied.has(f))
    if (pending.length === 0) {
      console.log('[migrations] up to date')
      return
    }

    console.log(`[migrations] ${pending.length} pending: ${pending.join(', ')}`)

    for (const filename of pending) {
      const body = await readFile(join(SCRIPTS_DIR, filename), 'utf8')
      // Skip empty files — easy mistake to make and nothing to do.
      if (!body.trim()) {
        console.log(`[migrations] (empty) ${filename} — recording`)
        await client.query(
          'INSERT INTO _migrations (filename) VALUES ($1)',
          [filename],
        )
        continue
      }

      console.log(`[migrations] applying ${filename}`)
      try {
        // Each migration runs in its own transaction so a syntax
        // error or constraint violation rolls back cleanly without
        // leaving the schema half-applied.
        await client.query('BEGIN')
        await client.query(body)
        await client.query(
          'INSERT INTO _migrations (filename) VALUES ($1)',
          [filename],
        )
        await client.query('COMMIT')
        console.log(`[migrations] OK   ${filename}`)
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {})
        // Re-throw with the filename baked in so the Vercel build log
        // pinpoints the offending migration without us having to
        // grep through SQL stack traces.
        const message = err instanceof Error ? err.message : String(err)
        throw new Error(`migration ${filename} failed: ${message}`)
      }
    }

    console.log('[migrations] all pending migrations applied')
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((err) => {
  console.error('[migrations] FATAL:', err)
  // Non-zero exit kills the Vercel build. This is what we want — we
  // must NEVER deploy app code against a schema that didn't migrate.
  process.exit(1)
})
