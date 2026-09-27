import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { sendNewsletterCampaign } from '@/lib/email'

/*
 * POST /api/admin/newsletter/campaigns/[id]/send
 *
 * Dispatch a campaign to its audience and flip it to "sent". The
 * audience is either the marketing opt-in list or every registered
 * user (see below). We do this inline (not via a queue) —
 * Dermaspace's list is small enough that a few seconds of HTTP wait
 * is fine, and it keeps the deploy footprint simple. When the list
 * outgrows that, swap the inner loop for a QStash enqueue without
 * changing the request / response shape.
 *
 * Idempotency: before each run we load the set of addresses already
 * logged `sent` for this campaign and skip them, so clicking "Send"
 * again on a partial or retried campaign only reaches the addresses
 * that haven't succeeded yet.
 */

const PUBLIC_ORIGIN =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
  'https://www.dermaspaceng.com'

// Be conservative — anything bigger than this on a single request
// risks SMTP throttling and Vercel's serverless function timeout. We
// refuse (rather than truncate) audiences above the cap so a campaign
// can never claim "sent" while silently skipping users; bigger lists
// should swap to a QStash queue.
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
    // A campaign may be (re)sent from `draft`, or retried from `failed` /
    // `sent` after a partial delivery. We never send from `sending` — that
    // means another request is already walking the list. Re-sends are
    // safe: already-delivered recipients are skipped below, so a retry
    // only reaches the addresses that failed (or never got logged) the
    // first time.
    if (c.status === 'sending') {
      return NextResponse.json(
        { error: 'Campaign is already sending' },
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
        LIMIT ${MAX_RECIPIENTS_PER_REQUEST + 1}
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
        LIMIT ${MAX_RECIPIENTS_PER_REQUEST + 1}
      `
      recipients = rows.map((r) => ({
        subscriberId: r.id as number,
        email: (r.email as string).trim(),
      }))
    }

    // We fetch one past the cap on purpose: if we get that extra row the
    // audience genuinely exceeds what a single inline request can safely
    // deliver. Refuse rather than silently truncating — otherwise the
    // campaign would report "sent" while leaving later users un-mailed.
    if (recipients.length > MAX_RECIPIENTS_PER_REQUEST) {
      return NextResponse.json(
        {
          error:
            `This audience has more than ${MAX_RECIPIENTS_PER_REQUEST} recipients. ` +
            'Split it into smaller sends (or wire the QStash queue) before blasting.',
        },
        { status: 422 },
      )
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
          last_error = NULL
      WHERE id = ${id}::uuid
    `

    // Skip anyone this campaign already delivered to. This is what makes
    // a retry (or a double-click that slipped past the status guard)
    // safe — we only touch addresses that don't yet have a `sent` log
    // row. The set is small relative to the list, so an in-memory lookup
    // keeps the hot loop free of a per-recipient SELECT.
    const deliveredRows = await sql`
      SELECT lower(email) AS email
      FROM newsletter_campaign_logs
      WHERE campaign_id = ${id}::uuid AND status = 'sent'
    `
    const alreadyDelivered = new Set(
      deliveredRows.map((r) => r.email as string),
    )

    let sentCount = 0
    let failedCount = 0
    let lastError: string | null = null

    for (const recipient of recipients) {
      const email = recipient.email
      const subId = recipient.subscriberId

      if (alreadyDelivered.has(email.toLowerCase())) {
        sentCount += 1
        continue
      }

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

    // Re-derive the final counters straight from the delivery log so a
    // retry reports lifetime totals (sent on the first pass + sent on
    // this one) rather than only what this request touched.
    const tallyRows = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'sent')::int   AS sent_count,
        COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_count
      FROM newsletter_campaign_logs
      WHERE campaign_id = ${id}::uuid
    `
    const totalSent = Number(tallyRows[0]?.sent_count ?? sentCount)
    const totalFailed = Number(tallyRows[0]?.failed_count ?? failedCount)

    // Final status flip. We mark `sent` even when some recipients
    // failed because the campaign itself is done — the per-recipient
    // failures are inspectable via newsletter_campaign_logs and can be
    // retried by sending the campaign again.
    await sql`
      UPDATE newsletter_campaigns
      SET status = ${totalSent === 0 ? 'failed' : 'sent'},
          sent_count = ${totalSent},
          failed_count = ${totalFailed},
          last_error = ${lastError},
          sent_at = NOW()
      WHERE id = ${id}::uuid
    `

    return NextResponse.json({
      ok: true,
      recipientCount: recipients.length,
      sentCount: totalSent,
      failedCount: totalFailed,
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
