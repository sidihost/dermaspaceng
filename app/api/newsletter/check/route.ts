import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      )
    }
    
    // Check if subscribed
    const existing = await sql`
      SELECT id FROM newsletter_subscribers WHERE email = ${email.toLowerCase()}
    `
    
    return NextResponse.json({ 
      subscribed: existing.length > 0
    })
    
  } catch (error) {
    console.error('Newsletter check error:', error)
    return NextResponse.json(
      { error: 'Failed to check subscription' },
      { status: 500 }
    )
  }
}
