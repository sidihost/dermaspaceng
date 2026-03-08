'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import DermaAI from '@/components/shared/derma-ai'
import { 
  User, Calendar, Heart, Settings, LogOut, Gift, Clock, 
  MapPin, ChevronRight, Star, Bell, Check, ArrowRight, Pencil
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
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF9]">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#7B2D8E] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  // Preferences Modal
  if (showPreferences) {
    return (
      <main className="min-h-screen bg-[#FDFBF9]">
        <Header />
        
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-100">
            <div className="p-6 border-b border-gray-100 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#7B2D8E] flex items-center justify-center mx-auto mb-4">
                <User className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Welcome, {user?.firstName}!</h2>
              <p className="text-sm text-gray-500 mt-1">Personalize your spa experience</p>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Skin Type</label>
                <div className="flex flex-wrap gap-2">
                  {skinTypes.map(type => (
                    <button
                      key={type}
                      onClick={() => setPreferences(p => ({ ...p, skinType: type }))}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
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
                <label className="block text-xs font-medium text-gray-700 mb-2">Skin Concerns</label>
                <div className="flex flex-wrap gap-2">
                  {concerns.map(concern => (
                    <button
                      key={concern}
                      onClick={() => toggleConcern(concern)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
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
                <label className="block text-xs font-medium text-gray-700 mb-2">Interested Services</label>
                <div className="flex flex-wrap gap-2">
                  {preferredServices.map(service => (
                    <button
                      key={service}
                      onClick={() => toggleService(service)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
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
                <label className="block text-xs font-medium text-gray-700 mb-2">Preferred Location</label>
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

              <div className="flex items-center justify-between py-3 border-t border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">Email notifications</p>
                  <p className="text-xs text-gray-500">Updates and offers</p>
                </div>
                <button
                  onClick={() => setPreferences(p => ({ ...p, notifications: !p.notifications }))}
                  className={`w-10 h-5 rounded-full transition-colors ${preferences.notifications ? 'bg-[#7B2D8E]' : 'bg-gray-200'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${preferences.notifications ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>

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
    <main className="min-h-screen bg-[#FDFBF9]">
      <Header />
      
      <div className="py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Welcome Header */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#7B2D8E] flex items-center justify-center text-white font-bold text-lg">
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    Welcome back, {user?.firstName}!
                  </h1>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                </div>
              </div>
              <Link
                href="/booking"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#7B2D8E] text-white text-sm font-medium rounded-xl hover:bg-[#6B2278] transition-colors"
              >
                <Calendar className="w-4 h-4" />
                Book Appointment
              </Link>
            </div>
          </div>

          <div className="grid lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-gray-100 p-4 sticky top-24">
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
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  ))}
                  
                  <div className="border-t border-gray-100 pt-2 mt-2">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3 space-y-6">
              {activeTab === 'overview' && (
                <>
                  {/* Stats Grid */}
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="bg-white rounded-2xl border border-gray-100 p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-[#7B2D8E]" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-gray-900">0</p>
                          <p className="text-xs text-gray-500">Upcoming</p>
                        </div>
                      </div>
                      <Link href="/booking" className="text-xs text-[#7B2D8E] font-medium hover:underline">
                        Book now
                      </Link>
                    </div>
                    
                    <div className="bg-white rounded-2xl border border-gray-100 p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center">
                          <Star className="w-5 h-5 text-[#7B2D8E]" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-gray-900">0</p>
                          <p className="text-xs text-gray-500">Reward Points</p>
                        </div>
                      </div>
                      <Link href="/membership" className="text-xs text-[#7B2D8E] font-medium hover:underline">
                        Learn more
                      </Link>
                    </div>
                    
                    <div className="bg-white rounded-2xl border border-gray-100 p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center">
                          <Gift className="w-5 h-5 text-[#7B2D8E]" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-gray-900">Standard</p>
                          <p className="text-xs text-gray-500">Membership</p>
                        </div>
                      </div>
                      <Link href="/membership" className="text-xs text-[#7B2D8E] font-medium hover:underline">
                        Upgrade
                      </Link>
                    </div>
                  </div>

                  {/* Recommendations */}
                  {preferences.preferredServices.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 p-6">
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
                            className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-[#7B2D8E]/30 transition-colors group"
                          >
                            <div className="w-12 h-12 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center">
                              <Heart className="w-5 h-5 text-[#7B2D8E]" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 group-hover:text-[#7B2D8E] transition-colors">{service}</p>
                              <p className="text-xs text-gray-500">Based on your preferences</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#7B2D8E]" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-6">
                    <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
                    <div className="grid sm:grid-cols-3 gap-3">
                      <Link href="/booking" className="p-4 rounded-xl border border-gray-100 hover:border-[#7B2D8E]/30 transition-colors text-center group">
                        <Calendar className="w-6 h-6 text-[#7B2D8E] mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-900">Book Appointment</p>
                      </Link>
                      <Link href="/gift-cards" className="p-4 rounded-xl border border-gray-100 hover:border-[#7B2D8E]/30 transition-colors text-center group">
                        <Gift className="w-6 h-6 text-[#7B2D8E] mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-900">Gift Cards</p>
                      </Link>
                      <Link href="/contact" className="p-4 rounded-xl border border-gray-100 hover:border-[#7B2D8E]/30 transition-colors text-center group">
                        <Bell className="w-6 h-6 text-[#7B2D8E] mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-900">Contact Us</p>
                      </Link>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-6">
                    <h2 className="font-semibold text-gray-900 mb-4">Recent Activity</h2>
                    <div className="text-center py-10">
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
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <h2 className="font-semibold text-gray-900 mb-4">Your Appointments</h2>
                  <div className="text-center py-14">
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
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <h2 className="font-semibold text-gray-900 mb-4">Favorite Services</h2>
                  <div className="text-center py-14">
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
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-semibold text-gray-900">Your Preferences</h2>
                    <button 
                      onClick={() => setShowPreferences(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#7B2D8E] bg-[#7B2D8E]/10 rounded-lg hover:bg-[#7B2D8E]/20 transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit All
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-gray-50">
                      <p className="text-xs font-medium text-gray-500 mb-1">Skin Type</p>
                      <p className="font-medium text-gray-900">{preferences.skinType || 'Not set'}</p>
                    </div>
                    
                    <div className="p-4 rounded-xl bg-gray-50">
                      <p className="text-xs font-medium text-gray-500 mb-2">Skin Concerns</p>
                      {preferences.concerns.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {preferences.concerns.map(c => (
                            <span key={c} className="px-2.5 py-1 bg-[#7B2D8E]/10 text-[#7B2D8E] text-xs font-medium rounded-full">{c}</span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">Not set</p>
                      )}
                    </div>
                    
                    <div className="p-4 rounded-xl bg-gray-50">
                      <p className="text-xs font-medium text-gray-500 mb-2">Interested Services</p>
                      {preferences.preferredServices.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {preferences.preferredServices.map(s => (
                            <span key={s} className="px-2.5 py-1 bg-[#7B2D8E]/10 text-[#7B2D8E] text-xs font-medium rounded-full">{s}</span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">Not set</p>
                      )}
                    </div>
                    
                    <div className="p-4 rounded-xl bg-gray-50">
                      <p className="text-xs font-medium text-gray-500 mb-1">Preferred Location</p>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#7B2D8E]" />
                        <p className="font-medium text-gray-900">{preferences.preferredLocation || 'Not set'}</p>
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-xl bg-gray-50 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Email Notifications</p>
                        <p className="font-medium text-gray-900">{preferences.notifications ? 'Enabled' : 'Disabled'}</p>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${preferences.notifications ? 'bg-green-500' : 'bg-gray-300'}`} />
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
