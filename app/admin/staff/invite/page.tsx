'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowLeft, Check, Copy, Loader2, Mail, Shield, UserCog } from 'lucide-react'

export default function InviteStaffPage() {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'staff' | 'admin'>('staff')
  const [inviting, setInviting] = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true)
    setError('')
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setInviteUrl(data.inviteUrl)
        setEmailSent(Boolean(data.emailSent))
      } else {
        setError(data.error || 'Failed to create invitation')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setInviting(false)
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Could not copy link automatically. Select and copy it manually.')
    }
  }

  const resetForm = () => {
    setEmail('')
    setRole('staff')
    setInviteUrl('')
    setEmailSent(false)
    setCopied(false)
    setError('')
  }

  return (
    <div className="space-y-4 max-w-xl">
      <Link
        href="/admin/staff"
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#7B2D8E] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to staff
      </Link>

      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="h-[2px] bg-[#7B2D8E]" aria-hidden="true" />
        <div className="p-5 sm:p-6 space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center shrink-0">
              <UserCog className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Invite staff member</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Send a signed onboarding link. Invitations expire after 7 days.
              </p>
            </div>
          </div>

          {!inviteUrl ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="invite-email"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Work email address
                </label>
                <input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@dermaspaceng.com"
                  className="w-full h-10 px-3.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#7B2D8E]"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Access role</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setRole('staff')}
                    className={`text-left p-3.5 rounded-xl border transition-colors cursor-pointer ${
                      role === 'staff'
                        ? 'border-[#7B2D8E] bg-[#FAF6FB]'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-gray-900">Staff</span>
                      <span
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          role === 'staff' ? 'border-[#7B2D8E] bg-[#7B2D8E]' : 'border-gray-300'
                        }`}
                      >
                        {role === 'staff' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      Handle bookings, consultations, complaints, live chat, and assigned requests.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`text-left p-3.5 rounded-xl border transition-colors cursor-pointer ${
                      role === 'admin'
                        ? 'border-[#7B2D8E] bg-[#FAF6FB]'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                        <Shield className="w-3.5 h-3.5 text-[#7B2D8E]" />
                        Admin
                      </span>
                      <span
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          role === 'admin' ? 'border-[#7B2D8E] bg-[#7B2D8E]' : 'border-gray-300'
                        }`}
                      >
                        {role === 'admin' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      Full dashboard access including team management, services, and system settings.
                    </p>
                  </button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 text-sm text-[#3E104B] bg-[#FAF6FB] border border-[#3E104B]/30 rounded-xl px-3.5 py-2.5"
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-[#5A1D6A]" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <Link
                  href="/admin/staff"
                  className="flex-1 h-10 px-4 text-sm font-medium border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={inviting}
                  className="flex-1 h-10 px-4 text-sm font-medium bg-[#7B2D8E] text-white rounded-xl hover:bg-[#5A1D6A] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {inviting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Send invite
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#7B2D8E]/20 bg-[#FAF6FB] p-4 text-center">
                <div className="w-11 h-11 rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center mx-auto mb-2.5">
                  <Check className="w-5 h-5" />
                </div>
                <p className="text-gray-900 font-semibold text-sm">
                  {emailSent ? 'Invitation email sent' : 'Invitation link created'}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {emailSent
                    ? `An onboarding link has been emailed to ${email}.`
                    : 'Email delivery was unavailable — copy and share the link below directly.'}
                </p>
              </div>

              <div className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-xl">
                <input
                  type="text"
                  value={inviteUrl}
                  readOnly
                  className="flex-1 bg-transparent text-xs text-gray-700 outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => void copyLink()}
                  className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-white border border-gray-200 text-xs font-medium text-[#7B2D8E] hover:border-[#7B2D8E]/40 transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 text-center">This invitation expires in 7 days.</p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 h-10 px-4 text-sm font-medium border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Invite another
                </button>
                <Link
                  href="/admin/staff"
                  className="flex-1 h-10 px-4 text-sm font-medium bg-[#7B2D8E] text-white rounded-xl hover:bg-[#5A1D6A] transition-colors flex items-center justify-center"
                >
                  Back to staff
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
