'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Calendar,
  MapPin,
  Clock,
  Award,
  Globe,
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
  Youtube,
  UserPlus,
  UserCheck,
  Camera,
  Share2,
  Lock,
  Pencil,
  Check,
  Heart,
  BadgeCheck,
  Loader2,
} from 'lucide-react'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { useFollow } from '@/hooks/use-follow'
import { AvatarPicker } from '@/components/profile/avatar-picker'
import { isSpaAvatarUrl } from '@/lib/spa-avatars'

interface UserProfile {
  id: string
  firstName: string
  lastName: string
  username: string | null
  avatarUrl?: string
  bio?: string
  preferredLocation?: string
  memberSince: string
  totalBookings?: number
  favoriteServices?: string[]
  // When the owner is viewing their own private profile, the API
  // still returns the full payload but flips `isPublic` to `false`
  // so we can show an "only you can see this" notice at the top of
  // the page. For public profiles (and all viewers of them) this
  // stays `true`.
  isPublic?: boolean
  socials?: {
    website?: string | null
    instagram?: string | null
    twitter?: string | null
    tiktok?: string | null
    facebook?: string | null
    linkedin?: string | null
    youtube?: string | null
  }
}

// TikTok doesn't ship in lucide-react, so we draw a lightweight inline
// glyph that matches the stroke weight of the other lucide icons.
function TikTokGlyph({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M19.6 6.5a5.6 5.6 0 0 1-3.3-1.1 5.6 5.6 0 0 1-2.1-3.3V2h-3.3v13.4a2.6 2.6 0 1 1-1.9-2.5v-3.4a6 6 0 1 0 5.2 5.9V9a8.9 8.9 0 0 0 5.4 1.8V6.5z" />
    </svg>
  )
}

interface ViewerState {
  id: string | null
  username: string | null
  // Viewer's gender — drives which avatars show up in the picker
  // when they open it on their own profile. Null for legacy rows.
  gender: 'male' | 'female' | null
  loaded: boolean
}

