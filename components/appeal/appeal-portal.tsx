'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
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
  extractEmailHintFromAppealToken,
  normalizePrefillEmail,
} from '@/lib/suspension-appeal-constants'
import { useNotify } from '@/components/shared/notify'

type VerifyResponse = {
  valid: boolean
  code?: string
  error?: string
  status?: 'eligible' | 'already_pending' | 'reinstated'
  firstName?: string | null
  email?: string | null
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
  eyebrow,
  title,
  description,
  points,
}: {
  eyebrow: string
  title: string
  description: string
  points: string[]
}) {
  return (
    <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-10 bg-[#7B2D8E]">
      <div className="text-white max-w-md w-full">
        <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/15 flex items-center justify-center mb-6">
          <ShieldAlert className="w-6 h-6 text-white" />
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

function AppealPortalContent() {
  const searchParams = useSearchParams()
  const notify = useNotify()
  const token = (searchParams.get('token') || '').trim()
  const queryEmail = normalizePrefillEmail(searchParams.get('email'))
  const fallbackEmail = queryEmail || extractEmailHintFromAppealToken(token)

  const [verifying, setVerifying] = useState(Boolean(token))
  const [tokenInfo, setTokenInfo] = useState<VerifyResponse | null>(null)

  const [email, setEmail] = useState(fallbackEmail)
  const [appealMessage, setAppealMessage] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submittedAppealId, setSubmittedAppealId] = useState<string | null>(null)
  const [submittedGenericMessage, setSubmittedGenericMessage] = useState<string | null>(null)

  useEffect(() => {
    if (fallbackEmail) {
      setEmail((prev) => prev || fallbackEmail)
    }
  }, [fallbackEmail])

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
          if (data.valid && data.email) {
            setEmail(data.email)
          } else if (fallbackEmail) {
            setEmail((prev) => prev || fallbackEmail)
          }
          if (!data.valid && data.error) {
            setError(data.error)
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          if (fallbackEmail) {
            setEmail((prev) => prev || fallbackEmail)
          }
          setTokenInfo({
            valid: false,
            error: 'Could not verify your link. Please enter your account email below.',
          })
        }
      })
      .finally(() => {
        if (!cancelled) setVerifying(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, fallbackEmail])

  const hasValidToken = Boolean(token && tokenInfo?.valid)
  const isStaff = Boolean(
    hasValidToken && (tokenInfo?.role === 'staff' || tokenInfo?.role === 'admin'),
  )

  const eyebrow = 'Dermaspace Account Security'
  const sidePoints = [
    'Your account details, history, and records remain safely preserved during review.',
    'Every reinstatement request is automatically routed to the appropriate Dermaspace review team.',
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
            'If a suspended account matches that email address, your appeal has been recorded and updates will be sent to the email address on file.',
        )
        setSubmittedGenericMessage(genericMsg)
        notify.success('Account appeal submitted')
      } else {
        const refId = String(data.appealId || 'Submitted')
        setSubmittedAppealId(refId)
        notify.success(
          'Account appeal received',
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
          eyebrow={eyebrow}
          title="Account Appeal"
          description="We are verifying your suspension notice so you can submit an appeal for review."
          points={sidePoints}
        />
        <div className="flex-1 flex items-center justify-center px-6 py-16">
          <div className="text-center">
            <Loader2 className="w-7 h-7 animate-spin text-[#7B2D8E] mx-auto mb-3" />
            <p className="text-sm text-gray-600">Checking your account status...</p>
          </div>
        </div>
      </div>
    )
  }

  if (submittedAppealId || submittedGenericMessage) {
    return (
      <div className="min-h-screen bg-white lg:flex lg:flex-row">
        <BrandSidePanel
          eyebrow={eyebrow}
          title="Appeal Submitted"
          description="Our team reviews every reinstatement request carefully and will send an automated update to your email."
          points={sidePoints}
        />
        <div className="flex-1 flex items-center justify-center px-6 pt-12 pb-24 lg:p-8">
          <div className="w-full max-w-md text-center mx-auto">
            <div className="w-14 h-14 bg-[#7B2D8E]/10 border border-[#7B2D8E]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-[#7B2D8E]" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              {submittedGenericMessage ? 'Request Submitted' : 'Appeal Received'}
            </h1>
            <p className="text-sm text-gray-600 mb-5 leading-relaxed">
              {submittedGenericMessage ||
                'Thank you for reaching out. Our team is reviewing your request and will send an update to your email address.'}
            </p>
            {submittedAppealId && (
              <div className="rounded-xl border border-gray-200 bg-[#FAF6FB] p-4 mb-4 text-left">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  Appeal Reference
                </p>
                <p className="mt-1 font-mono text-sm font-semibold text-[#7B2D8E] break-all">
                  {submittedAppealId}
                </p>
              </div>
            )}
            <div className="rounded-xl border border-gray-200 bg-white p-4 mb-6 text-left space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                What happens next
              </p>
              <ul className="space-y-1.5 text-xs text-gray-600 leading-relaxed">
                <li>1. Our admin team reviews your explanation and account details.</li>
                <li>2. If approved, your account is automatically reinstated and you&apos;ll receive an email to sign back in.</li>
                <li>3. No need to submit another form while this appeal is pending.</li>
              </ul>
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

  if (tokenInfo?.status === 'reinstated') {
    return (
      <div className="min-h-screen bg-white lg:flex lg:flex-row">
        <BrandSidePanel
          eyebrow={eyebrow}
          title="Account Active"
          description="Your Dermaspace access is active and ready for sign in."
          points={sidePoints}
        />
        <div className="flex-1 flex items-center justify-center px-6 pt-12 pb-24 lg:p-8">
          <div className="w-full max-w-md text-center mx-auto">
            <div className="w-14 h-14 bg-[#7B2D8E]/10 border border-[#7B2D8E]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserCheck className="w-7 h-7 text-[#7B2D8E]" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Your Account Is Active
            </h1>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Good news — {tokenInfo.maskedEmail ? `${tokenInfo.maskedEmail} has` : 'your account has'} already been reinstated. You can sign back in now.
            </p>
            <Link
              href="/signin"
              className="block w-full py-2.5 bg-[#7B2D8E] text-white text-sm font-semibold rounded-xl hover:bg-[#5A1D6A] transition-colors"
            >
              Sign In to Dermaspace
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
          eyebrow={eyebrow}
          title="Under Review"
          description="Your reinstatement appeal is already in our queue. We will email you as soon as a decision is made."
          points={sidePoints}
        />
        <div className="flex-1 flex items-center justify-center px-6 pt-12 pb-24 lg:p-8">
          <div className="w-full max-w-md text-center mx-auto">
            <div className="w-14 h-14 bg-[#7B2D8E]/10 border border-[#7B2D8E]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-7 h-7 text-[#7B2D8E]" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Appeal Already Under Review
            </h1>
            <p className="text-sm text-gray-600 mb-5 leading-relaxed">
              We already have an open appeal for your account and will notify you by email once our team finishes reviewing it.
            </p>
            <div className="rounded-xl border border-gray-200 bg-[#FAF6FB] p-4 mb-4 text-left space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Reference ID
              </p>
              <p className="font-mono text-sm font-semibold text-[#7B2D8E] break-all">
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
            <div className="rounded-xl border border-gray-200 bg-white p-4 mb-6 text-left space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                What happens next
              </p>
              <ul className="space-y-1.5 text-xs text-gray-600 leading-relaxed">
                <li>1. You don&apos;t need to submit another appeal — your request is already in our review queue.</li>
                <li>2. As soon as an admin makes a decision, we&apos;ll email you automatically.</li>
                <li>3. If approved, your access is restored immediately and you can sign back in.</li>
              </ul>
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
        eyebrow={eyebrow}
        title="Account Appeal"
        description="If your Dermaspace account was suspended by mistake or you have resolved the issue, submit an appeal below for review."
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

          <h1 className="text-xl font-bold text-gray-900 mb-1">
            Appeal Account Suspension
          </h1>
          <p className="text-sm text-gray-600 mb-4 leading-relaxed">
            Tell our team why your account should be reinstated. Every appeal is reviewed personally.
          </p>

          {hasValidToken && tokenInfo?.reason && (
            <div className="mb-4 rounded-xl border border-gray-200 bg-[#FAF6FB] p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7B2D8E]">
                {isStaff ? 'Administrative Note' : 'Suspension Note'}
              </p>
              <p className="mt-0.5 text-xs text-gray-700 leading-relaxed break-words">
                {tokenInfo.reason}
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-[#FAF6FB] border border-[#7B2D8E]/25 rounded-xl text-sm text-[#5A1D6A]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="appeal-email"
                  className="block text-xs font-medium text-gray-700"
                >
                  Suspended Account Email
                </label>
                {((hasValidToken && (tokenInfo?.email || tokenInfo?.maskedEmail || email)) ||
                  (Boolean(fallbackEmail) && email.trim().toLowerCase() === fallbackEmail)) && (
                  <span className="text-[11px] font-medium text-[#7B2D8E]">
                    Auto-filled
                  </span>
                )}
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="appeal-email"
                  type={hasValidToken ? 'text' : 'email'}
                  required={!hasValidToken}
                  readOnly={hasValidToken}
                  value={hasValidToken ? (tokenInfo?.email || tokenInfo?.maskedEmail || email) : email}
                  onChange={(e) => {
                    if (!hasValidToken) setEmail(e.target.value)
                  }}
                  placeholder="you@email.com"
                  className={`w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-base sm:text-sm focus:outline-none ${
                    hasValidToken
                      ? 'bg-[#FAF6FB] text-gray-700 cursor-default'
                      : 'bg-white text-gray-900 focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]'
                  }`}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <label
                  htmlFor="appeal-message"
                  className="block text-xs font-medium text-gray-700"
                >
                  Why should your account be reinstated?
                </label>
                <span className="text-[11px] text-gray-400 tabular-nums shrink-0">
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
                placeholder="Explain what happened or share any context that helps us review your account..."
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-base sm:text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] resize-y"
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
                Preferred Notification Email{' '}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="appeal-contact-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="Defaults to your account email"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
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
                  Submitting appeal...
                </>
              ) : (
                'Submit Account Appeal'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export function AppealPortal() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#7B2D8E]" />
        </div>
      }
    >
      <AppealPortalContent />
    </Suspense>
  )
}
