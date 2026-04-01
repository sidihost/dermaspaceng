import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { ArrowRight, ArrowLeft, Check, Zap, Flame, Star, Shield, Award, Sparkles, Clock } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Waxing Services | Dermaspace',
  description: 'Professional waxing services at Dermaspace Lagos. Strip wax and hot wax techniques for smooth, hair-free skin.',
}

const waxingServices = [
  { name: 'Full Body Wax', duration: '120 mins', price: '50,000' },
  { name: 'Brazilian Wax', duration: '30 mins', price: '15,000', popular: true },
  { name: 'Bikini Wax', duration: '20 mins', price: '10,000' },
  { name: 'Full Leg Wax', duration: '45 mins', price: '20,000', popular: true },
  { name: 'Half Leg Wax', duration: '30 mins', price: '12,000' },
  { name: 'Full Arm Wax', duration: '30 mins', price: '12,000' },
  { name: 'Underarm Wax', duration: '15 mins', price: '5,000' },
  { name: 'Upper Lip Wax', duration: '10 mins', price: '3,000' },
  { name: 'Full Face Wax', duration: '30 mins', price: '10,000' },
  { name: 'Back Wax', duration: '45 mins', price: '18,000' },
  { name: 'Chest Wax', duration: '30 mins', price: '15,000' },
]

