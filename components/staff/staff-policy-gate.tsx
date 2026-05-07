'use client'

/**
 * <StaffPolicyGate />
 * --------------------------------------------------------------
 * One-time, deliberately short acknowledgement modal shown to a
 * staff member the first time they sign in to the staff console.
 *
 * Why a separate gate from the customer-facing legal pack
 * --------------------------------------------------------
 * The customer Terms / Privacy / Derma AI cards are written for
 * paying members and exclude /staff and /admin from their gate.
 * Staff don't need to read consumer terms — what they need is a
 * very brief, role-specific reminder of how to behave with
 * customer data + a single acknowledgement so we have an audit
 * trail. Anything longer would just be ignored.
 *
 * Behaviour
 * ---------
 *   • Renders only on /staff/* routes for users with the `staff`
 *     or `admin` role.
 *   • Reads `staffPolicyAcceptedVersion` off the user record. If
 *     it matches the current version, the gate renders nothing.
 *   • POSTs to /api/staff/policy/accept on confirm.
 *   • Once accepted in the same session we hide immediately
 *     (don't wait for SWR revalidation).
 */

import * as React from 'react'
import { Loader2, ShieldCheck, Check } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

export const STAFF_POLICY_VERSION = '2026-05-07'

const POLICY_BULLETS = [
  'Treat every customer record as confidential — view it only when handling a request.',
  'Never share screens, screenshots, or notes that contain a customer’s personal data.',
  'Use real names in chat replies and stay within the tone guide.',
  'Flag anything you’re unsure about to a manager before acting.',
] as const

export function StaffPolicyGate() {
  const { user, isLoading } = useAuth()
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [justAccepted, setJustAccepted] = React.useState(false)

  // Only the staff role sees this gate. Admins (Itunu, Franca, the
  // Sidihost super admin) are deliberately excluded — they're trusted
  // by definition and shouldn't have to re-acknowledge a policy
  // every time they cross into the staff console while triaging.
  // Their welcome flow is just the avatar picker in the sidebar.
  const role = user?.role
  const isStaff = role === 'staff'
  const accepted =
    (user as unknown as { staffPolicyAcceptedVersion?: string | null })
      ?.staffPolicyAcceptedVersion === STAFF_POLICY_VERSION

  if (isLoading) return null
  if (!user) return null
  if (!isStaff) return null
  if (accepted || justAccepted) return null

  async function handleAccept() {
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/staff/policy/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: STAFF_POLICY_VERSION }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? "Couldn't save acknowledgement")
      }
      // Dispatch the same event our customer flow uses so SWR
      // re-fetches /api/auth/me. The gate hides immediately via
      // `justAccepted` either way.
      window.dispatchEvent(new Event('user-updated'))
      setJustAccepted(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-900/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Staff acknowledgement"
    >
      <div className="w-full sm:max-w-md">
        <div className="relative w-full bg-white rounded-t-3xl sm:rounded-3xl border border-gray-100 shadow-[0_24px_60px_-20px_rgba(123,45,142,0.35)] overflow-hidden">
          {/* Brand-tinted header */}
          <div className="px-5 pt-5 pb-3 bg-gradient-to-b from-[#7B2D8E]/[0.08] to-transparent">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#7B2D8E]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E]" />
              Staff acknowledgement
            </span>
          </div>

          <div className="px-5 sm:px-6 pb-2">
            <div className="w-11 h-11 rounded-2xl bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center mb-3">
              <ShieldCheck className="w-5 h-5" aria-hidden />
            </div>
            <h2 className="text-[18px] sm:text-[19px] font-bold text-gray-900 leading-snug tracking-tight">
              Welcome to the Dermaspace staff console.
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-gray-600">
              You handle real customers&apos; data here. A few quick ground
              rules — please read and confirm before you continue.
            </p>

            <ul className="mt-4 space-y-2.5">
              {POLICY_BULLETS.map((line, i) => (
                <li
                  key={i}
                  className="relative pl-5 text-[13px] leading-relaxed text-gray-700"
                >
                  <span
                    aria-hidden
                    className="absolute left-0 top-[0.55em] w-1.5 h-1.5 rounded-full bg-[#7B2D8E]"
                  />
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-gray-100 px-4 py-3 sm:px-5 bg-white">
            {error && (
              <div className="mb-2.5 px-3 py-2 rounded-lg bg-red-50 text-[12px] font-medium text-red-700 border border-red-100">
                {error}
              </div>
            )}
            <button
              type="button"
              onClick={handleAccept}
              disabled={submitting}
              className="w-full h-10 rounded-xl bg-[#7B2D8E] text-white text-[13.5px] font-semibold hover:bg-[#5A1D6A] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  I understand and agree
                </>
              )}
            </button>
            <p className="mt-2 text-center text-[11px] text-gray-500 tabular-nums">
              Version {STAFF_POLICY_VERSION}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
