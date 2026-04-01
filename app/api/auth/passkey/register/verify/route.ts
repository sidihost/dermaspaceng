import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { verifyPasskeyRegistration } from '@/lib/passkey'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { credential, name } = body

    if (!credential) {
      return NextResponse.json({ error: 'Credential is required' }, { status: 400 })
    }

    const result = await verifyPasskeyRegistration(user.id, credential, name || 'My Passkey')
    
    if (result.success) {
      return NextResponse.json({ success: true, message: 'Passkey registered successfully' })
    } else {
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error verifying registration:', error)
    return NextResponse.json({ error: 'Failed to verify registration' }, { status: 500 })
  }
}