export default function WaxingPage() {
  return (
    <main className="bg-gradient-to-b from-gray-50 to-white min-h-screen">
      <Header />
      
      {/* Hero Section */}
      <section className="relative min-h-[70vh] md:min-h-[80vh] overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-young-girl-beauty-salon-1024x681.jpg-oxGrqVSRoD400FZKPP5mLOdN42EJvX.webp"
            alt="Waxing Services"
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
              <Sparkles className="w-4 h-4 text-[#E8B4BC]" />
              <span className="text-sm font-medium text-white/90 tracking-wide">{waxingServices.length} Waxing Services</span>
            </div>
            
            <p className="text-[#E8B4BC] font-medium tracking-widest uppercase text-sm mb-4">Silky Smooth Perfection</p>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold text-white mb-6 leading-tight text-balance">Waxing Services</h1>
            
            <p className="text-lg md:text-xl text-white/80 leading-relaxed mb-10 text-pretty">
              Achieve smooth, hair-free skin with our professional waxing services. We use premium wax formulas for comfortable, long-lasting results.
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

      {/* Waxing Techniques */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#7B2D8E]/10 mb-4">
              <Star className="w-4 h-4 text-[#7B2D8E] fill-current" />
              <span className="text-sm font-semibold text-[#7B2D8E]">Professional Techniques</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-4">Choose Your Waxing Method</h2>
            <p className="text-gray-600 max-w-xl mx-auto">We offer two professional waxing techniques tailored to your needs</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            {/* Strip Wax */}
            <div className="group relative bg-white rounded-3xl overflow-hidden shadow-lg shadow-gray-200/50 hover:shadow-xl hover:shadow-[#7B2D8E]/10 transition-all duration-500">
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-[#7B2D8E]/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:scale-150 transition-transform duration-700" />
              
              <div className="relative p-8 md:p-10">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7B2D8E] to-[#9B4DB0] flex items-center justify-center mb-6">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                
                <h3 className="text-2xl md:text-3xl font-serif font-bold text-gray-900 mb-4 group-hover:text-[#7B2D8E] transition-colors">Strip Wax</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">Strip waxing uses a thin layer of warm wax applied to the skin, covered with a cloth or paper strip, then quickly removed against the direction of hair growth.</p>
                
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0"><Check className="w-3.5 h-3.5 text-[#7B2D8E]" /></div>
                    <span className="text-gray-700">Best for large areas like legs and arms</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0"><Check className="w-3.5 h-3.5 text-[#7B2D8E]" /></div>
                    <span className="text-gray-700">Quick and efficient application</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0"><Check className="w-3.5 h-3.5 text-[#7B2D8E]" /></div>
                    <span className="text-gray-700">Suitable for fine to medium hair</span>
                  </li>
                </ul>
                
                <Link href="/booking" className="inline-flex items-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white font-semibold rounded-full hover:bg-[#5A1D6A] transition-all duration-300 group/btn">
                  Book Strip Wax
                  <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Hot Wax */}
            <div className="group relative bg-white rounded-3xl overflow-hidden shadow-lg shadow-gray-200/50 hover:shadow-xl hover:shadow-[#7B2D8E]/10 transition-all duration-500">
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-[#7B2D8E]/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:scale-150 transition-transform duration-700" />
              
              <div className="absolute top-6 right-6">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#7B2D8E] to-[#9B4DB0] rounded-full shadow-lg">
                  <Star className="w-3.5 h-3.5 text-white fill-current" />
                  <span className="text-xs font-semibold text-white">Recommended</span>
                </div>
              </div>
              
              <div className="relative p-8 md:p-10">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7B2D8E] to-[#9B4DB0] flex items-center justify-center mb-6">
                  <Flame className="w-8 h-8 text-white" />
                </div>
                
                <h3 className="text-2xl md:text-3xl font-serif font-bold text-gray-900 mb-4 group-hover:text-[#7B2D8E] transition-colors">Hot Wax</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">Hot wax is applied warm and allowed to cool and harden on the skin before being removed. It grips the hair more effectively and is gentler on the skin.</p>
                
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0"><Check className="w-3.5 h-3.5 text-[#7B2D8E]" /></div>
                    <span className="text-gray-700">Best for sensitive areas like bikini</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0"><Check className="w-3.5 h-3.5 text-[#7B2D8E]" /></div>
                    <span className="text-gray-700">Gentler on delicate skin</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0"><Check className="w-3.5 h-3.5 text-[#7B2D8E]" /></div>
                    <span className="text-gray-700">Effective on coarse hair</span>
                  </li>
                </ul>
                
                <Link href="/booking" className="inline-flex items-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white font-semibold rounded-full hover:bg-[#5A1D6A] transition-all duration-300 group/btn">
                  Book Hot Wax
                  <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* All Waxing Services */}
      <section className="py-16 md:py-24 bg-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-[#7B2D8E]/5 to-transparent rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-[#E8B4BC]/20 to-transparent rounded-full translate-x-1/2 translate-y-1/2 blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-3">Treatment Areas</h2>
              <p className="text-gray-600">Professional waxing for all body areas</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="w-2 h-2 bg-[#7B2D8E] rounded-full"></span>
              {waxingServices.length} services available
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {waxingServices.map((service) => (
              <div key={service.name} className="group relative bg-white rounded-2xl border border-gray-100 p-5 hover:border-[#7B2D8E]/30 hover:shadow-xl hover:shadow-[#7B2D8E]/5 transition-all duration-500 hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-[#7B2D8E]/0 to-[#7B2D8E]/0 group-hover:from-[#7B2D8E]/5 group-hover:to-transparent rounded-2xl transition-all duration-500" />
                
                <div className="relative">
                  {service.popular && (
                    <div className="absolute -top-2 -right-2">
                      <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-[#7B2D8E] to-[#9B4DB0] rounded-full">
                        <Star className="w-3 h-3 text-white fill-current" />
                        <span className="text-[10px] font-bold text-white uppercase">Popular</span>
                      </div>
                    </div>
                  )}
                  
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-[#7B2D8E] transition-colors">{service.name}</h3>
                  
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#7B2D8E]/10 rounded-full mb-4">
                    <Clock className="w-3.5 h-3.5 text-[#7B2D8E]" />
                    <span className="text-xs font-semibold text-[#7B2D8E]">{service.duration}</span>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div>
                      <span className="text-xs text-gray-400">From</span>
                      <p className="text-lg font-bold text-[#7B2D8E]">N{service.price}</p>
                    </div>
                    <Link href="/booking" className="flex items-center justify-center w-9 h-9 bg-[#7B2D8E]/10 rounded-full group-hover:bg-[#7B2D8E] transition-all duration-300">
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
      <section className="py-12 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7B2D8E] to-[#9B4DB0] flex items-center justify-center flex-shrink-0">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Hygienic Practice</h3>
                <p className="text-sm text-gray-500">Single-use applicators</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7B2D8E] to-[#9B4DB0] flex items-center justify-center flex-shrink-0">
                <Award className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Trained Specialists</h3>
                <p className="text-sm text-gray-500">Expert waxing technicians</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7B2D8E] to-[#9B4DB0] flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Premium Wax</h3>
                <p className="text-sm text-gray-500">Gentle, effective formulas</p>
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
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-white mb-6 text-balance">Ready for silky smooth skin?</h2>
          <p className="text-lg md:text-xl text-white/80 mb-10 max-w-2xl mx-auto">Book your waxing session today and experience professional hair removal</p>
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
