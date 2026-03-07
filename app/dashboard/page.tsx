'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { 
  User, Calendar, Heart, Settings, LogOut, Gift, Clock, 
  MapPin, ChevronRight, Sparkles, Star, Bell, Check
} from 'lucide-react'

const skinTypes = ['Oily', 'Dry', 'Combination', 'Normal', 'Sensitive']
const concerns = ['Acne', 'Aging', 'Hyperpigmentation', 'Dullness', 'Dehydration', 'Uneven Texture']
const preferredServices = ['Facials', 'Body Treatments', 'Massages', 'Manicure & Pedicure', 'Waxing', 'Laser']

export default function DashboardPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<{ firstName: string; lastName: string; email: string } | null>(null)
  const [showPreferences, setShowPreferences] = useState(false)
  const [preferences, setPreferences] = useState({
    skinType: '',
    concerns: [] as string[],
    preferredServices: [] as string[],
    preferredLocation: '',
    notifications: true
  })

  useEffect(() => {
    // Check auth status
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          setUser(data.user)
          if (data.preferences) {
            setPreferences(data.preferences)
          } else {
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

  const savePreferences = async () => {
    try {
      await fetch('/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      })
      setShowPreferences(false)
    } catch (error) {
      console.error('Error saving preferences:', error)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#7B2D8E] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Preferences Setup Modal
  if (showPreferences) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Header />
        <div className="py-20 px-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-[#7B2D8E]" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome, {user?.firstName}!
              </h1>
              <p className="text-gray-600">
                Let us personalize your Dermaspace experience
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-8">
              {/* Skin Type */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  What is your skin type?
                </label>
                <div className="flex flex-wrap gap-2">
                  {skinTypes.map(type => (
                    <button
                      key={type}
                      onClick={() => setPreferences(p => ({ ...p, skinType: type }))}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        preferences.skinType === type
                          ? 'bg-[#7B2D8E] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Concerns */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  What are your main skin concerns? (Select all that apply)
                </label>
                <div className="flex flex-wrap gap-2">
                  {concerns.map(concern => (
                    <button
                      key={concern}
                      onClick={() => toggleConcern(concern)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        preferences.concerns.includes(concern)
                          ? 'bg-[#7B2D8E] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {concern}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preferred Services */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  What services interest you most?
                </label>
                <div className="flex flex-wrap gap-2">
                  {preferredServices.map(service => (
                    <button
                      key={service}
                      onClick={() => toggleService(service)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        preferences.preferredServices.includes(service)
                          ? 'bg-[#7B2D8E] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {service}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preferred Location */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  Preferred location
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {['Victoria Island', 'Ikoyi'].map(loc => (
                    <button
                      key={loc}
                      onClick={() => setPreferences(p => ({ ...p, preferredLocation: loc }))}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        preferences.preferredLocation === loc
                          ? 'border-[#7B2D8E] bg-[#7B2D8E]/5'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <MapPin className={`w-5 h-5 mb-2 ${preferences.preferredLocation === loc ? 'text-[#7B2D8E]' : 'text-gray-400'}`} />
                      <p className="font-medium text-gray-900">{loc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notifications */}
              <div className="flex items-center justify-between py-3 border-t border-gray-100">
                <div>
                  <p className="font-medium text-gray-900">Email notifications</p>
                  <p className="text-sm text-gray-500">Receive updates about offers and appointments</p>
                </div>
                <button
                  onClick={() => setPreferences(p => ({ ...p, notifications: !p.notifications }))}
                  className={`w-12 h-6 rounded-full transition-colors ${preferences.notifications ? 'bg-[#7B2D8E]' : 'bg-gray-200'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${preferences.notifications ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>

              <button
                onClick={savePreferences}
                className="w-full py-3 bg-[#7B2D8E] text-white font-medium rounded-xl hover:bg-[#5A1D6A] transition-colors"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {user?.firstName}
              </h1>
              <p className="text-gray-600">Manage your appointments and preferences</p>
            </div>
            <Link
              href="/consultation"
              className="hidden md:inline-flex items-center gap-2 px-5 py-2.5 bg-[#7B2D8E] text-white text-sm font-medium rounded-xl hover:bg-[#5A1D6A] transition-colors"
            >
              <Calendar className="w-4 h-4" />
              Book Appointment
            </Link>
          </div>

          <div className="grid lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <nav className="space-y-1">
                  {[
                    { id: 'overview', label: 'Overview', icon: User },
                    { id: 'appointments', label: 'Appointments', icon: Calendar },
                    { id: 'favorites', label: 'Favorites', icon: Heart },
                    { id: 'preferences', label: 'Preferences', icon: Settings },
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        activeTab === item.id
                          ? 'bg-[#7B2D8E] text-white'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  ))}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3 space-y-6">
              {activeTab === 'overview' && (
                <>
                  {/* Quick Stats */}
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="bg-white rounded-2xl border border-gray-100 p-5">
                      <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center mb-3">
                        <Calendar className="w-5 h-5 text-[#7B2D8E]" />
                      </div>
                      <p className="text-2xl font-bold text-gray-900">0</p>
                      <p className="text-sm text-gray-500">Upcoming Appointments</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 p-5">
                      <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center mb-3">
                        <Star className="w-5 h-5 text-[#7B2D8E]" />
                      </div>
                      <p className="text-2xl font-bold text-gray-900">0</p>
                      <p className="text-sm text-gray-500">Loyalty Points</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 p-5">
                      <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center mb-3">
                        <Gift className="w-5 h-5 text-[#7B2D8E]" />
                      </div>
                      <p className="text-2xl font-bold text-gray-900">Standard</p>
                      <p className="text-sm text-gray-500">Membership</p>
                    </div>
                  </div>

                  {/* Personalized Recommendations */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-gray-900">Recommended for You</h2>
                      <Link href="/services" className="text-sm text-[#7B2D8E] hover:underline">
                        View All
                      </Link>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {preferences.preferredServices.slice(0, 2).map((service, i) => (
                        <Link
                          key={service}
                          href={`/services/${service.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`}
                          className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-[#7B2D8E]/30 transition-colors group"
                        >
                          <div className="w-12 h-12 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-[#7B2D8E]" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 group-hover:text-[#7B2D8E] transition-colors">{service}</p>
                            <p className="text-sm text-gray-500">Based on your preferences</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#7B2D8E]" />
                        </Link>
                      )) || (
                        <p className="text-gray-500 col-span-2">Set your preferences to get personalized recommendations</p>
                      )}
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
                    <div className="text-center py-8">
                      <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No recent activity</p>
                      <Link href="/consultation" className="text-sm text-[#7B2D8E] hover:underline mt-2 inline-block">
                        Book your first appointment
                      </Link>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'appointments' && (
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Appointments</h2>
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-4">No appointments yet</p>
                    <Link
                      href="/consultation"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7B2D8E] text-white text-sm font-medium rounded-xl hover:bg-[#5A1D6A] transition-colors"
                    >
                      Book Appointment
                    </Link>
                  </div>
                </div>
              )}

              {activeTab === 'favorites' && (
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Favorite Services</h2>
                  <div className="text-center py-12">
                    <Heart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-4">No favorites yet</p>
                    <Link
                      href="/services"
                      className="text-sm text-[#7B2D8E] hover:underline"
                    >
                      Browse Services
                    </Link>
                  </div>
                </div>
              )}

              {activeTab === 'preferences' && (
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Your Preferences</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Skin Type</p>
                      <p className="font-medium text-gray-900">{preferences.skinType || 'Not set'}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Skin Concerns</p>
                      <div className="flex flex-wrap gap-2">
                        {preferences.concerns.length > 0 ? preferences.concerns.map(c => (
                          <span key={c} className="px-3 py-1 bg-[#7B2D8E]/10 text-[#7B2D8E] text-sm rounded-full">{c}</span>
                        )) : <span className="text-gray-500">Not set</span>}
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Preferred Services</p>
                      <div className="flex flex-wrap gap-2">
                        {preferences.preferredServices.length > 0 ? preferences.preferredServices.map(s => (
                          <span key={s} className="px-3 py-1 bg-[#7B2D8E]/10 text-[#7B2D8E] text-sm rounded-full">{s}</span>
                        )) : <span className="text-gray-500">Not set</span>}
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Preferred Location</p>
                      <p className="font-medium text-gray-900">{preferences.preferredLocation || 'Not set'}</p>
                    </div>

                    <button
                      onClick={() => setShowPreferences(true)}
                      className="px-5 py-2.5 bg-[#7B2D8E] text-white text-sm font-medium rounded-xl hover:bg-[#5A1D6A] transition-colors"
                    >
                      Update Preferences
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
