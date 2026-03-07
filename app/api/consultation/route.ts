import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const { name, email, phone, location, concerns, message } = await request.json()

    if (!name || !email || !phone || !location) {
      return NextResponse.json(
        { error: 'Name, email, phone, and location are required' },
        { status: 400 }
      )
    }

    // Create table if not exists
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

    // Save to database
    await sql`
      INSERT INTO consultations (name, email, phone, location, concerns, message)
      VALUES (${name}, ${email}, ${phone}, ${location}, ${concerns || []}, ${message || null})
    `

    // TODO: Send email notification to admin@dermaspaceng.com

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Consultation form error:', error)
    return NextResponse.json(
      { error: 'Failed to submit consultation request' },
      { status: 500 }
    )
  }
}
