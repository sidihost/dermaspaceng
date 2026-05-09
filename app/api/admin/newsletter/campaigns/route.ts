import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

/*
 * GET /api/admin/newsletter/campaigns
 *   List of campaigns ordered newest-first. Used to populate the
 *   "Campaigns" tab on the admin newsletter page.
 *
 * POST /api/admin/newsletter/campaigns
 *   Create a new draft. The composer calls this once on first save
 *   and then PATCHes the returned id on every subsequent edit, so
 *   we never end up with orphan drafts on every keystroke.
 */

interface CreateCampaignBody {
  subject?: string
  preheader?: string
  eyebrow?: string
  headline?: string
  bodyHtml?: string
  ctaLabel?: string
  ctaUrl?: string
}

// Tiny defence-in-depth body sanitiser. Admins are trusted authors
// so we don't strip rich tags, but we do block obviously dangerous
// constructs (script tags, on* event handlers, javascript: hrefs).
// Our send template re-emits the body inline so XSS in an email
// body would render in the recipient's mail client — worth a
// belt-and-braces check at write time.
function sanitiseBody(html: string): string {
  return html
    // Strip <script> blocks outright.
    .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/<\s*script[^>]*>/gi, '')
    // Strip on* attribute handlers.
    .replace(/\s+on[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*'[^']*'/gi, '')
    // Block javascript: hrefs.
    .replace(/href\s*=\s*"javascript:[^"]*"/gi, 'href="#"')
    .replace(/href\s*=\s*'javascript:[^']*'/gi, "href='#'")
}

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const rows = await sql`
      SELECT id, subject, preheader, eyebrow, headline, status,
             recipient_count, sent_count, failed_count,
             last_error, created_at, sent_at,
             last_test_email, last_test_at
      FROM newsletter_campaigns
      ORDER BY created_at DESC
      LIMIT 200
    `
    return NextResponse.json({
      campaigns: rows.map(r => ({
        id: r.id,
        subject: r.subject,
        preheader: r.preheader || null,
        eyebrow: r.eyebrow || null,
        headline: r.headline || null,
        status: r.status,
        recipientCount: Number(r.recipient_count ?? 0),
        sentCount: Number(r.sent_count ?? 0),
        failedCount: Number(r.failed_count ?? 0),
        lastError: r.last_error || null,
        createdAt: r.created_at ? new Date(r.created_at as string).toISOString() : null,
        sentAt: r.sent_at ? new Date(r.sent_at as string).toISOString() : null,
        lastTestEmail: r.last_test_email || null,
        lastTestAt: r.last_test_at ? new Date(r.last_test_at as string).toISOString() : null,
      })),
    })
  } catch (error) {
    console.error('[newsletter/campaigns GET] failed', error)
    return NextResponse.json({ error: 'Failed to load campaigns' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  let user
  try {
    user = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: CreateCampaignBody = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const subject = (body.subject || '').trim()
  if (!subject) {
    return NextResponse.json({ error: 'Subject is required' }, { status: 400 })
  }
  if (subject.length > 200) {
    return NextResponse.json({ error: 'Subject must be 200 characters or fewer' }, { status: 400 })
  }

  const bodyHtml = sanitiseBody((body.bodyHtml || '').trim())
  if (!bodyHtml) {
    return NextResponse.json({ error: 'Body content is required' }, { status: 400 })
  }

  const preheader = (body.preheader || '').trim().slice(0, 200) || null
  const eyebrow = (body.eyebrow || '').trim().slice(0, 60) || null
  const headline = (body.headline || '').trim().slice(0, 200) || null
  const ctaLabel = (body.ctaLabel || '').trim().slice(0, 60) || null
  const ctaUrl = (body.ctaUrl || '').trim() || null

  try {
    const rows = await sql`
      INSERT INTO newsletter_campaigns (
        subject, preheader, eyebrow, headline, body_html,
        cta_label, cta_url, created_by
      ) VALUES (
        ${subject}, ${preheader}, ${eyebrow}, ${headline}, ${bodyHtml},
        ${ctaLabel}, ${ctaUrl}, ${user.id}
      )
      RETURNING id, subject, status, created_at
    `
    return NextResponse.json({
      ok: true,
      campaign: {
        id: rows[0].id,
        subject: rows[0].subject,
        status: rows[0].status,
        createdAt: new Date(rows[0].created_at as string).toISOString(),
      },
    })
  } catch (error) {
    console.error('[newsletter/campaigns POST] failed', error)
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
  }
}
