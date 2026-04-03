import { NextResponse } from 'next/server'
import { generatePasskeyAuthOptions } from '@/lib/passkey'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { email } = body

    console.log('[v0] Passkey auth options - email:', email || 'not provided (discoverable credential)')

    // Email is optional - allows for discoverable credentials (resident keys)
    const { options, challengeId } = await generatePasskeyAuthOptions(email || undefined)
    
    if (!options) {
      console.log('[v0] Passkey auth options - Failed to generate options')
      return NextResponse.json({ error: 'Failed to generate authentication options' }, { status: 500 })
    }

    console.log('[v0] Passkey auth options - Generated challengeId:', challengeId)
    console.log('[v0] Passkey auth options - rpID:', options.rpId)

    return NextResponse.json({ ...options, challengeId })
  } catch (error) {
    console.error('[v0] Passkey auth options error:', error)
    return NextResponse.json({ error: 'Failed to generate authentication options' }, { status: 500 })
  }
}
