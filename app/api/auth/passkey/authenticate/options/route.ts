import { NextResponse } from 'next/server'
import { generatePasskeyAuthOptions } from '@/lib/passkey'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { email } = body

    console.log('[Passkey Auth] Generating options for email:', email || 'discoverable')

    // Email is optional - allows for discoverable credentials (resident keys)
    const { options, challengeId } = await generatePasskeyAuthOptions(email || undefined)
    
    if (!options) {
      return NextResponse.json({ error: 'Failed to generate authentication options' }, { status: 500 })
    }

    console.log('[Passkey Auth] Options generated - rpId:', options.rpId, 'challengeId:', challengeId)

    return NextResponse.json({ ...options, challengeId })
  } catch (error) {
    console.error('[Passkey Auth] Error generating options:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to generate authentication options: ${errorMessage}` }, { status: 500 })
  }
}
