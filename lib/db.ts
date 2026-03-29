import { neon, NeonQueryFunction } from '@neondatabase/serverless'

// Create a lazy-loaded SQL client that only connects when DATABASE_URL is available
let _sql: NeonQueryFunction<false, false> | null = null

export const sql = new Proxy({} as NeonQueryFunction<false, false>, {
  apply: (_target, _thisArg, args) => {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not configured')
    }
    if (!_sql) {
      _sql = neon(process.env.DATABASE_URL)
    }
    return (_sql as unknown as (...args: unknown[]) => unknown)(...args)
  },
  get: (_target, prop) => {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not configured')
    }
    if (!_sql) {
      _sql = neon(process.env.DATABASE_URL)
    }
    return _sql[prop as keyof typeof _sql]
  }
})

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
