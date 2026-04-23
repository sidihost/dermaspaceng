'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, ArrowLeft, Check, ChevronDown } from 'lucide-react'
import { DatePicker } from '@/components/ui/date-picker'
import HCaptcha, { type HCaptchaRef } from '@/components/shared/hcaptcha'

const COUNTRY_CODES = [
  { code: 'NG', dial: '+234', flag: '🇳🇬', name: 'Nigeria' },
  { code: 'US', dial: '+1', flag: '🇺🇸', name: 'United States' },
  { code: 'GB', dial: '+44', flag: '🇬🇧', name: 'United Kingdom' },
  { code: 'AE', dial: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: 'GH', dial: '+233', flag: '🇬🇭', name: 'Ghana' },
  { code: 'ZA', dial: '+27', flag: '🇿🇦', name: 'South Africa' },
  { code: 'CA', dial: '+1', flag: '🇨🇦', name: 'Canada' },
  { code: 'DE', dial: '+49', flag: '🇩🇪', name: 'Germany' },
  { code: 'FR', dial: '+33', flag: '🇫🇷', name: 'France' },
  { code: 'KE', dial: '+254', flag: '🇰🇪', name: 'Kenya' },
  { code: 'AU', dial: '+61', flag: '🇦🇺', name: 'Australia' },
  { code: 'IN', dial: '+91', flag: '🇮🇳', name: 'India' },
]

function SignUpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/dashboard'
  const captchaRef = useRef<HCaptchaRef>(null)
  
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showCountryDropdown, setShowCountryDropdown] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0])
  const [showToast, setShowToast] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  // Two-step signup: 1 = details (name/email/phone/dob/password),
  // 2 = gender picker. Keeping the first screen focused on the
  // essentials makes it feel lighter; gender gets its own spotlight.
  const [step, setStep] = useState<1 | 2>(1)
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    // ISO date (YYYY-MM-DD) from the native date input. Optional — used for
    // the birthday wish email + celebration banner.
    dateOfBirth: '',
    // Gender is required — we use it to pick a matching default
    // avatar and to filter the avatar picker later. '' means
    // "not chosen yet" and blocks submit.
    gender: '' as '' | 'male' | 'female',
    password: '',
    confirmPassword: ''
  })

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            setShowToast(true)
            setTimeout(() => {
              router.push(redirectTo)
            }, 2000)
          } else {
            setIsCheckingAuth(false)
          }
        } else {
          setIsCheckingAuth(false)
        }
      } catch {
        setIsCheckingAuth(false)
      }
    }
    checkAuth()
  }, [router, redirectTo])

  useEffect(() => {
    if (!isCheckingAuth && !showToast) {
      const detectCountry = async () => {
        try {
          const res = await fetch('https://ipapi.co/json/')
          const data = await res.json()
          const detected = COUNTRY_CODES.find(c => c.code === data.country_code)
          if (detected) {
            setSelectedCountry(detected)
          }
        } catch {
          // ignore
        }
      }
      detectCountry()
    }
  }, [isCheckingAuth, showToast])

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-[#7B2D8E] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (showToast) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-3 px-6 py-4 bg-white rounded-2xl shadow-lg border border-[#7B2D8E]/20 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center">
              <Check className="w-5 h-5 text-[#7B2D8E]" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Already Signed In</p>
              <p className="text-sm text-gray-500">Redirecting you now...</p>
            </div>
          </div>
          <div className="w-8 h-8 border-2 border-[#7B2D8E] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  // Step 1 -> Step 2 transition. Validates the details form and
  // surfaces errors without firing the network request.
  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('Please enter your first and last name.')
      return
    }

    if (!formData.email.trim()) {
      setError('Please enter your email.')
      return
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setStep(2)
    // Scroll to top so the gender step is the first thing the
    // user sees — especially important on mobile.
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (formData.gender !== 'male' && formData.gender !== 'female') {
      setError('Please select your gender so we can personalize your profile.')
      return
    }

    if (!captchaToken) {
      setError('Please complete the captcha')
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          phone: formData.phone ? `${selectedCountry.dial}${formData.phone}` : '',
          countryCode: selectedCountry.code,
          captchaToken
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        // Reset captcha so user can try again
        setCaptchaToken('')
        captchaRef.current?.reset()
        return
      }

      setSuccess(true)
    } catch {
      setError('Something went wrong. Please try again.')
      // Reset captcha on error
      setCaptchaToken('')
      captchaRef.current?.reset()
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-[#7B2D8E]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Check Your Email</h1>
          <p className="text-gray-600 mb-6">
            We&apos;ve sent a verification link to <strong>{formData.email}</strong>. 
            Please check your inbox and click the link to verify your account.
          </p>
          <Link 
            href="/signin"
            className="inline-flex items-center gap-2 text-[#7B2D8E] font-medium hover:underline"
          >
            Go to Sign In
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    // Mirrors /signin exactly — clean mobile, framed card on desktop,
    // on a faint brand-tinted backdrop. Same chrome, different form.
    <main className="min-h-screen flex flex-col items-center bg-white sm:bg-gradient-to-b sm:from-[#F7F1F9] sm:via-white sm:to-white px-4 pt-8 pb-16 sm:pt-16 sm:pb-24">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="flex justify-center mb-5 sm:mb-6"
          aria-label="Dermaspace home"
        >
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-EdcQ7u5ESh5sPzpgMsL9Sep8NnY0iu.webp"
            alt="Dermaspace"
            className="h-8 w-auto"
          />
        </Link>

        <div className="sm:bg-white sm:border sm:border-gray-200/80 sm:rounded-2xl sm:p-8 sm:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(123,45,142,0.15)]">
        {/* Step progress — quiet dots that signal there's a short
            journey without feeling like a big multi-step checkout. */}
        <div className="flex items-center justify-center gap-1.5 mb-4">
          <span
            className={`h-1.5 rounded-full transition-all duration-300 ${
              step === 1 ? 'w-6 bg-[#7B2D8E]' : 'w-1.5 bg-[#7B2D8E]'
            }`}
            aria-label="Step 1 of 2"
          />
          <span
            className={`h-1.5 rounded-full transition-all duration-300 ${
              step === 2 ? 'w-6 bg-[#7B2D8E]' : 'w-1.5 bg-gray-200'
            }`}
            aria-label="Step 2 of 2"
          />
        </div>

        <div className="text-center mb-6">
          {step === 1 ? (
            <>
              <h1 className="text-[22px] sm:text-2xl font-bold text-gray-900 tracking-tight">
                Create your account
              </h1>
              <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">
                A few details and you&apos;re in. We&apos;ll sort the rest.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-[22px] sm:text-2xl font-bold text-gray-900 tracking-tight">
                One last thing
              </h1>
              <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">
                Pick what fits so we can personalize your experience.
              </p>
            </>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-[#7B2D8E]/5 border border-[#7B2D8E]/20 rounded-xl text-sm text-[#7B2D8E]">
            {error}
          </div>
        )}

        {/* Social options up top — fastest path for most users. The
            email/password form sits below the "or with email" divider
            as the explicit, fill-out-the-details fallback. Only shown
            on step 1 so the gender step is distraction-free. */}
        {step === 1 && (
        <>
        <div className="space-y-3">
          <a
            href="/api/auth/google"
            className="w-full py-3 px-4 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign up with Google
          </a>

          {/* Sign up with X — kicks off PKCE via /api/auth/x. */}
          <a
            href="/api/auth/x"
            className="w-full py-3 px-4 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5 text-gray-900" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
            </svg>
            Sign up with X
          </a>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">or with email</span>
          </div>
        </div>
        </>
        )}

        {step === 1 && (
        <form onSubmit={handleContinue} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">First Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                    placeholder="First name"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Last Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                    placeholder="Last name"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                  placeholder="you@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Phone Number</label>
              <div className="flex gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                    className="flex items-center gap-2 px-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] bg-white hover:bg-gray-50 transition-colors min-w-[110px]"
                  >
                    <span className="text-lg">{selectedCountry.flag}</span>
                    <span className="text-gray-700 font-medium">{selectedCountry.dial}</span>
                    <ChevronDown className="w-4 h-4 text-gray-400 ml-auto" />
                  </button>
                  
                  {showCountryDropdown && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setShowCountryDropdown(false)}
                      />
                      <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-20 max-h-64 overflow-y-auto">
                        {COUNTRY_CODES.map((country) => (
                          <button
                            key={country.code}
                            type="button"
                            onClick={() => {
                              setSelectedCountry(country)
                              setShowCountryDropdown(false)
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                              selectedCountry.code === country.code ? 'bg-[#7B2D8E]/5' : ''
                            }`}
                          >
                            <span className="text-lg">{country.flag}</span>
                            <span className="flex-1 text-sm text-gray-700">{country.name}</span>
                            <span className="text-sm text-gray-500">{country.dial}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                
                <div className="flex-1 relative">
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                    placeholder="Phone number"
                  />
                </div>
              </div>
            </div>

            {/* Date of birth — powered by our branded <DatePicker> so users
                get Dermaspace-purple styling instead of the browser's default
                date picker, and a year dropdown that makes picking a DOB
                from decades ago effortless. */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Date of Birth <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <DatePicker
                value={formData.dateOfBirth}
                onChange={(v) => setFormData((prev) => ({ ...prev, dateOfBirth: v }))}
                placeholder="Select your birthday"
                ariaLabel="Date of birth"
              />
              <p className="mt-1 text-[11px] text-gray-400">
                So we can wish you a happy birthday
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                  placeholder="Min. 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                  placeholder="Confirm password"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#7B2D8E] text-white text-sm font-semibold rounded-xl hover:bg-[#5A1D6A] transition-colors flex items-center justify-center gap-2"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Step 2 — gender picker. Large, tactile, photo-first tap
            targets so the choice feels like onboarding, not a form
            field. Captcha + final submit live here. */}
        {step === 2 && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { value: 'male' as const, label: 'Man', hero: '/avatars/m2.jpg' },
                { value: 'female' as const, label: 'Woman', hero: '/avatars/f1.jpg' },
              ]
            ).map((opt) => {
              const selected = formData.gender === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, gender: opt.value }))}
                  aria-pressed={selected}
                  className={`group relative overflow-hidden rounded-2xl border-2 transition-all ${
                    selected
                      ? 'border-[#7B2D8E] shadow-[0_0_0_4px_rgba(123,45,142,0.12)]'
                      : 'border-gray-200 hover:border-[#7B2D8E]/40'
                  }`}
                >
                  <div className="aspect-[3/4] w-full overflow-hidden bg-gray-50">
                    <img
                      src={opt.hero}
                      alt=""
                      aria-hidden="true"
                      className={`w-full h-full object-cover transition-transform duration-500 ${
                        selected ? 'scale-105' : 'group-hover:scale-[1.02]'
                      }`}
                    />
                    {/* Readability veil at the bottom for the label */}
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-white drop-shadow">
                      {opt.label}
                    </span>
                    <span
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        selected
                          ? 'border-white bg-[#7B2D8E]'
                          : 'border-white/80 bg-white/10 backdrop-blur-sm'
                      }`}
                      aria-hidden="true"
                    >
                      {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
          <p className="text-center text-[11px] text-gray-400">
            Helps us pick an avatar you&apos;ll love. You can change it anytime.
          </p>

          <HCaptcha ref={captchaRef} onVerify={setCaptchaToken} />

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setError('')
                setStep(1)
              }}
              className="px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.gender}
              className="flex-1 py-3 bg-[#7B2D8E] text-white text-sm font-semibold rounded-xl hover:bg-[#5A1D6A] transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Creating your account…' : 'Create account'}
            </button>
          </div>
        </form>
        )}
        </div>
        {/* Sits outside the card — secondary navigation, not part of
            the sign-up action itself. */}
        <p className="mt-5 sm:mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/signin" className="text-[#7B2D8E] font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-[#7B2D8E] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SignUpForm />
    </Suspense>
  )
}
