'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Clock, Star } from 'lucide-react'
import { useUserPersonalization } from '@/hooks/use-user-personalization'
import FavoriteButton from '@/components/favorite-button'
import PersonalizedHero from './personalized-hero'
import RecommendedForYou from './recommended-for-you'
import QuickRebook from './quick-rebook'
import SkinCareTips from './skin-care-tips'
import ServiceCTA from './service-cta'
// Semantic search bar — sits right under the hero so visitors who
// browse by concern (not by category name) have a clear entry point
// before they have to commit to one of the four category cards.
import SemanticServiceSearch from './semantic-service-search'

// preferenceKeys map to dashboard preference options: 'Facials', 'Body Treatments', 'Massages', 'Manicure & Pedicure', 'Waxing', 'Laser'
const serviceCategories = [
  {
    title: 'Body Treatments',
    preferenceKeys: ['Body Treatments', 'Massages'], // Matches dashboard preferences
    description: 'Indulge in luxurious body treatments for complete relaxation including massages, body scrubs, and therapeutic sessions.',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-african-woman-resting-relaxing-with-sea-salt-back-spa-salon-5-768x512-1.jpg-qzDnc9aVQiTjypUgkMMu2l5wqwyRZG.webp',
    imagePosition: 'object-center',
    href: '/services/body-treatments',
    treatments: ['Hot Stone Massage', 'Thai Massage', 'Sports Massage', 'Detox Body Scrub', 'Pregnancy Massage', 'Reflexology'],
    duration: 'From 60 mins',
    rating: 4.9,
  },
  {
    title: 'Facial Treatments',
    preferenceKeys: ['Facials'], // Matches dashboard preferences
    description: 'Rejuvenate your skin with our expert facial therapies ranging from deep cleansing to advanced chemical peels.',
    image: '/images/facial-treatment-hd.jpg',
    imagePosition: 'object-[center_18%]',
    href: '/services/facial-treatments',
    treatments: ['Deep Cleansing Facial', 'Hydra Facial', 'Acne Facial', 'Microneedling', 'Chemical Peels', 'Signature Facial'],
    duration: 'From 45 mins',
    rating: 4.8,
  },
  {
    title: 'Nail Care',
    preferenceKeys: ['Manicure & Pedicure'], // Matches dashboard preferences
    description: 'Perfect manicures and pedicures for beautiful, healthy nails with premium products and expert techniques.',
    image: '/images/nail-care-hd.jpg',
    imagePosition: 'object-[center_38%]',
    href: '/services/nail-care',
    treatments: ['Hot Wax Mani-Pedi', 'Jelly Pedicure', 'Classic Manicure', 'Classic Pedicure', 'Gel Polish', 'Nail Art'],
    duration: 'From 30 mins',
    rating: 4.7,
  },
  {
    title: 'Waxing',
    preferenceKeys: ['Waxing'], // Matches dashboard preferences
    description: 'Smooth, hair-free skin with gentle waxing services using premium strip wax and hot wax techniques.',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-young-girl-beauty-salon-1024x681.jpg-oxGrqVSRoD400FZKPP5mLOdN42EJvX.webp',
    imagePosition: 'object-center',
    href: '/services/waxing',
    treatments: ['Full Body Wax', 'Brazilian Wax', 'Bikini Wax', 'Arm Wax', 'Leg Wax', 'Underarm Wax'],
    duration: 'From 15 mins',
    rating: 4.8,
  },
]

