// One-off migration runner for #420. SQL is inlined because the script
// runner evaluates this file from string, so `__dirname` isn't a real
// filesystem path and we can't readFileSync the .sql sibling.
const { neon } = require('@neondatabase/serverless')

const sql = neon(process.env.DATABASE_URL)

const statements = [
  // 1. Add the column (idempotent).
  `ALTER TABLE users
     ADD COLUMN IF NOT EXISTS signup_step SMALLINT NOT NULL DEFAULT 0`,
  // 2. Backfill: anyone who finished gets the terminal step.
  `UPDATE users
      SET signup_step = 4
    WHERE profile_complete = TRUE
      AND signup_step < 4`,
  // 3. Backfill partials, broadest → narrowest using GREATEST so the
  //    highest matching step wins.
  `UPDATE users
      SET signup_step = GREATEST(signup_step, 3)
    WHERE profile_complete = FALSE
      AND username IS NOT NULL
      AND username <> ''`,
  `UPDATE users
      SET signup_step = GREATEST(signup_step, 2)
    WHERE profile_complete = FALSE
      AND phone IS NOT NULL
      AND phone <> ''
      AND first_name IS NOT NULL
      AND first_name <> ''`,
  `UPDATE users
      SET signup_step = GREATEST(signup_step, 1)
    WHERE profile_complete = FALSE
      AND avatar_url IS NOT NULL
      AND avatar_url <> ''`,
]

async function main() {
  for (const stmt of statements) {
    console.log('[v0] Running:', stmt.slice(0, 120).replace(/\s+/g, ' '), '...')
    await sql.query(stmt)
  }
  console.log('[v0] Migration 420 complete.')
}

main().catch((err) => {
  console.error('[v0] Migration failed:', err)
  process.exit(1)
})
