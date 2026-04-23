import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { ArrowRight, Clock, Flower2, ArrowLeft, Star, Shield, Heart } from 'lucide-react'
import FavoriteButton from '@/components/favorite-button'

const servicesData: Record<string, {
  title: string
  description: string
  image: string
  tagline: string
  treatments: { name: string; duration: string; price: string; description: string; popular?: boolean }[]
}> = {
  'body-treatments': {
    title: 'Body Treatments',
    tagline: 'Revitalize Your Body & Soul',
    description: 'Indulge in luxurious body treatments designed to melt away tension and leave you feeling completely renewed. Our skilled therapists use premium products and techniques.',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-african-woman-resting-relaxing-with-sea-salt-back-spa-salon-5-768x512-1.jpg-qzDnc9aVQiTjypUgkMMu2l5wqwyRZG.webp',
    treatments: [
      { name: 'Swedish Massage', duration: '60 mins', price: '25,000', description: 'Classic relaxation massage with long, flowing strokes', popular: true },
      { name: 'Deep Tissue Massage', duration: '60 mins', price: '30,000', description: 'Targets deep muscle tension and chronic pain' },
      { name: 'Hot Stone Massage', duration: '75 mins', price: '40,000', description: 'Heated stones for deeper muscle relaxation', popular: true },
      { name: 'Thai Massage', duration: '90 mins', price: '35,000', description: 'Traditional stretching and pressure point therapy' },
      { name: 'Sports Massage', duration: '60 mins', price: '30,000', description: 'Designed for active individuals and athletes' },
      { name: 'Pregnancy Massage', duration: '60 mins', price: '30,000', description: 'Safe, soothing massage for expectant mothers' },
      { name: 'Detox Body Scrub', duration: '45 mins', price: '25,000', description: 'Exfoliating scrub to reveal smooth skin' },
      { name: 'Body Wrap', duration: '60 mins', price: '35,000', description: 'Detoxifying wrap for skin nourishment' },
    ],
  },
  'facial-treatments': {
    title: 'Facial Treatments',
    tagline: 'Radiance Starts Here',
    description: 'Transform your skin with our expert facial treatments. From deep cleansing to advanced therapies, we offer solutions for every skin type and concern.',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6462-2048x1463.jpg-768x549-2-aOLyIQYjwEGezoOTEw78F0jLOjfkia.webp',
    treatments: [
      { name: 'Deep Cleansing Facial', duration: '60 mins', price: '25,000', description: 'Thorough cleansing and extraction for clear skin' },
      { name: 'Hydra Facial', duration: '75 mins', price: '50,000', description: 'Multi-step treatment for deep hydration', popular: true },
      { name: 'Signature Facial', duration: '90 mins', price: '45,000', description: 'Our signature rejuvenating treatment', popular: true },
      { name: 'Acne Facial', duration: '60 mins', price: '30,000', description: 'Targeted treatment for acne-prone skin' },
      { name: 'Microneedling', duration: '60 mins', price: '80,000', description: 'Collagen-boosting skin rejuvenation' },
      { name: 'Chemical Peel', duration: '45 mins', price: '50,000', description: 'Exfoliating treatment for skin renewal' },
      { name: 'LED Light Therapy', duration: '30 mins', price: '20,000', description: 'Light-based skin treatment' },
      { name: 'Vitamin C Facial', duration: '60 mins', price: '35,000', description: 'Brightening and antioxidant treatment' },
    ],
  },
  'nail-care': {
    title: 'Nail Care',
    tagline: 'Beauty at Your Fingertips',
    description: 'Pamper your hands and feet with our premium nail services. We use only the finest products for beautiful, healthy nails.',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/young-woman-getting-her-nails-done-salon-scaled.jpg-768x512-1-dTT1qPz9fJm1tSGBMYraVrKPoDeTdC.webp',
    treatments: [
      { name: 'Classic Manicure', duration: '30 mins', price: '8,000', description: 'Basic nail care and polish' },
      { name: 'Classic Pedicure', duration: '45 mins', price: '10,000', description: 'Foot care with polish' },
      { name: 'Hot Wax Manicure', duration: '45 mins', price: '12,000', description: 'Deep moisturizing wax treatment', popular: true },
      { name: 'Hot Wax Pedicure', duration: '60 mins', price: '15,000', description: 'Luxurious wax foot treatment', popular: true },
      { name: 'Jelly Pedicure', duration: '60 mins', price: '18,000', description: 'Fun and relaxing jelly soak' },
      { name: 'Gel Polish', duration: '45 mins', price: '15,000', description: 'Long-lasting gel finish' },
      { name: 'Nail Art', duration: '30 mins', price: '5,000', description: 'Custom nail designs' },
      { name: 'Mani-Pedi Combo', duration: '75 mins', price: '20,000', description: 'Complete hand and foot care' },
    ],
  },
  'waxing': {
    title: 'Waxing',
    tagline: 'Silky Smooth Perfection',
    description: 'Achieve smooth, hair-free skin with our professional waxing services. We use premium wax for comfortable, long-lasting results.',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-young-girl-beauty-salon-1024x681.jpg-oxGrqVSRoD400FZKPP5mLOdN42EJvX.webp',
    treatments: [
      { name: 'Full Leg Wax', duration: '45 mins', price: '20,000', description: 'Complete leg hair removal', popular: true },
      { name: 'Half Leg Wax', duration: '30 mins', price: '12,000', description: 'Lower leg waxing' },
      { name: 'Full Arm Wax', duration: '30 mins', price: '12,000', description: 'Complete arm hair removal' },
      { name: 'Underarm Wax', duration: '15 mins', price: '5,000', description: 'Quick underarm waxing' },
      { name: 'Brazilian Wax', duration: '30 mins', price: '15,000', description: 'Complete bikini waxing', popular: true },
      { name: 'Bikini Wax', duration: '20 mins', price: '10,000', description: 'Bikini line waxing' },
      { name: 'Full Body Wax', duration: '120 mins', price: '50,000', description: 'Complete body hair removal' },
      { name: 'Facial Wax', duration: '15 mins', price: '5,000', description: 'Upper lip, chin, or eyebrow' },
    ],
  },
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const service = servicesData[slug]
  if (!service) return { title: 'Service Not Found' }
  
  return {
    title: `${service.title} | Dermaspace`,
    description: service.description,
  }
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const service = servicesData[slug]
  
  if (!service) {
    notFound()
  }

  const popularTreatments = service.treatments.filter(t => t.popular)
  const otherTreatments = service.treatments.filter(t => !t.popular)

  return (
    <main className="bg-gradient-to-b from-gray-50 to-white min-h-screen">
      <Header />
      
      {/* Hero Section - Elegant with curves */}
      <section className="relative min-h-[70vh] md:min-h-[80vh] overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <Image
            src={service.image}
            alt={service.title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a0a1f]/95 via-[#7B2D8E]/80 to-[#1a0a1f]/90" />
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Large curved shape */}
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-gradient-to-br from-white/5 to-transparent rounded-full blur-3xl" />
          <div className="absolute -bottom-60 -left-40 w-[600px] h-[600px] bg-gradient-to-tr from-[#7B2D8E]/20 to-transparent rounded-full blur-3xl" />
          
          {/* Floating orbs */}
          <div className="absolute top-1/4 right-[15%] w-24 h-24 bg-gradient-to-br from-white/10 to-white/5 rounded-full blur-xl animate-float hidden md:block" />
          <div className="absolute bottom-1/3 left-[10%] w-16 h-16 bg-gradient-to-br from-[#9B4DB0]/30 to-transparent rounded-full blur-lg animate-float delay-300 hidden md:block" />
          
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 opacity-5" style={{ 
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }} />
        </div>
        
        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-32 pb-20 min-h-[70vh] md:min-h-[80vh] flex flex-col justify-center">
          {/* Back button */}
          <Link 
            href="/services"
            className="inline-flex items-center gap-2 text-white/70 text-sm mb-8 hover:text-white transition-colors w-fit group"
          >
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 group-hover:bg-white/20 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </span>
            Back to Services
          </Link>
          
          <div className="max-w-2xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
              <Flower2 className="w-4 h-4 text-[#E8B4BC]" />
              <span className="text-sm font-medium text-white/90 tracking-wide">{service.treatments.length} Premium Treatments</span>
            </div>
            
            {/* Tagline */}
            <p className="text-[#E8B4BC] font-medium tracking-widest uppercase text-sm mb-4 animate-fade-in">
              {service.tagline}
            </p>
            
            {/* Title */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold text-white mb-6 leading-tight animate-fade-in-up">
              {service.title}
            </h1>
            
            {/* Description */}
            <p className="text-lg md:text-xl text-white/80 leading-relaxed mb-10 animate-fade-in-up delay-100">
              {service.description}
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 animate-fade-in-up delay-200">
              <Link
                href="/booking"
                className="group inline-flex items-center gap-3 px-8 py-4 bg-white text-[#7B2D8E] font-semibold rounded-full hover:bg-[#E8B4BC] transition-all duration-300 shadow-lg shadow-black/20"
              >
                Book Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-8 py-4 text-white font-medium rounded-full border border-white/30 hover:bg-white/10 transition-all duration-300"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
        
        {/* Bottom curved edge */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="#F9FAFB"/>
          </svg>
        </div>
      </section>

      {/* Popular Treatments Section */}
      {popularTreatments.length > 0 && (
        <section className="py-16 md:py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            {/* Section Header */}
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#7B2D8E]/10 mb-4">
                <Star className="w-4 h-4 text-[#7B2D8E] fill-current" />
                <span className="text-sm font-semibold text-[#7B2D8E]">Most Popular</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-4">
                Client Favorites
              </h2>
              <p className="text-gray-600 max-w-xl mx-auto">
                Our most sought-after treatments, loved by clients for their exceptional results
              </p>
            </div>

            {/* Popular Cards - Large format */}
            <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
              {popularTreatments.map((treatment, index) => (
                <div 
                  key={treatment.name}
                  className="group relative bg-white rounded-3xl overflow-hidden shadow-lg shadow-gray-200/50 hover:shadow-xl hover:shadow-[#7B2D8E]/10 transition-all duration-500"
                >
                  {/* Glass morphism accent */}
                  <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-[#7B2D8E]/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:scale-150 transition-transform duration-700" />
                  
                  <div className="relative p-8 md:p-10">
                    {/* Popular badge + save-for-later heart. The heart
                        sits alongside the badge so users can shortlist a
                        treatment without needing to scroll to booking. */}
                    <div className="absolute top-6 right-6 flex items-center gap-2">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#7B2D8E] to-[#9B4DB0] rounded-full shadow-lg">
                        <Star className="w-3.5 h-3.5 text-white fill-current" />
                        <span className="text-xs font-semibold text-white">Popular</span>
                      </div>
                      <FavoriteButton
                        itemType="treatment"
                        itemId={`${slug}:${treatment.name}`.toLowerCase().replace(/\s+/g, '-')}
                        label={treatment.name}
                        href={`/services/${slug}`}
                        variant="solid"
                        size="sm"
                      />
                    </div>
                    
                    {/* Number accent */}
                    <div className="absolute -left-4 top-1/2 -translate-y-1/2 text-[120px] font-serif font-bold text-[#7B2D8E]/5 select-none hidden lg:block">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    
                    <div className="relative">
                      {/* Treatment name */}
                      <h3 className="text-2xl md:text-3xl font-serif font-bold text-gray-900 mb-3 group-hover:text-[#7B2D8E] transition-colors">
                        {treatment.name}
                      </h3>
                      
                      {/* Description */}
                      <p className="text-gray-600 mb-6 leading-relaxed">
                        {treatment.description}
                      </p>
                      
                      {/* Details row */}
                      <div className="flex flex-wrap items-center gap-4 mb-8">
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full">
                          <Clock className="w-4 h-4 text-[#7B2D8E]" />
                          <span className="text-sm font-medium text-gray-700">{treatment.duration}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-gray-500">Starting from</span>
                          <span className="text-2xl font-bold text-[#7B2D8E]">N{treatment.price}</span>
                        </div>
                      </div>
                      
                      {/* Book button */}
                      <Link
                        href="/booking"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white font-semibold rounded-full hover:bg-[#5A1D6A] transition-all duration-300 group/btn"
                      >
                        Book This Treatment
                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All Treatments Section */}
      <section className="py-16 md:py-24 bg-white relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-[#7B2D8E]/5 to-transparent rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-[#E8B4BC]/20 to-transparent rounded-full translate-x-1/2 translate-y-1/2 blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-3">
                All Treatments
              </h2>
              <p className="text-gray-600">
                Explore our complete menu of {service.title.toLowerCase()} services
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="w-2 h-2 bg-[#7B2D8E] rounded-full"></span>
              {service.treatments.length} services available
            </div>
          </div>

          {/* Treatment Cards Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {(popularTreatments.length > 0 ? otherTreatments : service.treatments).map((treatment, index) => (
              <div 
                key={treatment.name}
                className="group relative bg-white rounded-2xl border border-gray-100 p-6 hover:border-[#7B2D8E]/30 hover:shadow-xl hover:shadow-[#7B2D8E]/5 transition-all duration-500 hover:-translate-y-1"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Hover accent */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#7B2D8E]/0 to-[#7B2D8E]/0 group-hover:from-[#7B2D8E]/5 group-hover:to-transparent rounded-2xl transition-all duration-500" />
                
                <div className="relative">
                  {/* Save-for-later heart pinned to the top-right of the
                      card. Uses the slug+name as a stable itemId. */}
                  <div className="absolute top-0 right-0">
                    <FavoriteButton
                      itemType="treatment"
                      itemId={`${slug}:${treatment.name}`.toLowerCase().replace(/\s+/g, '-')}
                      label={treatment.name}
                      href={`/services/${slug}`}
                      variant="solid"
                      size="sm"
                    />
                  </div>

                  {/* Duration badge */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#7B2D8E]/10 rounded-full mb-4">
                    <Clock className="w-3.5 h-3.5 text-[#7B2D8E]" />
                    <span className="text-xs font-semibold text-[#7B2D8E]">{treatment.duration}</span>
                  </div>
                  
                  {/* Name */}
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-[#7B2D8E] transition-colors">
                    {treatment.name}
                  </h3>
                  
                  {/* Description */}
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                    {treatment.description}
                  </p>
                  
                  {/* Price and action */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div>
                      <span className="text-xs text-gray-400">From</span>
                      <p className="text-xl font-bold text-[#7B2D8E]">N{treatment.price}</p>
                    </div>
                    <Link
                      href="/booking"
                      className="flex items-center justify-center w-10 h-10 bg-[#7B2D8E]/10 rounded-full group-hover:bg-[#7B2D8E] transition-all duration-300"
                    >
                      <ArrowRight className="w-4 h-4 text-[#7B2D8E] group-hover:text-white transition-colors" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Shield, title: 'Safe & Hygienic', desc: 'Highest standards of cleanliness and safety protocols' },
              { icon: Star, title: 'Expert Therapists', desc: 'Certified professionals with years of experience' },
              { icon: Heart, title: 'Premium Products', desc: 'Only the finest skincare and wellness products' },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-4 p-6 bg-white rounded-2xl border border-gray-100">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-[#7B2D8E] to-[#9B4DB0] rounded-xl shadow-lg shadow-[#7B2D8E]/20">
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Helpful Contact Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-r from-[#7B2D8E]/5 via-[#7B2D8E]/10 to-[#7B2D8E]/5 rounded-2xl p-8 md:p-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#7B2D8E]/10 mb-3">
                  <Flower2 className="w-3.5 h-3.5 text-[#7B2D8E]" />
                  <span className="text-xs font-medium text-[#7B2D8E]">Ready to Book?</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Questions about {service.title.toLowerCase()}?
                </h3>
                <p className="text-sm text-gray-600 max-w-md">
                  Our team is here to help you choose the perfect treatment and schedule your appointment
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <a
                  href="https://wa.me/2349167890123"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-500 text-white font-medium rounded-xl hover:bg-green-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </a>
                <a
                  href="tel:+2349167890123"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white font-medium rounded-xl hover:bg-[#6A2579] transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Call Us
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
