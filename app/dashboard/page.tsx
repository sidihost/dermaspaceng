'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import DermaAI from '@/components/shared/derma-ai'
import { 
  User, Calendar, Heart, Settings, LogOut, Gift, Clock, 
  MapPin, ChevronRight, Star, Bell, Check, ArrowRight
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#7B2D8E] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  // Preferences Setup Modal
  if (showPreferences) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Header />
        
        {/* Modal Overlay */}
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 text-center">
              <div className="w-12 h-12 rounded-full bg-[#7B2D8E] flex items-center justify-center mx-auto mb-3">
                <User className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Welcome, {user?.firstName}!</h2>
              <p className="text-sm text-gray-500 mt-1">Let&apos;s personalize your experience</p>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Skin Type */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Skin Type</label>
                <div className="flex flex-wrap gap-2">
                  {skinTypes.map(type => (
                    <button
                      key={type}
                      onClick={() => setPreferences(p => ({ ...p, skinType: type }))}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
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
                <label className="block text-sm font-medium text-gray-900 mb-2">Skin Concerns</label>
                <div className="flex flex-wrap gap-2">
                  {concerns.map(concern => (
                    <button
                      key={concern}
                      onClick={() => toggleConcern(concern)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
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
                <label className="block text-sm font-medium text-gray-900 mb-2">Interested Services</label>
                <div className="flex flex-wrap gap-2">
                  {preferredServices.map(service => (
                    <button
                      key={service}
                      onClick={() => toggleService(service)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
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
                <label className="block text-sm font-medium text-gray-900 mb-2">Preferred Location</label>
                <div className="grid grid-cols-2 gap-3">
                  {['Victoria Island', 'Ikoyi'].map(loc => (
                    <button
                      key={loc}
                      onClick={() => setPreferences(p => ({ ...p, preferredLocation: loc }))}
                      className={`p-3 rounded-xl border text-left transition-all ${
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

              {/* Notifications */}
              <div className="flex items-center justify-between py-3 border-t border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">Email notifications</p>
                  <p className="text-xs text-gray-500">Updates and offers</p>
                </div>
                <button
                  onClick={() => setPreferences(p => ({ ...p, notifications: !p.notifications }))}
                  className={`w-10 h-5 rounded-full transition-colors ${preferences.notifications ? 'bg-[#7B2D8E]' : 'bg-gray-200'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${preferences.notifications ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100">
              <button
                onClick={savePreferences}
                className="w-full py-3 bg-[#7B2D8E] text-white text-sm font-medium rounded-xl hover:bg-[#6B2278] transition-colors"
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
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Welcome back, {user?.firstName}
              </h1>
              <p className="text-sm text-gray-500">Manage your appointments and preferences</p>
            </div>
            <Link
              href="/consultation"
              className="hidden md:inline-flex items-center gap-2 px-4 py-2 bg-[#7B2D8E] text-white text-sm font-medium rounded-lg hover:bg-[#6B2278] transition-colors"
            >
              <Calendar className="w-4 h-4" />
              Book
            </Link>
          </div>

          <div className="grid lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                {/* User Info */}
                <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-100">
                  <div className="w-10 h-10 rounded-full bg-[#7B2D8E] flex items-center justify-center text-white font-semibold text-sm">
                    {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                </div>

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
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
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
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
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
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="w-8 h-8 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center mb-2">
                        <Calendar className="w-4 h-4 text-[#7B2D8E]" />
                      </div>
                      <p className="text-xl font-bold text-gray-900">0</p>
                      <p className="text-xs text-gray-500">Upcoming</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="w-8 h-8 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center mb-2">
                        <Star className="w-4 h-4 text-[#7B2D8E]" />
                      </div>
                      <p className="text-xl font-bold text-gray-900">0</p>
                      <p className="text-xs text-gray-500">Points</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="w-8 h-8 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center mb-2">
                        <Gift className="w-4 h-4 text-[#7B2D8E]" />
                      </div>
                      <p className="text-xl font-bold text-gray-900">Standard</p>
                      <p className="text-xs text-gray-500">Membership</p>
                    </div>
                  </div>

                  {/* Recommendations */}
                  {preferences.preferredServices.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-gray-900">Recommended for You</h2>
                        <Link href="/services" className="text-xs text-[#7B2D8E] hover:underline">
                          View All
                        </Link>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {preferences.preferredServices.slice(0, 2).map((service) => (
                          <Link
                            key={service}
                            href={`/services/${service.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`}
                            className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-[#7B2D8E]/30 transition-colors group"
                          >
                            <div className="w-10 h-10 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center">
                              <Heart className="w-4 h-4 text-[#7B2D8E]" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900 group-hover:text-[#7B2D8E]">{service}</p>
                              <p className="text-xs text-gray-500">Based on preferences</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Activity */}
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h2 className="text-sm font-semibold text-gray-900 mb-4">Recent Activity</h2>
                    <div className="text-center py-8">
                      <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No recent activity</p>
                      <Link href="/consultation" className="text-xs text-[#7B2D8E] hover:underline mt-1 inline-block">
                        Book your first appointment
                      </Link>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'appointments' && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h2 className="text-sm font-semibold text-gray-900 mb-4">Your Appointments</h2>
                  <div className="text-center py-12">
                    <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 mb-3">No upcoming appointments</p>
                    <Link
                      href="/consultation"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#7B2D8E] text-white text-sm font-medium rounded-lg hover:bg-[#6B2278] transition-colors"
                    >
                      Book Now
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              )}

              {activeTab === 'favorites' && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h2 className="text-sm font-semibold text-gray-900 mb-4">Favorite Services</h2>
                  <div className="text-center py-12">
                    <Heart className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 mb-3">No favorites yet</p>
                    <Link
                      href="/services"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#7B2D8E] text-white text-sm font-medium rounded-lg hover:bg-[#6B2278] transition-colors"
                    >
                      Explore Services
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              )}

              {activeTab === 'preferences' && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h2 className="text-sm font-semibold text-gray-900 mb-4">Your Preferences</h2>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Skin Type</p>
                        <p className="text-xs text-gray-500">{preferences.skinType || 'Not set'}</p>
                      </div>
                      <button 
                        onClick={() => setShowPreferences(true)}
                        className="text-xs text-[#7B2D8E] hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Skin Concerns</p>
                        <p className="text-xs text-gray-500">{preferences.concerns.join(', ') || 'Not set'}</p>
                      </div>
                      <button 
                        onClick={() => setShowPreferences(true)}
                        className="text-xs text-[#7B2D8E] hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Preferred Location</p>
                        <p className="text-xs text-gray-500">{preferences.preferredLocation || 'Not set'}</p>
                      </div>
                      <button 
                        onClick={() => setShowPreferences(true)}
                        className="text-xs text-[#7B2D8E] hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Email Notifications</p>
                        <p className="text-xs text-gray-500">{preferences.notifications ? 'Enabled' : 'Disabled'}</p>
                      </div>
                      <button
                        onClick={() => setPreferences(p => ({ ...p, notifications: !p.notifications }))}
                        className={`w-10 h-5 rounded-full transition-colors ${preferences.notifications ? 'bg-[#7B2D8E]' : 'bg-gray-200'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${preferences.notifications ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <DermaAI />
      <Footer />
    </main>
  )
}
