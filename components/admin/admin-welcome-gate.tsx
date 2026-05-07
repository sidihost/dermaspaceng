'use client'

/**
 * <AdminWelcomeGate />
 * --------------------------------------------------------------
 * Two-step "first sign-in" flow for admin and staff accounts that
 * were seeded with a temporary password and a placeholder email
 * (Itunu, Franca, future invitees). Mirrors the StaffPolicyGate
 * shell so the visual language stays consistent across the
 * console — same brand-purple header strip, same rounded card,
 * same disabled-button + spinner pattern.
 *
 * Decision tree on each render:
 *
 *   1. /api/auth/me hasn't hydrated yet         -> render nothing
 *   2. Not signed in                            -> render nothing
 *   3. Role is `customer` (i.e. plain `user`)   -> render nothing
 *   4. mustChangePassword === true              -> show password step
 *      (with a "Skip for now" button that dismisses to step 2 if
 *       an email is also missing, or closes the gate entirely if
 *       the email is already set)
 *   5. emailIsPlaceholder === true              -> show email step
 *      (compulsory — the only way out is to save a real address)
 *   6. neither                                   -> render nothing
 *
 * The two POSTs we already own do the writes:
 *   • POST /api/auth/password   { newPassword, isSettingPassword }
 *   • PUT  /api/auth/profile    { firstName, lastName, email }
 *
 * Each successful save dispatches the same `user-updated` event the
 * rest of the app listens on so SWR refetches /api/auth/me and the
 * gate naturally disappears once both flags are cleared.
 */

import * as React from 'react'
import { Loader2, Lock, Mail, Eye, EyeOff, Check, X } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

const BRAND = '#7B2D8E'

type GateUser = {
  firstName: string
  lastName: string
  email?: string
  role?: string | null
  mustChangePassword?: boolean
  emailIsPlaceholder?: boolean
}

