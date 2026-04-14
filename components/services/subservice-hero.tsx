'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Heart, Sparkles } from 'lucide-react'

interface User {
  firstName: string
  lastName: string
}

interface Preferences {
  preferredServices?: string[]
  skinType?: string
}

interface SubserviceHeroProps {
  title: string
  description: string
  category: string
  preferenceKeys?: string[] // Keys that match this service category
}

export default function SubserviceHero({ 
  title, 
  description, 
  category,
  preferenceKeys = []
}: SubserviceHeroProps) {
  const [user, setUser] = useState<User | null>(null)
  const [preferences, setPreferences] = useState<Preferences | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            setUser(data.user)
            // Fetch preferences
            const prefRes = await fetch('/api/user/preferences')
            if (prefRes.ok) {
              const prefData = await prefRes.json()
              setPreferences(prefData.preferences)
            }
          }
        }
      } catch {
        // Not logged in
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const isFavoriteCategory = preferences?.preferredServices?.some(pref => 
    preferenceKeys.includes(pref)
  )

  const getTimeGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <section className="relative py-16 md:py-20 bg-[#7B2D8E] overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      <div className="absolute top-1/2 right-12 w-2 h-2 bg-white/30 rounded-full hidden md:block" />
      <div className="absolute top-1/4 left-12 w-3 h-3 bg-white/20 rounded-full hidden md:block" />
      
      <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
        {/* Back link */}
        <Link 
          href="/services" 
          className="inline-flex items-center gap-2 text-white/90 text-sm mb-6 hover:text-white transition-colors group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Services
        </Link>

        {isLoading ? (
          <>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-4">
              <span className="text-xs font-medium text-white uppercase tracking-widest">{category}</span>
            </div>
            
            <h1 className="text-2xl md:text-4xl font-bold text-white mb-3">
              {title}
            </h1>
            
            {/* Curved underline */}
            <svg className="mx-auto mb-4" width="120" height="8" viewBox="0 0 120 8" fill="none">
              <path d="M2 6C30 2 90 2 118 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5"/>
            </svg>
            
            <p className="text-sm md:text-base text-white/80 max-w-md mx-auto">
              {description}
            </p>
          </>
        ) : user ? (
          /* Personalized view for logged-in users */
          <>
            {isFavoriteCategory ? (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 border border-white/25 mb-4">
                <Heart className="w-3.5 h-3.5 text-white fill-white" />
                <span className="text-xs font-medium text-white uppercase tracking-widest">Your Favorite</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-4">
                <Sparkles className="w-3.5 h-3.5 text-white" />
                <span className="text-xs font-medium text-white uppercase tracking-widest">{category}</span>
              </div>
            )}
            
            <h1 className="text-2xl md:text-4xl font-bold text-white mb-3">
              {getTimeGreeting()}, {user.firstName}
            </h1>
            
            {/* Curved underline */}
            <svg className="mx-auto mb-4" width="120" height="8" viewBox="0 0 120 8" fill="none">
              <path d="M2 6C30 2 90 2 118 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5"/>
            </svg>
            
            <p className="text-sm md:text-base text-white/90 max-w-lg mx-auto">
              {isFavoriteCategory 
                ? `We know you love ${title.toLowerCase()}. Here are our treatments curated just for you.`
                : `Explore our ${title.toLowerCase()} designed for your wellness journey.`
              }
            </p>

            {/* Skin type badge if applicable */}
            {preferences?.skinType && (title.toLowerCase().includes('facial') || title.toLowerCase().includes('body')) && (
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20">
                <span className="text-xs text-white/80">
                  Your skin type: <span className="font-medium text-white">{preferences.skinType}</span>
                </span>
              </div>
            )}
          </>
        ) : (
          /* Default view for guests */
          <>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-4">
              <span className="text-xs font-medium text-white uppercase tracking-widest">{category}</span>
            </div>
            
            <h1 className="text-2xl md:text-4xl font-bold text-white mb-3">
              {title}
            </h1>
            
            {/* Curved underline */}
            <svg className="mx-auto mb-4" width="120" height="8" viewBox="0 0 120 8" fill="none">
              <path d="M2 6C30 2 90 2 118 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5"/>
            </svg>
            
            <p className="text-sm md:text-base text-white/80 max-w-md mx-auto">
              {description}
            </p>
          </>
        )}
        
        {/* Decorative line */}
        <div className="flex items-center justify-center gap-2 mt-6">
          <div className="w-8 h-0.5 bg-white/30" />
          <div className="w-2 h-2 rounded-full bg-white/50" />
          <div className="w-8 h-0.5 bg-white/30" />
        </div>
      </div>
    </section>
  )
}
