/**
 * Web Push notifications
 *
 * Wraps the `web-push` library with a thin, fail-soft API. If VAPID
 * keys aren't configured in the environment, or if we are executing inside
 * a Vercel preview deployment, every send becomes a no-op so preview
 * deployments never emit push notifications and never dispatch pushes to
 * `*.vercel.app` / legacy non-canonical subscriptions.
 *
 * Env vars (set them on Vercel):
 *   VAPID_PUBLIC_KEY    — base64url public key
 *   VAPID_PRIVATE_KEY   — base64url private key
 *   VAPID_SUBJECT       — "mailto:you@example.com" or your canonical site URL
 *
 * Run `node scripts/generate-vapid.mjs` to mint a fresh pair.
 */

import { sql } from './db'
import {
  filterValidPushSubscriptions,
  isPreviewDeploymentEnv,
  isValidWebPushEndpoint,
  sanitizePushActionUrl,
  sanitizeVapidSubject,
} from './push-origin'

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
let ensuredSchema = false

export async function ensurePushSchema() {
  if (ensuredSchema) return
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id TEXT NOT NULL,
        endpoint TEXT UNIQUE NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        user_agent TEXT,
        origin TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `
    await sql`ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS origin TEXT`
    await sql`ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
    ensuredSchema = true
  } catch {
    // Non-fatal: continue with best-effort query
  }
}

function subscriptionFilterOptions() {
  return {
    configuredAppUrl: process.env.NEXT_PUBLIC_APP_URL,
    allowLocalhost: !isPreviewDeploymentEnv(),
  }
}

function getVapid() {
  if (isPreviewDeploymentEnv()) {
    return null
  }
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = sanitizeVapidSubject(process.env.VAPID_SUBJECT)
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
  if (isPreviewDeploymentEnv()) return false
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}

export function getPublicVapidKey(): string | null {
  if (isPreviewDeploymentEnv()) return null
  return process.env.VAPID_PUBLIC_KEY || null
}

type Subscription = {
  id: string
  endpoint: string
  p256dh: string
  auth: string
  user_id: string | null
  origin: string | null
}

async function deleteSubscriptionById(id: string) {
  try {
    await sql`DELETE FROM push_subscriptions WHERE id = ${id}`
  } catch (err) {
    console.warn('[push] failed to delete subscription', id, err)
  }
}

async function sendToSubscription(
  webpush: typeof import('web-push'),
  sub: Subscription,
  payload: PushPayload,
): Promise<{ ok: boolean; expired?: boolean }> {
  if (!isValidWebPushEndpoint(sub.endpoint)) {
    return { ok: false, expired: true }
  }
  const safePayload: PushPayload = {
    ...payload,
    url: sanitizePushActionUrl(payload.url),
  }
  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(safePayload),
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

/**
 * Remove any stored push subscriptions whose origin is missing or belongs to
 * a Vercel preview / non-canonical host so those devices stop receiving
 * notifications showing a preview origin.
 */
export async function purgeNonCanonicalPushSubscriptions(): Promise<number> {
  await ensurePushSchema()
  const subs = (await sql`
    SELECT id, origin
    FROM push_subscriptions
  `) as unknown as Array<{ id: string; origin: string | null }>

  const { stale } = filterValidPushSubscriptions(subs, subscriptionFilterOptions())
  for (const sub of stale) {
    await deleteSubscriptionById(sub.id)
  }
  return stale.length
}

/** Send a push to every canonical subscription for a given user id. */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (isPreviewDeploymentEnv()) return { sent: 0, removed: 0 }
  const webpush = await loadWebPush()
  if (!webpush) return { sent: 0, removed: 0 }

  await ensurePushSchema()
  const subs = (await sql`
    SELECT id, endpoint, p256dh, auth, user_id, origin
    FROM push_subscriptions
    WHERE user_id = ${userId}
  `) as unknown as Subscription[]

  const { valid, stale } = filterValidPushSubscriptions(
    subs,
    subscriptionFilterOptions(),
  )

  let sent = 0
  let removed = 0
  for (const staleSub of stale) {
    await deleteSubscriptionById(staleSub.id)
    removed++
  }

  for (const sub of valid) {
    const res = await sendToSubscription(webpush, sub, payload)
    if (res.ok) sent++
    if (res.expired) {
      await deleteSubscriptionById(sub.id)
      removed++
    }
  }
  return { sent, removed }
}

/** Send a push to *every* canonical subscriber. Used by admin broadcasts. */
export async function sendPushToAll(payload: PushPayload) {
  if (isPreviewDeploymentEnv()) return { sent: 0, removed: 0, total: 0 }
  const webpush = await loadWebPush()
  if (!webpush) return { sent: 0, removed: 0, total: 0 }

  await ensurePushSchema()
  const subs = (await sql`
    SELECT id, endpoint, p256dh, auth, user_id, origin
    FROM push_subscriptions
  `) as unknown as Subscription[]

  const { valid, stale } = filterValidPushSubscriptions(
    subs,
    subscriptionFilterOptions(),
  )

  let sent = 0
  let removed = 0
  for (const staleSub of stale) {
    await deleteSubscriptionById(staleSub.id)
    removed++
  }

  // Send concurrently, capped at 10 in flight to avoid hammering FCM.
  const queue = valid.slice()
  const workers = Array.from({ length: Math.min(10, queue.length) }, async () => {
    while (queue.length) {
      const sub = queue.shift()
      if (!sub) break
      const res = await sendToSubscription(webpush, sub, payload)
      if (res.ok) sent++
      if (res.expired) {
        await deleteSubscriptionById(sub.id)
        removed++
      }
    }
  })
  await Promise.all(workers)
  return { sent, removed, total: valid.length }
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
