'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
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
} from 'lucide-react'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'

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

export default function PublicProfilePage() {
  const params = useParams()
  const username = params.username as string
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFoundError, setNotFoundError] = useState(false)

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch(`/api/user/profile/${username}`)
        if (res.status === 404) {
          setNotFoundError(true)
          return
        }
        if (!res.ok) throw new Error('Failed to fetch profile')
        const data = await res.json()
        setProfile(data)
      } catch (error) {
        console.error('Error fetching profile:', error)
        setNotFoundError(true)
      } finally {
        setLoading(false)
      }
    }

    if (username) {
      fetchProfile()
    }
  }, [username])

  if (loading) {
    return (
      <>
        <Header />
        <main className="bg-gray-50 pt-2 pb-4">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-8 animate-pulse">
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-gray-200" />
                <div className="h-6 w-40 bg-gray-200 rounded mt-4" />
                <div className="h-4 w-24 bg-gray-200 rounded mt-2" />
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
        <main className="bg-gray-50 pt-2 pb-4">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-8 sm:p-12 text-center">
              <div className="w-16 h-16 mx-auto bg-[#7B2D8E]/10 rounded-full flex items-center justify-center mb-5">
                <span className="text-2xl font-bold text-[#7B2D8E]">?</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900 mb-2">Profile Not Found</h1>
              <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                The user <span className="font-medium text-gray-700">@{username}</span>{' '}
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
        </main>
        <Footer />
      </>
    )
  }

  const initials = `${profile.firstName?.charAt(0) || ''}${
    profile.lastName?.charAt(0) || ''
  }`.toUpperCase()

  // Build the list of social links to render — only networks with a
  // resolved URL are shown. Each entry pairs a lucide icon with a
  // short label for the accessible hover title.
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

  return (
    <>
      <Header />
      <main className="bg-gray-50 pt-2 pb-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {/* "Only you" banner — only shown when the logged-in viewer
              is the owner of a private profile. A visitor who isn't
              the owner gets a 404 upstream so this banner never leaks
              the fact that the profile exists. */}
          {profile.isPublic === false && (
            <div className="mb-3 rounded-xl border border-gray-200 bg-white p-3 sm:p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4"
                  aria-hidden="true"
                >
                  <rect width="18" height="11" x="3" y="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 leading-tight">
                  Your profile is private
                </p>
                <p className="text-[11px] sm:text-xs text-gray-500 leading-snug mt-0.5">
                  Only you can see this page. To let others view it,{' '}
                  <Link
                    href="/dashboard/settings"
                    className="text-[#7B2D8E] font-medium hover:underline"
                  >
                    make your profile public
                  </Link>
                  .
                </p>
              </div>
            </div>
          )}

          {/* Profile Card — flat, matching the rest of the site. The
              cover band uses a solid brand colour (no gradient) per
              the design direction. */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="h-32 bg-[#7B2D8E]" />

            <div className="px-6 pb-8 -mt-12">
              {/* Avatar */}
              <div className="flex justify-center">
                {profile.avatarUrl ? (
                  <Image
                    src={profile.avatarUrl}
                    alt={`${profile.firstName}'s avatar`}
                    width={96}
                    height={96}
                    className="w-24 h-24 rounded-full border-4 border-white object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full border-4 border-white bg-[#7B2D8E] flex items-center justify-center text-white text-2xl font-bold">
                    {initials}
                  </div>
                )}
              </div>

              {/* Name and username */}
              <div className="text-center mt-4">
                <h1 className="text-2xl font-bold text-gray-900">
                  {profile.firstName} {profile.lastName}
                </h1>
                {profile.username && (
                  <p className="text-[#7B2D8E] font-medium">@{profile.username}</p>
                )}
              </div>

              {/* Bio */}
              {profile.bio && (
                <p className="text-center text-gray-600 mt-4 max-w-md mx-auto whitespace-pre-line">
                  {profile.bio}
                </p>
              )}

              {/* Social links row — only the networks the user has filled
                  in show up. Each link opens in a new tab, uses a
                  subtle bordered pill, and keeps the hover state tied
                  to the brand colour for consistency with the rest of
                  the site. */}
              {socialLinks.length > 0 && (
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  {socialLinks.map((link) => (
                    <a
                      key={link.key}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer me"
                      title={link.label}
                      aria-label={link.label}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 text-gray-500 hover:text-[#7B2D8E] hover:border-[#7B2D8E]/40 hover:bg-[#7B2D8E]/5 transition-colors"
                    >
                      {link.icon}
                    </a>
                  ))}
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mt-8">
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-center mb-2">
                    <Calendar className="w-5 h-5 text-[#7B2D8E]" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {profile.totalBookings || 0}
                  </p>
                  <p className="text-xs text-gray-500">Bookings</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-center mb-2">
                    <Award className="w-5 h-5 text-[#7B2D8E]" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">Member</p>
                  <p className="text-xs text-gray-500">Status</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-center mb-2">
                    <Clock className="w-5 h-5 text-[#7B2D8E]" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {new Date(profile.memberSince).getFullYear()}
                  </p>
                  <p className="text-xs text-gray-500">Since</p>
                </div>
              </div>

              {/* Preferred Location */}
              {profile.preferredLocation && (
                <div className="mt-6 flex items-center justify-center gap-2 text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>Prefers {profile.preferredLocation}</span>
                </div>
              )}

              {/* Favorite Services */}
              {profile.favoriteServices && profile.favoriteServices.length > 0 && (
                <div className="mt-6">
                  <p className="text-sm text-gray-500 text-center mb-3">Favorite Services</p>
                  <div className="flex flex-wrap justify-center gap-2">
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

              {/* CTA */}
              <div className="mt-8 text-center">
                <Link
                  href="/booking"
                  className="inline-flex items-center gap-2 px-8 py-3 bg-[#7B2D8E] text-white rounded-xl hover:bg-[#6B2278] transition-colors font-medium"
                >
                  <Calendar className="w-5 h-5" />
                  Book an Appointment
                </Link>
              </div>
            </div>
          </div>

          {/* Dermaspace branding */}
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm text-gray-500 hover:text-[#7B2D8E] transition-colors"
            >
              Powered by <span className="font-semibold">Dermaspace</span>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
