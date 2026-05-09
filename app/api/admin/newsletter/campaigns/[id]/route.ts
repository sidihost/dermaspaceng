import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

/*
 * GET    /api/admin/newsletter/campaigns/[id]   — full campaign row
 * PATCH  /api/admin/newsletter/campaigns/[id]   — edit a draft
 * DELETE /api/admin/newsletter/campaigns/[id]   — delete (drafts only)
 *
 * Once a campaign has been sent (`status = 'sent' | 'sending'`) we
 * intentionally lock it down. Drafts are mutable for editing
 * convenience; sent campaigns are an audit record.
 */

interface PatchBody {
  subject?: string
  preheader?: string
  eyebrow?: string
  headline?: string
  bodyHtml?: string
  ctaLabel?: string
  ctaUrl?: string
}

function sanitiseBody(html: string): string {
  return html
    .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/<\s*script[^>]*>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/href\s*=\s*"javascript:[^"]*"/gi, 'href="#"')
    .replace(/href\s*=\s*'javascript:[^']*'/gi, "href='#'")
}

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await ctx.params
  try {
    const rows = await sql`
      SELECT id, subject, preheader, eyebrow, headline, body_html,
             cta_label, cta_url, status, recipient_count, sent_count,
             failed_count, last_error, created_at, sent_at,
             last_test_email, last_test_at
      FROM newsletter_campaigns
      WHERE id = ${id}::uuid
      LIMIT 1
    `
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }
    const r = rows[0]
    return NextResponse.json({
      campaign: {
        id: r.id,
        subject: r.subject,
        preheader: r.preheader || '',
        eyebrow: r.eyebrow || '',
        headline: r.headline || '',
        bodyHtml: r.body_html || '',
        ctaLabel: r.cta_label || '',
        ctaUrl: r.cta_url || '',
        status: r.status,
        recipientCount: Number(r.recipient_count ?? 0),
        sentCount: Number(r.sent_count ?? 0),
        failedCount: Number(r.failed_count ?? 0),
        lastError: r.last_error || null,
        createdAt: r.created_at ? new Date(r.created_at as string).toISOString() : null,
        sentAt: r.sent_at ? new Date(r.sent_at as string).toISOString() : null,
        lastTestEmail: r.last_test_email || null,
        lastTestAt: r.last_test_at ? new Date(r.last_test_at as string).toISOString() : null,
      },
    })
  } catch (error) {
    console.error('[newsletter/campaigns GET id] failed', error)
    return NextResponse.json({ error: 'Failed to load campaign' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await ctx.params
  let body: PatchBody = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Lock down already-sent / in-flight campaigns. Drafts are
  // freely editable; everything else returns a 409 so the UI can
  // surface a friendly "this campaign has already been sent"
  // message instead of silently no-oping.
  const existing = await sql`SELECT status FROM newsletter_campaigns WHERE id = ${id}::uuid LIMIT 1`
  if (existing.length === 0) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }
  if (existing[0].status !== 'draft') {
    return NextResponse.json(
      { error: 'Only draft campaigns can be edited' },
      { status: 409 },
    )
  }

  const subject = body.subject !== undefined ? (body.subject || '').trim() : undefined
  if (subject !== undefined && !subject) {
    return NextResponse.json({ error: 'Subject is required' }, { status: 400 })
  }
  if (subject !== undefined && subject.length > 200) {
    return NextResponse.json({ error: 'Subject must be 200 characters or fewer' }, { status: 400 })
  }

  const bodyHtml =
    body.bodyHtml !== undefined ? sanitiseBody((body.bodyHtml || '').trim()) : undefined
  if (bodyHtml !== undefined && !bodyHtml) {
    return NextResponse.json({ error: 'Body content is required' }, { status: 400 })
  }

  const preheader = body.preheader !== undefined ? (body.preheader || '').trim().slice(0, 200) || null : undefined
  const eyebrow = body.eyebrow !== undefined ? (body.eyebrow || '').trim().slice(0, 60) || null : undefined
  const headline = body.headline !== undefined ? (body.headline || '').trim().slice(0, 200) || null : undefined
  const ctaLabel = body.ctaLabel !== undefined ? (body.ctaLabel || '').trim().slice(0, 60) || null : undefined
  const ctaUrl = body.ctaUrl !== undefined ? (body.ctaUrl || '').trim() || null : undefined

  try {
    // We use a single UPDATE with COALESCE so unspecified fields
    // keep their current values. Passing `undefined` through Neon's
    // template tag binds it as NULL which is the wrong semantic for
    // a partial PATCH, hence the explicit fallback to the existing
    // row via COALESCE.
    const rows = await sql`
      UPDATE newsletter_campaigns
      SET
        subject     = COALESCE(${subject ?? null}, subject),
        body_html   = COALESCE(${bodyHtml ?? null}, body_html),
        preheader   = CASE WHEN ${body.preheader !== undefined} THEN ${preheader ?? null} ELSE preheader END,
        eyebrow     = CASE WHEN ${body.eyebrow !== undefined} THEN ${eyebrow ?? null} ELSE eyebrow END,
        headline    = CASE WHEN ${body.headline !== undefined} THEN ${headline ?? null} ELSE headline END,
        cta_label   = CASE WHEN ${body.ctaLabel !== undefined} THEN ${ctaLabel ?? null} ELSE cta_label END,
        cta_url     = CASE WHEN ${body.ctaUrl !== undefined} THEN ${ctaUrl ?? null} ELSE cta_url END
      WHERE id = ${id}::uuid AND status = 'draft'
      RETURNING id
    `
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[newsletter/campaigns PATCH] failed', error)
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await ctx.params
  try {
    const existing = await sql`SELECT status FROM newsletter_campaigns WHERE id = ${id}::uuid LIMIT 1`
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }
    if (existing[0].status === 'sending') {
      return NextResponse.json(
        { error: 'Cannot delete a campaign that is currently sending' },
        { status: 409 },
      )
    }
    await sql`DELETE FROM newsletter_campaigns WHERE id = ${id}::uuid`
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[newsletter/campaigns DELETE] failed', error)
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 })
  }
}
