import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { Clock, ArrowRight, ArrowLeft, Flame, Sparkles, Hand, Footprints, Star, Shield, Award, Gem } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Nail Care Services | Dermaspace',
  description: 'Professional nail care services at Dermaspace Lagos. Manicures, pedicures, hot wax treatments, jelly pedicures, and more for beautiful, healthy nails.',
}

const treatments = [
  {
    name: 'Hot Wax Mani-Pedi',
    description: 'This treatment involves the use of heated paraffin wax, mineral oil, and petroleum-based wax to cleanse and exfoliate dead skin cells or calluses leaving the feet smooth and soft.',
    duration: '90 mins',
    price: '25,000',
    icon: Flame,
    popular: true,
  },
  {
    name: 'Jelly Pedicure',
    description: 'This treatment involves detoxifying, softening, and cleansing the feet while providing relaxing aromatherapy. A relaxing experience for tired feet.',
    duration: '60 mins',
    price: '18,000',
    icon: Sparkles,
    popular: true,
  },
  {
    name: 'Classic Manicure',
    description: 'This treatment helps boost confidence, prevent fungal infections, and improve blood circulation. Includes nail shaping, cuticle care, and polish application.',
    duration: '45 mins',
    price: '8,000',
    icon: Hand,
  },
  {
    name: 'Classic Pedicure',
    description: 'Complete foot care treatment including soaking, exfoliation, nail shaping, cuticle care, massage, and polish application for beautiful, healthy feet.',
    duration: '60 mins',
    price: '10,000',
    icon: Footprints,
  },
  {
    name: 'Gel Polish Manicure',
    description: 'Long-lasting gel polish application that stays chip-free for up to 2 weeks. Includes nail prep, gel application, and LED curing.',
    duration: '60 mins',
    price: '15,000',
    icon: Gem,
  },
  {
    name: 'Gel Polish Pedicure',
    description: 'Durable gel polish for your toes that maintains its shine and color for weeks. Perfect for a lasting, beautiful finish.',
    duration: '75 mins',
    price: '18,000',
    icon: Gem,
  },
]

const popularTreatments = treatments.filter(t => t.popular)
const otherTreatments = treatments.filter(t => !t.popular)

