'use client'

import Link from 'next/link'
import { Check, Clock, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SectionTitle } from '@/components/ui/section-title'

const packages = [
  {
    name: 'Bronze',
    price: '77,000',
    duration: '2 Hours',
    features: ['Deep Tissue/Swedish Massage', 'Deep Cleansing Facial'],
    popular: false,
  },
  {
    name: 'Silver',
    price: '97,000',
    duration: '3 Hours 50 Mins',
    features: ['Deep Tissue/Swedish Massage', 'Detox Body Scrub + Steam', 'Deep Cleansing Facial', 'ManiPedi or Wax'],
    popular: false,
  },
  {
    name: 'Gold',
    price: '141,000',
    duration: '3 Hours 30 Mins',
    features: ['Deep Tissue/Swedish Massage', 'Detox Body Scrub + Steam', 'Deep Cleansing Facial', 'ManiPedi or Wax'],
    popular: true,
  },
]

export default function PackagesSection() {
  return (
    <section className="py-20 bg-[#FDFBF9]">
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <SectionTitle
          label="Spa Packages"
          title="Choose Your"
          highlight="Experience"
          description="Carefully curated packages for ultimate relaxation"
        />

        <div className="grid md:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <div
              key={pkg.name}
              className={cn(
                'rounded-2xl p-6 transition-all',
                pkg.popular 
                  ? 'bg-[#7B2D8E] text-white' 
                  : 'bg-white border border-gray-200 hover:border-[#7B2D8E]/40'
              )}
            >
              {pkg.popular && (
                <span className="inline-block text-xs font-medium uppercase tracking-wide bg-[#D4A853] text-white px-3 py-1 rounded-full mb-4">
                  Most Popular
                </span>
              )}
              
              <h3 className={cn(
                'text-xl font-bold mb-2',
                pkg.popular ? 'text-white' : 'text-gray-900'
              )}>
                {pkg.name} Experience
              </h3>
              
              <div className="flex items-baseline gap-1 mb-4">
                <span className={cn(
                  'text-3xl font-bold',
                  pkg.popular ? 'text-white' : 'text-gray-900'
                )}>
                  N{pkg.price}
                </span>
              </div>
              
              <div className={cn(
                'flex items-center gap-2 pb-4 mb-4 border-b',
                pkg.popular ? 'border-white/20' : 'border-gray-100'
              )}>
                <Clock className={cn('w-4 h-4', pkg.popular ? 'text-[#D4A853]' : 'text-[#7B2D8E]')} />
                <span className={cn('text-sm', pkg.popular ? 'text-white/80' : 'text-gray-600')}>
                  {pkg.duration}
                </span>
              </div>

              <ul className="space-y-3 mb-6">
                {pkg.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className={cn(
                      'w-4 h-4 mt-0.5 flex-shrink-0',
                      pkg.popular ? 'text-[#D4A853]' : 'text-[#7B2D8E]'
                    )} />
                    <span className={cn(
                      'text-sm',
                      pkg.popular ? 'text-white/90' : 'text-gray-600'
                    )}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                className={cn(
                  'w-full rounded-full h-11',
                  pkg.popular 
                    ? 'bg-white text-[#7B2D8E] hover:bg-[#D4A853] hover:text-white' 
                    : 'bg-[#7B2D8E] text-white hover:bg-[#5A1D6A]'
                )}
              >
                <Link href="/booking">Book Package</Link>
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/packages"
            className="inline-flex items-center gap-2 text-[#7B2D8E] font-medium hover:underline"
          >
            View All Packages
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
