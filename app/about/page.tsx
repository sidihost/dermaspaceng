import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { ArrowRight, Award, Heart, Leaf, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn about Dermaspace Esthetic & Wellness Centre. Founded in 2019, we are recognized as one of the best day and esthetic spas in Lagos, Nigeria.',
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
    description: 'Our team holds international certifications from renowned brands and institutes worldwide.',
  },
  {
    icon: Leaf,
    title: 'Premium Quality',
    description: 'We use only the finest products and techniques for exceptional results.',
  },
  {
    icon: Users,
    title: 'Welcoming Environment',
    description: 'Our spa offers a serene space where you can unwind and embrace relaxation.',
  },
]

const founders = [
  {
    name: 'Itunuoluwa Umar-Lawal',
    role: 'CEO',
    company: 'Dermaspace Esthetic and Wellness Centre Ltd',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/85157438_9aab_3.jpg-1YOii0Tsg7gHL94IxkJU0Ppoi3pRHa.webp',
    bio: 'Itunu is a passionate and dedicated skincare enthusiast whose focus is on product formulation. She has received certifications in spa products formulation from England and has founded a successful natural skincare product range. She believes our skin is as unique as our personalities and that good skincare is good self-care. She is also a trained lawyer with a natural flair for entrepreneurship.',
  },
  {
    name: 'Franca Ebuzome',
    role: 'Co-Founder & COO',
    company: 'Dermaspace Esthetic and Wellness Centre Ltd',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/franca-1-ZLFTvxIeaKIywWjr4amphoEGwfmuOe.webp',
    bio: 'Franca is a licensed Medical Esthetician (CIDESCO) and Laser Technician with over a decade of hands-on experience in skincare therapy and wellness. She is committed to helping individuals regain their skin confidence through noninvasive or mild-invasive methods. Her expertise is certified by renowned international brands and institutes. She is also a licensed Real Estate Broker (ANIVS) and Facility Manager.',
  },
]

const milestones = [
  { year: '2019', title: 'Founded', description: 'Dermaspace was established in Lagos' },
  { year: '2020', title: 'Expansion', description: 'Opened second location in Ikoyi' },
  { year: '2023', title: 'Recognition', description: 'Named top esthetic spa in Lagos' },
  { year: '2024', title: 'Growth', description: 'Expanded services and team' },
]

