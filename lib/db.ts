import { neon, NeonQueryFunction, neonConfig } from '@neondatabase/serverless'

// Configure neon for better performance
neonConfig.fetchConnectionCache = true

// Create a lazy-loaded SQL client that only connects when DATABASE_URL is available
let _sql: NeonQueryFunction<false, false> | null = null

function getSql(): NeonQueryFunction<false, false> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured')
  }
  if (!_sql) {
    _sql = neon(process.env.DATABASE_URL)
  }
  return _sql
}

export const sql = new Proxy({} as NeonQueryFunction<false, false>, {
  apply: (_target, _thisArg, args) => {
    return (getSql() as unknown as (...args: unknown[]) => unknown)(...args)
  },
  get: (_target, prop) => {
    return getSql()[prop as keyof NeonQueryFunction<false, false>]
  }
})

// Query function with parameterized queries (for $1, $2 style params)
// This converts parameterized queries to tagged template literal format for Neon
export async function query<T = Record<string, unknown>>(
  text: string, 
  params: unknown[] = []
): Promise<{ rows: T[] }> {
  const sqlClient = getSql()
  
  if (params.length === 0) {
    // No parameters, execute as-is
    const strings = [text] as unknown as TemplateStringsArray
    Object.assign(strings, { raw: [text] })
    const result = await sqlClient(strings)
    return { rows: result as T[] }
  }
  
  // Split the query by parameter placeholders ($1, $2, etc.)
  // and create a tagged template-like structure
  const parts: string[] = []
  let lastIndex = 0
  const paramRegex = /\$(\d+)/g
  let match
  
  while ((match = paramRegex.exec(text)) !== null) {
    parts.push(text.substring(lastIndex, match.index))
    lastIndex = match.index + match[0].length
  }
  parts.push(text.substring(lastIndex))
  
  // Create a proper TemplateStringsArray
  const strings = parts as unknown as TemplateStringsArray
  Object.assign(strings, { raw: parts })
  
  // Execute with the neon client
  const result = await sqlClient(strings, ...params)
  return { rows: result as T[] }
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
