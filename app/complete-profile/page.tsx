'use client'

// ---------------------------------------------------------------------------
// /app/complete-profile — multi-step onboarding wizard.
//
// Replaces the old single-scroll form. Same backend (`POST
// /api/auth/complete-profile`), same validation rules, same redirect
// to `/dashboard` on success. The data is collected one focus area
// at a time so:
//
//   1. Photo     — pick a curated avatar (or skip with a fallback initial)
//   2. About you — name + phone (with country dial code detection)
//   3. Username  — public handle with debounced availability lookup
//   4. Polish    — optional bio + privacy + social links
//
// We intentionally split into a wizard rather than a one-page form
// because:
//   - mobile keyboards eat ~half the viewport, so a long form pushes
//     the CTA off-screen and tanks completion
//   - a single page hides the optional polish fields behind a
//     disclosure that 80% of users never expand; broken into a step
//     of its own they get a fair chance to fill it in
//   - per-step validation lets us surface errors next to the field
//     they belong to instead of stacking them at the bottom
// ---------------------------------------------------------------------------

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Phone,
  AtSign,
  Camera,
  Check,
  X,
  Loader2,
  Globe,
  Lock,
  Eye,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Hand,
} from 'lucide-react'

// Same brand wordmark used in the staff & admin consoles, so the
// onboarding flow reads as part of Dermaspace instead of a stripped-down
// fallback shell. Hosted on the project blob storage CDN.
const DERMASPACE_LOGO =
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-EdcQ7u5ESh5sPzpgMsL9Sep8NnY0iu.webp'

import { AvatarPicker } from '@/components/profile/avatar-picker'
import PageLoader from '@/components/shared/page-loader'

const COUNTRY_CODES = [
  { code: 'NG', dial: '+234', flag: '🇳🇬', name: 'Nigeria' },
  { code: 'US', dial: '+1', flag: '🇺🇸', name: 'United States' },
  { code: 'GB', dial: '+44', flag: '🇬🇧', name: 'United Kingdom' },
  { code: 'AE', dial: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: 'GH', dial: '+233', flag: '🇬🇭', name: 'Ghana' },
  { code: 'ZA', dial: '+27', flag: '🇿🇦', name: 'South Africa' },
] as const

const STEPS = [
  { key: 'photo', label: 'Photo' },
  { key: 'about', label: 'About you' },
  { key: 'username', label: 'Username' },
  { key: 'polish', label: 'Polish' },
] as const
type StepKey = (typeof STEPS)[number]['key']

interface MeUser {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string | null
  username?: string | null
  avatarUrl?: string | null
  gender?: 'male' | 'female' | null
}

const SOCIAL_PLATFORMS = [
  { key: 'website', label: 'Website', placeholder: 'https://yourdomain.com' },
  { key: 'instagram', label: 'Instagram', placeholder: '@you' },
  { key: 'twitter', label: 'X / Twitter', placeholder: '@you' },
  { key: 'tiktok', label: 'TikTok', placeholder: '@you' },
] as const

