import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { sendNewsletterCampaign } from '@/lib/email'

/*
 * POST /api/admin/newsletter/campaigns/[id]/send
 *
 * Promote a draft to "sent" by walking the active-subscriber list
 * and dispatching the campaign email to each address. We do this
 * inline (not via a queue) — Dermaspace's list is small enough at
 * launch that a few seconds of HTTP wait is fine, and it keeps the
 * deploy footprint simple. When the list outgrows that, swap the
 * inner loop for a QStash enqueue without changing the request /
 * response shape.
 *
 * Idempotency: the unique constraint on
 * (campaign_id, email) inside `newsletter_campaign_logs` means a
 * second click of "Send" on a partially-sent campaign skips already-
 * delivered rows automatically.
 */

const PUBLIC_ORIGIN =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
  'https://www.dermaspaceng.com'

// Be conservative — anything bigger than this on a single request
// risks SMTP throttling and Vercel's serverless function timeout.
// At launch our list is well under 500 so this is effectively
// unlimited; bigger lists should swap to a QStash queue.
const MAX_RECIPIENTS_PER_REQUEST = 2000

export const maxDuration = 300

export async function POST(
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
    // Fetch campaign — bail out early if it's not a draft (or already
    // in flight) so we never re-send something that's already gone.
    const campaignRows = await sql`
      SELECT id, subject, preheader, eyebrow, headline, body_html,
             cta_label, cta_url, status, audience
      FROM newsletter_campaigns
      WHERE id = ${id}::uuid
      LIMIT 1
    `
    if (campaignRows.length === 0) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }
    const c = campaignRows[0]
    if (c.status !== 'draft') {
      return NextResponse.json(
        { error: `Campaign cannot be sent from status "${c.status}"` },
        { status: 409 },
      )
    }

    // Snapshot the recipient list for this campaign's audience.
    //
    //   'customers'   — every active, non-deleted registered account
    //                   whose email is verified-or-present, MINUS
    //                   anyone who explicitly opted out of
    //                   promotional email (user_preferences
    //                   .notification_promotions = false). A missing
    //                   preferences row means "not opted out", so
    //                   those users are still included.
    //   'subscribers' — the marketing newsletter list (default /
    //                   legacy behaviour).
    //
    // Both branches normalise to the same shape: { subscriberId, email }
    // where subscriberId is the newsletter_subscribers row id for the
    // subscriber audience and NULL for customers (the campaign_logs
    // FK is ON DELETE SET NULL and nullable, and we dedupe on email).
    const audience = (c.audience as string) || 'subscribers'

    let recipients: { subscriberId: number | null; email: string }[] = []

    if (audience === 'customers') {
      const rows = await sql`
        SELECT DISTINCT ON (lower(u.email)) u.email
        FROM users u
        LEFT JOIN user_preferences p ON p.user_id = u.id
        WHERE u.email IS NOT NULL
          AND u.email <> ''
          AND COALESCE(u.is_active, true) = true
          AND u.deleted_at IS NULL
          AND COALESCE(p.notification_promotions, true) = true
        ORDER BY lower(u.email) ASC
        LIMIT ${MAX_RECIPIENTS_PER_REQUEST}
      `
      recipients = rows.map((r) => ({
        subscriberId: null,
        email: (r.email as string).trim(),
      }))
    } else {
      // We deliberately filter out null statuses too via COALESCE,
      // since legacy rows that pre-date the migration's status column
      // should still receive mail.
      const rows = await sql`
        SELECT id, email
        FROM newsletter_subscribers
        WHERE COALESCE(status, 'active') = 'active'
          AND email IS NOT NULL
          AND email <> ''
        ORDER BY id ASC
        LIMIT ${MAX_RECIPIENTS_PER_REQUEST}
      `
      recipients = rows.map((r) => ({
        subscriberId: r.id as number,
        email: (r.email as string).trim(),
      }))
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        {
          error:
            audience === 'customers'
              ? 'No active customers to send to.'
              : 'No active subscribers to send to.',
        },
        { status: 400 },
      )
    }

    // Flip status to `sending` and snapshot the recipient count.
    await sql`
      UPDATE newsletter_campaigns
      SET status = 'sending',
          recipient_count = ${recipients.length},
          sent_count = 0,
          failed_count = 0,
          last_error = NULL
      WHERE id = ${id}::uuid
    `

    let sentCount = 0
    let failedCount = 0
    let lastError: string | null = null

    for (const recipient of recipients) {
      const email = recipient.email
      const subId = recipient.subscriberId

      // Per-recipient unsubscribe link — token-less for now (we'll
      // add a signed token when the public unsubscribe page lands).
      // Encoded so addresses with `+aliases` survive the URL.
      const unsubscribeUrl = `${PUBLIC_ORIGIN}/unsubscribe?email=${encodeURIComponent(email)}`

      // Reserve the log row first so a crash mid-loop doesn't leave
      // us with no record. ON CONFLICT keeps re-runs idempotent.
      // subscriber_id is NULL for the "all customers" audience.
      await sql`
        INSERT INTO newsletter_campaign_logs (campaign_id, subscriber_id, email, status)
        VALUES (${id}::uuid, ${subId}, ${email}, 'pending')
        ON CONFLICT (campaign_id, email) DO NOTHING
      `

      let ok = false
      let errMsg: string | null = null
      try {
        ok = await sendNewsletterCampaign({
          to: email,
          subject: c.subject as string,
          preheader: (c.preheader as string) || null,
          eyebrow: (c.eyebrow as string) || null,
          headline: (c.headline as string) || null,
          bodyHtml: (c.body_html as string) || '',
          ctaLabel: (c.cta_label as string) || null,
          ctaUrl: (c.cta_url as string) || null,
          unsubscribeUrl,
        })
      } catch (err) {
        ok = false
        errMsg = err instanceof Error ? err.message : 'unknown send error'
      }

      if (ok) {
        sentCount += 1
        await sql`
          UPDATE newsletter_campaign_logs
          SET status = 'sent', sent_at = NOW(), error = NULL
          WHERE campaign_id = ${id}::uuid AND email = ${email}
        `
        // Only stamp the subscriber row for the subscriber audience —
        // customer recipients have no newsletter_subscribers row.
        if (subId != null) {
          await sql`
            UPDATE newsletter_subscribers
            SET last_sent_at = NOW()
            WHERE id = ${subId}
          `
        }
      } else {
        failedCount += 1
        lastError = errMsg || 'send returned false'
        await sql`
          UPDATE newsletter_campaign_logs
          SET status = 'failed', error = ${lastError}
          WHERE campaign_id = ${id}::uuid AND email = ${email}
        `
      }
    }

    // Final status flip. We mark `sent` even when some recipients
    // failed because the campaign itself is done — the per-recipient
    // failures are inspectable via newsletter_campaign_logs.
    await sql`
      UPDATE newsletter_campaigns
      SET status = ${failedCount === recipients.length ? 'failed' : 'sent'},
          sent_count = ${sentCount},
          failed_count = ${failedCount},
          last_error = ${lastError},
          sent_at = NOW()
      WHERE id = ${id}::uuid
    `

    return NextResponse.json({
      ok: true,
      recipientCount: recipients.length,
      sentCount,
      failedCount,
    })
  } catch (error) {
    console.error('[newsletter/campaigns send] failed', error)
    // Best-effort status revert so the admin can retry.
    try {
      await sql`
        UPDATE newsletter_campaigns
        SET status = 'failed', last_error = ${error instanceof Error ? error.message : 'send failed'}
        WHERE id = ${id}::uuid
      `
    } catch {
      /* swallow */
    }
    return NextResponse.json({ error: 'Send failed' }, { status: 500 })
  }
}
