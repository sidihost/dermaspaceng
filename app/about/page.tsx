import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { ArrowRight, Award, Heart, Leaf, Users, MapPin, Clock, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'About Us | Dermaspace',
  description: 'Learn about Dermaspace Esthetic & Wellness Centre. Founded in April 2019, we are recognized as one of the best day and esthetic spas in Lagos, Nigeria.',
}

const values = [
  {
    icon: Heart,
    title: 'Client-Centered Care',
    description: 'We believe good skincare is good self-care. Every treatment is tailored to your unique needs.',
  },
  {
    icon: Award,
    title: 'Professional Excellence',
    description: 'International certifications from renowned brands and institutes worldwide.',
  },
  {
    icon: Leaf,
    title: 'Premium Quality',
    description: 'We use only the finest products and techniques for exceptional results.',
  },
  {
    icon: Users,
    title: 'Welcoming Environment',
    description: 'Serene space where you can unwind and embrace complete relaxation.',
  },
]

const founders = [
  {
    name: 'Itunuoluwa Umar-Lawal',
    role: 'CEO',
    company: 'Dermaspace Esthetic and Wellness Centre Ltd',
    image: '/images/itunu.webp',
    bio: 'Itunu is a passionate and dedicated skincare enthusiast whose focus is on product formulation. She has received certifications in spa products formulation from England and has founded a successful natural skincare product range in the past. She believes our skin is as unique as our personalities and that good skincare is good self-care. She is also a trained lawyer with a natural flair for entrepreneurship.',
  },
  {
    name: 'Franca Ebuzome',
    role: 'Co-Founder & COO',
    company: 'Dermaspace Esthetic and Wellness Centre Ltd',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/franca-1-ZLFTvxIeaKIywWjr4amphoEGwfmuOe.webp',
    bio: 'Franca is a licensed Medical Esthetician (CIDESCO) and Laser Technician with over a decade of hands-on experience in skincare therapy and wellness. She is committed to helping individuals regain their skin confidence through noninvasive or mild-invasive methods. Her expertise is certified by renowned international brands and institutes. She is also a licensed Real Estate Broker (ANIVS) and Facility Manager.',
  },
]

const stats = [
  { value: '2019', label: 'Founded' },
  { value: '10K+', label: 'Happy Clients' },
  { value: '2', label: 'Locations' },
  { value: '50+', label: 'Treatments' },
]

