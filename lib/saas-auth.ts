import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import { saasSql, ensureSaasSchema } from '@/lib/saas-db'

// ---------------------------------------------------------------------------
// lib/saas-auth.ts
//
// Authentication for the Derma AI SaaS tenant dashboard. This is a
// SEPARATE identity system from the main Dermaspace `users` table — a
// company that licenses Derma AI is not a spa customer. All tenant data
// lives in the DEDICATED SaaS database (SAAS_DATABASE_URL). Sessions are
// stored in derma_saas_sessions and carried in the `saas_session` cookie.
// ---------------------------------------------------------------------------

export const SAAS_SESSION_COOKIE = 'saas_session'
const SESSION_TTL_DAYS = 30
export const SAAS_PLAN_PRICE_NAIRA = 35000
export const SAAS_TRIAL_DAYS = 3

export interface Tenant {
  id: string
  company_name: string
  contact_name: string
  contact_email: string
  public_key: string
  status: 'pending' | 'trial' | 'active' | 'suspended'
  plan_price_kobo: number
  subscription_expires_at: string | null
  trial_ends_at: string | null
  brand_name: string
  assistant_name: string
  brand_color: string
  welcome_message: string
  logo_url: string | null
  business_context: string | null
  launcher_label: string
  allowed_domains: string | null
  created_at: string
  activated_at: string | null
}

// Lazy fragment: only touches the SaaS client when a query actually runs.
const tenantColumns = () => saasSql`
  id, company_name, contact_name, contact_email, public_key, status,
  plan_price_kobo, subscription_expires_at, trial_ends_at, brand_name, assistant_name,
  brand_color, welcome_message, logo_url, business_context, launcher_label,
  allowed_domains, created_at, activated_at
`

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validateEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim())
}

export function validatePassword(password: string): string | null {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters.'
  }
  return null
}

export function generatePublicKey(): string {
  // URL-safe, non-secret identifier embedded in customer HTML.
  return 'dk_' + randomBytes(18).toString('hex')
}

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 12)
}

export async function createTenant(data: {
  companyName: string
  contactName: string
  contactEmail: string
  password: string
}): Promise<{ tenant: Tenant | null; error: string | null }> {
  const email = data.contactEmail.trim().toLowerCase()
  if (!validateEmail(email)) {
    return { tenant: null, error: 'Please enter a valid email address.' }
  }
  const pwError = validatePassword(data.password)
  if (pwError) {
    return { tenant: null, error: pwError }
  }
  try {
    await ensureSaasSchema()
    const existing = await saasSql`SELECT id FROM derma_saas_tenants WHERE contact_email = ${email}`
    if (existing.length > 0) {
      return { tenant: null, error: 'An account with this email already exists.' }
    }
    const passwordHash = await hashPassword(data.password)
    const publicKey = generatePublicKey()

    // Every new account starts on a free trial with the widget fully live.
    const trialEndsAt = new Date(Date.now() + SAAS_TRIAL_DAYS * 24 * 60 * 60 * 1000)

    const rows = await saasSql`
      INSERT INTO derma_saas_tenants (
        company_name, contact_name, contact_email, password_hash, public_key,
        brand_name, assistant_name, welcome_message, status, trial_ends_at
      )
      VALUES (
        ${data.companyName.trim()}, ${data.contactName.trim()}, ${email},
        ${passwordHash}, ${publicKey},
        ${data.companyName.trim()}, 'Assistant',
        ${'Hi! Welcome to ' + data.companyName.trim() + '. How can I help you today?'},
        'trial', ${trialEndsAt.toISOString()}
      )
      RETURNING ${tenantColumns()}
    `
    return { tenant: rows[0] as Tenant, error: null }
  } catch (err) {
    console.error('[saas-auth] createTenant failed:', err)
    return { tenant: null, error: 'Could not create your account. Please try again.' }
  }
}

/**
 * "Login with Dermaspace" — find (or create) the SaaS tenant that belongs
 * to a main-site Dermaspace user. Lookup order:
 *   1. tenant already linked via dermaspace_user_id
 *   2. tenant whose contact_email matches (link it now)
 *   3. brand-new tenant on a fresh 3-day trial
 * The tenant gets a random, unusable password hash when created this way —
 * these accounts always sign in through Dermaspace.
 */
