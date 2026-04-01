import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { sql } from '@/lib/db'

// GET - Check if user has seen wallet onboarding
export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('session_id')?.value

    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const sessions = await sql`
      SELECT s.user_id FROM sessions s
      WHERE s.id = ${sessionId} AND s.expires_at > NOW()
    `

    if (sessions.length === 0) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    const userId = sessions[0].user_id

    // Check if user has seen wallet onboarding
    // First, ensure the column exists (for existing deployments)
    try {
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_onboarding_seen BOOLEAN DEFAULT FALSE`
    } catch {
      // Column might already exist or we might not have ALTER permissions, continue anyway
    }
    
    const result = await sql`
      SELECT wallet_onboarding_seen FROM users WHERE id = ${userId}
    `

    return NextResponse.json({
      hasSeenOnboarding: result[0]?.wallet_onboarding_seen || false
    })
  } catch (error) {
    console.error('Wallet onboarding check error:', error)
    // If column doesn't exist yet, return false
    return NextResponse.json({ hasSeenOnboarding: false })
  }
}

// POST - Mark wallet onboarding as seen
export async function POST() {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('session_id')?.value

    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const sessions = await sql`
      SELECT s.user_id FROM sessions s
      WHERE s.id = ${sessionId} AND s.expires_at > NOW()
    `

    if (sessions.length === 0) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    const userId = sessions[0].user_id

    // Update user's wallet onboarding status
    await sql`
      UPDATE users SET wallet_onboarding_seen = TRUE WHERE id = ${userId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Wallet onboarding update error:', error)
    return NextResponse.json({ error: 'Failed to update onboarding status' }, { status: 500 })
  }
}
