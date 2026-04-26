// ---------------------------------------------------------------------------
// Upstash Redis client (singleton).
//
// Why this file exists
// --------------------
// The whole stack is moving from "Postgres for everything" toward Postgres-as-
// system-of-record + Redis-as-hot-path. We want every read that is more
// expensive than a single primary-key lookup to hit Redis first, and every
// piece of ephemeral state (rate limits, OTP attempts, idempotency keys,
// "currently online" markers, fan-out queues) to live in Redis instead of
// Postgres tables.
//
// Implementation notes
// --------------------
// * We use the **REST** client (`@upstash/redis`) rather than the TCP
//   `ioredis` client because Vercel's serverless / edge runtimes can't keep
//   long-lived TCP sockets open. The REST client is HTTP-based, works in
//   every Next.js environment (Node, edge, route handlers, server actions),
//   and is what Upstash bills as the canonical option.
// * `Redis.fromEnv()` reads `UPSTASH_REDIS_REST_URL` and
//   `UPSTASH_REDIS_REST_TOKEN` automatically. We've chosen to wrap that
//   behind a lazy singleton (`getRedis()`) so a missing env var doesn't
//   crash module evaluation at build time — we only fail when something
//   actually tries to read/write.
// * Tiny `cached()` helper implements stale-while-revalidate-style caching
//   for any async function. Cache keys live under namespaced prefixes so
//   we can SCAN+DEL them by family during invalidation without nuking
//   unrelated keys (rate limiters, sessions, etc.).
// ---------------------------------------------------------------------------

import { Redis } from "@upstash/redis"

let _client: Redis | null = null

/**
 * Lazily-initialised Upstash Redis singleton.
 *
 * Throws a clear, branded error if the env vars are missing so the issue
 * surfaces in logs/Sentry rather than as a confusing TypeError.
 */
export function getRedis(): Redis {
  if (_client) return _client

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    throw new Error(
      "[redis] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set. " +
        "Add them in Project → Settings → Environment Variables.",
    )
  }

  _client = new Redis({ url, token })
  return _client
}

// ---------------------------------------------------------------------------
// Namespaced key prefixes
// ---------------------------------------------------------------------------
// Centralising every cache namespace here means we never accidentally collide
// with another feature's keys and we can wipe a whole family with a single
// `invalidatePrefix()` call (see below).

export const KEYS = {
  // Blog
  blogPostsList: "blog:posts:list", // hashed query → JSON list
  blogPostBySlug: "blog:post:slug", // <slug> → post JSON
  blogCategories: "blog:categories:all", // single JSON
  blogRelated: "blog:related", // <slug> → JSON list

  // Site-wide hot reads. Each one corresponds to a query that runs on
  // EVERY page render (or near it), so caching them in Redis is the
  // single biggest perf win we can make against Postgres.
  featureFlags: "flags:all", // single JSON — `feature_flags` table
  banners: "banners", // <scope> → array of active banners
  services: "services:all", // single JSON — full services catalog
  serviceBySlug: "services:slug", // <slug> → service JSON
  adminStats: "admin:stats", // single JSON — admin dashboard aggregate
  staffDashboard: "staff:dashboard", // single JSON — staff dashboard aggregate
  sessionLookup: "session", // <sessionId> → { userId, expiresAt }

  // The signed-in user's hydrated profile blob — exactly the JSON
  // shape returned by /api/auth/me. Keyed by USER ID (not session
  // ID) so a profile update on one device invalidates the cache
  // for ALL of that user's logged-in sessions/devices in one
  // call. TTL is short (60s) so even a missed invalidation only
  // shows stale data for a minute.
  userMe: "user:me", // <userId> → JSON

  // Rate limiting + abuse mitigation
  rateLimit: "rl", // <bucket>:<id> → integer count
  loginFailures: "auth:fail", // <identifier> → integer count (sticky window)
  voucherProbes: "voucher:probe", // <ip> → integer count (brute force guard)
} as const

// ---------------------------------------------------------------------------
// Generic cache wrapper
// ---------------------------------------------------------------------------

/**
 * Wraps an async producer with a Redis-backed cache.
 *
 * Behaviour:
 *   1. Try GET <key>. If it's a hit, parse and return.
 *   2. Otherwise call `producer()`, store the result with `EX ttlSeconds`,
 *      and return it.
 *
 * If Redis itself fails (network, quota, etc.) we **fall back to the
 * producer** rather than throw — caching is never allowed to break a page
 * for a real visitor. The error is logged so Sentry / the platform can
 * surface it.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  producer: () => Promise<T>,
): Promise<T> {
  let redis: Redis
  try {
    redis = getRedis()
  } catch (err) {
    console.warn("[redis] disabled, calling producer directly:", err)
    return producer()
  }

  try {
    // The Upstash REST client auto-deserialises JSON written via `set`,
    // so `hit` already comes back as the original shape (object/array).
    const hit = await redis.get<T>(key)
    if (hit !== null && hit !== undefined) {
      return hit as T
    }
  } catch (err) {
    console.warn(`[redis] GET failed for ${key}:`, err)
  }

  const fresh = await producer()

  try {
    await redis.set(key, fresh as unknown as object, { ex: ttlSeconds })
  } catch (err) {
    console.warn(`[redis] SET failed for ${key}:`, err)
  }

  return fresh
}

/**
 * Delete every key matching `prefix*`. Used after writes to invalidate
 * a whole family (e.g. all `blog:posts:list:*` query variants when a
 * post is published).
 *
 * Uses SCAN + UNLINK in a small loop so we never block the Redis main
 * thread on KEYS for large keyspaces.
 */
