import type { NextRequest } from 'next/server'

/**
 * Resolve the app's public base URL for redirects and payment
 * callback URLs.
 *
 * Priority:
 *   1. NEXT_PUBLIC_APP_URL — explicit operator configuration wins
 *      (use this in production so emails/webhooks always point at
 *      the canonical domain).
 *   2. x-forwarded-host / x-forwarded-proto — what the user's browser
 *      actually hit, set by Vercel and most proxies. This keeps
 *      preview deployments and local dev working without any config.
 *   3. The request URL's own origin as a last resort.
 *
 * Previously every payment route hard-required NEXT_PUBLIC_APP_URL;
 * when it was unset, Paystack callback URLs were literally
 * "undefined/api/wallet/verify?..." so the browser redirect after
 * checkout never reached us and transactions sat at "pending"
 * forever. Deriving from the request fixes that class of bug.
 */
export function getBaseUrl(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
  if (configured) return configured

  const host =
    request.headers.get('x-forwarded-host') || request.headers.get('host')
  if (host) {
    const proto =
      request.headers.get('x-forwarded-proto') ||
      (host.startsWith('localhost') || host.startsWith('127.')
        ? 'http'
        : 'https')
    return `${proto}://${host}`
  }

  return request.nextUrl.origin
}
