/**
 * Web Push notifications
 *
 * Wraps the `web-push` library with a thin, fail-soft API. If VAPID
 * keys aren't configured in the environment, every send becomes a
 * no-op (logged once) so the rest of the app keeps working — pushes
 * are always best-effort.
 *
 * Env vars (set them on Vercel):
 *   VAPID_PUBLIC_KEY    — base64url public key
 *   VAPID_PRIVATE_KEY   — base64url private key
 *   VAPID_SUBJECT       — "mailto:you@example.com" or your site URL
 *
 * Run `node scripts/generate-vapid.mjs` to mint a fresh pair.
 */

import { sql } from './db'

export type PushPayload = {
  title: string
  body: string
  url?: string
  /** Notification icon (defaults to brand). */
  icon?: string
  /** Tag — newer notifications with the same tag replace older ones. */
  tag?: string
}

let warnedMissing = false

function getVapid() {
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:info@dermaspaceng.com'
  if (!publicKey || !privateKey) {
    if (!warnedMissing) {
      console.warn('[push] VAPID keys not configured — push notifications disabled')
      warnedMissing = true
    }
    return null
  }
  return { publicKey, privateKey, subject }
}

export function isPushConfigured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}

export function getPublicVapidKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null
}

type Subscription = {
  id: string
  endpoint: string
  p256dh: string
  auth: string
  user_id: string | null
}

async function sendToSubscription(
  webpush: typeof import('web-push'),
  sub: Subscription,
  payload: PushPayload,
): Promise<{ ok: boolean; expired?: boolean }> {
  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24 }, // 24h — old notifications aren't worth delivering
    )
    return { ok: true }
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode
    // 404 / 410 = subscription expired or unsubscribed.
    if (status === 404 || status === 410) {
      return { ok: false, expired: true }
    }
    console.error('[push] sendNotification failed', status, err)
    return { ok: false }
  }
}

async function loadWebPush() {
  const vapid = getVapid()
  if (!vapid) return null
  // Dynamic import so projects without web-push installed still build.
  const mod = await import('web-push').catch(() => null)
  if (!mod) {
    if (!warnedMissing) {
      console.warn('[push] `web-push` package not installed')
      warnedMissing = true
    }
    return null
  }
  const webpush = (mod as unknown as { default?: typeof import('web-push') }).default || mod
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey)
  return webpush
}

/** Send a push to every subscription for a given user id. */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  const webpush = await loadWebPush()
  if (!webpush) return { sent: 0, removed: 0 }

  const subs = (await sql`
    SELECT id, endpoint, p256dh, auth, user_id
    FROM push_subscriptions
    WHERE user_id = ${userId}
  `) as unknown as Subscription[]

  let sent = 0
  let removed = 0
  for (const sub of subs) {
    const res = await sendToSubscription(webpush, sub, payload)
    if (res.ok) sent++
    if (res.expired) {
      await sql`DELETE FROM push_subscriptions WHERE id = ${sub.id}`
      removed++
    }
  }
  return { sent, removed }
}

/** Send a push to *every* subscriber. Used by admin broadcasts. */
export async function sendPushToAll(payload: PushPayload) {
  const webpush = await loadWebPush()
  if (!webpush) return { sent: 0, removed: 0, total: 0 }

  const subs = (await sql`
    SELECT id, endpoint, p256dh, auth, user_id
    FROM push_subscriptions
  `) as unknown as Subscription[]

  let sent = 0
  let removed = 0
  // Send concurrently, capped at 10 in flight to avoid hammering FCM.
  const queue = subs.slice()
  const workers = Array.from({ length: Math.min(10, queue.length) }, async () => {
    while (queue.length) {
      const sub = queue.shift()
      if (!sub) break
      const res = await sendToSubscription(webpush, sub, payload)
      if (res.ok) sent++
      if (res.expired) {
        await sql`DELETE FROM push_subscriptions WHERE id = ${sub.id}`
        removed++
      }
    }
  })
  await Promise.all(workers)
  return { sent, removed, total: subs.length }
}

/** Send a push to a list of user ids. */
export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  let sent = 0
  let removed = 0
  for (const id of userIds) {
    const res = await sendPushToUser(id, payload)
    sent += res.sent
    removed += res.removed
  }
  return { sent, removed }
}
