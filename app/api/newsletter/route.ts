import { NextResponse } from 'next/server'
import { sendNewsletterWelcome } from '@/lib/email'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      )
    }
    
    // Send welcome email
    const emailSent = await sendNewsletterWelcome(email)
    
    if (!emailSent) {
      console.error('Newsletter welcome email failed to send')
    }
    
    return NextResponse.json({ 
      success: true, 
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
