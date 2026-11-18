import type { NextResponse } from 'next/server'
import {
  getClientReadableCookieOptions,
  type CookieRequestHint,
} from '@/lib/cookie-options'

/**
 * Non-sensitive client-readable cookie storing ONLY the signed-in user's
 * opaque UUID (`users.id`).
 *
 * Never used for authentication or authorization on the server (`session_id`
 * HttpOnly cookie remains the sole source of truth). Its only job is to let
 * client-side first-paint cache (`lib/auth-cache.ts`) immediately detect
 * when the active session belongs to a different account (e.g. admin →
 * client impersonation, OAuth account switch, logout) and purge stale
 * avatar/name/role data BEFORE a single frame paints.
 */
export const AUTH_UID_COOKIE = 'ds_auth_uid'

const THIRTY_DAYS_SEC = 60 * 60 * 24 * 30

export function applyAuthUidCookie(
  response: NextResponse,
  userId: string,
  request?: CookieRequestHint,
  maxAgeSeconds: number = THIRTY_DAYS_SEC,
): void {
  if (!userId) return
  response.cookies.set(
    AUTH_UID_COOKIE,
    userId,
    getClientReadableCookieOptions({ maxAge: maxAgeSeconds }, request),
  )
}

export function clearAuthUidCookie(
  response: NextResponse,
  request?: CookieRequestHint,
): void {
  response.cookies.set(
    AUTH_UID_COOKIE,
    '',
    getClientReadableCookieOptions({ maxAge: 0, expires: new Date(0) }, request),
  )
}
