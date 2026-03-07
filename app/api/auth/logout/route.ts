import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { sql } from '@/lib/db'

export async function POST() {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('session_id')?.value

    if (sessionId) {
      await sql`DELETE FROM sessions WHERE id = ${sessionId}`
    }

    const response = NextResponse.json({ success: true })
    response.cookies.delete('session_id')
    
    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
