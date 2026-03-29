import { NextResponse } from 'next/server'
import { sendGiftCardRequestToAdmin, sendGiftCardConfirmation } from '@/lib/email'
import { cookies } from 'next/headers'
import { sql } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('session_id')?.value

    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Verify session
    const sessions = await sql`
      SELECT s.*, u.email as user_email, u.first_name, u.last_name
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ${sessionId} AND s.expires_at > NOW()
    `

    if (sessions.length === 0) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const user = sessions[0]
    const data = await request.json()

    const {
      amount,
      design,
      designName,
      designGradient,
      occasion,
      font,
      fontName,
      recipientName,
      recipientEmail,
      recipientPhone,
      senderName,
      personalMessage,
      deliveryMethod,
      deliveryDate
    } = data

    const fullSenderName = senderName || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Customer'

    // Send email to admin with card design details
    await sendGiftCardRequestToAdmin({
      amount,
      design,
      designName,
      designGradient,
      occasion,
      font,
      fontName,
      recipientName,
      recipientEmail,
      recipientPhone,
      senderName: fullSenderName,
      senderEmail: user.user_email,
      personalMessage,
      deliveryMethod,
      deliveryDate
    })

    // Send confirmation to user with design details
    await sendGiftCardConfirmation({
      userEmail: user.user_email,
      userName: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Valued Customer',
      amount,
      recipientName,
      occasion,
      designName
    })

    return NextResponse.json({ 
      success: true,
      message: 'Gift card request submitted successfully'
    })
  } catch (error) {
    console.error('Gift card request error:', error)
    return NextResponse.json(
      { error: 'Failed to submit request' },
      { status: 500 }
    )
  }
}
