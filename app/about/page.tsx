import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { ArrowRight, Award, Heart, Leaf, Users } from 'lucide-react'
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
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/85157438_9aab_3.jpg-1YOii0Tsg7gHL94IxkJU0Ppoi3pRHa.webp',
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

export default function AboutPage() {
  return (
    <main>
      <Header />
      
      {/* Hero Section - Compact */}
      <section className="py-12 bg-[#7B2D8E]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xs font-medium text-[#D4A853] uppercase tracking-widest mb-2">
            About Us
          </p>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Your Journey to Skin Confidence
          </h1>
          <p className="text-sm text-white/70 max-w-lg mx-auto">
            Boutique spa promoting skin confidence and body wellness since 2019
          </p>
        </div>
      </section>

      {/* About Content */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                Dermaspace Esthetic & Wellness Centre is a boutique spa that aims to promote skin confidence and improve body wellness. We are committed to bringing our clients the most effective skincare treatments.
              </p>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                Founded in April 2019, we have grown expeditiously and are recognized as one of the best day and esthetic spas in Lagos, Nigeria.
              </p>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                Our core areas are Body treatments, Facial treatments, Waxing, Nail care, and advanced esthetic treatments such as Acne treatment, Chemical Peel, and Microneedling.
              </p>
              <p className="text-sm text-gray-600 leading-relaxed">
                Located in the heart of Lagos Island (Ikoyi and Victoria Island), we are committed to bringing our clients the utmost premium spa-pampering experience. Our highly professional staff and comforting ambiance makes Dermaspace the best choice for your rejuvenating experience.
              </p>
            </div>
            <div className="relative">
              <div className="grid grid-cols-2 gap-3">
                <div className="relative aspect-square rounded-xl overflow-hidden">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6401-1024x731.jpg-2JIwk298ibQ6byxSACK1nUh6Fnqjcw.webp"
                    alt="Dermaspace Spa Interior"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="relative aspect-square rounded-xl overflow-hidden mt-6">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6468-2-2048x1463.jpg-1024x732-1-dKeUu4w0K7uutGPH5gmeN7nXrcuOu2.webp"
                    alt="Facial Treatment"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-16 bg-[#FDFBF9]">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold text-[#D4A853] uppercase tracking-widest mb-2">
              Our Values
            </p>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">
              Why Clients Choose Us
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {values.map((value) => (
              <div 
                key={value.title}
                className="bg-white rounded-xl p-5 border border-gray-100 text-center hover:border-[#7B2D8E]/20 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-3">
                  <value.icon className="w-5 h-5 text-[#7B2D8E]" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">{value.title}</h3>
                <p className="text-xs text-gray-500">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Founders Section */}
      <section id="team" className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold text-[#D4A853] uppercase tracking-widest mb-2">
              Leadership
            </p>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">
              Meet Our Founders
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {founders.map((founder) => (
              <div 
                key={founder.name}
                className="bg-[#FDFBF9] rounded-xl p-5 border border-gray-100"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                    <Image
                      src={founder.image}
                      alt={founder.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{founder.name}</h3>
                    <p className="text-xs text-[#7B2D8E] font-medium">{founder.role}</p>
                    <p className="text-[10px] text-gray-500">{founder.company}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{founder.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 bg-[#7B2D8E]">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-3">
            Ready to Experience Dermaspace?
          </h2>
          <p className="text-sm text-white/70 mb-6">
            Book your appointment today and let us pamper you
          </p>
          <Button
            asChild
            className="bg-white text-[#7B2D8E] hover:bg-gray-100 rounded-full px-6 h-10 text-sm"
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