export default function CompleteProfilePage() {
  const router = useRouter()
  const [authChecking, setAuthChecking] = useState(true)
  const [user, setUser] = useState<MeUser | null>(null)

  const [step, setStep] = useState<StepKey>('photo')
  const stepIndex = STEPS.findIndex((s) => s.key === step)

  // ---- Form state ------------------------------------------------------
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState<(typeof COUNTRY_CODES)[number]>(COUNTRY_CODES[0])
  const [showCountry, setShowCountry] = useState(false)

  const [username, setUsername] = useState('')
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [usernameMessage, setUsernameMessage] = useState<string | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)

  const [bio, setBio] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [socials, setSocials] = useState<Record<string, string>>({
    website: '',
    instagram: '',
    twitter: '',
    tiktok: '',
  })

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // ---- Bootstrap (auth + IP geo for default country) -------------------
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (!res.ok) {
          router.push('/signin')
          return
        }
        const data = await res.json()
        if (cancelled) return
        const u: MeUser = data.user ?? {}
        setUser(u)
        setFirstName(u.firstName || '')
        setLastName(u.lastName || '')
        setPhone(u.phone || '')
        setUsername(u.username || '')
        setAvatarUrl(u.avatarUrl || null)
        setAuthChecking(false)
      } catch {
        router.push('/signin')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  useEffect(() => {
    if (authChecking) return
    ;(async () => {
      try {
        const res = await fetch('https://ipapi.co/json/')
        const data = await res.json()
        const detected = COUNTRY_CODES.find((c) => c.code === data.country_code)
        if (detected) setCountry(detected)
      } catch {
        // best-effort — keep the default
      }
    })()
  }, [authChecking])

  // ---- Username availability (debounced) -------------------------------
  useEffect(() => {
    if (username.length === 0) {
      setUsernameAvailable(null)
      setUsernameMessage(null)
      return
    }
    if (username.length < 3) {
      setUsernameAvailable(null)
      setUsernameMessage('Username must be at least 3 characters')
      return
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameAvailable(false)
      setUsernameMessage('Letters, numbers and underscores only')
      return
    }
    setUsernameMessage(null)
    const id = setTimeout(async () => {
      setCheckingUsername(true)
      try {
        const res = await fetch(
          `/api/user/username?username=${encodeURIComponent(username)}`,
        )
        const data = await res.json()
        setUsernameAvailable(!!data.available)
        if (data.available) {
          setUsernameMessage(`@${username} is yours.`)
        } else {
          setUsernameMessage(data.error || `@${username} is taken.`)
        }
      } catch {
        setUsernameMessage('Could not verify, try again.')
      } finally {
        setCheckingUsername(false)
      }
    }, 400)
    return () => clearTimeout(id)
  }, [username])

  // ---- Per-step gates --------------------------------------------------
  const canAdvance = useMemo(() => {
    switch (step) {
      case 'photo':
        // Photo is optional — we'll fall back to initials. Always allow advance.
        return true
      case 'about':
        return Boolean(
          firstName.trim() && lastName.trim() && phone.replace(/\D/g, '').length >= 7,
        )
      case 'username':
        // The user must pick a username — same rule as the legacy form.
        return Boolean(username && usernameAvailable === true)
      case 'polish':
        // Always allow submit; polish fields are all optional.
        return true
      default:
        return false
    }
  }, [step, firstName, lastName, phone, username, usernameAvailable])

  const goNext = () => {
    if (!canAdvance) return
    if (stepIndex < STEPS.length - 1) setStep(STEPS[stepIndex + 1].key)
  }
  const goBack = () => {
    if (stepIndex > 0) setStep(STEPS[stepIndex - 1].key)
  }

  // ---- Submit ----------------------------------------------------------
  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const fullPhone = phone ? `${country.dial}${phone.replace(/^0+/, '').replace(/\D/g, '')}` : ''
      const res = await fetch('/api/auth/complete-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: fullPhone,
          username: username.trim(),
          avatarUrl: avatarUrl || user?.avatarUrl || null,
          bio: bio.trim() || undefined,
          isPublic,
          ...socials,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSubmitError(data.error || 'Could not save your profile.')
        // If the username turned out to be reserved/taken under our
        // feet, jump back to the username step so the user can fix it.
        if (typeof data.error === 'string' && data.error.toLowerCase().includes('username')) {
          setStep('username')
          setUsernameAvailable(false)
          setUsernameMessage(data.error)
        }
        return
      }
      router.push('/dashboard')
    } catch {
      setSubmitError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (authChecking) return <PageLoader />

  const initials = `${(firstName[0] || user?.firstName?.[0] || '?').toUpperCase()}${(lastName[0] || user?.lastName?.[0] || '').toUpperCase()}`

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#F7F4FA] via-gray-50 to-gray-50">
      {/* Slim header — no full Header to keep onboarding focused */}
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between px-5 py-3.5">
          <Link href="/" aria-label="Dermaspace home" className="flex items-center">
            {/* Plain <img> on purpose — matches /signin, /signup and the
                main site header where this same blob asset is rendered
                without next/image. The blob host isn't whitelisted in
                next.config remotePatterns, so going through next/image
                would silently fall back to a broken state and the user
                would see the bare "Dermaspace" text again. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={DERMASPACE_LOGO || "/placeholder.svg"}
              alt="Dermaspace"
              className="h-7 w-auto"
            />
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#7B2D8E]/10 px-2.5 py-1 text-[11px] font-semibold text-[#7B2D8E]">
            <Hand className="h-3 w-3" aria-hidden="true" />
            Welcome
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-xl px-5 pb-10 pt-6 sm:pt-8">
        {/* Step counter — gives the user a clear sense of progress
            before they even read the heading. */}
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7B2D8E]">
          Step {stepIndex + 1} of {STEPS.length}
        </p>
        <h1 className="mt-2 text-balance text-2xl font-bold leading-tight tracking-tight text-gray-900 sm:text-[28px]">
          Let&apos;s finish setting up your account
        </h1>
        <p className="mt-2 text-pretty text-[14px] leading-relaxed text-gray-600">
          A few quick details so we can take care of you the right way.
        </p>

        <ProgressBar steps={STEPS as unknown as { key: string; label: string }[]} current={stepIndex} />

        <div className="mt-6 rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-12px_rgba(123,45,142,0.18)] sm:p-7">
          {step === 'photo' ? (
            <PhotoStep
              avatarUrl={avatarUrl}
              initials={initials}
              onOpenPicker={() => setShowAvatarPicker(true)}
              onClear={() => setAvatarUrl(null)}
            />
          ) : null}

          {step === 'about' ? (
            <AboutStep
              firstName={firstName}
              lastName={lastName}
              phone={phone}
              country={country}
              showCountry={showCountry}
              email={user?.email || ''}
              onFirstName={setFirstName}
              onLastName={setLastName}
              onPhone={(v) => setPhone(v.replace(/[^\d]/g, ''))}
              onCountry={setCountry}
              onToggleCountry={() => setShowCountry((v) => !v)}
            />
          ) : null}

          {step === 'username' ? (
            <UsernameStep
              username={username}
              available={usernameAvailable}
              message={usernameMessage}
              checking={checkingUsername}
              onChange={(v) => setUsername(v.replace(/[^a-zA-Z0-9_]/g, ''))}
            />
          ) : null}

          {step === 'polish' ? (
            <PolishStep
              bio={bio}
              isPublic={isPublic}
              socials={socials}
              onBio={setBio}
              onPublic={setIsPublic}
              onSocial={(k, v) => setSocials((prev) => ({ ...prev, [k]: v }))}
            />
          ) : null}

          {submitError ? (
            <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-[12px] text-red-700">
              {submitError}
            </p>
          ) : null}

          <div className="mt-6 flex items-center gap-3 border-t border-gray-100 pt-5">
            <button
              type="button"
              onClick={goBack}
              disabled={stepIndex === 0 || submitting}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <span className="ml-auto" />
            {step !== 'polish' ? (
              <button
                type="button"
                onClick={goNext}
                disabled={!canAdvance}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#7B2D8E] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#5A1D6A] disabled:opacity-40"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canAdvance || submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-[#7B2D8E] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#5A1D6A] disabled:opacity-40"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Finish
              </button>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-[12px] leading-relaxed text-gray-500">
          You can change any of this later from your profile settings.
        </p>
      </section>

      <AvatarPicker
        open={showAvatarPicker}
        onClose={() => setShowAvatarPicker(false)}
        currentUrl={avatarUrl}
        initials={initials || '?'}
        gender={user?.gender ?? null}
        onSelect={async (url) => {
          setAvatarUrl(url)
          setShowAvatarPicker(false)
        }}
      />
    </main>
  )
}

