/**
 * Derma AI "dynamic intent" links.
 *
 * Lets the assistant hand a user off to /signin or /signup,
 * remember WHAT they were trying to do, and pick up the request
 * automatically once they're signed in — even if the auth flow
 * bounces them through OAuth callbacks (Google, X), 2FA, or
 * email verification.
 *
 * How it works
 * ------------
 *   1. The user types "what's my wallet balance?" while signed
 *      out. Derma AI calls `/api/derma/intent/store` with that
 *      query, which signs a short-lived JWT and writes it as an
 *      HttpOnly cookie. The user is then sent to /signin?from=derma.
 *
 *   2. They sign in by ANY path — email/password, Google, X,
 *      passkey, or 2FA. The cookie travels with them; the auth
 *      flows themselves don't need to know about it.
 *
 *   3. When the post-login page mounts, the global
 *      `<DermaIntentResumer />` reads `/api/derma/intent/consume`,
 *      receives the original payload, clears the cookie, and
 *      dispatches `derma:resume-intent` on `window`.
 *
 *   4. Derma AI listens for that event, opens its panel,
 *      acknowledges the user by name ("You're now signed in,
 *      picking up where we left off…"), and re-submits the
 *      original query with full account access.
 *
 * Why a JWT?
 * ----------
 * Survives full-page navigation, can't be tampered with by the
 * user, and doesn't need a DB roundtrip. 15-minute lifetime
 * because if the user took longer than that to sign up, the
 * intent is probably stale.
 */

import { sign, verify } from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

/** HttpOnly cookie that carries the signed intent. */
export const DERMA_INTENT_COOKIE = 'derma_intent'

/** Cookie lifetime in seconds (15 minutes). */
export const DERMA_INTENT_TTL_SECONDS = 15 * 60

export type DermaIntentFlow = 'signin' | 'signup'

export interface DermaIntent {
  /** The original message the user tried to send Derma AI. May be
   *  empty when the user clicked a generic "Sign in to Derma" CTA
   *  with no specific question pending. */
  query: string
  /** Always 'derma' today; left as a discriminator so we can add
   *  other origins (e.g. floating sidebar, email link) later. */
  source: 'derma'
  /** Where to land the user after auth. Usually the page they
   *  were on when Derma was open. */
  returnTo: string
  /** Which auth flow the user was sent through. Lets us tailor
   *  the welcome banner copy ("you're now signed in" vs "your
   *  account is ready"). */
  flow: DermaIntentFlow
  /** Wall-clock timestamp the intent was created. Used by the
   *  resumer for stale-intent detection beyond the JWT exp. */
  createdAt: number
}

/** Sign a new intent JWT. */
export function signIntent(payload: Omit<DermaIntent, 'createdAt'>): string {
  return sign(
    { ...payload, createdAt: Date.now() } satisfies DermaIntent,
    SECRET,
    { expiresIn: DERMA_INTENT_TTL_SECONDS },
  )
}

/** Verify a stored intent JWT. Returns null on any failure
 *  (expired, tampered, malformed). */
export function verifyIntent(token: string | undefined | null): DermaIntent | null {
  if (!token) return null
  try {
    const decoded = verify(token, SECRET) as DermaIntent
    // Defensive: ensure the shape is what we expect even if an
    // older signing format ever leaks through.
    if (
      typeof decoded === 'object' &&
      decoded !== null &&
      typeof decoded.query === 'string' &&
      decoded.source === 'derma' &&
      (decoded.flow === 'signin' || decoded.flow === 'signup')
    ) {
      return decoded
    }
    return null
  } catch {
    return null
  }
}
