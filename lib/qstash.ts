// ---------------------------------------------------------------------------
// lib/qstash.ts
//
// Upstash QStash — durable, HTTP-based message queue + scheduler.
//
// Why we use it (and not Vercel cron)
// -----------------------------------
// * Vercel cron only fires on the platform Hobby/Pro schedules, runs at
//   minute granularity, and disappears entirely if the Vercel deployment
//   is rolled back or the team's plan downgrades. QStash is hosted on
//   Upstash's own infrastructure: schedules survive redeploys, support
//   per-second precision, retry exponentially on 5xx, and emit signed
//   webhooks we verify in our route handlers.
// * For one-off scheduled events (publish a single blog post at 2026-04-26
//   09:00 Lagos time) Vercel cron is the wrong shape — you'd need a cron
//   that scans every minute. QStash lets us enqueue exactly one message
//   for the exact minute we care about.
//
// What's in this module
// ---------------------
// * `getQStash()`         — lazy singleton wrapping the official Upstash
//                            client.
// * `schedulePublish()`   — enqueue a future POST to our internal publish
//                            endpoint when an author saves a 'scheduled'
//                            post.
// * `cancelMessage()`     — cancel a previously-scheduled message when
//                            the post is edited away from 'scheduled' or
//                            deleted.
// * `verifyQStash(req)`   — verify the signature header on inbound QStash
//                            webhook requests so randoms can't fake a
//                            "publish this post now" call.
//
// Configuration
// -------------
// Reads `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, and
// `QSTASH_NEXT_SIGNING_KEY` from the env. We deliberately fail loudly if
// any are missing so misconfigured deploys never silently drop scheduled
// jobs.
// ---------------------------------------------------------------------------

import { Client, Receiver } from "@upstash/qstash"

let _client: Client | null = null
let _receiver: Receiver | null = null

export function getQStash(): Client {
  if (_client) return _client
  const token = process.env.QSTASH_TOKEN
  if (!token) {
    throw new Error(
      "[qstash] QSTASH_TOKEN is not set. Add Upstash QStash credentials in Project → Settings.",
    )
  }
  _client = new Client({ token })
  return _client
}

function getReceiver(): Receiver {
  if (_receiver) return _receiver
  const cur = process.env.QSTASH_CURRENT_SIGNING_KEY
  const next = process.env.QSTASH_NEXT_SIGNING_KEY
  if (!cur || !next) {
    throw new Error(
      "[qstash] QSTASH_CURRENT_SIGNING_KEY / QSTASH_NEXT_SIGNING_KEY are not set.",
    )
  }
  _receiver = new Receiver({ currentSigningKey: cur, nextSigningKey: next })
  return _receiver
}

// ---------------------------------------------------------------------------
// Public base URL
// ---------------------------------------------------------------------------
// QStash needs a publicly reachable URL to call back to. We prefer an
// explicit NEXT_PUBLIC_SITE_URL (so localhost devs can use a tunnel /
// staging URL) and fall back to the Vercel-provided VERCEL_URL.

function publicBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return explicit.replace(/\/+$/, "")
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return "https://www.dermaspaceng.com"
}

/**
 * Enqueue a one-off QStash message that will POST to
 * `/api/blog/publish-scheduled` exactly when `publishAt` is reached.
 *
 * Returns the QStash messageId so the caller can persist it on the
 * blog_posts row and later cancel it if the author edits/deletes.
 */
export async function schedulePublish(args: {
  postId: string
  slug: string
  publishAt: Date
}): Promise<string> {
  const qstash = getQStash()
  const url = `${publicBaseUrl()}/api/blog/publish-scheduled`

  // QStash supports both `notBefore` (unix timestamp seconds) and `delay`
  // (seconds). We use `notBefore` because authors think in absolute
  // times ("publish at 9 AM tomorrow"), not relative offsets.
  const notBefore = Math.floor(args.publishAt.getTime() / 1000)

  const res = await qstash.publishJSON({
    url,
    body: { postId: args.postId, slug: args.slug },
    notBefore,
    // Modest retry budget — our endpoint is idempotent, so a few extra
    // attempts on transient 5xx is fine but we don't want a runaway loop.
    retries: 3,
  })

  return res.messageId
}

/**
 * Cancel a previously-scheduled message. Safe to call on a stale id —
 * QStash returns 404 which we swallow.
 */
export async function cancelMessage(messageId: string | null | undefined): Promise<void> {
  if (!messageId) return
  try {
    const qstash = getQStash()
    await qstash.messages.delete(messageId)
  } catch (err) {
    // Already delivered, already cancelled, or unknown id — none of those
    // should break the user's "save" / "delete" flow.
    console.warn(`[qstash] cancelMessage(${messageId}) ignored:`, err)
  }
}

/**
 * Verify a QStash webhook. Reads the `Upstash-Signature` header and the
 * raw body; returns true on valid signatures, false otherwise.
 *
 * Use this at the top of every route that QStash calls into so attackers
 * can't trigger "publish this post" by guessing the URL.
 */
export async function verifyQStash(req: Request, rawBody: string): Promise<boolean> {
  const signature = req.headers.get("upstash-signature")
  if (!signature) return false
  try {
    const receiver = getReceiver()
    return await receiver.verify({
      signature,
      body: rawBody,
      // Optional but tightens security: the URL the message was sent to
      // must match where we're verifying it.
      url: `${publicBaseUrl()}${new URL(req.url).pathname}`,
    })
  } catch (err) {
    console.warn("[qstash] verify failed:", err)
    return false
  }
}