export default function PublicProfilePage() {
  const params = useParams()
  const router = useRouter()
  const username = params.username as string

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFoundError, setNotFoundError] = useState(false)
  // Separate "server error" state so a 500 on the API doesn't get
  // silently rendered as a misleading "Profile Not Found".
  const [serverError, setServerError] = useState(false)

  // Who's looking? We need this to decide whether to show the follow
  // button (never on your own profile) and to unlock the avatar picker
  // + "edit profile" shortcut for the owner. Loaded in parallel with
  // the profile fetch to keep first paint fast.
  const [viewer, setViewer] = useState<ViewerState>({
    id: null,
    username: null,
    gender: null,
    loaded: false,
  })

  // Owner-only state for the spa avatar picker. Saving goes straight
  // through PUT /api/auth/profile so the change lands in the DB and
  // mirrors back into this page immediately — no reload required.
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [copiedShare, setCopiedShare] = useState(false)

  // Follow state lives in SWR so the counts stay in sync across any
  // other follow buttons that mount on the same username later. We
  // fetch for owners too (so they can see their own follower count)
  // — the follow button itself is just hidden in that case.
  const isOwner = viewer.loaded && viewer.id && profile?.id === viewer.id
  const follow = useFollow(username)

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch(`/api/user/profile/${username}`)
        if (res.status === 404) {
          setNotFoundError(true)
          return
        }
        if (!res.ok) {
          console.error(
            `[v0] /api/user/profile/${username} returned ${res.status}`,
          )
          setServerError(true)
          return
        }
        const data = await res.json()
        setProfile(data)
      } catch (error) {
        console.error('Error fetching profile:', error)
        setServerError(true)
      } finally {
        setLoading(false)
      }
    }

    async function fetchViewer() {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          setViewer({
            id: data.user?.id ?? null,
            username: data.user?.username ?? null,
            gender:
              data.user?.gender === 'male' || data.user?.gender === 'female'
                ? data.user.gender
                : null,
            loaded: true,
          })
        } else {
          setViewer({ id: null, username: null, gender: null, loaded: true })
        }
      } catch {
        setViewer({ id: null, username: null, gender: null, loaded: true })
      }
    }

    if (username) {
      fetchProfile()
      fetchViewer()
    }
  }, [username])

  const handleFollow = async () => {
    if (!viewer.loaded) return
    if (!viewer.id) {
      // Bounce unauthenticated visitors to sign in and bring them
      // right back to this profile so the follow action stays in
      // the flow of intent.
      router.push(`/signin?next=${encodeURIComponent(`/${username}`)}`)
      return
    }
    await follow.toggle()
  }

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    try {
      if (
        typeof navigator !== 'undefined' &&
        'share' in navigator &&
        typeof navigator.share === 'function'
      ) {
        await navigator.share({
          title: profile
            ? `${profile.firstName} ${profile.lastName} on Dermaspace`
            : 'Dermaspace profile',
          url,
        })
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url)
        setCopiedShare(true)
        setTimeout(() => setCopiedShare(false), 2000)
      }
    } catch {
      /* user dismissed the share sheet — nothing to do */
    }
  }

  // Save a new avatar (spa preset or uploaded photo) for the owner
  // directly from this page. We reuse /api/auth/profile, echoing the
  // current name fields because the endpoint's validator requires
  // them, then patch local state so the hero avatar updates with no
  // round-trip delay.
  const saveOwnerAvatar = async (url: string) => {
    if (!profile) return
    const previous = profile.avatarUrl
    setProfile({ ...profile, avatarUrl: url })
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: profile.firstName,
          lastName: profile.lastName,
          avatarUrl: url,
        }),
      })
      if (!res.ok) throw new Error('save failed')
      // Broadcast the change so the header (and any other mounted
      // consumers) re-fetch the current user record without a reload.
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('user-updated'))
      }
    } catch {
      // Revert on failure so the visible avatar always matches what's
      // actually stored.
      setProfile({ ...profile, avatarUrl: previous })
    }
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-white">
          <div className="py-6 md:py-8 px-4">
            <div className="max-w-6xl mx-auto">
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                <div className="h-40 md:h-56 bg-gray-100" />
                <div className="px-6 pb-8 -mt-14 md:-mt-16">
                  <div className="w-28 h-28 md:w-32 md:h-32 rounded-2xl bg-gray-200 border-4 border-white" />
                  <div className="h-6 w-48 bg-gray-200 rounded mt-4" />
                  <div className="h-4 w-28 bg-gray-200 rounded mt-2" />
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  if (serverError) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-white">
          <div className="py-6 md:py-8 px-4">
            <div className="max-w-6xl mx-auto">
              <div className="bg-white rounded-2xl border border-gray-100 p-8 sm:p-12 text-center">
                <div className="w-16 h-16 mx-auto bg-[#7B2D8E]/10 rounded-full flex items-center justify-center mb-5">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-7 h-7 text-[#7B2D8E]"
                    aria-hidden="true"
                  >
                    <path d="M12 9v4" />
                    <path d="M12 17h.01" />
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                </div>
                <h1 className="text-xl font-semibold text-gray-900 mb-2">
                  Something went wrong
                </h1>
                <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                  We couldn&apos;t load{' '}
                  <span className="font-medium text-gray-700">@{username}</span>&apos;s
                  profile right now. This is usually a temporary issue — please
                  try again in a moment.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7B2D8E] text-white text-sm font-medium rounded-xl hover:bg-[#6B2278] transition-colors"
                  >
                    Try again
                  </button>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:border-[#7B2D8E] hover:text-[#7B2D8E] transition-colors"
                  >
                    Go to Homepage
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  if (notFoundError || !profile) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-white">
          <div className="py-6 md:py-8 px-4">
            <div className="max-w-6xl mx-auto">
              <div className="bg-white rounded-2xl border border-gray-100 p-8 sm:p-12 text-center">
                <div className="w-16 h-16 mx-auto bg-[#7B2D8E]/10 rounded-full flex items-center justify-center mb-5">
                  <span className="text-2xl font-bold text-[#7B2D8E]">?</span>
                </div>
                <h1 className="text-xl font-semibold text-gray-900 mb-2">
                  Profile Not Found
                </h1>
                <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                  The user{' '}
                  <span className="font-medium text-gray-700">@{username}</span>{' '}
                  doesn&apos;t exist or hasn&apos;t set up their profile yet.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7B2D8E] text-white text-sm font-medium rounded-xl hover:bg-[#6B2278] transition-colors"
                  >
                    Go to Homepage
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:border-[#7B2D8E] hover:text-[#7B2D8E] transition-colors"
                  >
                    Claim your username
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  const initials = `${profile.firstName?.charAt(0) || ''}${
    profile.lastName?.charAt(0) || ''
  }`.toUpperCase()

  // Build the list of social links to render — only networks with a
  // resolved URL are shown.
  const socialLinks: {
    key: keyof NonNullable<UserProfile['socials']>
    label: string
    href: string
    icon: React.ReactNode
  }[] = []
  const s = profile.socials || {}
  const maybePush = (
    key: keyof NonNullable<UserProfile['socials']>,
    label: string,
    icon: React.ReactNode,
  ) => {
    const href = s[key]
    if (typeof href === 'string' && href) {
      socialLinks.push({ key, label, href, icon })
    }
  }
  maybePush('website', 'Website', <Globe className="w-4 h-4" />)
  maybePush('instagram', 'Instagram', <Instagram className="w-4 h-4" />)
  maybePush('twitter', 'X (Twitter)', <Twitter className="w-4 h-4" />)
  maybePush('tiktok', 'TikTok', <TikTokGlyph className="w-4 h-4" />)
  maybePush('facebook', 'Facebook', <Facebook className="w-4 h-4" />)
  maybePush('linkedin', 'LinkedIn', <Linkedin className="w-4 h-4" />)
  maybePush('youtube', 'YouTube', <Youtube className="w-4 h-4" />)

  const memberYear = new Date(profile.memberSince).getFullYear()
  // Friendly member-since string — "joined April 2026".
  const memberSinceLabel = new Date(profile.memberSince).toLocaleDateString(
    undefined,
    { month: 'long', year: 'numeric' },
  )

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        {/* Same outer padding + max width as /dashboard so the profile
            feels like it belongs to the same product. */}
        <div className="py-6 md:py-8 px-4">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* "Only you" banner — owner-only notice when the profile
                is private. Everyone else gets a 404 upstream. */}
            {profile.isPublic === false && isOwner && (
              <div className="rounded-2xl border border-[#7B2D8E]/20 bg-[#7B2D8E]/5 p-3 sm:p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 leading-tight">
                    Your profile is private
                  </p>
                  <p className="text-xs text-gray-600 leading-snug mt-0.5">
                    Only you can see this page.{' '}
                    <Link
                      href="/dashboard/settings"
                      className="text-[#7B2D8E] font-medium hover:underline"
                    >
                      Make it public
                    </Link>{' '}
                    so others can follow and book with you.
                  </p>
                </div>
              </div>
            )}

            {/* Profile hero + sidebar layout — mirrors the dashboard's
                main/sidebar split so the two pages feel cohesive. */}
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Main column */}
              <div className="flex-1 min-w-0 space-y-6">
                {/* Hero card */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  {/* Cover band — solid brand colour with a subtle
                      radial flare so it reads as premium without
                      violating the "no loud gradients" rule. */}
                  <div className="relative h-32 md:h-48 bg-[#7B2D8E]">
                    <div
                      className="absolute inset-0 opacity-40"
                      style={{
                        backgroundImage:
                          'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.25), transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.15), transparent 45%)',
                      }}
                      aria-hidden="true"
                    />
                    {/* Owner actions — floated top-right of the cover
                        band so they're discoverable without crowding
                        the name/handle row below. */}
                    {isOwner && (
                      <div className="absolute top-3 right-3 flex items-center gap-2">
                        <Link
                          href="/dashboard/settings"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur text-xs font-medium text-gray-900 hover:bg-white transition-colors shadow-sm"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Edit profile</span>
                          <span className="sm:hidden">Edit</span>
                        </Link>
                      </div>
                    )}
                  </div>

                  <div className="px-4 sm:px-6 pb-6 -mt-14 md:-mt-16">
                    {/* Avatar + primary actions row. On mobile the
                        actions stack underneath; on md+ they sit on
                        the right, vertically centered with the name
                        block. */}
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                      <div className="flex flex-col md:flex-row md:items-end gap-3 md:gap-5 min-w-0">
                        {/* Avatar tile — the whole tile is clickable
                            for the owner, opening the spa avatar
                            picker. For visitors it's a static image. */}
                        <div className="relative flex-shrink-0">
                          {isOwner ? (
                            <button
                              type="button"
                              onClick={() => setShowAvatarPicker(true)}
                              className="group relative block w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden border-[5px] border-white shadow-[0_8px_24px_-8px_rgba(123,45,142,0.35)] bg-[#7B2D8E] hover:ring-4 hover:ring-[#7B2D8E]/20 transition-all"
                              aria-label="Change avatar"
                            >
                              {profile.avatarUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={profile.avatarUrl}
                                  alt={`${profile.firstName}'s avatar`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="w-full h-full flex items-center justify-center text-white text-3xl md:text-4xl font-bold">
                                  {initials}
                                </span>
                              )}
                              {/* Hover change pill — uses a camera
                                  glyph instead of the old Sparkles
                                  icon per product feedback. */}
                              <span className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-xs font-semibold text-[#7B2D8E]">
                                  <Camera className="w-3.5 h-3.5" />
                                  Change
                                </span>
                              </span>
                            </button>
                          ) : (
                            <div className="w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden border-[5px] border-white shadow-[0_8px_24px_-8px_rgba(123,45,142,0.35)] bg-[#7B2D8E]">
                              {profile.avatarUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={profile.avatarUrl}
                                  alt={`${profile.firstName}'s avatar`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="w-full h-full flex items-center justify-center text-white text-3xl md:text-4xl font-bold">
                                  {initials}
                                </span>
                              )}
                            </div>
                          )}
                          {/* Owner-only "edit" pip on mobile — a small
                              brand-coloured camera chip tucked to the
                              bottom-right of the avatar, gives a
                              clear affordance that the avatar is
                              tappable even without a hover state. */}
                          {isOwner && (
                            <button
                              type="button"
                              onClick={() => setShowAvatarPicker(true)}
                              aria-label="Change avatar"
                              className="absolute -bottom-0.5 -right-0.5 md:hidden w-9 h-9 rounded-full bg-[#7B2D8E] text-white border-[3px] border-white shadow-md flex items-center justify-center"
                            >
                              <Camera className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div className="min-w-0 md:pb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight tracking-tight text-balance">
                              {profile.firstName} {profile.lastName}
                            </h1>
                            {/* Tiny verified-style checkmark for public
                                profiles — purely decorative, matches
                                the "member" vibe. */}
                            {profile.isPublic !== false && (
                              <BadgeCheck
                                className="w-5 h-5 text-[#7B2D8E] fill-[#7B2D8E]/10"
                                aria-label="Public profile"
                              />
                            )}
                          </div>
                          {profile.username && (
                            <p className="text-sm text-[#7B2D8E] font-medium">
                              @{profile.username}
                            </p>
                          )}
                          {/* Counts row — follows / followers sit right
                              under the handle, tappable on the follower
                              count only (followers list is a nice-to-
                              have for later; the count alone is enough
                              social proof for v1). */}
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <div className="flex items-center gap-1">
                              <span className="font-semibold text-gray-900">
                                {follow.followerCount}
                              </span>
                              <span className="text-gray-500">
                                {follow.followerCount === 1
                                  ? 'follower'
                                  : 'followers'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="font-semibold text-gray-900">
                                {follow.followingCount}
                              </span>
                              <span className="text-gray-500">following</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons — Follow (visitors) and Share
                          (everyone). On mobile the row stretches full
                          width so buttons are easy to tap; on md+ they
                          sit inline next to the name block. */}
                      <div className="flex items-center gap-2 w-full md:w-auto">
                        {!isOwner && viewer.loaded && (
                          <button
                            type="button"
                            onClick={handleFollow}
                            disabled={follow.isPending}
                            className={`inline-flex items-center justify-center gap-1.5 flex-1 md:flex-none min-w-[120px] px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 ${
                              follow.isFollowing
                                ? 'bg-[#7B2D8E]/10 text-[#7B2D8E] hover:bg-[#7B2D8E]/15 border border-[#7B2D8E]/20'
                                : 'bg-[#7B2D8E] text-white hover:bg-[#6B2278] shadow-sm shadow-[#7B2D8E]/20'
                            }`}
                            aria-pressed={follow.isFollowing}
                            aria-busy={follow.isPending}
                          >
                            {follow.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>
                                  {follow.isFollowing ? 'Unfollowing' : 'Following'}
                                </span>
                              </>
                            ) : follow.isFollowing ? (
                              <>
                                <UserCheck className="w-4 h-4" />
                                Following
                              </>
                            ) : (
                              <>
                                <UserPlus className="w-4 h-4" />
                                Follow
                              </>
                            )}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleShare}
                          className="inline-flex items-center justify-center gap-1.5 flex-1 md:flex-none px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:border-[#7B2D8E] hover:text-[#7B2D8E] transition-colors active:scale-[0.98]"
                        >
                          {copiedShare ? (
                            <>
                              <Check className="w-4 h-4" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Share2 className="w-4 h-4" />
                              Share
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Bio */}
                    {profile.bio && (
                      <p className="mt-5 text-sm md:text-base text-gray-600 leading-relaxed whitespace-pre-line max-w-2xl text-pretty">
                        {profile.bio}
                      </p>
                    )}

                    {/* Social pills — only networks the user has set
                        up. Each one opens in a new tab. */}
                    {socialLinks.length > 0 && (
                      <div className="mt-5 flex flex-wrap items-center gap-2">
                        {socialLinks.map((link) => (
                          <a
                            key={link.key}
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer me"
                            title={link.label}
                            aria-label={link.label}
                            className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 text-gray-500 hover:text-[#7B2D8E] hover:border-[#7B2D8E]/40 hover:bg-[#7B2D8E]/5 transition-colors"
                          >
                            {link.icon}
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Meta row — member since + preferred location */}
                    <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs md:text-sm text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span>Member since {memberSinceLabel}</span>
                      </div>
                      {profile.preferredLocation && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4" />
                          <span>Prefers {profile.preferredLocation}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Favorite services card */}
                {profile.favoriteServices &&
                  profile.favoriteServices.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Heart className="w-4 h-4 text-[#7B2D8E]" />
                        <h2 className="font-semibold text-gray-900">
                          Favorite Services
                        </h2>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {profile.favoriteServices.map((service, index) => (
                          <span
                            key={index}
                            className="px-3 py-1.5 bg-[#7B2D8E]/10 text-[#7B2D8E] rounded-full text-sm font-medium"
                          >
                            {service}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                {/* CTA card — always present, invites the viewer to
                    book. On the owner's own profile it still makes
                    sense ("book your next appointment"). */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5 md:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-[#7B2D8E]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm md:text-base">
                        {isOwner
                          ? 'Ready for your next treatment?'
                          : `Book a session at Dermaspace`}
                      </h3>
                      <p className="text-xs md:text-sm text-gray-500 mt-0.5">
                        Reserve a slot with our expert therapists.
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/booking"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#7B2D8E] text-white text-sm font-medium rounded-xl hover:bg-[#6B2278] transition-colors"
                  >
                    <Calendar className="w-4 h-4" />
                    Book appointment
                  </Link>
                </div>
              </div>

              {/* Sidebar — stats + quick links. Mirrors the dashboard
                  sidebar width (lg:w-72) so users can tell at a glance
                  the two pages were designed together. */}
              <aside className="lg:w-72 flex-shrink-0 space-y-6">
                <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6 lg:sticky lg:top-24">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-4">
                    At a glance
                  </h2>
                  {/* Stacked rows on every breakpoint — each stat gets
                      its own generous, scannable row with an icon on
                      the left, a bold number and a soft label on the
                      right. Mobile used to squash three cards into a
                      cramped 3-col grid; rows breathe better on small
                      screens and feel equally intentional on desktop. */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-3 p-3 bg-[#7B2D8E]/5 rounded-xl">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Calendar className="w-5 h-5 text-[#7B2D8E]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-lg font-bold text-gray-900 leading-tight">
                          {profile.totalBookings || 0}
                        </p>
                        <p className="text-xs text-gray-500 leading-tight">
                          {profile.totalBookings === 1 ? 'Booking' : 'Bookings'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-[#7B2D8E]/5 rounded-xl">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Award className="w-5 h-5 text-[#7B2D8E]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-lg font-bold text-gray-900 leading-tight">
                          Member
                        </p>
                        <p className="text-xs text-gray-500 leading-tight">
                          Status
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-[#7B2D8E]/5 rounded-xl">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Clock className="w-5 h-5 text-[#7B2D8E]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-lg font-bold text-gray-900 leading-tight">
                          {memberYear}
                        </p>
                        <p className="text-xs text-gray-500 leading-tight">
                          Since
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Owner-only shortcut — a compact edit link that
                      mirrors the one in the cover band. Hidden on
                      non-owner views to avoid suggesting visitors
                      can edit this page. */}
                  {isOwner && (
                    <div className="mt-5 pt-5 border-t border-gray-100 space-y-3">
                      <Link
                        href="/dashboard"
                        className="flex items-center justify-between text-sm font-medium text-gray-700 hover:text-[#7B2D8E] transition-colors"
                      >
                        Go to dashboard
                        <span aria-hidden="true" className="text-gray-400">→</span>
                      </Link>
                      <Link
                        href="/dashboard/settings"
                        className="flex items-center justify-between text-sm font-medium text-gray-700 hover:text-[#7B2D8E] transition-colors"
                      >
                        Edit bio &amp; socials
                        <span aria-hidden="true" className="text-gray-400">→</span>
                      </Link>
                    </div>
                  )}
                </div>

                {/* Small "Powered by" note — keeps branding consistent
                    with the old design but in a more tasteful spot. */}
                <div className="text-center text-xs text-gray-400">
                  <Link
                    href="/"
                    className="hover:text-[#7B2D8E] transition-colors"
                  >
                    Powered by{' '}
                    <span className="font-semibold">Dermaspace</span>
                  </Link>
                </div>
              </aside>
            </div>
          </div>
        </div>

        {/* Owner-only avatar picker — mounted here so the sidebar /
            picker never competes for the same z-index as the header. */}
        {isOwner && (
          <AvatarPicker
            open={showAvatarPicker}
            onClose={() => setShowAvatarPicker(false)}
            currentUrl={profile.avatarUrl || null}
            initials={initials}
            gender={viewer.gender}
            onSelect={async (url) => {
              await saveOwnerAvatar(url)
              setShowAvatarPicker(false)
            }}
          />
        )}
      </main>
      <Footer />
    </>
  )
}
