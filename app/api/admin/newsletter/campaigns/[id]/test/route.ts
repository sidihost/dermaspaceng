import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { sendNewsletterCampaign } from '@/lib/email'

/*
 * POST /api/admin/newsletter/campaigns/[id]/test
 *
 * Send a single test copy of the campaign to the email address in
 * the body. Used by the admin to QA a draft before sending it to
 * the whole list. The campaign stays in `draft` status; we just
 * stamp `last_test_email` + `last_test_at` so the admin can see at
 * a glance that a test went out.
 */

const PUBLIC_ORIGIN =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
  'https://www.dermaspaceng.com'

// Tiny RFC-loose email validator. Good enough for the test-send form
// — Zepto will reject anything genuinely malformed at SMTP time.
function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await ctx.params

  let body: { email?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const testEmail = (body.email || '').trim()
  if (!isEmail(testEmail)) {
    return NextResponse.json({ error: 'A valid test email is required' }, { status: 400 })
  }

  try {
    const rows = await sql`
      SELECT id, subject, preheader, eyebrow, headline, body_html,
             cta_label, cta_url
      FROM newsletter_campaigns
      WHERE id = ${id}::uuid
      LIMIT 1
    `
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }
    const c = rows[0]

    // The test email is *the same* email subscribers will receive,
    // including the unsubscribe footer line. We use a placeholder
    // unsubscribe URL because there's no real subscriber row backing
    // this send — the admin doesn't get to actually opt out via the
    // test, only verify that the link renders correctly.
    const ok = await sendNewsletterCampaign({
      to: testEmail,
      subject: `[TEST] ${c.subject as string}`,
      preheader: (c.preheader as string) || null,
      eyebrow: (c.eyebrow as string) || null,
      headline: (c.headline as string) || null,
      bodyHtml: (c.body_html as string) || '',
      ctaLabel: (c.cta_label as string) || null,
      ctaUrl: (c.cta_url as string) || null,
      unsubscribeUrl: `${PUBLIC_ORIGIN}/unsubscribe?test=1`,
    })

    if (!ok) {
      return NextResponse.json(
        { error: 'Test send failed — check ZEPTO_MAIL_PASSWORD and try again.' },
        { status: 502 },
      )
    }

    await sql`
      UPDATE newsletter_campaigns
      SET last_test_email = ${testEmail}, last_test_at = NOW()
      WHERE id = ${id}::uuid
    `

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[newsletter/campaigns test] failed', error)
    return NextResponse.json({ error: 'Test send failed' }, { status: 500 })
  }
}