export default function ServicesPageContent() {
  const {
    isLoggedIn,
    isLoading,
    preferences,
    recentBookings,
    recentServices,
    lastVisitDate,
    skinTips,
    getGreetingMessage,
    getPersonalizedSubtitle
  } = useUserPersonalization()

  return (
    <>
      {/* Personalized Hero Section */}
      <PersonalizedHero
        isLoggedIn={isLoggedIn}
        isLoading={isLoading}
        greeting={getGreetingMessage()}
        subtitle={getPersonalizedSubtitle()}
        skinType={preferences?.skinType}
        pageType="services"
      />

      {/* Semantic search — first thing a visitor sees after the hero.
          Concern-first ("I get spots before my period") routes to the
          right treatment + blog article via Upstash Vector. */}
      <SemanticServiceSearch />

      {/* Recommended For You Section - Only for logged-in users with preferences */}
      {isLoggedIn && !isLoading && preferences && (
        <RecommendedForYou
          skinType={preferences.skinType}
          concerns={preferences.concerns}
          preferredServices={preferences.preferredServices}
          tips={skinTips}
          pageType="services"
        />
      )}

      {/* Quick Rebook Section - Only for logged-in users with booking history */}
      {isLoggedIn && !isLoading && recentServices.length > 0 && (
        <QuickRebook
          recentServices={recentServices}
          lastVisitDate={lastVisitDate}
          recentBookings={recentBookings}
        />
      )}

      {/* Services Grid */}
      <section className="pt-6 pb-12 sm:pt-8 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          {/* Section header for logged-in users */}
          {isLoggedIn && !isLoading && (
            <div className="mb-6 sm:mb-7 text-center">
              {/* Eyebrow with tracked uppercase label between hairlines */}
              <div className="inline-flex items-center gap-2 mb-2.5">
                <span className="h-px w-4 bg-[#7B2D8E]/40" aria-hidden="true" />
                <span className="text-[9px] font-semibold tracking-[0.2em] uppercase text-[#7B2D8E]">
                  The Collection
                </span>
                <span className="h-px w-4 bg-[#7B2D8E]/40" aria-hidden="true" />
              </div>

              {/* Display title with gradient second line */}
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-[1.1] tracking-tight">
                All{' '}
                <span className="bg-gradient-to-br from-[#8A3FA0] via-[#7B2D8E] to-[#5E1F70] bg-clip-text text-transparent">
                  Services
                </span>
              </h2>

              {/* Supporting copy */}
              <p className="mt-2 text-xs sm:text-sm text-gray-500 max-w-md mx-auto leading-relaxed text-balance">
                {serviceCategories.length} curated categories of premium treatments
              </p>

              {/* Refined divider — dot flanked by fading hairlines */}
              <div className="mt-4 flex items-center justify-center gap-2" aria-hidden="true">
                <span className="h-px w-8 bg-gradient-to-r from-transparent to-[#7B2D8E]/40" />
                <span className="w-1 h-1 rounded-full bg-[#7B2D8E]/60" />
                <span className="h-px w-8 bg-gradient-to-l from-transparent to-[#7B2D8E]/40" />
              </div>
            </div>
          )}
          
          <div className="grid md:grid-cols-2 gap-6">
            {serviceCategories.map((category) => (
              <Link
                key={category.title}
                href={category.href}
                className="group grid sm:grid-cols-[190px_1fr] bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-[#7B2D8E]/40 transition-colors"
              >
                {/* Portrait-friendly Media Column */}
                <div className="relative aspect-[4/3] sm:aspect-auto sm:min-h-[248px] overflow-hidden bg-[#FAF6FB]">
                  <Image
                    src={category.image}
                    alt={category.title}
                    fill
                    quality={95}
                    sizes="(max-width: 640px) 100vw, 320px"
                    referrerPolicy="no-referrer"
                    className={`object-cover ${category.imagePosition} group-hover:scale-105 transition-transform duration-500`}
                  />

                  {/* Rating Chip */}
                  <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 bg-white rounded-full border border-gray-200">
                    <Star className="w-3 h-3 text-[#7B2D8E] fill-current" />
                    <span className="text-xs font-semibold text-gray-900 tabular-nums">{category.rating}</span>
                  </div>

                  {/* Favorite control */}
                  <div className="absolute top-3 right-3 z-10">
                    <FavoriteButton
                      itemType="category"
                      itemId={category.href}
                      label={category.title}
                      href={category.href}
                      variant="overlay"
                    />
                  </div>
                </div>

                {/* Content Column */}
                <div className="p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FAF6FB] border border-[#7B2D8E]/20 rounded-md text-[11px] font-medium text-[#7B2D8E]">
                        <Clock className="w-3 h-3 text-[#7B2D8E]" />
                        {category.duration}
                      </span>
                      {isLoggedIn && preferences?.preferredServices?.some(pref => category.preferenceKeys.includes(pref)) && (
                        <span className="px-2 py-0.5 bg-[#7B2D8E] text-white text-[10px] font-semibold rounded-md">
                          Your Favorite
                        </span>
                      )}
                    </div>

                    <h2 className="text-lg font-bold text-gray-900 group-hover:text-[#7B2D8E] transition-colors mb-1.5">
                      {category.title}
                    </h2>

                    <p className="text-sm text-gray-600 mb-3.5 line-clamp-2 leading-relaxed">
                      {category.description}
                    </p>

                    {/* Treatments Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {category.treatments.slice(0, 3).map((treatment) => (
                        <span
                          key={treatment}
                          className="px-2 py-0.5 text-[11px] font-medium text-[#7B2D8E] bg-[#FAF6FB] border border-[#7B2D8E]/15 rounded-md"
                        >
                          {treatment}
                        </span>
                      ))}
                      {category.treatments.length > 3 && (
                        <span className="px-2 py-0.5 text-[11px] font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-md">
                          +{category.treatments.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-sm font-semibold text-[#7B2D8E] group-hover:gap-2 transition-all pt-3 border-t border-gray-100">
                    View Details
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Skin Care Tips Section - Only for logged-in users */}
      {isLoggedIn && !isLoading && skinTips.length > 0 && (
        <SkinCareTips
          skinType={preferences?.skinType}
          tips={skinTips}
          pageType="services"
        />
      )}

      {/* CTA Section */}
      <ServiceCTA />
    </>
  )
}
