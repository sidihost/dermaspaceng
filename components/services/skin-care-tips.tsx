'use client'

import Link from 'next/link'
import { Lightbulb, ArrowRight, Droplets, Sun, Shield, Leaf } from 'lucide-react'
import type { SkinTip } from '@/lib/skin-tips'

interface SkinCareTipsProps {
  skinType?: string
  tips: SkinTip[]
  pageType?: 'services' | 'laser'
}

const skinTypeIcons: Record<string, React.ReactNode> = {
  'Oily': <Droplets className="w-5 h-5" />,
  'Dry': <Sun className="w-5 h-5" />,
  'Combination': <Leaf className="w-5 h-5" />,
  'Normal': <Shield className="w-5 h-5" />,
  'Sensitive': <Shield className="w-5 h-5" />,
}

export default function SkinCareTips({ 
  skinType, 
  tips,
  pageType = 'services'
}: SkinCareTipsProps) {
  if (tips.length === 0) {
    return null
  }

  const mainTip = tips[0]
  const secondaryTips = tips.slice(1, 3)

  return (
    <section className="py-8 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-6xl mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#7B2D8E]/10 mb-3">
            <Lightbulb className="w-3.5 h-3.5 text-[#7B2D8E]" />
            <span className="text-xs font-semibold text-[#7B2D8E]">
              {pageType === 'laser' ? 'Laser Treatment Tips' : 'Skincare Tips'} For You
            </span>
          </div>
          <h2 className="text-base md:text-xl font-bold text-gray-900">
            Personalized {pageType === 'laser' ? 'Laser' : 'Skincare'} Advice
          </h2>
          {skinType && (
            <p className="text-xs text-gray-600 mt-1.5">
              Tailored recommendations for your {skinType.toLowerCase()} skin
            </p>
          )}
        </div>

        {/* Main Tip Card */}
        <div className="mb-5">
          <div className="relative overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#7B2D8E]/5 rounded-full -translate-y-1/2 translate-x-1/2" />

            <div className="flex flex-col md:flex-row md:items-start gap-4 relative z-10">
              {/* Icon */}
              <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0 text-[#7B2D8E]">
                {skinType && skinTypeIcons[skinType] ? skinTypeIcons[skinType] : <Lightbulb className="w-4 h-4" />}
              </div>

              {/* Content */}
              <div className="flex-1">
                <h3 className="text-sm font-bold text-gray-900 mb-1.5">{mainTip.title}</h3>
                <p className="text-xs text-gray-600 mb-3 leading-relaxed">{mainTip.description}</p>

                {/* Recommended Services */}
                <div className="mb-3">
                  <p className="text-[10px] text-gray-500 mb-1.5 font-medium uppercase tracking-wide">
                    Recommended Treatments
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {mainTip.recommendedServices.map((service) => (
                      <span
                        key={service}
                        className="px-2.5 py-1 text-[11px] font-medium text-[#7B2D8E] bg-[#7B2D8E]/10 rounded-full"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                </div>

                <Link
                  href="/booking"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#7B2D8E] hover:gap-2 transition-all"
                >
                  Book a treatment
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Tips */}
        {secondaryTips.length > 0 && (
          <div className="grid md:grid-cols-2 gap-4">
            {secondaryTips.map((tip, index) => (
              <div 
                key={index}
                className="p-5 bg-white rounded-xl border border-gray-100 hover:border-[#7B2D8E]/20 hover:shadow-sm transition-all"
              >
                <h4 className="font-semibold text-gray-900 text-sm mb-2">{tip.title}</h4>
                <p className="text-xs text-gray-600 mb-3 line-clamp-2">{tip.description}</p>
                
                <div className="flex flex-wrap gap-1.5">
                  {tip.recommendedServices.slice(0, 3).map((service) => (
                    <span 
                      key={service}
                      className="px-2 py-0.5 text-[10px] font-medium text-gray-600 bg-gray-100 rounded"
                    >
                      {service}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-6 text-center">
          <Link
            href="/contact"
            className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-[#7B2D8E] transition-colors"
          >
            <span>Need personalized advice? Talk to our skincare experts</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  )
}
