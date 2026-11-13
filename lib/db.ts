import { neon, NeonQueryFunction } from '@neondatabase/serverless'
import { buildNeonTemplate } from './db-params'

// Create a lazy-loaded SQL client that only connects when DATABASE_URL is available
let _sql: NeonQueryFunction<false, false> | null = null

const mockNeon = (async () => {
  return []
}) as unknown as NeonQueryFunction<false, false>

function getSql(): NeonQueryFunction<false, false> {
  if (!process.env.DATABASE_URL) {
    return mockNeon
  }
  if (!_sql) {
    try {
      _sql = neon(process.env.DATABASE_URL)
    } catch {
      return mockNeon
    }
  }
  return _sql
}

// Create a callable function that acts as a tagged template literal
function createSqlProxy(): NeonQueryFunction<false, false> {
  const handler = (strings: TemplateStringsArray, ...values: unknown[]) => {
    return getSql()(strings, ...values)
  }
  
  return handler as NeonQueryFunction<false, false>
}

export const sql = createSqlProxy()

// Query function with parameterized queries (for $1, $2 style params)
// Maps each positional $N placeholder to params[N - 1] so repeated or
// out-of-order placeholders (e.g. $1 ... $1 ... $3) bind accurately.
export async function query<T = Record<string, unknown>>(
  text: string, 
  params: unknown[] = []
): Promise<{ rows: T[]; rowCount: number }> {
  const sqlClient = getSql()
  
  if (params.length === 0) {
    // No parameters, execute as-is
    const strings = [text] as unknown as TemplateStringsArray
    Object.assign(strings, { raw: [text] })
    const result = await sqlClient(strings)
    const rows = Array.isArray(result) ? (result as T[]) : []
    return { rows, rowCount: rows.length }
  }
  
  const { strings, values } = buildNeonTemplate(text, params)
  const result = await sqlClient(strings, ...values)
  const rows = Array.isArray(result) ? (result as T[]) : []
  return { rows, rowCount: rows.length }
}

export async function initDatabase() {
  await sql`
    CREATE TABLE IF NOT EXISTS consultations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      location VARCHAR(100) NOT NULL,
      concerns TEXT[],
      message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `
  
  await sql`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      subject VARCHAR(255),
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `
  
  await sql`
    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `
}
