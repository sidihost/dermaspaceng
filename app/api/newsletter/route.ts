import { NextResponse } from 'next/server'
import { sendNewsletterWelcome } from '@/lib/email'
import { sql } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'
import {
  honeypotResponse,
  parseJsonBody,
  requireSameOrigin,
  withRateLimit,
} from '@/lib/api-guard'

interface NewsletterBody {
  email?: string
}

export async function POST(request: Request) {
  try {
    // Cross-site forgery guard — newsletter signups should come
    // from our own marketing surfaces, not an embedded iframe.
    const csrf = requireSameOrigin(request)
    if (csrf) return csrf

    // 5 attempts per IP per 10 minutes — well above any honest
    // user pattern, far below script-driven inbox-flooding rates.
    const rl = await withRateLimit(request, {
      bucket: 'newsletter:ip',
      limit: 5,
      windowSec: 600,
    })
    if (rl) return rl

    // 4 KB body cap — newsletter only needs an email address; any
    // real payload is well under 200 bytes.
    const parsed = await parseJsonBody<NewsletterBody>(request, 4 * 1024)
    if (!parsed.ok) return parsed.response

    // Silent 200 for bots that filled the honeypot, so they keep
    // marking us as "subscribed" and stop hammering the endpoint.
    const trap = honeypotResponse(parsed.data as Record<string, unknown>)
    if (trap) return trap

    const { email } = parsed.data
    console.log('[v0] Newsletter subscription request for:', email)

    if (!email || typeof email !== 'string' || !email.includes('@') || email.length > 254) {
      console.log('[v0] Invalid email provided')
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
