'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import DermaAI from '@/components/shared/derma-ai'
import ActivityFeed from '@/components/dashboard/activity-feed'
import { SecurityReminder } from '@/components/dashboard/security-reminder'
import OnboardingTour from '@/components/dashboard/onboarding-tour'
import { 
  User, Calendar, Heart, Settings, LogOut, Gift, Clock, 
  MapPin, ChevronRight, Star, Bell, ArrowRight, X, MessageSquare, Wallet, Sliders
} from 'lucide-react'

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
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<{ id: string; firstName: string; lastName: string; email: string } | null>(null)
  const [showPreferences, setShowPreferences] = useState(false)
  const [showAIWelcome, setShowAIWelcome] = useState(false)
  const [showTour, setShowTour] = useState(false)
  const [preferences, setPreferences] = useState({
    skinType: '',
    concerns: [] as string[],
    preferredServices: [] as string[],
    preferredLocation: '',
    notifications: true
  })
  const [chatHistory, setChatHistory] = useState<Array<{ id: string; title: string; date: string }>>([])

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          setUser(data.user)
          
          // Check localStorage for saved preferences or if user has seen the modal
          const savedPrefs = localStorage.getItem(`dermaspace-prefs-${data.user.id}`)
          if (savedPrefs) {
            const parsed = JSON.parse(savedPrefs)
            if (!parsed.skipped) {
              setPreferences(parsed)
            }
          } else {
            // First time user - show AI welcome modal instead of preferences
            setShowAIWelcome(true)
          }
          
          // Check if user has completed the tour
          const tourStatus = localStorage.getItem(`dermaspace-tour-${data.user.id}`)
          if (!tourStatus) {
            // First time user - show tour after a short delay
            setTimeout(() => setShowTour(true), 1000)
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

  const savePreferences = () => {
    if (user) {
      localStorage.setItem(`dermaspace-prefs-${user.id}`, JSON.stringify(preferences))
    }
    setShowPreferences(false)
  }

  const skipPreferences = () => {
    if (user) {
      localStorage.setItem(`dermaspace-prefs-${user.id}`, JSON.stringify({ skipped: true }))
    }
    setShowPreferences(false)
  }

  const handleAIWelcomeYes = () => {
    setShowAIWelcome(false)
    // Open the AI chat by dispatching a custom event
    window.dispatchEvent(new CustomEvent('openDermaAI'))
  }

  const handleAIWelcomeNo = () => {
    setShowAIWelcome(false)
    // Show preferences modal instead
    setShowPreferences(true)
  }

  const openPreferencesModal = () => {
    if (user) {
      const savedPrefs = localStorage.getItem(`dermaspace-prefs-${user.id}`)
      if (savedPrefs) {
        const parsed = JSON.parse(savedPrefs)
        if (!parsed.skipped) {
          setPreferences(parsed)
        }
      }
    }
    setShowPreferences(true)
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#7B2D8E] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-white">
      <Header />
      
      {/* AI Welcome Modal - First login */}
      {showAIWelcome && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAIWelcome(false)} />
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

            <div className="flex-1 overflow-y-auto p-5 pb-6 space-y-6">
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
                      className={`p-4 rounded-xl border text-left transition-colors ${
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
      
      <div className="py-6 md:py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Welcome Header */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6 mb-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-[#7B2D8E] flex items-center justify-center text-white font-semibold text-sm md:text-base flex-shrink-0">
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h1 className="text-base md:text-lg font-semibold text-gray-900 truncate">
                    Welcome, {user?.firstName}!
                  </h1>
                  <p className="text-xs md:text-sm text-gray-500 truncate">{user?.email}</p>
                </div>
              </div>
              <Link
                href="/booking"
                data-tour="book-button"
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 bg-[#7B2D8E] text-white text-sm font-medium rounded-xl hover:bg-[#6B2278] transition-colors flex-shrink-0"
              >
                <Calendar className="w-4 h-4" />
                Book
              </Link>
            </div>
            <Link
              href="/booking"
              className="sm:hidden mt-4 flex items-center justify-center gap-2 w-full py-2.5 bg-[#7B2D8E] text-white text-sm font-medium rounded-xl"
            >
              <Calendar className="w-4 h-4" />
              Book Appointment
            </Link>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar */}
            <div className="lg:w-56 flex-shrink-0">
              <div className="bg-white rounded-2xl border border-gray-100 p-2 lg:sticky lg:top-24">
                <div className="flex lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0 -mx-1 px-1 lg:mx-0 lg:px-0 scrollbar-hide">
                  {[
                    { id: 'overview', label: 'Overview', icon: User, tourId: 'overview-tab' },
                    { id: 'book', label: 'Book', icon: Calendar, tourId: 'book-tab' },
                    { id: 'ai', label: 'Derma AI', icon: null, isAI: true, tourId: 'ai-tab' },
                    { id: 'wallet', label: 'Wallet', icon: Wallet, href: '/dashboard/wallet' },
                    { id: 'appointments', label: 'My Bookings', icon: Clock, tourId: 'appointments-tab' },
                    { id: 'favorites', label: 'Favorites', icon: Heart },
                    { id: 'preferences', label: 'Preferences', icon: Sliders, tourId: 'preferences-tab' },
                    { id: 'settings', label: 'Settings', icon: Settings, href: '/dashboard/settings' },
                  ].map(item => (
                    item.href ? (
                      <Link
                        key={item.id}
                        href={item.href}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 text-gray-600 hover:bg-gray-50"
                      >
                        {item.icon && <item.icon className="w-4 h-4" />}
                        {item.label}
                      </Link>
                    ) : (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      data-tour={item.tourId}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
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
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap flex-shrink-0 lg:mt-2 lg:border-t lg:border-gray-100 lg:pt-3"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0 space-y-6">
{activeTab === 'overview' && (
  <>
  {/* Security Reminder */}
  <SecurityReminder />
  
  {/* Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-5">
                      <div className="flex items-center gap-3 mb-2 md:mb-3">
                        <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-4 h-4 md:w-5 md:h-5 text-[#7B2D8E]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xl md:text-2xl font-bold text-gray-900">0</p>
                          <p className="text-xs text-gray-500">Upcoming</p>
                        </div>
                      </div>
                      <Link href="/booking" className="text-xs text-[#7B2D8E] font-medium hover:underline">
                        Book now
                      </Link>
                    </div>
                    
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-5">
                      <div className="flex items-center gap-3 mb-2 md:mb-3">
                        <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                          <Star className="w-4 h-4 md:w-5 md:h-5 text-[#7B2D8E]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xl md:text-2xl font-bold text-gray-900">0</p>
                          <p className="text-xs text-gray-500">Points</p>
                        </div>
                      </div>
                      <Link href="/membership" className="text-xs text-[#7B2D8E] font-medium hover:underline">
                        Earn more
                      </Link>
                    </div>
                    
                    <div className="col-span-2 sm:col-span-1 bg-white rounded-2xl border border-gray-100 p-4 md:p-5">
                      <div className="flex items-center gap-3 mb-2 md:mb-3">
                        <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                          <Gift className="w-4 h-4 md:w-5 md:h-5 text-[#7B2D8E]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xl md:text-2xl font-bold text-gray-900">Standard</p>
                          <p className="text-xs text-gray-500">Member</p>
                        </div>
                      </div>
                      <Link href="/membership" className="text-xs text-[#7B2D8E] font-medium hover:underline">
                        Upgrade
                      </Link>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6">
                    <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-3 gap-2 md:gap-3">
                      <Link href="/booking" className="p-3 md:p-4 rounded-xl border border-gray-100 hover:border-[#7B2D8E]/30 transition-colors text-center">
                        <Calendar className="w-5 h-5 md:w-6 md:h-6 text-[#7B2D8E] mx-auto mb-2" />
                        <p className="text-xs md:text-sm font-medium text-gray-900">Book</p>
                      </Link>
                      <Link href="/gift-cards" className="p-3 md:p-4 rounded-xl border border-gray-100 hover:border-[#7B2D8E]/30 transition-colors text-center">
                        <Gift className="w-5 h-5 md:w-6 md:h-6 text-[#7B2D8E] mx-auto mb-2" />
                        <p className="text-xs md:text-sm font-medium text-gray-900">Gift Cards</p>
                      </Link>
                      <Link href="/contact" className="p-3 md:p-4 rounded-xl border border-gray-100 hover:border-[#7B2D8E]/30 transition-colors text-center">
                        <Bell className="w-5 h-5 md:w-6 md:h-6 text-[#7B2D8E] mx-auto mb-2" />
                        <p className="text-xs md:text-sm font-medium text-gray-900">Contact</p>
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
                    <h2 className="font-semibold text-gray-900 mb-2">Book an Appointment</h2>
                    <p className="text-sm text-gray-500 mb-6">
                      Schedule your next treatment at one of our locations
                    </p>
                    <div className="rounded-xl overflow-hidden border border-gray-200">
                      <iframe
                        src="https://app.withsplice.com/s/dermaspaceng"
                        width="100%"
                        height="600"
                        style={{ border: 'none', display: 'block' }}
                        title="Book Appointment"
                        allow="payment"
                      />
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
                <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-gray-900">My Bookings</h2>
                    <button 
                      onClick={() => setActiveTab('book')}
                      className="text-xs text-[#7B2D8E] font-medium hover:underline flex items-center gap-1"
                    >
                      Book New <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-center py-10">
                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No upcoming bookings</p>
                    <button 
                      onClick={() => setActiveTab('book')}
                      className="inline-flex items-center gap-1 text-sm text-[#7B2D8E] font-medium mt-2"
                    >
                      Book your first appointment <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'favorites' && (
                <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6">
                  <h2 className="font-semibold text-gray-900 mb-4">Favorites</h2>
                  <div className="text-center py-10">
                    <Heart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No favorites yet</p>
                    <Link href="/services" className="inline-flex items-center gap-1 text-sm text-[#7B2D8E] font-medium mt-2">
                      Browse services <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
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
<div data-tour="ai-assistant">
  <DermaAI />
</div>

{/* Onboarding Tour for first-time users */}
{showTour && user && (
  <OnboardingTour 
    userId={user.id} 
    onComplete={() => setShowTour(false)} 
  />
)}
    </main>
  )
}