// ---------------------------------------------------------------------------
// Sub-components — defined inline because they only render here and
// keeping them local makes the wizard easier to refactor than splitting
// every step into its own file.
// ---------------------------------------------------------------------------

function ProgressBar({
  steps,
  current,
}: {
  steps: { key: string; label: string }[]
  current: number
}) {
  return (
    <div
      className="mt-5 flex items-center gap-1.5"
      role="progressbar"
      aria-valuenow={current + 1}
      aria-valuemin={1}
      aria-valuemax={steps.length}
      aria-label={`Step ${current + 1} of ${steps.length}`}
    >
      {steps.map((s, i) => {
        const done = i < current
        const cur = i === current
        return (
          <span
            key={s.key}
            className={[
              'h-1.5 flex-1 rounded-full transition-all duration-300',
              done
                ? 'bg-[#7B2D8E]'
                : cur
                ? 'bg-[#7B2D8E]'
                : 'bg-gray-200',
            ].join(' ')}
            aria-hidden="true"
          />
        )
      })}
    </div>
  )
}

function PhotoStep({
  avatarUrl,
  initials,
  onOpenPicker,
  onClear,
}: {
  avatarUrl: string | null
  initials: string
  onOpenPicker: () => void
  onClear: () => void
}) {
  return (
    <div className="text-center">
      <h2 className="text-lg font-bold tracking-tight text-gray-900">
        Add a profile photo
      </h2>
      <p className="mx-auto mt-1.5 max-w-[280px] text-[13px] leading-relaxed text-gray-500">
        Pick from our curated set — or skip and we&apos;ll show your initials.
      </p>

      <div className="relative mx-auto mt-6 h-24 w-24 sm:h-28 sm:w-28">
        <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#7B2D8E]/10 ring-4 ring-white shadow-[0_6px_16px_-6px_rgba(123,45,142,0.35)]">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl || "/placeholder.svg"}
              alt=""
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <span className="text-2xl font-bold text-[#7B2D8E] sm:text-3xl">
              {initials}
            </span>
          )}
        </div>

        {/* Tap-to-edit camera badge — small affordance pinned to the
            avatar so it's discoverable even before reading the buttons. */}
        <button
          type="button"
          onClick={onOpenPicker}
          aria-label={avatarUrl ? 'Change photo' : 'Choose photo'}
          className="absolute -bottom-1 -right-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#7B2D8E] text-white shadow-md ring-4 ring-white transition-colors hover:bg-[#5A1D6A]"
        >
          <Camera className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-6 flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={onOpenPicker}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#7B2D8E] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#5A1D6A] sm:w-auto sm:min-w-[200px]"
        >
          <Camera className="h-4 w-4" />
          {avatarUrl ? 'Change photo' : 'Choose photo'}
        </button>
        {avatarUrl ? (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-gray-500 transition-colors hover:text-gray-700"
          >
            <X className="h-3.5 w-3.5" />
            Use initials instead
          </button>
        ) : null}
      </div>
    </div>
  )
}

