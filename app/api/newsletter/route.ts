import { NextResponse } from 'next/server'
import { sendNewsletterWelcome } from '@/lib/email'
import { sql } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'
import { rateLimit } from '@/lib/redis'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    console.log('[v0] Newsletter subscription request for:', email)
    
    if (!email || !email.includes('@')) {
      console.log('[v0] Invalid email provided')
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      )
    }

    // Tight rate limit: a real user only ever subscribes one address
    // from one device. Beyond 5 in 10 minutes from one IP is almost
    // certainly a script signing fake addresses up to spam our Zepto
    // sender reputation.
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    const limit = await rateLimit('newsletter:ip', ip, 5, 600)
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Too many subscription attempts. Please try again later.' },
        { status: 429 },
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
    
    // Add to subscribers list with UUID
    const id = uuidv4()
    console.log('[v0] Adding new subscriber with id:', id)
    await sql`
      INSERT INTO newsletter_subscribers (id, email) VALUES (${id}, ${email.toLowerCase()})
    `
    console.log('[v0] Subscriber added successfully')
    
    // Send welcome email
    const emailSent = await sendNewsletterWelcome(email)
    console.log('[v0] Welcome email sent:', emailSent)
    
    if (!emailSent) {
      console.error('Newsletter welcome email failed to send')
    }
    
    return NextResponse.json({ 
      success: true, 
      alreadySubscribed: false,
      message: 'Successfully subscribed to newsletter'
    })
    
  } catch (error) {
    console.error('[v0] Newsletter subscription error:', error)
    return NextResponse.json(
      { error: 'Failed to subscribe', details: String(error) },
      { status: 500 }
    )
  }
}
