import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getUserPasskeys } from '@/lib/passkey'

export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const passkeys = await getUserPasskeys(user.id)
    
    return NextResponse.json({ passkeys })
  } catch (error) {
    console.error('Error fetching passkeys:', error)
    return NextResponse.json({ error: 'Failed to fetch passkeys' }, { status: 500 })
  }
}