export default function AboutPage() {
  return (
    <main>
      <Header />
      
      {/* Hero Section with Curved Bottom */}
      <section className="relative py-16 md:py-24 bg-[#7B2D8E] overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="about-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="10" cy="10" r="1.5" fill="white" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#about-pattern)" />
          </svg>
        </div>
        
        <div className="relative max-w-5xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-4">
            <span className="text-xs font-medium text-white uppercase tracking-widest">About Us</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Your Journey to <span className="text-white/90">Skin Confidence</span>
          </h1>
          <p className="text-sm md:text-lg text-white/80 max-w-xl mx-auto">
            Boutique spa promoting skin confidence and body wellness since 2019
          </p>
        </div>
        
        {/* Curved Bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" preserveAspectRatio="none" className="w-full h-12 md:h-20">
            <path d="M0,80 C360,0 1080,0 1440,80 L1440,80 L0,80 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-8 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-4 gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl md:text-3xl font-bold text-[#7B2D8E]">{stat.value}</p>
                <p className="text-xs md:text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Content with Curved Accent */}
      <section className="py-12 md:py-16 bg-white relative">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div className="relative">
              {/* Curved accent behind images */}
              <div className="absolute -top-4 -left-4 w-32 h-32 bg-[#7B2D8E]/10 rounded-[40px] -z-10" />
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-[#7B2D8E]/5 rounded-[30px] -z-10" />
              
              <div className="grid grid-cols-2 gap-3">
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-lg">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6401-1024x731.jpg-2JIwk298ibQ6byxSACK1nUh6Fnqjcw.webp"
                    alt="Dermaspace Spa Interior"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-lg mt-8">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6468-2-2048x1463.jpg-1024x732-1-dKeUu4w0K7uutGPH5gmeN7nXrcuOu2.webp"
                    alt="Facial Treatment"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7B2D8E]/10 mb-4">
                <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Our Story</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
                Where Wellness Meets <span className="text-[#7B2D8E]">Excellence</span>
              </h2>
              <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
                <p>
                  Dermaspace Esthetic & Wellness Centre is a boutique spa that aims to promote skin confidence and improve body wellness. We are committed to bringing our clients the most effective skincare treatments.
                </p>
                <p>
                  Founded in April 2019, we have grown expeditiously and are recognized as one of the best day and esthetic spas in Lagos, Nigeria.
                </p>
                <p>
                  Our core areas are Body treatments, Facial treatments, Waxing, Nail care, and advanced esthetic treatments such as Acne treatment, Chemical Peel, and Microneedling.
                </p>
                <p>
                  Located in the heart of Lagos Island (Ikoyi and Victoria Island), we are committed to bringing our clients the utmost premium spa-pampering experience.
                </p>
              </div>
              
              {/* Location Quick Info */}
              <div className="mt-6 p-4 bg-[#FDFBF9] rounded-2xl border border-[#7B2D8E]/10">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-[#7B2D8E] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-900">2 Premium Locations</p>
                      <p className="text-xs text-gray-500">Victoria Island & Ikoyi</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-[#7B2D8E] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-900">Mon - Sat</p>
                      <p className="text-xs text-gray-500">9am - 7pm</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone className="w-4 h-4 text-[#7B2D8E] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-900">Call Us</p>
                      <p className="text-xs text-gray-500">+234 901 797 2919</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Values with Curved Background */}
      <section className="py-12 md:py-16 relative overflow-hidden">
        {/* Curved Top */}
        <div className="absolute top-0 left-0 right-0 -mt-px">
          <svg viewBox="0 0 1440 60" fill="none" preserveAspectRatio="none" className="w-full h-8 md:h-14">
            <path d="M0,0 C360,60 1080,60 1440,0 L1440,60 L0,60 Z" fill="#FDFBF9" />
          </svg>
        </div>
        
        <div className="bg-[#FDFBF9] pt-8 pb-12 md:pb-16">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7B2D8E]/10 mb-3">
                <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Our Values</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                Why Clients <span className="text-[#7B2D8E]">Choose Us</span>
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {values.map((value, index) => (
                <div 
                  key={value.title}
                  className="relative bg-white rounded-2xl p-5 border border-gray-100 text-center group hover:border-[#7B2D8E]/20 hover:shadow-lg transition-all duration-300"
                >
                  {/* Curved accent */}
                  <div className={`absolute ${index % 2 === 0 ? 'top-0 right-0 rounded-bl-[40px]' : 'bottom-0 left-0 rounded-tr-[40px]'} w-16 h-16 bg-[#7B2D8E]/5 -z-10 group-hover:bg-[#7B2D8E]/10 transition-colors`} />
                  
                  <div className="w-12 h-12 rounded-2xl bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-[#7B2D8E] transition-colors">
                    <value.icon className="w-6 h-6 text-[#7B2D8E] group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 mb-1">{value.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Curved Bottom */}
        <div className="absolute bottom-0 left-0 right-0 -mb-px">
          <svg viewBox="0 0 1440 60" fill="none" preserveAspectRatio="none" className="w-full h-8 md:h-14">
            <path d="M0,60 C360,0 1080,0 1440,60 L1440,0 L0,0 Z" fill="#FDFBF9" />
          </svg>
        </div>
      </section>

      {/* Founders Section with Curved Cards */}
      <section id="team" className="py-12 md:py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7B2D8E]/10 mb-3">
              <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Leadership</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">
              Meet Our <span className="text-[#7B2D8E]">Founders</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {founders.map((founder, index) => (
              <div 
                key={founder.name}
                className="group relative bg-white rounded-3xl overflow-hidden border border-gray-100 hover:border-[#7B2D8E]/20 hover:shadow-xl transition-all duration-300"
              >
                {/* Curved accent in corner */}
                <div className={`absolute ${index === 0 ? 'top-0 right-0' : 'top-0 left-0'} w-24 h-24 bg-gradient-to-br from-[#7B2D8E]/10 to-transparent ${index === 0 ? 'rounded-bl-[60px]' : 'rounded-br-[60px]'}`} />
                
                {/* Top accent line with curve */}
                <div className="h-1.5 bg-gradient-to-r from-[#7B2D8E] via-[#9B4DB0] to-[#7B2D8E]" />
                
                <div className="p-6 relative">
                  {/* Profile Section */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-4">
                    <div className="relative">
                      {/* Curved frame around image */}
                      <div className="absolute -inset-2 bg-gradient-to-br from-[#7B2D8E]/20 to-[#7B2D8E]/5 rounded-[28px] -z-10" />
                      <div className="w-20 h-20 rounded-2xl overflow-hidden ring-4 ring-white shadow-lg">
                        <Image
                          src={founder.image}
                          alt={founder.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      {/* Badge */}
                      <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#7B2D8E] rounded-lg flex items-center justify-center shadow-lg">
                        <span className="text-white text-xs font-bold">{index + 1}</span>
                      </div>
                    </div>
                    
                    <div className="text-center sm:text-left">
                      <h3 className="text-base font-bold text-gray-900 mb-0.5">{founder.name}</h3>
                      <p className="text-sm text-[#7B2D8E] font-semibold mb-0.5">{founder.role}</p>
                      <p className="text-xs text-gray-500">{founder.company}</p>
                    </div>
                  </div>
                  
                  {/* Bio with curved left border */}
                  <div className="relative">
                    <div className="absolute left-0 top-2 bottom-2 w-1 bg-gradient-to-b from-[#7B2D8E] via-[#7B2D8E]/50 to-transparent rounded-full" />
                    <p className="text-sm text-gray-600 leading-relaxed pl-4">{founder.bio}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA with Curved Top */}
      <section className="relative py-12 md:py-16 bg-[#7B2D8E] overflow-hidden">
        {/* Curved Top */}
        <div className="absolute top-0 left-0 right-0 -mt-px">
          <svg viewBox="0 0 1440 60" fill="none" preserveAspectRatio="none" className="w-full h-8 md:h-14">
            <path d="M0,0 C480,60 960,60 1440,0 L1440,60 L0,60 Z" fill="#7B2D8E" />
          </svg>
        </div>
        
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="cta-pattern" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                <circle cx="5" cy="5" r="1" fill="white" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#cta-pattern)" />
          </svg>
        </div>
        
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-xl md:text-3xl font-bold text-white mb-3">
            Ready to Experience Dermaspace?
          </h2>
          <p className="text-sm text-white/70 mb-6 max-w-md mx-auto">
            Book your appointment today and let us pamper you with our premium spa treatments
          </p>
          <Button
            asChild
            className="bg-white text-[#7B2D8E] hover:bg-gray-100 rounded-full px-6 h-10 text-sm font-semibold"
          >
            <Link href="/booking" className="flex items-center gap-2">
              Book Now
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
    </main>
  )
}
