"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Phone, User, CheckCircle, Camera, ChevronDown, AtSign, Check, X, Loader2, Globe, Lock, Eye, ChevronRight } from "lucide-react"
import { AvatarPicker } from "@/components/profile/avatar-picker"
import PageLoader from "@/components/shared/page-loader"

const COUNTRY_CODES = [
  { code: 'NG', dial: '+234', flag: '🇳🇬', name: 'Nigeria' },
  { code: 'US', dial: '+1', flag: '🇺🇸', name: 'United States' },
  { code: 'GB', dial: '+44', flag: '🇬🇧', name: 'United Kingdom' },
  { code: 'AE', dial: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: 'GH', dial: '+233', flag: '🇬🇭', name: 'Ghana' },
  { code: 'ZA', dial: '+27', flag: '🇿🇦', name: 'South Africa' },
]

export default function CompleteProfilePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [error, setError] = useState("")
  // `gender` is captured during signup and drives which avatar pool
  // we show (men only see male avatars, women only see female ones).
  // Legacy sign-ups that predate the gender field fall back to a
  // softer "tell us who you are" nudge inside AvatarPicker itself.
  const [user, setUser] = useState<{
    firstName?: string
    lastName?: string
    email?: string
    avatarUrl?: string
    gender?: 'male' | 'female' | null
  } | null>(null)
  // Chosen avatar URL (curated, already hosted). Null until the user
  // picks one. On submit we send this — or fall back to whatever was
  // already on their record — as `avatarUrl`.
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  // Controls the AvatarPicker modal. Previously the camera button
  // kicked off a file-input upload (and on some flows punted the
  // user over to settings); now it opens the in-place picker so the
  // whole signup funnel stays on this page.
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [showCountryDropdown, setShowCountryDropdown] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0])
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    username: "",
  })
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [usernameMessage, setUsernameMessage] = useState<string | null>(null)
  // Optional profile-polish fields. Hidden behind a disclosure so the
  // critical path (name, phone, username) stays short; users who want
  // to set up their profile in one go can expand it. Everything below
  // is purely additive — the API treats missing values as "skip".
  const [showMore, setShowMore] = useState(false)
  const [bio, setBio] = useState("")
  const [isPublic, setIsPublic] = useState(true)
  const [socials, setSocials] = useState({
    website: "",
    instagram: "",
    twitter: "",
    tiktok: "",
    facebook: "",
    linkedin: "",
    youtube: "",
  })

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me")
        if (res.ok) {
          const data = await res.json()
          setUser(data.user)
          setAvatarPreview(data.user.avatarUrl || null)
          setFormData({
            firstName: data.user.firstName || "",
            lastName: data.user.lastName || "",
            phone: data.user.phone || "",
            username: data.user.username || "",
          })
          setIsCheckingAuth(false)
        } else {
          router.push("/signin")
        }
      } catch {
        router.push("/signin")
      }
    }
    fetchUser()
  }, [router])

  useEffect(() => {
    if (!isCheckingAuth) {
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
  }, [isCheckingAuth])

  // Check username availability (inline feedback only — never leaks into main form error)
  useEffect(() => {
    if (formData.username.length === 0) {
      setUsernameAvailable(null)
      setUsernameMessage(null)
      return
    }
    if (formData.username.length < 3) {
      setUsernameAvailable(null)
      setUsernameMessage('Username must be at least 3 characters')
      return
    }

    setUsernameMessage(null)
    const timeoutId = setTimeout(async () => {
      setCheckingUsername(true)
      try {
        const res = await fetch(`/api/user/username?username=${encodeURIComponent(formData.username)}`)
        const data = await res.json()
        setUsernameAvailable(!!data.available)
        if (data.available) {
          setUsernameMessage(`@${formData.username} is available`)
        } else {
          setUsernameMessage(data.error || `@${formData.username} is already taken`)
        }
      } catch {
        setUsernameMessage('Could not verify username, try again')
      } finally {
        setCheckingUsername(false)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [formData.username])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      // Curated avatar URLs come pre-hosted from AvatarPicker, so no
      // upload step is needed — just forward whatever the user chose
      // (or whatever was already on their record from signup).
      const avatarUrl = avatarPreview || user?.avatarUrl || null

      const fullPhone = formData.phone ? `${selectedCountry.dial}${formData.phone.replace(/^0+/, '')}` : ''

      const res = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          phone: fullPhone,
          avatarUrl,
          // Optional profile-polish fields. Server treats empty
          // strings as "don't write" so passing them verbatim is
          // safe even when the disclosure is collapsed.
          bio,
          isPublic,
          ...socials,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to complete profile")
        setIsLoading(false)
        return
      }

      router.push("/dashboard")
    } catch {
      setError("An error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  if (isCheckingAuth) {
    return <PageLoader />
  }

  // Matches the signin/signup shell so profile completion feels like
  // the same auth stack — narrower column, lighter chrome on mobile,
  // same soft gradient backdrop on sm+. Previously the card was a
  // shadow-heavy max-w-md dialog that dwarfed the rest of the auth
  // flow on phones.
  const initials =
    `${(user?.firstName ?? formData.firstName).charAt(0) || ''}${(user?.lastName ?? formData.lastName).charAt(0) || ''}`.toUpperCase()

  return (
    <>
    {/* Outer shell — Google-style auth surface. The previous version
        was a `pt-16 pb-24` page with a soft purple gradient backdrop
        and a shadow-heavy card; the spacing made the form feel like
        it took up two screens. We now use a tighter `pt-6 pb-12 sm:
        pt-10` rhythm, drop the gradient, and keep the card flat on
        mobile with just a hairline border on desktop — the same
        chrome Google/Stripe use for short-form auth steps. */}
    <main className="min-h-[100svh] flex flex-col items-center bg-white px-4 pt-6 pb-12 sm:pt-10 sm:pb-16">
      <div className="w-full max-w-[420px]">
        <Link href="/" className="block mb-5 text-center">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-EdcQ7u5ESh5sPzpgMsL9Sep8NnY0iu.webp"
            alt="Dermaspace"
            className="h-8 w-auto mx-auto"
          />
        </Link>

        {/* Card — flat on mobile, hairline border on desktop. We
            dropped the soft drop-shadow because at this small width
            it added a "modal floating in space" quality that fought
            the form. */}
        <div className="bg-white rounded-2xl sm:border sm:border-gray-200 p-5 sm:p-6">
          {/* Compact header — was a stack of: 48×48 brand circle +
              CheckCircle, "Almost there!" title, subtitle, and
              "Signed in as …" line. Four vertical elements is too
              much chrome for what's just a "complete your profile"
              prompt; we collapse it into a single 36×36 mark,
              tighter title/subtitle, and inline the signed-in-as
              line right under the subtitle so it reads as one
              coherent block. */}
          <div className="mb-5 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-[18px] h-[18px] text-[#7B2D8E]" strokeWidth={2.25} />
            </div>
            <div className="min-w-0">
              <h1 className="text-[17px] font-semibold text-gray-900 leading-tight tracking-tight">
                Complete your profile
              </h1>
              <p className="mt-1 text-[13px] text-gray-600 leading-snug">
                A few quick details so we can personalise your visits.
                {user?.email && (
                  <>
                    {' '}Signed in as{' '}
                    <span className="font-medium text-gray-900">{user.email}</span>.
                  </>
                )}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-4 bg-[#7B2D8E]/5 border border-[#7B2D8E]/20 rounded-xl text-sm text-[#7B2D8E]">
                {error}
              </div>
            )}

            {/* Avatar chooser — was a 96×96 ring + a separate
                centred caption underneath, which ate two rows of
                vertical space. We now keep the same tap target but
                pair it with an inline caption to its right (Google
                profile-edit style), so the avatar block reads as a
                single horizontal row instead of two stacked ones. */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setShowAvatarPicker(true)}
                className="relative group focus:outline-none flex-shrink-0"
                aria-label="Choose profile avatar"
              >
                <div className="w-[72px] h-[72px] rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200 group-hover:border-[#7B2D8E] group-focus-visible:ring-2 group-focus-visible:ring-[#7B2D8E]/40 transition-colors">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-7 h-7 bg-[#7B2D8E] rounded-full flex items-center justify-center text-white group-hover:bg-[#5A1D6A] transition-colors border-2 border-white"
                  aria-hidden="true"
                >
                  <Camera className="w-3.5 h-3.5" />
                </span>
              </button>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-gray-900 leading-tight">
                  Profile photo
                </p>
                <p className="mt-0.5 text-[12px] text-gray-500 leading-snug">
                  {avatarPreview ? 'Tap the avatar to change it.' : 'Tap the avatar to choose one.'}
                </p>
              </div>
            </div>

            {/* Name pair — labels tightened from `text-xs … mb-1.5`
                to `text-[11px] … mb-1`, and the icon was dropped from
                first-name (it duplicated the same User glyph already
                shown in the avatar tile right above). Inputs now use
                `py-2.5` for the calmer Google-style density. */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">
                  First name
                </label>
                <input
                  type="text"
                  placeholder="First name"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] placeholder-gray-400"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">
                  Last name
                </label>
                <input
                  type="text"
                  placeholder="Last name"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] placeholder-gray-400"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Phone number <span className="text-[#7B2D8E]">*</span>
              </label>
              <div className="flex gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                    className="flex items-center gap-2 px-3 py-2.5 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] bg-white hover:bg-gray-50 transition-colors min-w-[104px]"
                  >
                    <span className="text-base">{selectedCountry.flag}</span>
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
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    placeholder="Phone number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                    className="w-full pl-10 pr-3.5 py-2.5 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] placeholder-gray-400"
                    required
                  />
                </div>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Used for booking confirmations and consultations.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Username
              </label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="yourname"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                  maxLength={30}
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] placeholder-gray-400"
                />
                {formData.username.length >= 3 && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {checkingUsername ? (
                      <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                    ) : usernameAvailable ? (
                      <Check className="w-4 h-4 text-[#7B2D8E]" strokeWidth={3} />
                    ) : usernameAvailable === false ? (
                      <X className="w-4 h-4 text-gray-400" strokeWidth={2.5} />
                    ) : null}
                  </div>
                )}
              </div>
              {usernameMessage ? (
                <p className={`text-[11px] mt-1 font-medium ${
                  usernameAvailable
                    ? 'text-[#7B2D8E]'
                    : 'text-gray-500'
                }`}>
                  {usernameMessage}
                </p>
              ) : (
                <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                  3–30 characters. Letters, numbers, and underscores only.
                </p>
              )}
            </div>

            {/* Optional fields — bio, social links, and a public/
                private toggle for the user's profile page. Collapsed
                by default so the critical path stays short; expanded
                users get inline inputs that map 1:1 to the dashboard
                settings page so the two surfaces feel like the same
                app. Works at every breakpoint — stacked on mobile,
                two-column grid for socials on sm+. */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowMore((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                aria-expanded={showMore}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
                    <Eye className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 leading-tight">
                      Tell people about yourself
                    </p>
                    <p className="text-[11px] text-gray-500 leading-snug">
                      Bio, social links, and privacy — all optional
                    </p>
                  </div>
                </div>
                <ChevronRight
                  className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${
                    showMore ? 'rotate-90' : ''
                  }`}
                />
              </button>

              {showMore && (
                <div className="px-4 pb-4 pt-1 space-y-4 border-t border-gray-100">
                  {/* Bio */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-medium text-gray-700">
                        Bio
                      </label>
                      <span className="text-[10px] text-gray-400 tabular-nums">
                        {bio.length}/500
                      </span>
                    </div>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value.slice(0, 500))}
                      rows={3}
                      placeholder="A few words about yourself — interests, skin goals, anything."
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] resize-none placeholder-gray-400"
                      maxLength={500}
                    />
                  </div>

                  {/* Socials */}
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1.5">Social links</p>
                    <p className="text-[11px] text-gray-500 mb-2.5">
                      Paste a full URL or just your @handle.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {(
                        [
                          { key: 'website', label: 'Website', placeholder: 'yoursite.com' },
                          { key: 'instagram', label: 'Instagram', placeholder: '@handle' },
                          { key: 'twitter', label: 'X (Twitter)', placeholder: '@handle' },
                          { key: 'tiktok', label: 'TikTok', placeholder: '@handle' },
                          { key: 'facebook', label: 'Facebook', placeholder: 'username' },
                          { key: 'linkedin', label: 'LinkedIn', placeholder: 'username' },
                          { key: 'youtube', label: 'YouTube', placeholder: '@channel' },
                        ] as const
                      ).map(({ key, label, placeholder }) => (
                        <div key={key}>
                          <label className="block text-[10px] font-medium text-gray-600 mb-1">
                            {label}
                          </label>
                          <input
                            type="text"
                            value={socials[key]}
                            onChange={(e) =>
                              setSocials((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                            placeholder={placeholder}
                            maxLength={200}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] placeholder-gray-400"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Privacy — a single, explicit toggle. We show the
                      current state as a visible chip so it's obvious
                      what will happen, and the wording flips to match
                      what the user actually gets. */}
                  <div className="rounded-xl border border-gray-200 p-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isPublic
                            ? 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 leading-tight">
                          {isPublic ? 'Public profile' : 'Private profile'}
                        </p>
                        <p className="text-[11px] text-gray-500 leading-snug mt-0.5">
                          {isPublic
                            ? 'Anyone with your profile link can see your bio and socials.'
                            : 'Only you can see your profile page — hidden from everyone else.'}
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isPublic}
                        onClick={() => setIsPublic((v) => !v)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/30 ${
                          isPublic ? 'bg-[#7B2D8E]' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            isPublic ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Submit — slightly slimmer (h-11) and uses font-medium
                instead of font-semibold so the button doesn't shout
                next to the rest of the form, the same restraint
                Google's auth flows use on their primary action. */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 mt-1 bg-[#7B2D8E] text-white text-[14px] font-medium rounded-xl hover:bg-[#5A1D6A] active:bg-[#4A1856] transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Completing profile…' : 'Complete profile'}
            </button>
          </form>

          <p className="mt-5 text-center text-[11px] text-gray-500 leading-relaxed">
            By continuing, you agree to our{' '}
            <Link href="/terms" className="text-[#7B2D8E] hover:underline">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-[#7B2D8E] hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </main>

    {/* Curated avatar picker — opened from the avatar tile above.
        Saves happen on submit (not immediately) since this is still
        the onboarding form, so we just cache the chosen URL in
        local state for now. `gender` is coming from the signup step;
        if it's missing the picker falls back to its own "tell us who
        you are" nudge. */}
    <AvatarPicker
      open={showAvatarPicker}
      onClose={() => setShowAvatarPicker(false)}
      currentUrl={avatarPreview}
      initials={initials}
      gender={user?.gender ?? null}
      onSelect={(url) => {
        setAvatarPreview(url)
      }}
    />
    </>
  )
}