function AboutStep({
  firstName,
  lastName,
  phone,
  country,
  showCountry,
  email,
  onFirstName,
  onLastName,
  onPhone,
  onCountry,
  onToggleCountry,
}: {
  firstName: string
  lastName: string
  phone: string
  country: (typeof COUNTRY_CODES)[number]
  showCountry: boolean
  email: string
  onFirstName: (v: string) => void
  onLastName: (v: string) => void
  onPhone: (v: string) => void
  onCountry: (c: (typeof COUNTRY_CODES)[number]) => void
  onToggleCountry: () => void
}) {
  return (
    <div>
      <h2 className="text-base font-bold text-gray-900">About you</h2>
      <p className="mt-1 text-[12px] text-gray-500">
        We use this to address you in confirmations and reminders.
      </p>

      <div className="mt-4 space-y-3">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <Field label="First name">
            <input
              type="text"
              value={firstName}
              onChange={(e) => onFirstName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-[#7B2D8E] focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20"
              autoComplete="given-name"
            />
          </Field>
          <Field label="Last name">
            <input
              type="text"
              value={lastName}
              onChange={(e) => onLastName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-[#7B2D8E] focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20"
              autoComplete="family-name"
            />
          </Field>
        </div>

        <Field label="Phone">
          <div className="flex">
            <button
              type="button"
              onClick={onToggleCountry}
              className="inline-flex items-center gap-1 rounded-l-xl border border-r-0 border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-700"
            >
              <span aria-hidden="true">{country.flag}</span>
              <span>{country.dial}</span>
              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
            </button>
            <input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => onPhone(e.target.value)}
              placeholder="8012345678"
              className="w-full rounded-r-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-[#7B2D8E] focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20"
              autoComplete="tel"
            />
          </div>
          {showCountry ? (
            <ul className="mt-2 max-h-48 overflow-auto rounded-xl border border-gray-100 bg-white text-sm shadow-sm">
              {COUNTRY_CODES.map((c) => (
                <li key={c.code}>
                  <button
                    type="button"
                    onClick={() => {
                      onCountry(c)
                      onToggleCountry()
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-50"
                  >
                    <span aria-hidden="true">{c.flag}</span>
                    <span className="flex-1">{c.name}</span>
                    <span className="text-gray-500">{c.dial}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </Field>

        {email ? (
          <p className="text-[11px] text-gray-500">
            Signed in as <span className="font-medium text-gray-700">{email}</span>
          </p>
        ) : null}
      </div>
    </div>
  )
}

function UsernameStep({
  username,
  available,
  message,
  checking,
  onChange,
}: {
  username: string
  available: boolean | null
  message: string | null
  checking: boolean
  onChange: (v: string) => void
}) {
  return (
    <div>
      <h2 className="text-base font-bold text-gray-900">Pick your username</h2>
      <p className="mt-1 text-[12px] text-gray-500">
        Your public profile lives at{' '}
        <span className="font-mono text-gray-700">dermaspaceng.com/{username || 'username'}</span>
      </p>

      <div className="mt-4">
        <Field label="Username">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <AtSign className="h-4 w-4" />
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => onChange(e.target.value)}
              placeholder="yourhandle"
              className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-9 py-2.5 text-sm focus:border-[#7B2D8E] focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20"
              autoComplete="username"
              maxLength={30}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              {checking ? (
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              ) : available === true ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : available === false ? (
                <X className="h-4 w-4 text-red-500" />
              ) : null}
            </span>
          </div>
        </Field>
        {message ? (
          <p
            className={[
              'mt-1.5 text-[12px]',
              available === true ? 'text-green-700' : available === false ? 'text-red-600' : 'text-gray-500',
            ].join(' ')}
          >
            {message}
          </p>
        ) : (
          <p className="mt-1.5 text-[12px] text-gray-500">
            Letters, numbers and underscores. 3–30 characters.
          </p>
        )}
      </div>
    </div>
  )
}

function PolishStep({
  bio,
  isPublic,
  socials,
  onBio,
  onPublic,
  onSocial,
}: {
  bio: string
  isPublic: boolean
  socials: Record<string, string>
  onBio: (v: string) => void
  onPublic: (v: boolean) => void
  onSocial: (key: string, value: string) => void
}) {
  return (
    <div>
      <h2 className="text-base font-bold text-gray-900">Polish your profile</h2>
      <p className="mt-1 text-[12px] text-gray-500">
        All optional — skip and you can come back to this later.
      </p>

      <div className="mt-4 space-y-3">
        <Field label="Bio">
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => onBio(e.target.value.slice(0, 500))}
            placeholder="A line or two about you, your skin goals, anything we should know."
            className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-[#7B2D8E] focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20"
          />
          <p className="mt-1 text-right text-[10px] text-gray-400">{bio.length}/500</p>
        </Field>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            Profile visibility
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onPublic(true)}
              className={[
                'flex items-start gap-2 rounded-xl border p-3 text-left',
                isPublic ? 'border-[#7B2D8E] bg-[#7B2D8E]/5' : 'border-gray-200 bg-white',
              ].join(' ')}
            >
              <Globe className="mt-0.5 h-4 w-4 text-[#7B2D8E]" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Public</p>
                <p className="text-[11px] text-gray-500">Anyone can view your profile</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => onPublic(false)}
              className={[
                'flex items-start gap-2 rounded-xl border p-3 text-left',
                !isPublic ? 'border-[#7B2D8E] bg-[#7B2D8E]/5' : 'border-gray-200 bg-white',
              ].join(' ')}
            >
              <Lock className="mt-0.5 h-4 w-4 text-[#7B2D8E]" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Private</p>
                <p className="text-[11px] text-gray-500">Only you see your details</p>
              </div>
            </button>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            Social links
          </p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {SOCIAL_PLATFORMS.map((p) => (
              <Field key={p.key} label={p.label}>
                <input
                  type="text"
                  value={socials[p.key] || ''}
                  onChange={(e) => onSocial(p.key, e.target.value)}
                  placeholder={p.placeholder}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-[#7B2D8E] focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20"
                />
              </Field>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </span>
      {children}
    </label>
  )
}
