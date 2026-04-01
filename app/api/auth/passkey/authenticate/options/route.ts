import { NextResponse } from 'next/server'
import { generateAuthenticationOptions } from '@/lib/passkey'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const options = await generateAuthenticationOptions(email)
    
    if (!options) {
      return NextResponse.json({ error: 'No passkeys found for this account' }, { status: 404 })
    }

    return NextResponse.json(options)
  } catch (error) {
    console.error('Error generating authentication options:', error)
    return NextResponse.json({ error: 'Failed to generate authentication options' }, { status: 500 })
  }
}
