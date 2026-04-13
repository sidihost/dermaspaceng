import { NextResponse } from 'next/server'
import { generatePasskeyAuthOptions } from '@/lib/passkey'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { email } = body

    // Email is optional - allows for discoverable credentials (resident keys)
    const { options, challengeId } = await generatePasskeyAuthOptions(email || undefined)
    
    if (!options) {
      return NextResponse.json({ error: 'Failed to generate authentication options' }, { status: 500 })
    }

    return NextResponse.json({ ...options, challengeId })
  } catch (error) {
    console.error('[v0] Passkey auth options error:', error)
    return NextResponse.json({ error: 'Failed to generate authentication options' }, { status: 500 })
  }
}