export default function NailCarePage() {
  return (
    <main className="bg-gradient-to-b from-gray-50 to-white min-h-screen">
      <Header />
      
      {/* Hero Section */}
      <section className="relative min-h-[70vh] md:min-h-[80vh] overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/young-woman-getting-her-nails-done-salon-scaled.jpg-768x512-1-dTT1qPz9fJm1tSGBMYraVrKPoDeTdC.webp"
            alt="Nail Care"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a0a1f]/95 via-[#7B2D8E]/80 to-[#1a0a1f]/90" />
        </div>
        
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-gradient-to-br from-white/5 to-transparent rounded-full blur-3xl" />
          <div className="absolute -bottom-60 -left-40 w-[600px] h-[600px] bg-gradient-to-tr from-[#7B2D8E]/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-1/4 right-[15%] w-24 h-24 bg-gradient-to-br from-white/10 to-white/5 rounded-full blur-xl animate-pulse hidden md:block" />
          <div className="absolute bottom-1/3 left-[10%] w-16 h-16 bg-gradient-to-br from-[#9B4DB0]/30 to-transparent rounded-full blur-lg animate-pulse hidden md:block" style={{ animationDelay: '1s' }} />
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-32 pb-20 min-h-[70vh] md:min-h-[80vh] flex flex-col justify-center">
          <Link href="/services" className="inline-flex items-center gap-2 text-white/70 text-sm mb-8 hover:text-white transition-colors w-fit group">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 group-hover:bg-white/20 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </span>
            Back to Services
          </Link>
          
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
              <Gem className="w-4 h-4 text-[#E8B4BC]" />
              <span className="text-sm font-medium text-white/90 tracking-wide">{treatments.length} Nail Services</span>
            </div>
            
            <p className="text-[#E8B4BC] font-medium tracking-widest uppercase text-sm mb-4">Beauty at Your Fingertips</p>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold text-white mb-6 leading-tight text-balance">Nail Care</h1>
            
            <p className="text-lg md:text-xl text-white/80 leading-relaxed mb-10 text-pretty">
              Pamper your hands and feet with our premium nail services. We use only the finest products for beautiful, healthy nails that make a statement.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <Link href="/booking" className="group inline-flex items-center gap-3 px-8 py-4 bg-white text-[#7B2D8E] font-semibold rounded-full hover:bg-[#E8B4BC] transition-all duration-300 shadow-lg shadow-black/20">
                Book Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/contact" className="inline-flex items-center gap-2 px-8 py-4 text-white font-medium rounded-full border border-white/30 hover:bg-white/10 transition-all duration-300">Contact Us</Link>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto" preserveAspectRatio="none">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="#F9FAFB"/>
          </svg>
        </div>
      </section>

      {/* Popular Treatments */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#7B2D8E]/10 mb-4">
              <Star className="w-4 h-4 text-[#7B2D8E] fill-current" />
              <span className="text-sm font-semibold text-[#7B2D8E]">Most Popular</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-4">Signature Nail Treatments</h2>
            <p className="text-gray-600 max-w-xl mx-auto">Our most loved nail services for perfectly pampered hands and feet</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            {popularTreatments.map((treatment, index) => {
              const IconComponent = treatment.icon
              return (
                <div key={treatment.name} className="group relative bg-white rounded-3xl overflow-hidden shadow-lg shadow-gray-200/50 hover:shadow-xl hover:shadow-[#7B2D8E]/10 transition-all duration-500">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-[#7B2D8E]/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:scale-150 transition-transform duration-700" />
                  
                  <div className="relative p-8 md:p-10">
                    <div className="absolute top-6 right-6">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#7B2D8E] to-[#9B4DB0] rounded-full shadow-lg">
                        <Star className="w-3.5 h-3.5 text-white fill-current" />
                        <span className="text-xs font-semibold text-white">Popular</span>
                      </div>
                    </div>
                    
                    <div className="absolute -left-4 top-1/2 -translate-y-1/2 text-[120px] font-serif font-bold text-[#7B2D8E]/5 select-none hidden lg:block">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    
                    <div className="relative">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7B2D8E]/10 to-[#7B2D8E]/5 flex items-center justify-center mb-5">
                        <IconComponent className="w-7 h-7 text-[#7B2D8E]" />
                      </div>
                      
                      <h3 className="text-2xl md:text-3xl font-serif font-bold text-gray-900 mb-3 group-hover:text-[#7B2D8E] transition-colors">{treatment.name}</h3>
                      <p className="text-gray-600 mb-6 leading-relaxed">{treatment.description}</p>
                      
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
                      
                      <Link href="/booking" className="inline-flex items-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white font-semibold rounded-full hover:bg-[#5A1D6A] transition-all duration-300 group/btn">
                        Book This Treatment
                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* All Treatments */}
      <section className="py-16 md:py-24 bg-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-[#7B2D8E]/5 to-transparent rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-[#E8B4BC]/20 to-transparent rounded-full translate-x-1/2 translate-y-1/2 blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-3">All Nail Services</h2>
              <p className="text-gray-600">Complete menu of nail care treatments</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="w-2 h-2 bg-[#7B2D8E] rounded-full"></span>
              {treatments.length} services available
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {otherTreatments.map((treatment) => {
              const IconComponent = treatment.icon
              return (
                <div key={treatment.name} className="group relative bg-white rounded-2xl border border-gray-100 p-6 hover:border-[#7B2D8E]/30 hover:shadow-xl hover:shadow-[#7B2D8E]/5 transition-all duration-500 hover:-translate-y-1">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#7B2D8E]/0 to-[#7B2D8E]/0 group-hover:from-[#7B2D8E]/5 group-hover:to-transparent rounded-2xl transition-all duration-500" />
                  
                  <div className="relative">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7B2D8E]/10 to-[#7B2D8E]/5 flex items-center justify-center">
                        <IconComponent className="w-6 h-6 text-[#7B2D8E]" />
                      </div>
                    </div>
                    
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#7B2D8E]/10 rounded-full mb-3">
                      <Clock className="w-3.5 h-3.5 text-[#7B2D8E]" />
                      <span className="text-xs font-semibold text-[#7B2D8E]">{treatment.duration}</span>
                    </div>
                    
                    <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-[#7B2D8E] transition-colors">{treatment.name}</h3>
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">{treatment.description}</p>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div>
                        <span className="text-xs text-gray-400">From</span>
                        <p className="text-xl font-bold text-[#7B2D8E]">N{treatment.price}</p>
                      </div>
                      <Link href="/booking" className="flex items-center justify-center w-10 h-10 bg-[#7B2D8E]/10 rounded-full group-hover:bg-[#7B2D8E] transition-all duration-300">
                        <ArrowRight className="w-4 h-4 text-[#7B2D8E] group-hover:text-white transition-colors" />
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-12 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7B2D8E] to-[#9B4DB0] flex items-center justify-center flex-shrink-0">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Sterilized Tools</h3>
                <p className="text-sm text-gray-500">Hospital-grade sanitation</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7B2D8E] to-[#9B4DB0] flex items-center justify-center flex-shrink-0">
                <Award className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Expert Technicians</h3>
                <p className="text-sm text-gray-500">Skilled and certified</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7B2D8E] to-[#9B4DB0] flex items-center justify-center flex-shrink-0">
                <Gem className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Premium Polish</h3>
                <p className="text-sm text-gray-500">Long-lasting, chip-free</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#7B2D8E] via-[#7B2D8E] to-[#5A1D6A]" />
        
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#E8B4BC]/10 rounded-full blur-3xl" />
          <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0,50 Q25,30 50,50 T100,50" fill="none" stroke="white" strokeWidth="0.2"/>
            <path d="M0,60 Q25,40 50,60 T100,60" fill="none" stroke="white" strokeWidth="0.2"/>
          </svg>
        </div>
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-white mb-6 text-balance">Ready for beautifully polished nails?</h2>
          <p className="text-lg md:text-xl text-white/80 mb-10 max-w-2xl mx-auto">Book your nail care appointment today and treat yourself to perfect nails</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/booking" className="group inline-flex items-center gap-3 px-8 py-4 bg-white text-[#7B2D8E] font-semibold rounded-full hover:bg-[#E8B4BC] transition-all duration-300 shadow-lg">
              Book Appointment
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="tel:+2347000000000" className="inline-flex items-center gap-2 px-8 py-4 text-white font-medium rounded-full border border-white/30 hover:bg-white/10 transition-all duration-300">Call Us</Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