export async function invalidatePrefix(prefix: string): Promise<void> {
  let redis: Redis
  try {
    redis = getRedis()
  } catch {
    return
  }

  let cursor: string | number = 0
  try {
    do {
      const [next, batch] = (await redis.scan(cursor, {
        match: `${prefix}*`,
        count: 200,
      })) as [string | number, string[]]
      cursor = next
      if (batch.length > 0) {
        // `unlink` is the non-blocking, async equivalent of `del`. Falls
        // back to del transparently on older Redis versions.
        await redis.del(...batch)
      }
    } while (cursor !== "0" && cursor !== 0)
  } catch (err) {
    console.warn(`[redis] invalidatePrefix(${prefix}) failed:`, err)
  }
}

/**
 * Convenience: blow away every blog cache family in one call. Cheaper to
 * call this than to remember every prefix at every write site.
 */
export async function invalidateBlog(): Promise<void> {
  await Promise.all([
    invalidatePrefix(KEYS.blogPostsList),
    invalidatePrefix(KEYS.blogPostBySlug),
    invalidatePrefix(KEYS.blogRelated),
    invalidatePrefix(KEYS.blogCategories),
  ])
}

// ---------------------------------------------------------------------------
// Tiny rate-limit primitive
// ---------------------------------------------------------------------------
// We don't pull in `@upstash/ratelimit` because the brand wants minimal
// dependencies and our needs are simple: "max N writes per M seconds per
// IP/user". `INCR` + `EXPIRE` on first hit is the textbook pattern.

export async function rateLimit(
  bucket: string,
  identifier: string,
  limit: number,
  windowSeconds: number,
): Promise<{ ok: boolean; remaining: number; resetAt: number }> {
  const key = `${KEYS.rateLimit}:${bucket}:${identifier}`
  const now = Math.floor(Date.now() / 1000)

  let redis: Redis
  try {
    redis = getRedis()
  } catch {
    // Fail-open when Redis is unavailable — better to let the request
    // through than to break the whole site over a missing env var.
    return { ok: true, remaining: limit, resetAt: now + windowSeconds }
  }

  try {
    const count = await redis.incr(key)
    if (count === 1) {
      // First hit in this window — set the expiry so the counter resets.
      await redis.expire(key, windowSeconds)
    }
    const ttl = await redis.ttl(key)
    return {
      ok: count <= limit,
      remaining: Math.max(0, limit - count),
      resetAt: now + (ttl > 0 ? ttl : windowSeconds),
    }
  } catch (err) {
    console.warn(`[redis] rateLimit(${bucket}, ${identifier}) failed:`, err)
    return { ok: true, remaining: limit, resetAt: now + windowSeconds }
  }
}

/**
 * Build a stable cache key from any JSON-serialisable filter object.
 * We sort keys so `{a:1,b:2}` and `{b:2,a:1}` hit the same cache entry.
 */
export function cacheKey(prefix: string, params: Record<string, unknown>): string {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${String(params[k] ?? "")}`)
    .join("&")
  return `${prefix}:${sorted}`
}

// ---------------------------------------------------------------------------
// Direct key-value helpers
// ---------------------------------------------------------------------------
// These exist alongside `cached()` for the cases where the caller already
// holds the value (e.g. just wrote it to Postgres) and wants to push it to
// Redis without going through a producer. Both fail-soft: a Redis hiccup
// must never break a real user request.

export async function getJson<T>(key: string): Promise<T | null> {
  try {
    const r = getRedis()
    const v = await r.get<T>(key)
    return (v ?? null) as T | null
  } catch (err) {
    console.warn(`[redis] getJson(${key}) failed:`, err)
    return null
  }
}

export async function setJson<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  try {
    const r = getRedis()
    await r.set(key, value as unknown as object, { ex: ttlSeconds })
  } catch (err) {
    console.warn(`[redis] setJson(${key}) failed:`, err)
  }
}

export async function delKey(key: string): Promise<void> {
  try {
    const r = getRedis()
    await r.del(key)
  } catch (err) {
    console.warn(`[redis] delKey(${key}) failed:`, err)
  }
}

/**
 * Atomic INCR-with-TTL. Used by sticky counters like login-failure
 * trackers where we want to KEEP counting across a rolling window even
 * if the counter has already crossed the limit (so the user gets
 * locked out until the window resets).
 *
 * Returns the new count. Falls back to 0 on Redis errors so the caller
 * fail-opens on infrastructure issues.
 */
/**
 * Wipe the cached `/api/auth/me` payload for a user. Call this from
 * any endpoint that mutates the user row (profile edit, password
 * change, username change, email verification, etc.) so the next
 * /api/auth/me request rebuilds the JOIN against fresh data.
 *
 * Safe to call without awaiting — fail-soft on Redis hiccups.
 */
export async function invalidateUserMe(userId: string): Promise<void> {
  await delKey(`${KEYS.userMe}:${userId}`)
}

export async function incrWithTtl(key: string, ttlSeconds: number): Promise<number> {
  try {
    const r = getRedis()
    const count = await r.incr(key)
    if (count === 1) await r.expire(key, ttlSeconds)
    return count
  } catch (err) {
    console.warn(`[redis] incrWithTtl(${key}) failed:`, err)
    return 0
  }
}
