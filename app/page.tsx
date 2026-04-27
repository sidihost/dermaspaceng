import dynamic from 'next/dynamic'
import Header from '@/components/layout/header'
import Hero from '@/components/home/hero'
import AboutPreview from '@/components/home/about-preview'
import ServicesSection from '@/components/home/services-section'
import { FeatureGate } from '@/components/shared/feature-gate'

// Below-the-fold sections are dynamic-imported so the critical bundle for
// the hero + first viewport stays tiny. Server rendering is kept on (so
// SEO and the initial HTML are unchanged), but each section ships as its
// own chunk that the browser fetches only when it's actually needed.
// `loading: undefined` keeps the slot invisible during load — we don't
// want a spinner flashing through real content as the user scrolls.
//
// Several sections are wrapped in <FeatureGate> below so that admins
// flipping flags in /admin/features have a real, visible effect on
// the public homepage. Each gated section ALSO disappears from the
// client bundle when its flag is off, because <FeatureGate> resolves
// server-side before children render — we never even ship the chunk
// for, say, the testimonials section when `reviews` is OFF.
//
// Auth-gated: renders nothing for signed-out visitors, so it's safe to
// load eagerly on the homepage. Lightweight (just two horizontal rails).
const RecommendationsSection = dynamic(() => import('@/components/home/recommendations-section'))
const LaserSection = dynamic(() => import('@/components/home/laser-section'))
const AISection = dynamic(() => import('@/components/home/ai-section'))
const StatsSection = dynamic(() => import('@/components/home/stats-section'))
const QualitiesSection = dynamic(() => import('@/components/home/qualities-section'))
const PackagesSection = dynamic(() => import('@/components/home/packages-section'))
const GiftCardsSection = dynamic(() => import('@/components/home/gift-cards-section'))
const BookingSection = dynamic(() => import('@/components/home/booking-section'))
const TestimonialsSection = dynamic(() => import('@/components/home/testimonials-section'))
const GalleryPreview = dynamic(() => import('@/components/home/gallery-preview'))
const LocationsSection = dynamic(() => import('@/components/home/locations-section'))
const FAQSection = dynamic(() => import('@/components/home/faq-section'))
const NewsletterSection = dynamic(() => import('@/components/home/newsletter-section'))
const CTASection = dynamic(() => import('@/components/home/cta-section'))
const Footer = dynamic(() => import('@/components/layout/footer'))

export default function Home() {
  return (
    <main>
      <Header />
      <Hero />
      {/* Personalized discovery rails — only render for signed-in
          users. Self-hides for anonymous traffic. */}
      <RecommendationsSection />
      <AboutPreview />
      <ServicesSection />
      <LaserSection />
      {/* Derma AI marketing block — gated on the same `ai_chat` flag
          that controls the floating launcher. If the AI is off, the
          "Meet Derma AI" promo on the homepage shouldn't be promising
          something visitors can't actually use. */}
      <FeatureGate flag="ai_chat">
        <AISection />
      </FeatureGate>
      <StatsSection />
      <QualitiesSection />
      <PackagesSection />
      {/* Gift cards homepage promo. Hidden when the public gift card
          flow is paused so we don't drive traffic to a /gift-cards
          page that's also turned off. */}
      <FeatureGate flag="gift_cards">
        <GiftCardsSection />
      </FeatureGate>
      {/* Same logic for online booking — when `booking` is OFF the
          /booking route falls back to a "currently unavailable"
          screen, so removing the homepage CTA keeps the site
          consistent with itself. */}
      <FeatureGate flag="booking">
        <BookingSection />
      </FeatureGate>
      {/* Public reviews wall. Toggle off for legal review periods,
          GDPR removal sweeps, etc. */}
      <FeatureGate flag="reviews">
        <TestimonialsSection />
      </FeatureGate>
      <GalleryPreview />
      <LocationsSection />
      <FAQSection />
      {/* Footer newsletter capture. */}
      <FeatureGate flag="newsletter">
        <NewsletterSection />
      </FeatureGate>
      <CTASection />
      <Footer />
    </main>
  )
}
