import { NextResponse } from 'next/server'
import { sendNewsletterWelcome } from '@/lib/email'
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
    
    // Check if already subscribed
    const existing = await sql`
      SELECT id FROM newsletter_subscribers WHERE email = ${email.toLowerCase()}
    `
    
    if (existing.length > 0) {
      return NextResponse.json({ 
        success: true, 
        alreadySubscribed: true,
        message: 'You have already subscribed to our newsletter'
      })
    }
    
    // Add to subscribers list
    await sql`
      INSERT INTO newsletter_subscribers (email) VALUES (${email.toLowerCase()})
    `
    
    // Send welcome email
    const emailSent = await sendNewsletterWelcome(email)
    
    if (!emailSent) {
      console.error('Newsletter welcome email failed to send')
    }
    
    return NextResponse.json({ 
      success: true, 
      alreadySubscribed: false,
      message: 'Successfully subscribed to newsletter'
    })
    
  } catch (error) {
    console.error('Newsletter subscription error:', error)
    return NextResponse.json(
      { error: 'Failed to subscribe' },
      { status: 500 }
    )
  }
}