export async function findOrCreateTenantForDermaspaceUser(user: {
  id: string
  email: string
  firstName: string
  lastName: string
}): Promise<{ tenant: Tenant | null; error: string | null }> {
  const email = user.email.trim().toLowerCase()
  try {
    await ensureSaasSchema()

    // 1. Already linked.
    const linked = await saasSql`
      SELECT ${tenantColumns()} FROM derma_saas_tenants
      WHERE dermaspace_user_id = ${user.id}
    `
    if (linked.length > 0) return { tenant: linked[0] as Tenant, error: null }

    // 2. Same email — link the existing tenant to this Dermaspace account.
    const byEmail = await saasSql`
      SELECT ${tenantColumns()} FROM derma_saas_tenants
      WHERE contact_email = ${email} AND dermaspace_user_id IS NULL
    `
    if (byEmail.length > 0) {
      const rows = await saasSql`
        UPDATE derma_saas_tenants
        SET dermaspace_user_id = ${user.id}, updated_at = NOW()
        WHERE id = ${(byEmail[0] as Tenant).id}
        RETURNING ${tenantColumns()}
      `
      return { tenant: rows[0] as Tenant, error: null }
    }

    // 3. Create a new tenant on a fresh trial.
    const fullName = `${user.firstName} ${user.lastName}`.trim() || 'Dermaspace member'
    const companyName = fullName
    const passwordHash = await hashPassword(randomBytes(32).toString('hex'))
    const publicKey = generatePublicKey()
    const trialEndsAt = new Date(Date.now() + SAAS_TRIAL_DAYS * 24 * 60 * 60 * 1000)

    const rows = await saasSql`
      INSERT INTO derma_saas_tenants (
        company_name, contact_name, contact_email, password_hash, public_key,
        brand_name, assistant_name, welcome_message, status, trial_ends_at,
        dermaspace_user_id
      )
      VALUES (
        ${companyName}, ${fullName}, ${email},
        ${passwordHash}, ${publicKey},
        ${companyName}, 'Assistant',
        ${'Hi! Welcome to ' + companyName + '. How can I help you today?'},
        'trial', ${trialEndsAt.toISOString()}, ${user.id}
      )
      RETURNING ${tenantColumns()}
    `
    return { tenant: rows[0] as Tenant, error: null }
  } catch (err) {
    console.error('[saas-auth] findOrCreateTenantForDermaspaceUser failed:', err)
    return { tenant: null, error: 'Could not sign in with Dermaspace. Please try again.' }
  }
}

export async function authenticateTenant(
  email: string,
  password: string,
): Promise<{ tenant: Tenant | null; error: string | null }> {
  try {
    await ensureSaasSchema()
    const rows = await saasSql`
      SELECT id, password_hash FROM derma_saas_tenants
      WHERE contact_email = ${email.trim().toLowerCase()}
    `
    if (rows.length === 0) {
      return { tenant: null, error: 'Invalid email or password.' }
    }
    const ok = await bcrypt.compare(password, rows[0].password_hash as string)
    if (!ok) {
      return { tenant: null, error: 'Invalid email or password.' }
    }
    const tenant = await getTenantById(rows[0].id as string)
    return { tenant, error: tenant ? null : 'Account not found.' }
  } catch (err) {
    console.error('[saas-auth] authenticateTenant failed:', err)
    return { tenant: null, error: 'Sign in failed. Please try again.' }
  }
}

export async function getTenantById(id: string): Promise<Tenant | null> {
  try {
    const rows = await saasSql`SELECT ${tenantColumns()} FROM derma_saas_tenants WHERE id = ${id}`
    return (rows[0] as Tenant) ?? null
  } catch (err) {
    console.error('[saas-auth] getTenantById failed:', err)
    return null
  }
}

export async function getTenantByPublicKey(publicKey: string): Promise<Tenant | null> {
  try {
    await ensureSaasSchema()
    const rows = await saasSql`SELECT ${tenantColumns()} FROM derma_saas_tenants WHERE public_key = ${publicKey}`
    return (rows[0] as Tenant) ?? null
  } catch (err) {
    console.error('[saas-auth] getTenantByPublicKey failed:', err)
    return null
  }
}

export async function createTenantSession(tenantId: string): Promise<string> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000)
  const rows = await saasSql`
    INSERT INTO derma_saas_sessions (tenant_id, expires_at)
    VALUES (${tenantId}, ${expiresAt.toISOString()})
    RETURNING id
  `
  return rows[0].id as string
}

export async function setTenantSessionCookie(sessionId: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SAAS_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  })
}

export async function getCurrentTenant(): Promise<Tenant | null> {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get(SAAS_SESSION_COOKIE)?.value
    if (!sessionId) return null
    await ensureSaasSchema()
    const rows = await saasSql`
      SELECT tenant_id FROM derma_saas_sessions
      WHERE id = ${sessionId} AND expires_at > NOW()
    `
    if (rows.length === 0) return null
    return getTenantById(rows[0].tenant_id as string)
  } catch (err) {
    console.error('[saas-auth] getCurrentTenant failed:', err)
    return null
  }
}

export async function destroyTenantSession(): Promise<void> {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get(SAAS_SESSION_COOKIE)?.value
    if (sessionId) {
      await saasSql`DELETE FROM derma_saas_sessions WHERE id = ${sessionId}`
    }
    cookieStore.delete(SAAS_SESSION_COOKIE)
  } catch {
    /* best-effort */
  }
}

/** True when the tenant is on a free trial that has not yet expired. */
export function isTenantOnTrial(t: Tenant): boolean {
  return (
    t.status === 'trial' &&
    !!t.trial_ends_at &&
    new Date(t.trial_ends_at).getTime() > Date.now()
  )
}

/** Days remaining on the trial, rounded up. 0 when expired or not on trial. */
export function trialDaysLeft(t: Tenant): number {
  if (!t.trial_ends_at) return 0
  const ms = new Date(t.trial_ends_at).getTime() - Date.now()
  return ms > 0 ? Math.ceil(ms / (24 * 60 * 60 * 1000)) : 0
}

/** True when the tenant may serve live widget traffic (paid or trialing). */
export function isTenantActive(t: Tenant): boolean {
  if (isTenantOnTrial(t)) return true
  if (t.status !== 'active') return false
  if (t.subscription_expires_at) {
    return new Date(t.subscription_expires_at).getTime() > Date.now()
  }
  return true
}
