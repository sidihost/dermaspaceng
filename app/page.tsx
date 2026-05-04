// Aliased because we also export `dynamic` as a Next.js route
// segment config below ("force-dynamic"). Without the alias the two
// `dynamic` identifiers collide at module scope.
import nextDynamic from 'next/dynamic'
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
const RecommendationsSection = nextDynamic(() => import('@/components/home/recommendations-section'))
const LaserSection = nextDynamic(() => import('@/components/home/laser-section'))
const AISection = nextDynamic(() => import('@/components/home/ai-section'))
const StatsSection = nextDynamic(() => import('@/components/home/stats-section'))
const QualitiesSection = nextDynamic(() => import('@/components/home/qualities-section'))
const PackagesSection = nextDynamic(() => import('@/components/home/packages-section'))
const GiftCardsSection = nextDynamic(() => import('@/components/home/gift-cards-section'))
const BookingSection = nextDynamic(() => import('@/components/home/booking-section'))
const TestimonialsSection = nextDynamic(() => import('@/components/home/testimonials-section'))
const GalleryPreview = nextDynamic(() => import('@/components/home/gallery-preview'))
const LocationsSection = nextDynamic(() => import('@/components/home/locations-section'))
const FAQSection = nextDynamic(() => import('@/components/home/faq-section'))
const NewsletterSection = nextDynamic(() => import('@/components/home/newsletter-section'))
const CTASection = nextDynamic(() => import('@/components/home/cta-section'))
const Footer = nextDynamic(() => import('@/components/layout/footer'))

// Opt out of static prerender. The home page reads several feature
// flags through `<FeatureGate>` (ai_chat, gift_cards, booking,
// reviews, newsletter) — each of those server components hits
// Upstash Redis via `getJson` / `setJson`, which uses `no-store`
// fetches. During static prerender Next.js sees that and throws
// "Dynamic server usage" once per flag check, spamming ~10 warning
// lines into every build log. The warnings are benign (the error
// is caught, the producer falls back to Postgres, the page still
// renders), but the noise drowns out real errors. Forcing dynamic
// rendering is also genuinely correct here: the page personalises
// for signed-in users via `<RecommendationsSection>` and reflects
// admin flag toggles within ~5 seconds, so there's nothing to
// statically cache anyway. Matches the pattern already used by
// `/gift-cards` and `/booking`.
export const dynamic = 'force-dynamic'

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
