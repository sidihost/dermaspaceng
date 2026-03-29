import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { ArrowRight, Award, Heart, Leaf, Users, MapPin, Clock, Phone, Calendar, Smile, Building2, Layers } from 'lucide-react'
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
  { value: '2019', label: 'Founded', icon: Calendar },
  { value: '10K+', label: 'Happy Clients', icon: Smile },
  { value: '2', label: 'Locations', icon: Building2 },
  { value: '50+', label: 'Treatments', icon: Layers },
]

export default function AboutPage() {
  return (
    <main>
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-16 md:py-20 bg-[#7B2D8E] overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-4">
            <span className="text-xs font-medium text-white uppercase tracking-widest">About Us</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-3">
            Your Journey to <span className="text-white/90">Skin Confidence</span>
          </h1>
          <p className="text-sm md:text-base text-white/80 max-w-md mx-auto">
            Boutique spa promoting skin confidence and body wellness since 2019
          </p>
          
          {/* Decorative line */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <div className="w-8 h-0.5 bg-white/30" />
            <div className="w-2 h-2 rounded-full bg-white/50" />
            <div className="w-8 h-0.5 bg-white/30" />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-8 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.map((stat) => (
              <div 
                key={stat.label} 
                className="bg-white rounded-xl p-4 text-center border border-[#7B2D8E]/10 group hover:border-[#7B2D8E]/20 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-2 group-hover:bg-[#7B2D8E] transition-colors">
                  <stat.icon className="w-5 h-5 text-[#7B2D8E] group-hover:text-white transition-colors" />
                </div>
                <p className="text-xl md:text-2xl font-bold text-[#7B2D8E] mb-0.5">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Content */}
      <section className="py-10 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div className="relative">
              <div className="grid grid-cols-2 gap-3">
                <div className="relative aspect-[3/4] rounded-xl overflow-hidden">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6401-1024x731.jpg-2JIwk298ibQ6byxSACK1nUh6Fnqjcw.webp"
                    alt="Dermaspace Spa Interior"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="relative aspect-[3/4] rounded-xl overflow-hidden mt-6">
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
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7B2D8E]/10 mb-3">
                <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Our Story</span>
              </div>
              <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3">
                Where Wellness Meets <span className="text-[#7B2D8E]">Excellence</span>
              </h2>
              <div className="space-y-2 text-sm text-gray-600 leading-relaxed">
                <p>
                  Dermaspace Esthetic & Wellness Centre is a boutique spa that aims to promote skin confidence and improve body wellness.
                </p>
                <p>
                  Founded in April 2019, we are recognized as one of the best day and esthetic spas in Lagos, Nigeria.
                </p>
                <p>
                  Our core areas are Body treatments, Facial treatments, Waxing, Nail care, and advanced esthetic treatments.
                </p>
              </div>
              
              {/* Location Quick Info */}
              <div className="mt-4 p-3 bg-[#7B2D8E]/5 rounded-xl">
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#7B2D8E]" />
                    <span className="text-xs text-gray-600">VI & Ikoyi</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-[#7B2D8E]" />
                    <span className="text-xs text-gray-600">Mon-Sat 9am-7pm</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[#7B2D8E]" />
                    <span className="text-xs text-gray-600">+234 901 797 2919</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-10 bg-[#7B2D8E]/[0.03]">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7B2D8E]/10 mb-3">
              <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Our Values</span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900">
              Why Clients <span className="text-[#7B2D8E]">Choose Us</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {values.map((value) => (
              <div 
                key={value.title}
                className="bg-white rounded-xl p-4 text-center border border-[#7B2D8E]/10 group hover:border-[#7B2D8E]/20 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-2 group-hover:bg-[#7B2D8E] transition-colors">
                  <value.icon className="w-5 h-5 text-[#7B2D8E] group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">{value.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Founders Section */}
      <section id="team" className="py-10 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          {/* Section Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7B2D8E]/10 mb-3">
              <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Leadership</span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900">
              Meet Our <span className="text-[#7B2D8E]">Founders</span>
            </h2>
          </div>

          {/* Founders Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            {founders.map((founder, index) => (
              <div 
                key={founder.name}
                className="group bg-white rounded-2xl overflow-hidden border border-[#7B2D8E]/10 hover:border-[#7B2D8E]/20 hover:shadow-lg transition-all"
              >
                {/* Top gradient bar */}
                <div className="h-1 bg-gradient-to-r from-[#7B2D8E] via-[#9B4DB0] to-[#7B2D8E]" />
                
                <div className="p-5">
                  {/* Profile Header */}
                  <div className="flex items-start gap-4 mb-4">
                    {/* Profile Image */}
                    <div className="relative flex-shrink-0">
                      <div className="w-20 h-20 rounded-xl overflow-hidden ring-2 ring-[#7B2D8E]/20 ring-offset-2">
                        <Image
                          src={founder.image}
                          alt={founder.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      {/* Role Badge */}
                      <div className="absolute -bottom-1 -right-1 bg-[#7B2D8E] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {index === 0 ? 'CEO' : 'COO'}
                      </div>
                    </div>
                    
                    {/* Name & Title */}
                    <div className="pt-1">
                      <h3 className="text-sm font-bold text-gray-900 mb-1">{founder.name}</h3>
                      <p className="text-xs text-[#7B2D8E] font-semibold">{founder.role}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{founder.company}</p>
                    </div>
                  </div>
                  
                  {/* Full Bio - No truncation */}
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {founder.bio}
                  </p>
                  
                  {/* Bottom accent */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Award className="w-3 h-3 text-[#7B2D8E]" />
                      <span className="text-[10px] text-gray-400 uppercase tracking-wide">Dermaspace Leadership</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E]/30" />
                      <div className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E]/50" />
                      <div className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E]" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-10 mb-10 bg-[#7B2D8E] mx-4 rounded-2xl">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-lg md:text-xl font-bold text-white mb-2">
            Ready to Experience Dermaspace?
          </h2>
          <p className="text-sm text-white/70 mb-5 max-w-md mx-auto">
            Book your appointment today and let us pamper you
          </p>
          <Button
            asChild
            className="bg-white text-[#7B2D8E] hover:bg-gray-100 rounded-full px-5 h-9 text-sm font-semibold"
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
