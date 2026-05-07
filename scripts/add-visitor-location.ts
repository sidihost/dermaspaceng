/**
 * Migration: Add visitor_location column to live_chat_sessions
 * 
 * Run with:
 *   node --env-file-if-exists=/vercel/share/.env.project scripts/add-visitor-location.ts
 */

import { neon } from '@neondatabase/serverless'

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set')
    process.exit(1)
  }

  const sql = neon(process.env.DATABASE_URL)

  console.log('Adding visitor_location column to live_chat_sessions...')

  try {
    // Add the column if it doesn't exist
    await sql`
      ALTER TABLE live_chat_sessions 
      ADD COLUMN IF NOT EXISTS visitor_location TEXT DEFAULT NULL
    `
    console.log('Column added successfully!')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

main()
