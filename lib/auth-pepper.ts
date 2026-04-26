/**
 * Server-side password pepper.
 *
 * A "pepper" is a secret value mixed into every password before it
 * is hashed with bcrypt. Unlike a salt — which is stored next to the
 * hash in the database — the pepper lives in the application
 * environment (`AUTH_PEPPER`) and never touches the database.
 *
 * Threat model this defends against:
 *   * **Database-only compromise.** If an attacker dumps the `users`
 *     table but never touches our environment (e.g. via SQL
 *     injection or a leaked DB backup), they cannot run an offline
 *     bcrypt-cracking attack because their guesses never include
 *     the pepper. Even short / weak passwords become uncrackable.
 *
 * What this does NOT defend against:
 *   * Full server compromise (attacker has both DB and env).
 *   * Phishing / credential stuffing (the user types the password
 *     into a hostile form).
 *
 * `AUTH_PEPPER` is OPTIONAL. If unset (e.g. local dev), we silently
 * fall through to vanilla bcrypt so the app keeps working. In
 * production it should be a 32+ byte random string set in the
 * Vercel project's environment variables and rotated only via a
 * planned password-rehash migration.
 */

const PEPPER = process.env.AUTH_PEPPER || ''

/** True when AUTH_PEPPER is configured. Useful for diagnostics. */
export const HAS_PEPPER = PEPPER.length > 0

/**
 * Mix the pepper into the password before bcrypt sees it. Always
 * apply this on BOTH hash and verify paths so the round-trips line
 * up — `verifyPassword(applyPepper(pw), hash)` succeeds iff the
 * hash was generated with the same pepper.
 */
export function applyPepper(password: string): string {
  return PEPPER ? `${password}${PEPPER}` : password
}
