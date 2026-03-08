'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import DermaAI from '@/components/shared/derma-ai'
import { 
  User, Calendar, Heart, Settings, LogOut, Gift, Clock, 
  MapPin, ChevronRight, Star, Bell, ArrowRight, X
} from 'lucide-react'

const skinTypes = ['Oily', 'Dry', 'Combination', 'Normal', 'Sensitive']
const concerns = ['Acne', 'Aging', 'Hyperpigmentation', 'Dullness', 'Dehydration', 'Uneven Texture']
const preferredServices = ['Facials', 'Body Treatments', 'Massages', 'Manicure & Pedicure', 'Waxing', 'Laser']

export default function DashboardPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<{ id: string; firstName: string; lastName: string; email: string } | null>(null)
  const [showPreferences, setShowPreferences] = useState(false)
  const [preferences, setPreferences] = useState({
    skinType: '',
    concerns: [] as string[],
    preferredServices: [] as string[],
    preferredLocation: '',
    notifications: true
  })

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
            // First time user - show preferences modal
            setShowPreferences(true)
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

  const openPreferencesModal = () => {
    // Load current preferences when opening manually
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
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF9]">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#7B2D8E] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#FDFBF9]">
      <Header />
      
      {/* Preferences Modal - Slides up on mobile */}
      {showPreferences && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={skipPreferences} />
          <div className="relative w-full md:max-w-lg bg-white md:rounded-2xl rounded-t-3xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Personalize Your Experience</h2>
                <p className="text-xs text-gray-500">Help us recommend the best treatments</p>
              </div>
              <button onClick={skipPreferences} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-5 space-y-5" style={{ maxHeight: 'calc(90vh - 150px)' }}>
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

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 pb-24 md:pb-4 flex gap-3">
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
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 bg-[#7B2D8E] text-white text-sm font-medium rounded-xl hover:bg-[#6B2278] transition-colors flex-shrink-0"
              >
                <Calendar className="w-4 h-4" />
                Book
              </Link>
            </div>
            {/* Mobile book button */}
            <Link
              href="/booking"
              className="sm:hidden mt-4 flex items-center justify-center gap-2 w-full py-2.5 bg-[#7B2D8E] text-white text-sm font-medium rounded-xl"
            >
              <Calendar className="w-4 h-4" />
              Book Appointment
            </Link>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar - horizontal scroll on mobile */}
            <div className="lg:w-56 flex-shrink-0">
              <div className="bg-white rounded-2xl border border-gray-100 p-2 lg:sticky lg:top-24">
                <div className="flex lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0 -mx-1 px-1 lg:mx-0 lg:px-0 scrollbar-hide">
                  {[
                    { id: 'overview', label: 'Overview', icon: User },
                    { id: 'appointments', label: 'Appointments', icon: Calendar },
                    { id: 'favorites', label: 'Favorites', icon: Heart },
                    { id: 'preferences', label: 'Preferences', icon: Settings },
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                        activeTab === item.id
                          ? 'bg-[#7B2D8E] text-white'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  ))}
                  
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors whitespace-nowrap flex-shrink-0 lg:mt-2 lg:border-t lg:border-gray-100 lg:pt-3"
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

                  {/* Recommendations */}
                  {preferences.preferredServices.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Heart className="w-5 h-5 text-[#7B2D8E]" />
                          <h2 className="font-semibold text-gray-900">Recommended for You</h2>
                        </div>
                        <Link href="/services" className="text-xs text-[#7B2D8E] font-medium hover:underline">
                          View All
                        </Link>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {preferences.preferredServices.slice(0, 4).map((service) => (
                          <Link
                            key={service}
                            href={`/services/${service.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`}
                            className="flex items-center gap-3 p-3 md:p-4 rounded-xl border border-gray-100 hover:border-[#7B2D8E]/30 transition-colors group"
                          >
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                              <Heart className="w-4 h-4 md:w-5 md:h-5 text-[#7B2D8E]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 group-hover:text-[#7B2D8E] transition-colors truncate">{service}</p>
                              <p className="text-xs text-gray-500">Based on preferences</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#7B2D8E] flex-shrink-0" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

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

                  {/* Recent Activity */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6">
                    <h2 className="font-semibold text-gray-900 mb-4">Recent Activity</h2>
                    <div className="text-center py-8 md:py-10">
                      <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 mb-2">No recent activity</p>
                      <Link href="/booking" className="text-sm text-[#7B2D8E] font-medium hover:underline">
                        Book your first appointment
                      </Link>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'appointments' && (
                <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6">
                  <h2 className="font-semibold text-gray-900 mb-4">Your Appointments</h2>
                  <div className="text-center py-12 md:py-14">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No upcoming appointments</p>
                    <Link
                      href="/booking"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7B2D8E] text-white text-sm font-medium rounded-xl hover:bg-[#6B2278] transition-colors"
                    >
                      Book Now
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              )}

              {activeTab === 'favorites' && (
                <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6">
                  <h2 className="font-semibold text-gray-900 mb-4">Favorite Services</h2>
                  <div className="text-center py-12 md:py-14">
                    <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No favorites yet</p>
                    <Link
                      href="/services"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7B2D8E] text-white text-sm font-medium rounded-xl hover:bg-[#6B2278] transition-colors"
                    >
                      Explore Services
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              )}

              {activeTab === 'preferences' && (
                <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-semibold text-gray-900">Your Preferences</h2>
                    <button 
                      onClick={openPreferencesModal}
                      className="text-sm text-[#7B2D8E] font-medium hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-2">Skin Type</label>
                      <p className="text-gray-900">{preferences.skinType || 'Not set'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-2">Skin Concerns</label>
                      {preferences.concerns.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {preferences.concerns.map(c => (
                            <span key={c} className="px-3 py-1 bg-[#7B2D8E]/10 text-[#7B2D8E] text-sm rounded-full">{c}</span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-400">Not set</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-2">Preferred Services</label>
                      {preferences.preferredServices.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {preferences.preferredServices.map(s => (
                            <span key={s} className="px-3 py-1 bg-[#7B2D8E]/10 text-[#7B2D8E] text-sm rounded-full">{s}</span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-400">Not set</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-2">Preferred Location</label>
                      <p className="text-gray-900">{preferences.preferredLocation || 'Not set'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
      <DermaAI />
    </main>
  )
}
