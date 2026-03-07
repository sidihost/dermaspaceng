import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import Hero from '@/components/home/hero'
import LocationBanner from '@/components/shared/location-banner'
import AboutPreview from '@/components/home/about-preview'
import ServicesSection from '@/components/home/services-section'
import StatsSection from '@/components/home/stats-section'
import QualitiesSection from '@/components/home/qualities-section'
import PackagesSection from '@/components/home/packages-section'
import GiftCardsSection from '@/components/home/gift-cards-section'
import BookingSection from '@/components/home/booking-section'
import TestimonialsSection from '@/components/home/testimonials-section'
import NewsletterSection from '@/components/home/newsletter-section'
import CTASection from '@/components/home/cta-section'

export default function Home() {
  return (
    <main>
      <Header />
      <Hero />
      <LocationBanner />
      <AboutPreview />
      <ServicesSection />
      <StatsSection />
      <QualitiesSection />
      <PackagesSection />
      <GiftCardsSection />
      <BookingSection />
      <TestimonialsSection />
      <NewsletterSection />
      <CTASection />
      <Footer />
    </main>
  )
}
