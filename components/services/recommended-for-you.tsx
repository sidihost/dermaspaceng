'use client'

import Link from 'next/link'
import { Gem, ArrowRight, Star } from 'lucide-react'
import type { SkinTip } from '@/lib/skin-tips'

interface RecommendedForYouProps {
  skinType?: string
  concerns?: string[]
  preferredServices?: string[]
  tips: SkinTip[]
  pageType?: 'services' | 'laser'
}

// Service categories with their metadata - matches dashboard preference options
const serviceCategories = {
  'Facials': { href: '/services/facial-treatments', label: 'Facials', color: 'bg-pink-50' },
  'Body Treatments': { href: '/services/body-treatments', label: 'Body Treatments', color: 'bg-purple-50' },
  'Massages': { href: '/services/body-treatments', label: 'Massages', color: 'bg-blue-50' },
  'Manicure & Pedicure': { href: '/services/nail-care', label: 'Manicure & Pedicure', color: 'bg-rose-50' },
  'Waxing': { href: '/services/waxing', label: 'Waxing', color: 'bg-amber-50' },
  'Laser': { href: '/laser-tech', label: 'Laser Tech', color: 'bg-violet-50' },
}

const laserCategories = {
  'Laser Hair Removal': { href: '/laser-tech#hair-removal', label: 'Hair Removal', color: 'bg-purple-50' },
  'Skin Rejuvenation': { href: '/laser-tech#rejuvenation', label: 'Skin Rejuvenation', color: 'bg-pink-50' },
  'Pigmentation': { href: '/laser-tech#pigmentation', label: 'Pigmentation', color: 'bg-rose-50' },
  'Acne Scars': { href: '/laser-tech#acne-scars', label: 'Acne Scars', color: 'bg-amber-50' },
  'Laser': { href: '/laser-tech', label: 'Laser Tech', color: 'bg-violet-50' },
}

export default function RecommendedForYou({ 
  skinType, 
  concerns, 
  preferredServices,
  tips,
  pageType = 'services'
}: RecommendedForYouProps) {
  if (tips.length === 0 && (!preferredServices || preferredServices.length === 0)) {
    return null
  }

  const categories = pageType === 'laser' ? laserCategories : serviceCategories

  return (
    <section className="py-8 bg-gradient-to-b from-[#7B2D8E]/5 to-white">
      <div className="max-w-6xl mx-auto px-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-5">
          <div className="inline-flex self-start items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#7B2D8E]/10 whitespace-nowrap">
            <Gem className="w-3.5 h-3.5 text-[#7B2D8E] flex-shrink-0" />
            <span className="text-xs font-semibold text-[#7B2D8E]">Recommended For You</span>
          </div>
          {skinType && (
            <span className="text-xs text-gray-500">
              Based on your {skinType.toLowerCase()} skin type
            </span>
          )}
        </div>

        {/* Tips Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {tips.slice(0, 3).map((tip, index) => (
            <div 
              key={index}
              className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                  <Star className="w-5 h-5 text-[#7B2D8E]" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">{tip.title}</h3>
                  <p className="text-xs text-gray-600 mb-3 line-clamp-2">{tip.description}</p>
                  
                  {/* Recommended services */}
                  <div className="flex flex-wrap gap-1">
                    {tip.recommendedServices.slice(0, 2).map((service, i) => (
                      <span 
                        key={i}
                        className="px-2 py-0.5 text-[10px] font-medium text-[#7B2D8E] bg-[#7B2D8E]/5 rounded"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Preferred Service Categories */}
        {preferredServices && preferredServices.length > 0 && (
          <div className="mt-5">
            <p className="text-[10px] text-gray-500 mb-2 font-medium uppercase tracking-wide">
              Your Preferred Categories
            </p>
            <div className="flex flex-wrap gap-1.5">
              {preferredServices.slice(0, 4).map((service) => {
                const category = categories[service as keyof typeof categories]
                if (!category) return null

                return (
                  <Link
                    key={service}
                    href={category.href}
                    className="group inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full border border-gray-200 hover:border-[#7B2D8E]/30 hover:bg-[#7B2D8E]/5 transition-all"
                  >
                    <span className="text-xs font-medium text-gray-700 group-hover:text-[#7B2D8E]">
                      {category.label || service}
                    </span>
                    <ArrowRight className="w-3 h-3 text-gray-400 group-hover:text-[#7B2D8E] group-hover:translate-x-0.5 transition-all" />
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Concerns Tags */}
        {concerns && concerns.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">
              Targeting your concerns:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {concerns.slice(0, 4).map((concern) => (
                <span 
                  key={concern}
                  className="px-2.5 py-1 text-xs font-medium text-[#7B2D8E] bg-[#7B2D8E]/10 rounded-full"
                >
                  {concern}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
