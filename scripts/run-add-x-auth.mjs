import { readFile } from 'node:fs/promises'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL)
const src = await readFile(new URL('./add-x-auth.sql', import.meta.url), 'utf8')

// Split on `;` at end of line, filter empties and pure-comment chunks.
const statements = src
  .split(/;\s*$/m)
  .map((s) => s.trim())
  .filter((s) => s && !/^(--|\/\*)/.test(s))

for (const stmt of statements) {
  console.log('[v0] executing:', stmt.slice(0, 80).replace(/\s+/g, ' '), '...')
  await sql.query(stmt)
}
console.log('[v0] x auth migration complete')