export function AdminWelcomeGate() {
  const { user, isLoading } = useAuth()
  const u = user as unknown as GateUser | null

  // Local "manually skipped the password step" flag — once the user
  // taps Skip we hide step 1 for the remainder of the session even
  // if the server still says must_change_password=true. The next
  // sign-in will surface the prompt again, which is the right UX:
  // "skip" must mean "remind me later", not "never ask".
  const [passwordSkipped, setPasswordSkipped] = React.useState(false)

  // Form state for the password step.
  const [newPassword, setNewPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [showPwd, setShowPwd] = React.useState(false)
  const [savingPwd, setSavingPwd] = React.useState(false)
  const [pwdError, setPwdError] = React.useState<string | null>(null)

  // Form state for the email step.
  const [email, setEmail] = React.useState('')
  const [savingEmail, setSavingEmail] = React.useState(false)
  const [emailError, setEmailError] = React.useState<string | null>(null)

  if (isLoading) return null
  if (!u) return null

  const role = (u.role || '').toLowerCase()
  const isOperator = role === 'admin' || role === 'staff'
  if (!isOperator) return null

  const needsPassword = u.mustChangePassword === true && !passwordSkipped
  const needsEmail = u.emailIsPlaceholder === true

  if (!needsPassword && !needsEmail) return null

  // Step 1 takes priority over step 2 — if both are required we walk
  // the user through password → email rather than dropping them on a
  // single conjoined form.
  const step: 'password' | 'email' = needsPassword ? 'password' : 'email'

  async function handleSavePassword() {
    setPwdError(null)
    if (newPassword.length < 8) {
      setPwdError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPwdError('The two passwords don\u2019t match.')
      return
    }
    setSavingPwd(true)
    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPassword,
          // Tell the endpoint we don't have a `currentPassword` —
          // the seeded temp password counts as "no real password yet"
          // for the purposes of the welcome flow.
          isSettingPassword: true,
          // Keep this around for routes that look at it; harmless if
          // ignored by the current implementation.
          currentPassword: undefined,
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? 'Could not save your new password.')
      }
      // Tell the rest of the app to refetch /api/auth/me — the gate
      // will re-evaluate and drop step 1 automatically.
      window.dispatchEvent(new Event('user-updated'))
      setNewPassword('')
      setConfirmPassword('')
    } catch (e) {
      setPwdError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setSavingPwd(false)
    }
  }

  async function handleSaveEmail() {
    setEmailError(null)
    const value = email.trim().toLowerCase()
    if (!value) {
      setEmailError('Email is required.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailError('Enter a valid email address.')
      return
    }
    setSavingEmail(true)
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // The PUT endpoint requires firstName + lastName along
          // with the email, so we re-send the values we already have
          // from /api/auth/me.
          firstName: u?.firstName || 'Admin',
          lastName: u?.lastName || '-',
          email: value,
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? 'Could not save your email.')
      }
      window.dispatchEvent(new Event('user-updated'))
    } catch (e) {
      setEmailError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setSavingEmail(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-900/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Dermaspace"
    >
      <div className="w-full sm:max-w-md">
        <div className="relative w-full bg-white rounded-t-3xl sm:rounded-3xl border border-gray-100 shadow-[0_24px_60px_-20px_rgba(123,45,142,0.35)] overflow-hidden">
          {/* Brand-tinted header */}
          <div className="px-5 pt-5 pb-3 bg-gradient-to-b from-[#7B2D8E]/[0.08] to-transparent">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#7B2D8E]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E]" />
              First sign-in · Step {step === 'password' ? 1 : 2} of {needsPassword && needsEmail ? 2 : 1}
            </span>
          </div>

          {step === 'password' && (
            <div className="px-5 sm:px-6 pb-5">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3"
                style={{ backgroundColor: `${BRAND}1A`, color: BRAND }}
              >
                <Lock className="w-5 h-5" aria-hidden />
              </div>
              <h2 className="text-[18px] sm:text-[19px] font-bold text-gray-900 leading-snug tracking-tight">
                Pick a new password
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-gray-600">
                You&apos;re still on the temporary password we issued. Set
                something only you know — or skip for now and keep using
                the temp one until later.
              </p>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">
                    New password
                  </label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      aria-label={showPwd ? 'Hide password' : 'Show password'}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-400 hover:text-gray-700"
                    >
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">
                    Confirm password
                  </label>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Type it again"
                    autoComplete="new-password"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                  />
                </div>
              </div>

              {pwdError && (
                <div className="mt-3 px-3 py-2 rounded-lg bg-rose-50 text-[12px] font-medium text-rose-700 border border-rose-100">
                  {pwdError}
                </div>
              )}

              <div className="mt-5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPasswordSkipped(true)}
                  disabled={savingPwd}
                  className="h-10 px-4 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Skip for now
                </button>
                <button
                  type="button"
                  onClick={handleSavePassword}
                  disabled={savingPwd}
                  className="ml-auto h-10 px-4 rounded-xl text-white text-[13px] font-semibold disabled:opacity-60 inline-flex items-center gap-1.5"
                  style={{ backgroundColor: BRAND }}
                >
                  {savingPwd ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Save new password
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 'email' && (
            <div className="px-5 sm:px-6 pb-5">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3"
                style={{ backgroundColor: `${BRAND}1A`, color: BRAND }}
              >
                <Mail className="w-5 h-5" aria-hidden />
              </div>
              <h2 className="text-[18px] sm:text-[19px] font-bold text-gray-900 leading-snug tracking-tight">
                Add your email address
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-gray-600">
                We&apos;ll use this for password resets, security alerts and
                customer notifications. You can keep signing in with your
                username — this is purely your contact address.
              </p>

              <div className="mt-4">
                <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">
                  Your email
                </label>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@dermaspaceng.com"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                />
              </div>

              {emailError && (
                <div className="mt-3 px-3 py-2 rounded-lg bg-rose-50 text-[12px] font-medium text-rose-700 border border-rose-100">
                  {emailError}
                </div>
              )}

              <div className="mt-5 flex items-center gap-2">
                {/* Email is compulsory — no Skip button on this step. */}
                <p className="text-[11px] text-gray-500 inline-flex items-center gap-1">
                  <X className="w-3 h-3 text-gray-400" />
                  This step is required.
                </p>
                <button
                  type="button"
                  onClick={handleSaveEmail}
                  disabled={savingEmail}
                  className="ml-auto h-10 px-4 rounded-xl text-white text-[13px] font-semibold disabled:opacity-60 inline-flex items-center gap-1.5"
                  style={{ backgroundColor: BRAND }}
                >
                  {savingEmail ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Save email
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
