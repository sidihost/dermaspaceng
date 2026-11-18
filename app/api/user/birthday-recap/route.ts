import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'
import { getBirthdayRecapForUser } from '@/lib/birthday-recap'
import { getFestiveState } from '@/lib/feature-flags'
import type { CelebrationOccasion } from '@/lib/celebrations'
import { evaluateCelebrationAccess } from '@/lib/celebration-tokens'

/*
 * /api/user/birthday-recap
 * ------------------------
 * Powers the celebration recap JSON API. Enforces both occasion eligibility
 * (DOB on birthday, seasonal windows for Christmas / New Year, festive flag)
 * and a valid, non-expired, user-bound celebration token.
 */

export const dynamic = 'force-dynamic'

const NO_STORE = 'private, no-store, max-age=0'

function parseOccasion(raw: string | null): CelebrationOccasion {
  if (raw === 'christmas' || raw === 'new-year') return raw
  return 'birthday'
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401, headers: { 'Cache-Control': NO_STORE } },
      )
    }

    const occasion = parseOccasion(request.nextUrl.searchParams.get('occasion'))
    const token = request.nextUrl.searchParams.get('token')?.trim() || ''

    if (!token) {
      return NextResponse.json(
        { error: 'A valid celebration token is required', reason: 'missing_token' },
        { status: 403, headers: { 'Cache-Control': NO_STORE } },
      )
    }

    let dobIso: string | null = null
    if (occasion === 'birthday') {
      const rows = await sql`
        SELECT TO_CHAR(date_of_birth, 'YYYY-MM-DD') AS dob
        FROM users
        WHERE id = ${user.id}
        LIMIT 1
      `
      dobIso = (rows[0]?.dob as string | null) ?? null
    }

    let festiveEnabled = false
    if (occasion === 'christmas') {
      try {
        const festive = await getFestiveState()
        festiveEnabled = festive.enabled === true
      } catch {
        festiveEnabled = false
      }
    }

    const access = evaluateCelebrationAccess({
      occasion,
      userId: user.id,
      dobIso,
      festiveEnabled,
      token,
    })

    if (!access.allowed || access.needsTokenRedirect) {
      return NextResponse.json(
        {
          error: 'Celebration story is currently locked for this account',
          reason:
            !access.allowed && 'reason' in access
              ? access.reason
              : 'missing_token',
        },
        { status: 403, headers: { 'Cache-Control': NO_STORE } },
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
