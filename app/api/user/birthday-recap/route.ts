import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getBirthdayRecapForUser } from '@/lib/birthday-recap'

/*
 * /api/user/birthday-recap
 * ------------------------
 * Powers the "Glow Year Wrapped" birthday story JSON API and email deep links.
 * Delegates aggregation to getBirthdayRecapForUser() in lib/birthday-recap.ts.
 */

export const dynamic = 'force-dynamic'

const NO_STORE = 'private, no-store, max-age=0'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401, headers: { 'Cache-Control': NO_STORE } },
      )
    }

    const recap = await getBirthdayRecapForUser(user)
    return NextResponse.json(recap, {
      headers: { 'Cache-Control': NO_STORE },
    })
  } catch (error) {
    console.error('[birthday-recap] failed', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500, headers: { 'Cache-Control': NO_STORE } },
    )
  }
}
