'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Clock, Star, Layers } from 'lucide-react'
import { useUserPersonalization } from '@/hooks/use-user-personalization'
import PersonalizedHero from './personalized-hero'
import RecommendedForYou from './recommended-for-you'
import QuickRebook from './quick-rebook'
import SkinCareTips from './skin-care-tips'
import ServiceCTA from './service-cta'

// preferenceKeys map to dashboard preference options: 'Facials', 'Body Treatments', 'Massages', 'Manicure & Pedicure', 'Waxing', 'Laser'
const serviceCategories = [
  {
    title: 'Body Treatments',
    preferenceKeys: ['Body Treatments', 'Massages'], // Matches dashboard preferences
    description: 'Indulge in luxurious body treatments for complete relaxation including massages, body scrubs, and therapeutic sessions.',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-african-woman-resting-relaxing-with-sea-salt-back-spa-salon-5-768x512-1.jpg-qzDnc9aVQiTjypUgkMMu2l5wqwyRZG.webp',
    href: '/services/body-treatments',
    treatments: ['Hot Stone Massage', 'Thai Massage', 'Sports Massage', 'Detox Body Scrub', 'Pregnancy Massage', 'Reflexology'],
    duration: 'From 60 mins',
    rating: 4.9,
  },
  {
    title: 'Facial Treatments',
    preferenceKeys: ['Facials'], // Matches dashboard preferences
    description: 'Rejuvenate your skin with our expert facial therapies ranging from deep cleansing to advanced chemical peels.',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6462-2048x1463.jpg-768x549-2-aOLyIQYjwEGezoOTEw78F0jLOjfkia.webp',
    href: '/services/facial-treatments',
    treatments: ['Deep Cleansing Facial', 'Hydra Facial', 'Acne Facial', 'Microneedling', 'Chemical Peels', 'Signature Facial'],
    duration: 'From 45 mins',
    rating: 4.8,
  },
  {
    title: 'Nail Care',
    preferenceKeys: ['Manicure & Pedicure'], // Matches dashboard preferences
    description: 'Perfect manicures and pedicures for beautiful, healthy nails with premium products and expert techniques.',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/young-woman-getting-her-nails-done-salon-scaled.jpg-768x512-1-dTT1qPz9fJm1tSGBMYraVrKPoDeTdC.webp',
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
      <section className="py-12 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          {/* Section header for logged-in users */}
          {isLoggedIn && !isLoading && (
            <div className="mb-8 flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7B2D8E] to-[#9B4DB8] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#7B2D8E]/20">
                <Layers className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">All Services</h2>
                <p className="text-sm text-gray-600">Explore our full range of premium treatments and find the perfect care for you</p>
              </div>
            </div>
          )}
          
          <div className="grid md:grid-cols-2 gap-6">
            {serviceCategories.map((category) => (
              <Link
                key={category.title}
                href={category.href}
                className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-[#7B2D8E]/30 transition-all"
              >
                {/* Image */}
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={category.image}
                    alt={category.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  
                  {/* Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 bg-white/90 rounded-full">
                    <Star className="w-3 h-3 text-[#7B2D8E] fill-current" />
                    <span className="text-xs font-semibold text-gray-900">{category.rating}</span>
                  </div>

                  {/* Preferred badge for logged-in users */}
                  {isLoggedIn && preferences?.preferredServices?.some(pref => category.preferenceKeys.includes(pref)) && (
                    <div className="absolute top-3 right-3 px-2.5 py-1 bg-[#7B2D8E] text-white text-xs font-medium rounded-full">
                      Your Favorite
                    </div>
                  )}
                  
                  {/* Title on image */}
                  <div className="absolute bottom-3 left-4">
                    <h2 className="text-lg font-bold text-white">{category.title}</h2>
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#7B2D8E] rounded-full">
                      <Clock className="w-2.5 h-2.5 text-white" />
                      <span className="text-[10px] font-medium text-white">{category.duration}</span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {category.description}
                  </p>

                  {/* Treatments Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {category.treatments.slice(0, 3).map((treatment) => (
                      <span 
                        key={treatment}
                        className="px-2 py-0.5 text-[10px] font-medium text-[#7B2D8E] bg-[#7B2D8E]/5 rounded"
                      >
                        {treatment}
                      </span>
                    ))}
                    {category.treatments.length > 3 && (
                      <span className="px-2 py-0.5 text-[10px] font-medium text-gray-500 bg-gray-100 rounded">
                        +{category.treatments.length - 3} more
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-sm font-medium text-[#7B2D8E] group-hover:gap-2 transition-all">
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
