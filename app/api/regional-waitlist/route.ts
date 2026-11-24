import { NextResponse, type NextRequest } from 'next/server'
import { requireSameOrigin, withRateLimit } from '@/lib/api-guard'
import { resolveRequestCountry } from '@/lib/geo-blocking'
import { validateWaitlistSubmission } from '@/lib/regional-waitlist'
import { saveRegionalWaitlistEntry } from '@/lib/regional-waitlist-store'

export async function POST(req: NextRequest) {
  const csrf = requireSameOrigin(req)
  if (csrf) return csrf

  const rl = await withRateLimit(req, {
    bucket: 'regional-waitlist:ip',
    limit: 6,
    windowSec: 600,
  })
  if (rl) return rl

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 },
    )
  }

  const validated = validateWaitlistSubmission(body)
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 })
  }

  const requestGeoCountry = (req as NextRequest & { geo?: { country?: string } }).geo?.country
  const detectedCountry = resolveRequestCountry(req.headers, requestGeoCountry)

  const { alreadyJoined } = await saveRegionalWaitlistEntry(
    validated.data,
    detectedCountry,
  )

  return NextResponse.json(
    {
      ok: true,
      alreadyJoined,
      message: alreadyJoined
        ? 'You are already on our expansion waitlist. We have updated your details and will notify you first.'
        : 'You are on the waitlist. We will notify you as soon as Dermaspace launches in your region.',
    },
    { status: alreadyJoined ? 200 : 201 },
  )
}
