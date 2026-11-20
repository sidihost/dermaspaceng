'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  ShieldAlert,
  UserCheck,
} from 'lucide-react'
import {
  APPEAL_MAX_LENGTH,
  APPEAL_MIN_LENGTH,
} from '@/lib/suspension-appeal-constants'
import { useNotify } from '@/components/shared/notify'

export type AppealPortalKind = 'client' | 'staff'

type VerifyResponse = {
  valid: boolean
  code?: string
  error?: string
  status?: 'eligible' | 'already_pending' | 'reinstated'
  firstName?: string | null
  maskedEmail?: string | null
  role?: 'user' | 'staff' | 'admin'
  reason?: string | null
  appeal?: {
    id: string
    createdAt: string
  }
}

const DERMASPACE_LOGO =
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-EdcQ7u5ESh5sPzpgMsL9Sep8NnY0iu.webp'

function BrandSidePanel({
  isStaff,
  eyebrow,
  title,
  description,
  points,
}: {
  isStaff: boolean
  eyebrow: string
  title: string
  description: string
  points: string[]
}) {
  return (
    <div
      className={`hidden lg:flex lg:w-1/2 items-center justify-center p-10 ${
        isStaff ? 'bg-[#3E104B]' : 'bg-[#7B2D8E]'
      }`}
    >
      <div className="text-white max-w-md w-full">
        <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/15 flex items-center justify-center mb-6">
          {isStaff ? (
            <Briefcase className="w-6 h-6 text-white" />
          ) : (
            <ShieldAlert className="w-6 h-6 text-white" />
          )}
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75 mb-2">
          {eyebrow}
        </p>
        <h2 className="text-3xl font-bold mb-3 tracking-tight">{title}</h2>
        <p className="text-white/85 text-sm leading-relaxed mb-6">{description}</p>

        <ul className="space-y-2.5 border-t border-white/15 pt-5">
          {points.map((point) => (
            <li key={point} className="flex items-start gap-2.5 text-xs text-white/85 leading-relaxed">
              <CheckCircle2 className="w-4 h-4 text-white/90 shrink-0 mt-0.5" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function AppealPortalContent({ portal }: { portal: AppealPortalKind }) {
  const searchParams = useSearchParams()
  const notify = useNotify()
  const token = searchParams.get('token') || ''

  const [verifying, setVerifying] = useState(Boolean(token))
  const [tokenInfo, setTokenInfo] = useState<VerifyResponse | null>(null)

  const [email, setEmail] = useState('')
  const [appealMessage, setAppealMessage] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submittedAppealId, setSubmittedAppealId] = useState<string | null>(null)
  const [submittedGenericMessage, setSubmittedGenericMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!token) {
      setVerifying(false)
      setTokenInfo(null)
      return
    }
    setVerifying(true)
    fetch(`/api/appeals/verify?token=${encodeURIComponent(token)}`, {
      cache: 'no-store',
    })
      .then((res) => res.json())
      .then((data: VerifyResponse) => {
        if (!cancelled) {
          setTokenInfo(data)
          if (!data.valid && data.error) {
            setError(data.error)
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTokenInfo({
            valid: false,
            error:
              portal === 'staff'
                ? 'Could not verify your staff appeal link. Enter your work email below to submit.'
                : 'Could not verify your link. Please enter your account email below.',
          })
        }
      })
      .finally(() => {
        if (!cancelled) setVerifying(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, portal])

  const hasValidToken = Boolean(token && tokenInfo?.valid)
  const isStaff =
    hasValidToken && tokenInfo?.role
      ? tokenInfo.role === 'staff' || tokenInfo.role === 'admin'
      : portal === 'staff'

  const eyebrow = isStaff ? 'Dermaspace Team Security' : 'Dermaspace Account Security'
  const sidePoints = isStaff
    ? [
        'Console access and active staff sessions remain paused until review is complete.',
        'Every staff appeal is routed directly to Dermaspace Leadership & Security.',
        'Automated status updates are emailed to your work address or preferred reply address.',
      ]
    : [
        'Your bookings, wallet balance, and appointment history remain safely preserved.',
        'Every reinstatement appeal is reviewed personally by our Care & Security team.',
        'Automated updates are sent directly to your email once a decision is made.',
      ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/appeals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(hasValidToken ? { token } : { email: email.trim() }),
          appealMessage: appealMessage.trim(),
          contactEmail: contactEmail.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data?.existingAppealId) {
          setTokenInfo((prev) => ({
            ...(prev ?? { valid: true }),
            status: 'already_pending',
            appeal: {
              id: String(data.existingAppealId),
              createdAt: data.createdAt || new Date().toISOString(),
            },
          }))
          notify.info(
            'Appeal already under review',
            `Reference ${String(data.existingAppealId)} is currently in our review queue.`,
          )
          return
        }
        const message = data?.error || 'Could not submit your appeal.'
        setError(message)
        notify.error('Could not submit appeal', message)
        return
      }
      if (data?.generic) {
        const genericMsg = String(
          data.message ||
            (isStaff
              ? 'If a suspended Dermaspace team account matches that email, your staff appeal has been logged for leadership review.'
              : 'If a suspended account matches that email address, your appeal has been recorded and updates will be sent to the email address on file.'),
        )
        setSubmittedGenericMessage(genericMsg)
        notify.success(isStaff ? 'Staff appeal submitted' : 'Account appeal submitted')
      } else {
        const refId = String(data.appealId || 'Submitted')
        setSubmittedAppealId(refId)
        notify.success(
          isStaff ? 'Staff appeal received' : 'Account appeal received',
          `Reference ${refId} has been queued for review.`,
        )
      }
    } catch {
      setError('Something went wrong. Please try again.')
      notify.error('Network error', 'Could not reach Dermaspace. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (verifying) {
    return (
      <div className="min-h-screen bg-white lg:flex lg:flex-row">
        <BrandSidePanel
          isStaff={isStaff}
          eyebrow={eyebrow}
          title={isStaff ? 'Staff Access Appeal' : 'Client Account Appeal'}
          description={
            isStaff
              ? 'Verifying your staff suspension notice so you can submit an internal reinstatement appeal.'
              : 'We are verifying your suspension notice so you can submit an appeal for review.'
          }
          points={sidePoints}
        />
        <div className="flex-1 flex items-center justify-center px-6 py-16">
          <div className="text-center">
            <Loader2 className="w-7 h-7 animate-spin text-[#7B2D8E] mx-auto mb-3" />
            <p className="text-sm text-gray-600">
              {isStaff ? 'Checking your team access status...' : 'Checking your account status...'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (submittedAppealId || submittedGenericMessage) {
    return (
      <div className="min-h-screen bg-white lg:flex lg:flex-row">
        <BrandSidePanel
          isStaff={isStaff}
          eyebrow={eyebrow}
          title={isStaff ? 'Staff Appeal Logged' : 'Appeal Submitted'}
          description={
            isStaff
              ? 'Dermaspace Leadership & Security has received your staff reinstatement request and will send an update by email.'
              : 'Our team reviews every reinstatement request carefully and will send an automated update to your email.'
          }
          points={sidePoints}
        />
        <div className="flex-1 flex items-center justify-center px-6 pt-12 pb-24 lg:p-8">
          <div className="w-full max-w-md text-center mx-auto">
            <div className="w-14 h-14 bg-[#7B2D8E]/10 border border-[#7B2D8E]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-[#7B2D8E]" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              {submittedGenericMessage
                ? isStaff
                  ? 'Staff Appeal Submitted'
                  : 'Request Submitted'
                : isStaff
                  ? 'Staff Appeal Received'
                  : 'Appeal Received'}
            </h1>
            <p className="text-sm text-gray-600 mb-5 leading-relaxed">
              {submittedGenericMessage ||
                (isStaff
                  ? 'Thank you for submitting your appeal. Dermaspace Leadership & Security is reviewing your staff access and will email you once a decision is made.'
                  : 'Thank you for reaching out. Our team is reviewing your request and will send an update to your email address.')}
            </p>
            {submittedAppealId && (
              <div className="rounded-xl border border-gray-200 bg-[#FAF6FB] p-4 mb-6 text-left">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  {isStaff ? 'Staff Appeal Reference' : 'Appeal Reference'}
                </p>
                <p className="mt-1 font-mono text-sm font-semibold text-[#7B2D8E]">
                  {submittedAppealId}
                </p>
              </div>
            )}
            <Link
              href="/signin"
              className="block w-full py-2.5 bg-[#7B2D8E] text-white text-sm font-semibold rounded-xl hover:bg-[#5A1D6A] transition-colors"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (tokenInfo?.status === 'reinstated') {
    return (
      <div className="min-h-screen bg-white lg:flex lg:flex-row">
        <BrandSidePanel
          isStaff={isStaff}
          eyebrow={eyebrow}
          title={isStaff ? 'Staff Access Active' : 'Account Active'}
          description={
            isStaff
              ? 'Your Dermaspace staff console access is active and ready for sign in.'
              : 'Your Dermaspace access is active and ready for sign in.'
          }
          points={sidePoints}
        />
        <div className="flex-1 flex items-center justify-center px-6 pt-12 pb-24 lg:p-8">
          <div className="w-full max-w-md text-center mx-auto">
            <div className="w-14 h-14 bg-[#7B2D8E]/10 border border-[#7B2D8E]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserCheck className="w-7 h-7 text-[#7B2D8E]" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              {isStaff ? 'Your Staff Access Is Active' : 'Your Account Is Active'}
            </h1>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Good news — {tokenInfo.maskedEmail ? `${tokenInfo.maskedEmail} has` : 'your account has'} already been reinstated. You can sign back in now.
            </p>
            <Link
              href="/signin"
              className="block w-full py-2.5 bg-[#7B2D8E] text-white text-sm font-semibold rounded-xl hover:bg-[#5A1D6A] transition-colors"
            >
              {isStaff ? 'Sign In to Staff Workspace' : 'Sign In to Dermaspace'}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (tokenInfo?.status === 'already_pending' && tokenInfo.appeal) {
    return (
      <div className="min-h-screen bg-white lg:flex lg:flex-row">
        <BrandSidePanel
          isStaff={isStaff}
          eyebrow={eyebrow}
          title={isStaff ? 'Staff Appeal In Queue' : 'Under Review'}
          description={
            isStaff
              ? 'Your staff reinstatement appeal is already queued for leadership review. We will email you once a decision is made.'
              : 'Your reinstatement appeal is already in our queue. We will email you as soon as a decision is made.'
          }
          points={sidePoints}
        />
        <div className="flex-1 flex items-center justify-center px-6 pt-12 pb-24 lg:p-8">
          <div className="w-full max-w-md text-center mx-auto">
            <div className="w-14 h-14 bg-[#7B2D8E]/10 border border-[#7B2D8E]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-7 h-7 text-[#7B2D8E]" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              {isStaff ? 'Staff Appeal Already Under Review' : 'Appeal Already Under Review'}
            </h1>
            <p className="text-sm text-gray-600 mb-5 leading-relaxed">
              {isStaff
                ? 'We already have an open staff appeal for your team account and will notify you by email once leadership completes the review.'
                : 'We already have an open appeal for your account and will notify you by email once our team finishes reviewing it.'}
            </p>
            <div className="rounded-xl border border-gray-200 bg-[#FAF6FB] p-4 mb-6 text-left space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                {isStaff ? 'Staff Appeal Reference' : 'Reference ID'}
              </p>
              <p className="font-mono text-sm font-semibold text-[#7B2D8E]">
                {tokenInfo.appeal.id}
              </p>
              <p className="text-xs text-gray-500">
                Submitted{' '}
                {new Date(tokenInfo.appeal.createdAt).toLocaleDateString('en-NG', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
            <Link
              href="/signin"
              className="block w-full py-2.5 bg-[#7B2D8E] text-white text-sm font-semibold rounded-xl hover:bg-[#5A1D6A] transition-colors"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white lg:flex lg:flex-row">
      <BrandSidePanel
        isStaff={isStaff}
        eyebrow={eyebrow}
        title={isStaff ? 'Staff Access Appeal' : 'Client Account Appeal'}
        description={
          isStaff
            ? 'If your Dermaspace staff or administrator access was suspended in error or resolved with your clinic lead, share details below for leadership review.'
            : 'If your Dermaspace client account was suspended by mistake or you have resolved the issue, submit an appeal below.'
        }
        points={sidePoints}
      />

      <div className="px-6 pt-8 pb-24 lg:flex-1 lg:flex lg:items-center lg:justify-center lg:p-8">
        <div className="w-full max-w-md mx-auto">
          <Link
            href="/signin"
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#7B2D8E] mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>

          <Link href="/" className="block mb-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={DERMASPACE_LOGO}
              alt="Dermaspace"
              className="h-9 w-auto"
            />
          </Link>

          <div className="inline-flex items-center gap-1.5 rounded-lg border border-[#7B2D8E]/20 bg-[#FAF6FB] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#5A1D6A] mb-3">
            {isStaff ? (
              <Briefcase className="w-3.5 h-3.5 text-[#7B2D8E]" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5 text-[#7B2D8E]" />
            )}
            {isStaff ? 'Staff & Admin Access Appeal' : 'Client Account Appeal'}
          </div>

          <h1 className="text-xl font-bold text-gray-900 mb-1">
            {isStaff ? 'Appeal Staff Suspension' : 'Appeal Account Suspension'}
          </h1>
          <p className="text-sm text-gray-600 mb-4 leading-relaxed">
            {isStaff
              ? 'Explain why your Dermaspace staff access should be reinstated. Staff appeals are reviewed directly by Dermaspace Leadership & Security.'
              : 'Tell our team why your client account should be reinstated. Every appeal is reviewed personally.'}
          </p>

          {hasValidToken && tokenInfo && (
            <div className="mb-4 rounded-xl border border-gray-200 bg-[#FAF6FB] p-3.5 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-gray-500">
                  {isStaff ? 'Staff Account' : 'Client Account'}
                </span>
                <span className="text-xs font-semibold text-gray-900">
                  {tokenInfo.maskedEmail}
                </span>
              </div>
              {tokenInfo.reason && (
                <div className="pt-1.5 border-t border-gray-200/80">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7B2D8E]">
                    {isStaff ? 'Administrative Note' : 'Suspension Note'}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-700 leading-relaxed">
                    {tokenInfo.reason}
                  </p>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-[#FAF6FB] border border-[#7B2D8E]/25 rounded-xl text-sm text-[#5A1D6A]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!hasValidToken && (
              <div>
                <label
                  htmlFor="appeal-email"
                  className="block text-xs font-medium text-gray-700 mb-1"
                >
                  {isStaff ? 'Suspended Staff Work Email' : 'Suspended Account Email'}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="appeal-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={isStaff ? 'name@dermaspaceng.com' : 'you@email.com'}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                  />
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="appeal-message"
                  className="block text-xs font-medium text-gray-700"
                >
                  {isStaff
                    ? 'Operational context & reinstatement details'
                    : 'Why should your account be reinstated?'}
                </label>
                <span className="text-[11px] text-gray-400 tabular-nums">
                  {appealMessage.trim().length}/{APPEAL_MAX_LENGTH}
                </span>
              </div>
              <textarea
                id="appeal-message"
                required
                rows={5}
                minLength={APPEAL_MIN_LENGTH}
                maxLength={APPEAL_MAX_LENGTH}
                value={appealMessage}
                onChange={(e) => setAppealMessage(e.target.value)}
                placeholder={
                  isStaff
                    ? 'Share context on what occurred, any follow-up with your branch lead, and why your team access should be restored...'
                    : 'Explain what happened or share any context that helps us review your account...'
                }
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] resize-y"
              />
              <p className="mt-1 text-[11px] text-gray-500">
                Minimum {APPEAL_MIN_LENGTH} characters.
              </p>
            </div>

            <div>
              <label
                htmlFor="appeal-contact-email"
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                {isStaff ? 'Alternate Contact Email' : 'Preferred Notification Email'}{' '}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="appeal-contact-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder={
                  isStaff
                    ? 'Optional personal email if you cannot access your work inbox'
                    : 'Leave blank to receive updates on your account email'
                }
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || appealMessage.trim().length < APPEAL_MIN_LENGTH}
              className="w-full py-2.5 bg-[#7B2D8E] text-white text-sm font-semibold rounded-xl hover:bg-[#5A1D6A] transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isStaff ? 'Submitting staff appeal...' : 'Submitting appeal...'}
                </>
              ) : isStaff ? (
                'Submit Staff Appeal'
              ) : (
                'Submit Account Appeal'
              )}
            </button>
          </form>

          {!hasValidToken && (
            <div className="mt-6 pt-5 border-t border-gray-200 flex items-center justify-between gap-2 text-xs text-gray-500">
              <span>
                {isStaff
                  ? 'Looking for a client account appeal?'
                  : 'Dermaspace staff or admin member?'}
              </span>
              <Link
                href={isStaff ? '/appeal' : '/appeal/staff'}
                className="inline-flex items-center gap-1 font-semibold text-[#7B2D8E] hover:text-[#5A1D6A] transition-colors whitespace-nowrap"
              >
                {isStaff ? 'Client Appeal' : 'Staff Appeal'}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function AppealPortal({ portal }: { portal: AppealPortalKind }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#7B2D8E]" />
        </div>
      }
    >
      <AppealPortalContent portal={portal} />
    </Suspense>
  )
}
