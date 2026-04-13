'use client'

import { Sparkles, User } from 'lucide-react'

interface PersonalizedHeroProps {
  isLoggedIn: boolean
  isLoading: boolean
  greeting: string
  subtitle: string
  skinType?: string
  pageType?: 'services' | 'laser'
}

export default function PersonalizedHero({ 
  isLoggedIn, 
  isLoading,
  greeting,
  subtitle,
  skinType,
  pageType = 'services'
}: PersonalizedHeroProps) {
  const title = pageType === 'laser' ? 'Laser Technology' : 'Premium Spa Services'
  const defaultSubtitle = pageType === 'laser' 
    ? 'Advanced laser treatments for lasting results'
    : 'Expertly crafted treatments to rejuvenate your body and mind'

  return (
    <section className="relative py-16 md:py-20 bg-[#7B2D8E] overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      <div className="absolute top-1/2 right-12 w-2 h-2 bg-white/30 rounded-full hidden md:block" />
      <div className="absolute top-1/4 left-12 w-3 h-3 bg-white/20 rounded-full hidden md:block" />
      
      <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
        {isLoading ? (
          <>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-4">
              <span className="text-xs font-medium text-white uppercase tracking-widest">
                {pageType === 'laser' ? 'Laser Tech' : 'Our Services'}
              </span>
            </div>
            <h1 className="text-2xl md:text-4xl font-bold text-white mb-3">
              {title}
            </h1>
            <p className="text-sm md:text-base text-white/80 max-w-md mx-auto">
              {defaultSubtitle}
            </p>
          </>
        ) : isLoggedIn ? (
          <>
            {/* Personalized badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 border border-white/25 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span className="text-xs font-medium text-white uppercase tracking-widest">
                Personalized For You
              </span>
            </div>
            
            {/* Personalized greeting */}
            <h1 className="text-2xl md:text-4xl font-bold text-white mb-3">
              {greeting}
            </h1>
            
            {/* Skin type aware subtitle */}
            <p className="text-sm md:text-base text-white/90 max-w-lg mx-auto">
              {subtitle}
            </p>

            {/* Skin type badge */}
            {skinType && (
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20">
                <User className="w-3.5 h-3.5 text-white/80" />
                <span className="text-xs text-white/80">
                  Your skin type: <span className="font-medium text-white">{skinType}</span>
                </span>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-4">
              <span className="text-xs font-medium text-white uppercase tracking-widest">
                {pageType === 'laser' ? 'Laser Tech' : 'Our Services'}
              </span>
            </div>
            <h1 className="text-2xl md:text-4xl font-bold text-white mb-3">
              {title}
            </h1>
            <p className="text-sm md:text-base text-white/80 max-w-md mx-auto">
              {defaultSubtitle}
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