export default function AboutPage() {
  return (
    <main>
      <Header />
      
      {/* Hero Section */}
      <section className="py-20 bg-[#FDFBF9]">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest mb-4">
                About Dermaspace
              </p>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Your Journey to <span className="text-[#7B2D8E]">Skin Confidence</span>
              </h1>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-0.5 bg-[#D4A853]" />
                <div className="w-2 h-0.5 bg-[#7B2D8E]/30" />
              </div>
              <p className="text-gray-600 leading-relaxed mb-4">
                Dermaspace Esthetic & Wellness Centre is a boutique spa that aims to promote skin confidence and improve body wellness. We are committed to bringing our clients the most effective skincare treatments.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Founded in April 2019, we have grown expeditiously and are recognized as one of the best day and esthetic spas in Lagos, Nigeria.
              </p>
              <Button
                asChild
                className="mt-6 bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white rounded-lg px-6"
              >
                <Link href="/booking" className="flex items-center gap-2">
                  Book Your Visit
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6401-1024x731.jpg-2JIwk298ibQ6byxSACK1nUh6Fnqjcw.webp"
                    alt="Dermaspace Spa Interior"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden mt-8">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6468-2-2048x1463.jpg-1024x732-1-dKeUu4w0K7uutGPH5gmeN7nXrcuOu2.webp"
                    alt="Facial Treatment"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
              {/* Stats Card */}
              <div className="absolute -left-4 bottom-20 bg-white rounded-xl p-6 max-w-[180px] border border-gray-100">
                <p className="text-4xl font-bold text-[#7B2D8E]">5+</p>
                <p className="text-sm text-gray-600 mt-1">Years of Excellence</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Services Overview */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-[#7B2D8E] text-sm font-semibold tracking-wider uppercase">
              What We Do
            </span>
            <h2 className="mt-4 text-3xl md:text-4xl font-bold text-gray-900">
              Our Core <span className="text-[#7B2D8E]">Areas</span>
            </h2>
            <p className="mt-6 text-lg text-gray-600 text-pretty">
              Our core areas are Body treatments, Facial treatments, Waxing, Nail care, and advanced esthetic treatments such as Acne treatment, Chemical Peel, and Microneedling.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {['Body Treatments', 'Facial Treatments', 'Nail Care', 'Waxing', 'Acne Treatments', 'Advanced Esthetics'].map((service) => (
              <div 
                key={service}
                className="bg-white rounded-xl p-6 border border-gray-200 text-center hover:border-[#7B2D8E]/30 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-4">
                  <Leaf className="w-6 h-6 text-[#7B2D8E]" />
                </div>
                <h3 className="font-semibold text-gray-900">{service}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-24 bg-[#FDFBF9]">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-[#7B2D8E] text-sm font-semibold tracking-wider uppercase">
                Our Values
              </span>
              <h2 className="mt-4 text-3xl md:text-4xl font-bold text-gray-900 text-balance">
                Why Clients <span className="text-[#7B2D8E]">Choose Us</span>
              </h2>
              <p className="mt-6 text-lg text-gray-600 text-pretty">
                Located in the heart of Lagos Island (Ikoyi and Victoria Island), we are committed to bringing our clients the utmost premium spa-pampering experience. Our highly professional staff and comforting ambiance makes Dermaspace the best choice for your rejuvenating experience.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              {values.map((value) => (
                <div 
                  key={value.title}
                  className="bg-white rounded-xl p-6 border border-gray-100 hover:border-[#7B2D8E]/20 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center mb-4">
                    <value.icon className="w-6 h-6 text-[#7B2D8E]" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{value.title}</h3>
                  <p className="text-sm text-gray-600">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Founders Section */}
      <section id="team" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-[#7B2D8E] text-sm font-semibold tracking-wider uppercase">
              Leadership
            </span>
            <h2 className="mt-4 text-3xl md:text-4xl font-bold text-gray-900">
              Meet Our <span className="text-[#7B2D8E]">Founders</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            {founders.map((founder) => (
              <div 
                key={founder.name}
                className="bg-[#FDFBF9] rounded-xl p-6 border border-gray-200"
              >
                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="relative w-32 h-32 rounded-2xl overflow-hidden flex-shrink-0 mx-auto sm:mx-0">
                    <Image
                      src={founder.image}
                      alt={founder.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="text-center sm:text-left">
                    <h3 className="text-xl font-bold text-gray-900">{founder.name}</h3>
                    <p className="text-[#7B2D8E] font-medium">{founder.role}</p>
                    <p className="text-sm text-gray-500">{founder.company}</p>
                  </div>
                </div>
                <p className="mt-6 text-gray-600 leading-relaxed">{founder.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-24 bg-[#FDFBF9]">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="text-center mb-16">
            <span className="text-[#7B2D8E] text-sm font-semibold tracking-wider uppercase">
              Our Journey
            </span>
            <h2 className="mt-4 text-3xl md:text-4xl font-bold text-gray-900">
              <span className="text-[#7B2D8E]">Milestones</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {milestones.map((milestone, index) => (
              <div 
                key={milestone.year}
                className="relative bg-white rounded-xl p-6 border border-gray-100 text-center hover:border-[#7B2D8E]/20 transition-colors"
              >
                <div className="text-4xl font-bold text-[#7B2D8E] mb-2">{milestone.year}</div>
                <h3 className="font-semibold text-gray-900 mb-1">{milestone.title}</h3>
                <p className="text-sm text-gray-600">{milestone.description}</p>
                {index < milestones.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-px bg-[#7B2D8E]/30" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-[#7B2D8E]">
        <div className="max-w-4xl mx-auto px-4 lg:px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-balance">
            Ready to Experience <span className="text-[#D4A853]">Dermaspace</span>?
          </h2>
          <p className="mt-6 text-lg text-white/80">
            Book your appointment today and let us pamper you with world-class treatments
          </p>
          <Button
            asChild
            size="lg"
            className="mt-8 bg-white text-[#7B2D8E] hover:bg-gray-100 rounded-full px-8 h-14"
          >
            <Link href="/booking" className="flex items-center gap-2">
              Book Now
              <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
    </main>
  )
}
