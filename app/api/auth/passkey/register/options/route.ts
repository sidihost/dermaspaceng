import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { generatePasskeyRegistrationOptions } from '@/lib/passkey'

export async function POST() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const options = await generatePasskeyRegistrationOptions(user.id, user.email, user.name || user.email)
    
    return NextResponse.json(options)
  } catch (error) {
    console.error('Error generating registration options:', error)
    return NextResponse.json({ error: 'Failed to generate registration options' }, { status: 500 })
  }
}
