import type { NextRequest } from 'next/server'

/**
 * Canonical origin used for the X OAuth redirect URI. Prefers
 * NEXT_PUBLIC_APP_URL (must match the callback registered in the X
 * developer portal) and falls back to the request origin so the flow
 * still works when the env var is missing.
 */
export function getAppOrigin(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL
  if (configured) {
    try {
      return new URL(configured).origin
    } catch {
      /* malformed env value — fall through */
    }
  }
  return request.nextUrl.origin
}

/** Synthetic email given to X sign-ups (X doesn't share an address). */
export function xPlaceholderEmail(xUserId: string): string {
  return `x_${xUserId}@users.dermaspaceng.com`
}

export function isXPlaceholderEmail(email: string | null | undefined): boolean {
  return typeof email === 'string' && /^x_[^@]+@users\.dermaspaceng\.com$/i.test(email)
}
