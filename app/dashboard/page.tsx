'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import ActivityFeed from '@/components/dashboard/activity-feed'
import { SecurityReminder } from '@/components/dashboard/security-reminder'


import { 
  User, Calendar, Heart, Settings, LogOut, Gift, Clock, 
  MapPin, ChevronRight, Star, ArrowRight, X, MessageSquare, Wallet, Sliders, Ticket,
  Package, Flower2, Trash2
} from 'lucide-react'
import { useFavorites, type Favorite } from '@/hooks/use-favorites'
import { AvatarPicker } from '@/components/profile/avatar-picker'
import PageLoader from '@/components/shared/page-loader'

const skinTypes = ['Oily', 'Dry', 'Combination', 'Normal', 'Sensitive']
const concerns = ['Acne', 'Aging', 'Hyperpigmentation', 'Dullness', 'Dehydration', 'Uneven Texture']
const preferredServices = ['Facials', 'Body Treatments', 'Massages', 'Manicure & Pedicure', 'Waxing', 'Laser']

// Butterfly Logo
function ButterflyLogo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="currentColor">
      <path d="M16 4c-3.3 0-6 2.7-6 6 0 2 1 3.7 2.4 4.9-.8.4-1.7 1.1-2.4 1.7-2-1.6-4.7-2.6-7.3-2.6-.8 0-1.3.5-1.3 1.3s.5 1.3 1.3 1.3c1.9 0 3.6.7 5.1 1.7C6 20 5.3 22.3 5.3 24.7c0 .8.5 1.3 1.3 1.3s1.3-.5 1.3-1.3c0-1.9.5-3.6 1.5-5.1.7.4 1.5.8 2.3 1.1-.7 1.5-1.1 3.2-1.1 4.9 0 3.3 2.7 5.7 5.3 5.7s5.3-2.4 5.3-5.7c0-1.7-.4-3.5-1.1-4.9.8-.3 1.6-.7 2.3-1.1 1 1.5 1.5 3.2 1.5 5.1 0 .8.5 1.3 1.3 1.3s1.3-.5 1.3-1.3c0-2.4-.7-4.7-2.4-6.3 1.5-1 3.2-1.7 5.1-1.7.8 0 1.3-.5 1.3-1.3s-.5-1.3-1.3-1.3c-2.7 0-5.3 1.1-7.3 2.6-.7-.7-1.6-1.3-2.4-1.7C21 13.7 22 12 22 10c0-3.3-2.7-6-6-6zm0 2.7c1.9 0 3.3 1.5 3.3 3.3S17.9 13.3 16 13.3s-3.3-1.5-3.3-3.3S14.1 6.7 16 6.7z"/>
    </svg>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  
  // Handle tab query parameter from URL
  useEffect(() => {
    const tabParam = new URLSearchParams(window.location.search).get('tab')
    if (tabParam && ['overview', 'bookings', 'favorites', 'wallet', 'rewards'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [user, setUser] = useState<{
    id: string
    firstName: string
    lastName: string
    email: string
    avatarUrl?: string | null
    gender?: 'male' | 'female' | null
  } | null>(null)
  const [showPreferences, setShowPreferences] = useState(false)
  const [showAIWelcome, setShowAIWelcome] = useState(false)
  // Avatar intro is shown once to every user (new and existing) so
  // they know they can now pick a curated 3D avatar. Gated by a
  // localStorage key — once dismissed, it never comes back. The
  // AvatarPicker itself is a separate overlay so the intro modal
  // doesn't have to render it inline.
  const [showAvatarIntro, setShowAvatarIntro] = useState(false)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  
  const [preferences, setPreferences] = useState({
    skinType: '',
    concerns: [] as string[],
    preferredServices: [] as string[],
    preferredLocation: '',
    notifications: true
  })
  // Favorites are backed by /api/user/favorites (Neon-persisted) and
  // kept in sync across the site via SWR — the same hook powers every
  // FavoriteButton on service / package / treatment cards, so toggles
  // from any page show up here without an extra refetch.
  const { favorites, isLoading: favoritesLoading, removeFavorite } = useFavorites()
  const [chatHistory, setChatHistory] = useState<Array<{ id: string; title: string; date: string }>>([])
  // Total unread admin replies across all support tickets (drives the
  // Support badge on the sidebar & the Quick Action card).
  const [supportUnread, setSupportUnread] = useState(0)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          setUser(data.user)
          
          // Check database for saved preferences
          if (data.preferences) {
            // User has saved preferences in database
            setPreferences(data.preferences)
          }
          
          // Check if user has dismissed the welcome modal (database is the source of truth)
          if (!data.welcomeDismissed) {
            // First time user - show AI welcome modal
            setShowAIWelcome(true)
          } else if (!data.avatarIntroDismissed) {
            // Existing users who've already dismissed the AI welcome
            // still deserve to learn about the new avatar picker — we
            // show the intro once. The new-user branch handles the
            // same prompt inside dismissAIWelcome() below, so new
            // users get it right after the AI welcome flow.
            //
            // The "seen" flag lives on user_preferences server-side
            // (see /api/user/preferences) so it persists across
            // devices and private windows — the previous localStorage
            // gate was firing every visit for users whose browser
            // wiped storage between sessions.
            //
            // Delay just a hair so the dashboard has painted first
            // and the modal doesn't feel like it blocks the page.
            setTimeout(() => setShowAvatarIntro(true), 600)
          }
          

          
          // Load chat history
          const chatSessions = localStorage.getItem('derma-chat-sessions')
          if (chatSessions) {
            const sessions = JSON.parse(chatSessions)
            setChatHistory(sessions.slice(0, 5).map((s: { id: string; title: string; createdAt: string }) => ({
              id: s.id,
              title: s.title,
              date: new Date(s.createdAt).toLocaleDateString()
            })))
          }

          // Fetch support ticket unread-reply count so the sidebar & quick
          // action can show a badge when admin has replied.
          try {
            const ticketsRes = await fetch('/api/tickets')
            if (ticketsRes.ok) {
              const ticketsData = await ticketsRes.json()
              const total = (ticketsData.tickets || []).reduce(
                (sum: number, t: { unread_reply_count?: number }) =>
                  sum + (t.unread_reply_count || 0),
                0,
              )
              setSupportUnread(total)
            }
          } catch {
            /* non-blocking */
          }
        } else {
          router.push('/signin')
        }
      } catch {
        router.push('/signin')
      } finally {
        setIsLoading(false)
      }
    }
    checkAuth()
  }, [router])

  const toggleConcern = (concern: string) => {
    setPreferences(prev => ({
      ...prev,
      concerns: prev.concerns.includes(concern)
        ? prev.concerns.filter(c => c !== concern)
        : [...prev.concerns, concern]
    }))
  }

  const toggleService = (service: string) => {
    setPreferences(prev => ({
      ...prev,
      preferredServices: prev.preferredServices.includes(service)
        ? prev.preferredServices.filter(s => s !== service)
        : [...prev.preferredServices, service]
    }))
  }

  const savePreferences = async () => {
    setShowPreferences(false)
    
    try {
      const res = await fetch('/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...preferences,
          skipped: false
        })
      })
      if (!res.ok) {
        console.error('Failed to save preferences:', await res.text())
      }
    } catch (error) {
      console.error('Failed to save preferences:', error)
    }
  }

  const skipPreferences = async () => {
    setShowPreferences(false)
    
    try {
      await fetch('/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skipped: true })
      })
    } catch (error) {
      console.error('Failed to save skip status:', error)
    }
  }

  const handleAIWelcomeYes = async () => {
    await dismissAIWelcome()
    // Open the AI chat by dispatching a custom event
    window.dispatchEvent(new CustomEvent('openDermaAI'))
  }

  const dismissAIWelcome = async () => {
    setShowAIWelcome(false)

    // Queue the avatar intro right after the AI welcome so new users
    // see: AI welcome -> avatar intro -> (optional) preferences.
    // Server-side `avatar_intro_dismissed` is the source of truth, so
    // we re-check it here too — if a user has already dismissed it on
    // another device we don't want to nag them again.
    try {
      const res = await fetch('/api/user/preferences')
      if (res.ok) {
        const data = await res.json()
        if (!data.avatarIntroDismissed) {
          setTimeout(() => setShowAvatarIntro(true), 250)
        }
      } else {
        // Fall back to showing it; the dismiss handler will persist.
        setTimeout(() => setShowAvatarIntro(true), 250)
      }
    } catch {
      setTimeout(() => setShowAvatarIntro(true), 250)
    }

    try {
      await fetch('/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skipped: true })
      })
    } catch (error) {
      console.error('Failed to save skip status:', error)
    }
  }

  // Persist the "have seen the avatar intro" flag in the database so
  // we don't nag the same user on every visit, on any device. The
  // call is fire-and-forget — if it fails we still close the modal
  // locally; it'll re-prompt on the next visit which is acceptable
  // (worst case the user dismisses it twice).
  const markAvatarIntroSeen = () => {
    setShowAvatarIntro(false)
    fetch('/api/user/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatarIntroDismissed: true }),
    }).catch((err) => {
      console.error('Failed to persist avatar intro dismissal:', err)
    })
  }

  // "Pick my avatar" CTA in the intro modal — closes the intro and
  // immediately opens the AvatarPicker overlay so the user can
  // actually choose one.
  const handleAvatarIntroPick = () => {
    markAvatarIntroSeen()
    setShowAvatarPicker(true)
  }

  // Save the user's avatar pick. Gender is not sent here — the
  // settings page handles gender selection separately; this call
  // just persists the image URL through the shared profile PUT
  // endpoint. Uses echoed name/phone to keep the server validator
  // happy (same trick we use in settings).
  const saveAvatarFromDashboard = async (url: string | null) => {
    if (!user) return
    const previous = user.avatarUrl ?? null
    setUser((prev) => (prev ? { ...prev, avatarUrl: url } : prev))
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: user.firstName,
          lastName: user.lastName,
          avatarUrl: url,
        }),
      })
      if (!res.ok) throw new Error('save failed')
      // Let the header (and any other listener) know the user's
      // avatar has changed so they can refetch without a page reload.
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('user-updated'))
      }
    } catch {
      // Roll back optimistic update on failure.
      setUser((prev) => (prev ? { ...prev, avatarUrl: previous } : prev))
    } finally {
      setShowAvatarPicker(false)
    }
  }

  const handleAIWelcomeNo = async () => {
    await dismissAIWelcome()
    // Show preferences modal instead
    setShowPreferences(true)
  }

  const openPreferencesModal = async () => {
    // Fetch latest preferences from database
    try {
      const res = await fetch('/api/user/preferences')
      if (res.ok) {
        const data = await res.json()
        if (data.preferences) {
          setPreferences(data.preferences)
        }
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error)
    }
    setShowPreferences(true)
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    // Force full page reload to clear all cached user state
    window.location.href = '/'
  }

  if (isLoading) {
    return <PageLoader label="Loading..." />
  }

  if (isLoggingOut) {
    return <PageLoader label="Logging out..." />
  }

  return (
    <main className="min-h-screen bg-white">
      <Header />
      
      {/* AI Welcome Modal - First login */}
      {showAIWelcome && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={dismissAIWelcome} />
          <div className="relative w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl p-6 pb-24 sm:pb-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#7B2D8E] flex items-center justify-center mx-auto mb-4">
              <ButterflyLogo className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Welcome, {user?.firstName}!
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Would you like to chat with Derma AI, your personal skincare assistant? I can help you find the perfect treatments.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleAIWelcomeNo}
                className="flex-1 py-3 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Not Now
              </button>
              <button
                onClick={handleAIWelcomeYes}
                className="flex-1 py-3 text-sm font-medium text-white bg-[#7B2D8E] rounded-xl hover:bg-[#6B2278] transition-colors"
              >
                Chat Now
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Avatar Intro Modal — shown once per user (new + existing)
          so they discover they can now pick a curated 3D character
          avatar. Uses the exact same shell dimensions (`sm:max-w-sm`
          + bottom-sheet on mobile) as the AI Welcome modal above so
          it feels like part of the same guided tour, not a bolt-on. */}
      {showAvatarIntro && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={markAvatarIntroSeen} />
          <div className="relative w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl p-6 pb-24 sm:pb-6 text-center">
            {/* Three-avatar preview stack — uses dedicated "tour" art
                that is intentionally NOT in the picker grid, so the
                modal feels like a teaser ("here's a vibe") rather
                than spoiling three real options. The AvatarPicker
                grid still filters by the viewer's gender as usual. */}
            <div className="flex items-center justify-center mb-4">
              <div className="flex -space-x-3">
                <span className="w-14 h-14 rounded-full border-[3px] border-white shadow-sm overflow-hidden">
                  <img src="/avatars/tour-1.jpg" alt="" aria-hidden="true" className="w-full h-full object-cover" />
                </span>
                <span className="w-16 h-16 rounded-full border-[3px] border-white shadow-md overflow-hidden ring-2 ring-[#7B2D8E]/30 relative z-[1]">
                  <img src="/avatars/tour-2.jpg" alt="" aria-hidden="true" className="w-full h-full object-cover" />
                </span>
                <span className="w-14 h-14 rounded-full border-[3px] border-white shadow-sm overflow-hidden">
                  <img src="/avatars/tour-3.jpg" alt="" aria-hidden="true" className="w-full h-full object-cover" />
                </span>
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] text-[11px] font-semibold mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E]" aria-hidden="true" />
              New
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Make it yours, {user?.firstName}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              You can now pick a beautiful avatar that matches your vibe. Your new look shows up on your profile everywhere.
            </p>
            <div className="flex gap-3">
              <button
                onClick={markAvatarIntroSeen}
                className="flex-1 py-3 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Maybe later
              </button>
              <button
                onClick={handleAvatarIntroPick}
                className="flex-1 py-3 text-sm font-medium text-white bg-[#7B2D8E] rounded-xl hover:bg-[#6B2278] transition-colors"
              >
                Pick avatar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Picker — rendered at the dashboard root so the intro
          modal CTA can open it directly. Gender comes from the user
          record so men and women see different pools. When the user
          has no gender yet (the common first-time-tour case) the
          picker shows its inline Men / Women chooser; `onGenderSelect`
          persists that choice against the same profile endpoint that
          stores avatar/name, which is why we echo first/last name.
          Without this prop the tour would appear to "do nothing"
          after tapping a card on the very first session — the grid
          would flip locally but the choice would vanish on reload. */}
      {user && (
        <AvatarPicker
          open={showAvatarPicker}
          onClose={() => setShowAvatarPicker(false)}
          currentUrl={user.avatarUrl ?? null}
          initials={`${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase()}
          gender={user.gender ?? null}
          onSelect={saveAvatarFromDashboard}
          onGenderSelect={async (g) => {
            const res = await fetch('/api/auth/profile', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                firstName: user.firstName,
                lastName: user.lastName,
                gender: g,
              }),
            })
            if (!res.ok) throw new Error('gender save failed')
            setUser({ ...user, gender: g })
          }}
        />
      )}

      {/* Preferences Modal */}
      {showPreferences && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={skipPreferences} />
          <div className="relative w-full md:max-w-lg bg-white md:rounded-2xl rounded-t-3xl max-h-[85vh] flex flex-col">
            <div className="flex-shrink-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Personalize Your Experience</h2>
                <p className="text-xs text-gray-500">Help us recommend the best treatments</p>
              </div>
              <button onClick={skipPreferences} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 pb-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Skin Type</label>
                <div className="flex flex-wrap gap-2">
                  {skinTypes.map(type => (
                    <button
                      key={type}
                      onClick={() => setPreferences(p => ({ ...p, skinType: type }))}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        preferences.skinType === type
                          ? 'bg-[#7B2D8E] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Skin Concerns</label>
                <div className="flex flex-wrap gap-2">
                  {concerns.map(concern => (
                    <button
                      key={concern}
                      onClick={() => toggleConcern(concern)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        preferences.concerns.includes(concern)
                          ? 'bg-[#7B2D8E] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {concern}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Interested Services</label>
                <div className="flex flex-wrap gap-2">
                  {preferredServices.map(service => (
                    <button
                      key={service}
                      onClick={() => toggleService(service)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        preferences.preferredServices.includes(service)
                          ? 'bg-[#7B2D8E] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {service}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Location</label>
                <div className="grid grid-cols-2 gap-3">
                  {['Victoria Island', 'Ikoyi'].map(loc => (
                    <button
                      key={loc}
                      onClick={() => setPreferences(p => ({ ...p, preferredLocation: loc }))}
                      className={`p-3 rounded-xl border text-left transition-colors ${
                        preferences.preferredLocation === loc
                          ? 'border-[#7B2D8E] bg-[#7B2D8E]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <MapPin className={`w-4 h-4 mb-1 ${preferences.preferredLocation === loc ? 'text-[#7B2D8E]' : 'text-gray-400'}`} />
                      <p className="text-sm font-medium text-gray-900">{loc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 bg-white border-t border-gray-100 p-4 flex gap-3">
              <button
                onClick={skipPreferences}
                className="flex-1 py-3 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Skip
              </button>
              <button
                onClick={savePreferences}
                className="flex-1 py-3 text-sm font-medium text-white bg-[#7B2D8E] rounded-xl hover:bg-[#6B2278] transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Dashboard outer rhythm — second pass at tightening. The
          page is the most-visited surface in the product so every
          unit of vertical padding compounds across visits. Users
          flagged the previous rhythm as still scrolling more than a
          dashboard should ("Google wouldn't build that"), so we've
          taken another 25–30% off the major spacing knobs:
            - outer:    py-4 md:py-6  → py-3 md:py-4
            - header:   p-4 md:p-5    → p-3 md:p-4
            - mb under: mb-4          → mb-3
          The card padding still gives content room to breathe; only
          the gaps between cards and the page chrome got trimmed. */}
      <div className="py-3 md:py-4 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Welcome Header */}
          <div className="bg-white rounded-2xl border border-gray-100 p-3 md:p-4 mb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setShowAvatarPicker(true)}
                  className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-[#7B2D8E] flex items-center justify-center text-white font-semibold text-sm md:text-base flex-shrink-0 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2D8E] focus-visible:ring-offset-2"
                  aria-label="Change avatar"
                >
                  {user?.avatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={user.avatarUrl}
                      alt={`${user.firstName}'s avatar`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <>
                      {user?.firstName?.charAt(0)}
                      {user?.lastName?.charAt(0)}
                    </>
                  )}
                </button>
                <div className="min-w-0">
                  <h1 className="text-base md:text-lg font-semibold text-gray-900 truncate">
                    Welcome, {user?.firstName}!
                  </h1>
                  <p className="text-xs md:text-sm text-gray-500 truncate">{user?.email}</p>
                </div>
              </div>
              <Link
                href="/booking"
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 bg-[#7B2D8E] text-white text-sm font-medium rounded-xl hover:bg-[#6B2278] transition-colors flex-shrink-0"
              >
                <Calendar className="w-4 h-4" />
                Book
              </Link>
            </div>
            <Link
              href="/booking"
              className="sm:hidden mt-3 flex items-center justify-center gap-2 w-full py-2.5 bg-[#7B2D8E] text-white text-sm font-medium rounded-xl"
            >
              <Calendar className="w-4 h-4" />
              Book Appointment
            </Link>
          </div>

          <div className="flex flex-col lg:flex-row gap-4 lg:gap-5">
            {/* Sidebar */}
            <div className="lg:w-56 flex-shrink-0">
              <div className="bg-white rounded-2xl border border-gray-100 p-1.5 lg:sticky lg:top-20">
                <div className="flex lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0 -mx-1 px-1 lg:mx-0 lg:px-0 scrollbar-hide">
                  {[
                    { id: 'overview', label: 'Overview', icon: User },
                    { id: 'book', label: 'Book', icon: Calendar },
                    { id: 'ai', label: 'Derma AI', icon: null, isAI: true },
                    { id: 'wallet', label: 'Wallet', icon: Wallet, href: '/dashboard/wallet' },
                    { id: 'appointments', label: 'My Bookings', icon: Clock },
                    { id: 'favorites', label: 'Favorites', icon: Heart },
                    { id: 'preferences', label: 'Preferences', icon: Sliders },
                    { id: 'support', label: 'Support', icon: Ticket, href: '/dashboard/support' },
                    { id: 'settings', label: 'Settings', icon: Settings, href: '/dashboard/settings' },
                  ].map(item => (
                    item.href ? (
                      <Link
                        key={item.id}
                        href={item.href}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-[13.5px] font-medium transition-colors whitespace-nowrap flex-shrink-0 text-gray-600 hover:bg-gray-50"
                      >
                        {item.icon && <item.icon className="w-4 h-4" />}
                        <span className="flex items-center gap-2">
                          {item.label}
                          {item.id === 'support' && supportUnread > 0 && (
                            <span
                              className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-[#7B2D8E] text-white text-[10px] font-bold"
                              aria-label={`${supportUnread} new admin ${supportUnread === 1 ? 'reply' : 'replies'}`}
                            >
                              {supportUnread > 9 ? '9+' : supportUnread}
                            </span>
                          )}
                        </span>
                      </Link>
                    ) : (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[13.5px] font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                        activeTab === item.id
                          ? 'bg-[#7B2D8E] text-white'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {item.isAI ? (
                        <ButterflyLogo className="w-4 h-4" />
                      ) : item.icon ? (
                        <item.icon className="w-4 h-4" />
                      ) : null}
                      {item.label}
                    </button>
                    )
                  ))}
                  
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-[13.5px] font-medium text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap flex-shrink-0 lg:mt-1.5 lg:border-t lg:border-gray-100 lg:pt-2.5"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content — `space-y-3` (was 4, originally 6).
                Dashboard cards already have generous internal padding;
                stacking them with 12px between feels tighter and
                stops the page from scrolling further than the actual
                content density warrants. */}
            <div className="flex-1 min-w-0 space-y-3">
{activeTab === 'overview' && (
  <>
  {/* Security Reminder */}
  <SecurityReminder />
  
                  {/* Stats Grid — tighter padding + tighter inner
                      gap so three small cards fit on a phone without
                      pushing the rest of the dashboard down. */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 md:gap-3">
                    <div className="bg-white rounded-2xl border border-gray-100 p-3 md:p-3.5">
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <div className="w-9 h-9 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-4 h-4 md:w-[18px] md:h-[18px] text-[#7B2D8E]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-lg md:text-xl font-bold text-gray-900 leading-tight">0</p>
                          <p className="text-[11px] text-gray-500 leading-tight">Upcoming</p>
                        </div>
                      </div>
                      <Link href="/booking" className="text-[11px] text-[#7B2D8E] font-medium hover:underline">
                        Book now
                      </Link>
                    </div>
                    
                    <div className="bg-white rounded-2xl border border-gray-100 p-3 md:p-3.5">
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <div className="w-9 h-9 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                          <Star className="w-4 h-4 md:w-[18px] md:h-[18px] text-[#7B2D8E]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-lg md:text-xl font-bold text-gray-900 leading-tight">0</p>
                          <p className="text-[11px] text-gray-500 leading-tight">Points</p>
                        </div>
                      </div>
                      <Link href="/membership" className="text-[11px] text-[#7B2D8E] font-medium hover:underline">
                        Earn more
                      </Link>
                    </div>
                    
                    <div className="col-span-2 sm:col-span-1 bg-white rounded-2xl border border-gray-100 p-3 md:p-3.5">
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <div className="w-9 h-9 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                          <Gift className="w-4 h-4 md:w-[18px] md:h-[18px] text-[#7B2D8E]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-lg md:text-xl font-bold text-gray-900 leading-tight">Standard</p>
                          <p className="text-[11px] text-gray-500 leading-tight">Member</p>
                        </div>
                      </div>
                      <Link href="/membership" className="text-[11px] text-[#7B2D8E] font-medium hover:underline">
                        Upgrade
                      </Link>
                    </div>
                  </div>

                  {/* Quick Actions — trimmed card padding +
                      heading margin so the three CTAs sit right
                      under the stats without an empty band. */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-3.5 md:p-4">
                    <h2 className="font-semibold text-gray-900 text-[15px] mb-3">Quick Actions</h2>
                    <div className="grid grid-cols-3 gap-2">
                      <Link href="/booking" className="p-2.5 md:p-3 rounded-xl border border-gray-100 hover:border-[#7B2D8E]/30 transition-colors text-center">
                        <Calendar className="w-5 h-5 text-[#7B2D8E] mx-auto mb-1.5" />
                        <p className="text-xs md:text-[13px] font-medium text-gray-900">Book</p>
                      </Link>
                      <Link href="/gift-cards" className="p-2.5 md:p-3 rounded-xl border border-gray-100 hover:border-[#7B2D8E]/30 transition-colors text-center">
                        <Gift className="w-5 h-5 text-[#7B2D8E] mx-auto mb-1.5" />
                        <p className="text-xs md:text-[13px] font-medium text-gray-900">Gift Cards</p>
                      </Link>
                      <Link
                        href="/dashboard/support"
                        className={`relative p-2.5 md:p-3 rounded-xl border transition-colors text-center ${
                          supportUnread > 0
                            ? 'border-[#7B2D8E]/40 bg-[#7B2D8E]/5 hover:bg-[#7B2D8E]/10'
                            : 'border-gray-100 hover:border-[#7B2D8E]/30'
                        }`}
                      >
                        {supportUnread > 0 && (
                          <span
                            className="absolute top-1.5 right-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-[#7B2D8E] text-white text-[10px] font-bold shadow-sm"
                            aria-label={`${supportUnread} new admin ${supportUnread === 1 ? 'reply' : 'replies'}`}
                          >
                            {supportUnread > 9 ? '9+' : supportUnread}
                          </span>
                        )}
                        <Ticket className="w-5 h-5 text-[#7B2D8E] mx-auto mb-1.5" />
                        <p className="text-xs md:text-[13px] font-medium text-gray-900">
                          {supportUnread > 0 ? 'New reply' : 'Support'}
                        </p>
                      </Link>
                    </div>
                  </div>

                  {/* Activity Feed - Requests, Notifications, Progress */}
                  <ActivityFeed />
                </>
              )}
              
              {activeTab === 'book' && (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl border border-gray-100 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-[#7B2D8E]" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-gray-900">Book an Appointment</h2>
                        <p className="text-xs text-gray-500">Schedule your next treatment</p>
                      </div>
                    </div>
                    
                    {/* Coming Soon Notice */}
                    <div className="bg-gradient-to-br from-[#7B2D8E]/5 to-[#7B2D8E]/10 rounded-xl p-5 mb-4 text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#7B2D8E]/10 mb-3">
                        <Clock className="w-6 h-6 text-[#7B2D8E]" />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 mb-1">Online Booking Coming Soon</h3>
                      <p className="text-sm text-gray-600 mb-4">We&apos;re building a seamless booking experience for you</p>
                      <div className="flex flex-col sm:flex-row gap-2 justify-center">
                        <a
                          href="tel:+2349017972919"
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#7B2D8E] text-white rounded-lg text-sm font-medium hover:bg-[#6B2278] transition-colors"
                        >
                          Call to Book
                        </a>
                        <a
                          href="https://wa.me/+2349013134945"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-[#7B2D8E] text-[#7B2D8E] rounded-lg text-sm font-medium hover:bg-[#7B2D8E]/5 transition-colors"
                        >
                          WhatsApp
                        </a>
                      </div>
                    </div>
                    
                    <div className="text-center text-xs text-gray-400">
                      Mon - Sat: 9AM - 6PM | Abuja, Nigeria
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'ai' && (
                <div className="space-y-4">
                  {/* AI Assistant Card */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-6">
                    <div className="flex items-start gap-4 mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-[#7B2D8E] flex items-center justify-center flex-shrink-0">
                        <ButterflyLogo className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-gray-900 text-lg">Derma AI</h2>
                        <p className="text-sm text-gray-500">Your personal skincare assistant</p>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-6">
                      Derma AI is here to help you with skincare advice, treatment recommendations, 
                      booking appointments, and answering any questions about our services.
                    </p>
                    
                    <div className="grid sm:grid-cols-2 gap-3 mb-6">
                      <div className="p-4 rounded-xl bg-gray-50">
                        <h4 className="text-sm font-medium text-gray-900 mb-1">Ask anything</h4>
                        <p className="text-xs text-gray-500">Get instant answers about treatments, prices, and more</p>
                      </div>
                      <div className="p-4 rounded-xl bg-gray-50">
                        <h4 className="text-sm font-medium text-gray-900 mb-1">Voice Chat</h4>
                        <p className="text-xs text-gray-500">Talk hands-free with voice-to-voice feature</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent('openDermaAI'))}
                      className="w-full py-3 bg-[#7B2D8E] text-white text-sm font-medium rounded-xl hover:bg-[#6B2278] transition-colors flex items-center justify-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Start Chatting
                    </button>
                  </div>
                  
                  {/* Chat History */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Chat History</h3>
                    {chatHistory.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">No chat history yet</p>
                        <p className="text-xs text-gray-400 mt-1">Your conversations will appear here</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {chatHistory.map((chat) => (
                          <div
                            key={chat.id}
                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => window.dispatchEvent(new CustomEvent('openDermaAI'))}
                          >
                            <div className="w-9 h-9 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                              <MessageSquare className="w-4 h-4 text-[#7B2D8E]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{chat.title}</p>
                              <p className="text-xs text-gray-400">{chat.date}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'appointments' && (
                <div className="space-y-4">
                  {/* Header */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center">
                          <Clock className="w-5 h-5 text-[#7B2D8E]" />
                        </div>
                        <div>
                          <h2 className="font-semibold text-gray-900">My Bookings</h2>
                          <p className="text-xs text-gray-500">View and manage appointments</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setActiveTab('book')}
                        className="text-xs text-[#7B2D8E] font-medium hover:underline flex items-center gap-1"
                      >
                        Book New <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                    
                    {/* Filter Tabs */}
                    <div className="flex gap-2 border-b border-gray-100 pb-3 mb-4 overflow-x-auto">
                      {['All', 'Upcoming', 'Completed', 'Cancelled'].map((filter, idx) => (
                        <button
                          key={filter}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                            idx === 0 
                              ? 'bg-[#7B2D8E] text-white' 
                              : 'text-gray-500 hover:bg-gray-100'
                          }`}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>

                    {/* Empty State */}
                    <div className="text-center py-10">
                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                        <Calendar className="w-8 h-8 text-gray-300" />
                      </div>
                      <p className="text-sm font-medium text-gray-900 mb-1">No bookings yet</p>
                      <p className="text-xs text-gray-500 mb-4">Your appointments will appear here</p>
                      <button 
                        onClick={() => setActiveTab('book')}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#7B2D8E] text-white text-sm font-medium rounded-lg hover:bg-[#6B2278] transition-colors"
                      >
                        <Calendar className="w-4 h-4" />
                        Book your first appointment
                      </button>
                    </div>
                  </div>

                  {/* Sample Booking Cards (UI Preview - will be populated with real data later) */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6">
                    <h3 className="text-sm font-medium text-gray-500 mb-3">Sample Booking Preview</h3>
                    <div className="border border-dashed border-gray-200 rounded-xl p-4 bg-gray-50/50">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-[#7B2D8E]" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">Signature Glow Facial</p>
                            <p className="text-xs text-gray-500">90 minutes</p>
                          </div>
                        </div>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Confirmed</span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Apr 15, 2026</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>10:00 AM</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Victoria Island</span>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-3 border-t border-dashed border-gray-200">
                        <button className="flex-1 py-2 text-xs font-medium text-[#7B2D8E] border border-[#7B2D8E]/20 rounded-lg hover:bg-[#7B2D8E]/5 transition-colors">
                          View Details
                        </button>
                        <button className="flex-1 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                          Download Receipt
                        </button>
                      </div>
                    </div>
                    <p className="text-center text-xs text-gray-400 mt-3">This is a preview of how your bookings will appear</p>
                  </div>
                </div>
              )}

              {activeTab === 'favorites' && (
                <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-gray-900">Favorites</h2>
                    {favorites.length > 0 && (
                      <span className="text-xs text-gray-500">
                        {favorites.length} saved
                      </span>
                    )}
                  </div>

                  {/* Three render states: loading skeleton, empty state,
                      and a populated list grouped by item type so
                      Treatments, Packages and Categories stay visually
                      separate. The list shares its data source with
                      every FavoriteButton on the site. */}
                  {favoritesLoading ? (
                    <div className="space-y-3">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="h-16 rounded-xl bg-gray-50 animate-pulse"
                        />
                      ))}
                    </div>
                  ) : favorites.length === 0 ? (
                    <div className="text-center py-10">
                      <Heart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">No favorites yet</p>
                      <Link
                        href="/services"
                        className="inline-flex items-center gap-1 text-sm text-[#7B2D8E] font-medium mt-2"
                      >
                        Browse services <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  ) : (
                    <FavoritesList
                      favorites={favorites}
                      onRemove={removeFavorite}
                    />
                  )}
                </div>
              )}

              {activeTab === 'preferences' && (
                <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-gray-900">Preferences</h2>
                    <button 
                      onClick={openPreferencesModal}
                      className="text-xs text-[#7B2D8E] font-medium hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  {preferences.skinType || preferences.concerns.length > 0 || preferences.preferredServices.length > 0 || preferences.preferredLocation ? (
                    <div className="space-y-4">
                      {preferences.skinType && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Skin Type</p>
                          <span className="inline-block px-3 py-1 bg-[#7B2D8E]/10 text-[#7B2D8E] text-sm rounded-full">
                            {preferences.skinType}
                          </span>
                        </div>
                      )}
                      {preferences.concerns.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 mb-2">Skin Concerns</p>
                          <div className="flex flex-wrap gap-2">
                            {preferences.concerns.map(concern => (
                              <span key={concern} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                                {concern}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {preferences.preferredServices.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 mb-2">Interested Services</p>
                          <div className="flex flex-wrap gap-2">
                            {preferences.preferredServices.map(service => (
                              <span key={service} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                                {service}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {preferences.preferredLocation && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Preferred Location</p>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-[#7B2D8E]" />
                            <span className="text-sm text-gray-700">{preferences.preferredLocation}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <Settings className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">No preferences set</p>
                      <button 
                        onClick={openPreferencesModal}
                        className="inline-flex items-center gap-1 text-sm text-[#7B2D8E] font-medium mt-2"
                      >
                        Set preferences <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
                )}

              
            </div>
          </div>
        </div>
      </div>

<Footer />
      {/* DermaAI is mounted globally in the root layout now (see
          components/shared/derma-ai-mount.tsx) so the floating assistant
          follows the user on every page, not just /dashboard. */}


    </main>
  )
}

// Groups the flat favorites list by itemType and renders each group in
// its own subsection so Treatments, Packages and Categories stay
// visually distinct. Each row links back to where the item was
// favorited (treatment → its subservice page, package → /packages,
// category → that service category) and exposes a small trash button
// that calls the optimistic `removeFavorite` mutation from
// useFavorites.
function FavoritesList({
  favorites,
  onRemove,
}: {
  favorites: Favorite[]
  onRemove: (itemType: Favorite['itemType'], itemId: string) => Promise<void>
}) {
  // Fixed display order so the UI is stable regardless of the order
  // items were saved in (which is arbitrary per-user).
  const groupOrder: Array<{ type: Favorite['itemType']; label: string; icon: typeof Heart }> = [
    { type: 'treatment', label: 'Treatments', icon: Flower2 },
    { type: 'package', label: 'Packages', icon: Package },
    { type: 'category', label: 'Categories', icon: Heart },
  ]

  const [removing, setRemoving] = useState<string | null>(null)
  // Confirmation dialog state — Product feedback was that tapping the
  // tiny trash icon was too easy to do by accident on a phone, and
  // the row would vanish before the user realised. We now stage the
  // request in `pendingDelete` and only fire `onRemove` once the user
  // confirms in the modal. The modal uses the brand purple so the
  // primary "Remove" action stays consistent with every other
  // destructive confirm in the app.
  const [pendingDelete, setPendingDelete] = useState<Favorite | null>(null)

  const requestRemove = (fav: Favorite) => {
    if (removing) return
    setPendingDelete(fav)
  }

  const cancelRemove = () => {
    setPendingDelete(null)
  }

  const confirmRemove = async () => {
    const fav = pendingDelete
    if (!fav) return
    const key = `${fav.itemType}:${fav.itemId}`
    setPendingDelete(null)
    setRemoving(key)
    try {
      await onRemove(fav.itemType, fav.itemId)
    } catch {
      // The hook already rolls back the optimistic update on failure,
      // so the item just snaps back into the list — no extra UI needed.
    } finally {
      setRemoving(null)
    }
  }

  // Resolve the row title for the confirm dialog — same fallback logic
  // we use in the list so the modal can reference the row by its
  // human-readable label even when only the slug exists on disk.
  const pendingLabel = pendingDelete
    ? pendingDelete.label ||
      pendingDelete.itemId
        .replace(/^.*:/, '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : ''

  return (
    <div className="space-y-5">
      {groupOrder.map((group) => {
        const items = favorites.filter((f) => f.itemType === group.type)
        if (items.length === 0) return null
        const Icon = group.icon
        return (
          <div key={group.type}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-3.5 h-3.5 text-[#7B2D8E]" />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {group.label}
              </h3>
              <span className="text-xs text-gray-400">· {items.length}</span>
            </div>
            <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden">
              {items.map((fav) => {
                const key = `${fav.itemType}:${fav.itemId}`
                const isRemoving = removing === key
                // Fall back to a readable version of itemId when the
                // item was favorited before `label` existed on the row
                // (older clients), so we never render an empty line.
                const displayLabel =
                  fav.label ||
                  fav.itemId.replace(/^.*:/, '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                const href = fav.href || '/services'
                // Human-friendly subtitle per item type — shows what the
                // row is *about* instead of dumping the raw URL path
                // (which was noisy and looked technical, e.g.
                // "/services/body-treatments"). Readers now see
                // "Service category" / "Treatment" / "Package".
                const subtitle =
                  fav.itemType === 'category'
                    ? 'Service category'
                    : fav.itemType === 'package'
                      ? 'Spa package'
                      : 'Treatment'
                return (
                  <li key={key} className="flex items-center gap-1 p-3 hover:bg-gray-50 transition-colors">
                    <Link
                      href={href}
                      className="flex-1 min-w-0 flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {displayLabel}
                        </p>
                        <p className="text-[11px] text-gray-500 truncate">
                          {subtitle}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" aria-hidden="true" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => requestRemove(fav)}
                      disabled={isRemoving}
                      aria-label={`Remove ${displayLabel} from favorites`}
                      className="p-2 rounded-lg text-gray-400 hover:text-[#7B2D8E] hover:bg-[#7B2D8E]/5 transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}

      {/* Confirm delete dialog. We render it in the same tree (no
          portal) because it's local to FavoritesList and nothing
          above it sets `overflow-hidden` on the scroll container —
          the fixed positioning lifts it above every other surface
          via z-[70]. The backdrop traps the click so the row
          underneath isn't accidentally activated when the user
          taps "Cancel" near the row. */}
      {pendingDelete && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={cancelRemove}
            aria-hidden="true"
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="favorite-remove-title"
            className="relative w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl border border-gray-100 shadow-xl mx-0 sm:mx-4 p-5"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3
                  id="favorite-remove-title"
                  className="text-base font-semibold text-gray-900"
                >
                  Remove from favorites?
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  &quot;<span className="font-medium text-gray-900">{pendingLabel}</span>&quot; will be removed from your saved list. You can always add it back later.
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={cancelRemove}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRemove}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#7B2D8E] rounded-lg hover:bg-[#6B2278] transition-colors"
                autoFocus
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
