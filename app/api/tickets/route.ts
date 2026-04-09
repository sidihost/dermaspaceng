import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { sendTicketConfirmation } from '@/lib/email'

// Generate ticket ID: DS-YYYY-XXXXXX
function generateTicketId(): string {
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
  return `DS-${year}-${random}`
}

// GET - Fetch user's tickets
export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'You must be logged in to view tickets' },
        { status: 401 }
      )
    }

    const tickets = await sql`
      SELECT 
        id, ticket_id, category, subject, message, status, priority, created_at, updated_at
      FROM support_tickets 
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
    `

    return NextResponse.json({ tickets })
  } catch (error) {
    console.error('Fetch tickets error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    )
  }
}

// POST - Create a new ticket
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'You must be logged in to submit a ticket' },
        { status: 401 }
      )
    }

    const { category, subject, message, priority } = await request.json()

    if (!category || !subject || !message) {
      return NextResponse.json(
        { error: 'Category, subject, and message are required' },
        { status: 400 }
      )
    }

    const ticketId = generateTicketId()

    await sql`
      INSERT INTO support_tickets (
        ticket_id, user_id, user_email, user_name, category, subject, message, priority
      ) VALUES (
        ${ticketId}, 
        ${user.id}, 
        ${user.email}, 
        ${user.first_name + ' ' + user.last_name},
        ${category}, 
        ${subject}, 
        ${message},
        ${priority || 'medium'}
      )
    `

    // Send confirmation email
    let emailSent = false
    try {
      emailSent = await sendTicketConfirmation({
        email: user.email,
        firstName: user.first_name,
        ticketId,
        subject,
        category
      })
    } catch (emailError) {
      console.error('[v0] Ticket email error:', emailError)
    }

    return NextResponse.json({ 
      success: true, 
      ticketId,
      emailSent,
      message: `Your ticket ${ticketId} has been submitted successfully.`
    })
  } catch (error) {
    console.error('Create ticket error:', error)
    return NextResponse.json(
      { error: 'Failed to create ticket' },
      { status: 500 }
    )
  }
}
