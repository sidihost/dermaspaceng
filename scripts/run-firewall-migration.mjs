// One-shot runner for scripts/610-firewall-blocks.sql.
// Splits on statement boundaries so the neon HTTP driver (which
// doesn't accept multi-statement bodies) can execute each one
// individually.
import { readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL)
const file = new URL('./610-firewall-blocks.sql', import.meta.url)
const body = readFileSync(file, 'utf8')

// Strip line comments + split on semicolons that end a statement
// (PL/pgSQL blocks aren't needed here, plain DDL only).
const statements = body
  .split('\n')
  .filter((l) => !l.trim().startsWith('--'))
  .join('\n')
  .split(/;\s*\n/)
  .map((s) => s.trim())
  .filter(Boolean)

for (const stmt of statements) {
  try {
    await sql(stmt)
    console.log('OK:', stmt.split('\n')[0].slice(0, 90))
  } catch (e) {
    console.error('ERR:', stmt.split('\n')[0].slice(0, 90), '-', e.message)
  }
}
