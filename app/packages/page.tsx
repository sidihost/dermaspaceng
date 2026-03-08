import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { Clock, Check, ArrowRight, Users, User } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Spa Packages | Dermaspace',
  description: 'Discover our curated spa packages at Dermaspace Lagos. Gold, Silver, and Bronze experiences for singles and couples.',
}

const singlePackages = [
  {
    name: 'Gold Experience',
    type: 'Single',
    price: '141,000',
    duration: '3 Hours 30 Mins',
    features: [
      'Deep Tissue Massage/Swedish Massage',
      'Detox Body Scrub (Salt/Sugar) + Steam',
      'Deep Cleansing Facial',
      'ManiPedi or Wax treatment worth N20,000',
    ],
    popular: true,
    color: '#7B2D8E',
  },
  {
    name: 'Silver Experience',
    type: 'Single',
    price: '97,000',
    duration: '3 Hours 50 Mins',
    features: [
      'Deep Tissue Massage/Swedish Massage',
      'Detox Body Scrub (Salt/Sugar) + Steam',
      'Deep Cleansing Facial',
      'ManiPedi or Wax treatment worth N20,000',
    ],
    popular: false,
    color: '#9CA3AF',
  },
  {
    name: 'Bronze Experience',
    type: 'Single',
    price: '77,000',
    duration: '2 Hours',
    features: [
      'Deep Tissue Massage/Swedish Massage',
      'Deep Cleansing Facial',
    ],
    popular: false,
    color: '#B87333',
  },
]

const couplePackages = [
  {
    name: 'Gold Experience',
    type: 'Couple',
    price: '245,000',
    duration: '3 Hours 30 Mins',
    features: [
      'Couple Deep Tissue Massage/Swedish Massage',
      'Detox Body Scrub (Salt/Sugar) + Steam',
      'Deep Cleansing Facial',
      'ManiPedi or Wax treatment worth N20,000',
    ],
    popular: true,
    color: '#7B2D8E',
  },
  {
    name: 'Silver Experience',
    type: 'Couple',
    price: '185,000',
    duration: '2 Hours 30 Mins',
    features: [
      'Deep Tissue Massage/Detox Body Scrub + Steam',
      'Deep Cleansing Facial',
      'ManiPedi or Wax treatment worth N20,000',
    ],
    popular: false,
    color: '#9CA3AF',
  },
  {
    name: 'Bronze Experience',
    type: 'Couple',
    price: '149,000',
    duration: '2 Hours',
    features: [
      'Deep Tissue Massage/Swedish Massage',
      'Deep Cleansing Facial',
    ],
    popular: false,
    color: '#B87333',
  },
]

function PackageCard({ pkg }: { pkg: typeof singlePackages[0] }) {
  return (
    <div 
      className={`relative rounded-2xl overflow-hidden transition-all duration-300 ${
        pkg.popular 
          ? 'bg-gradient-to-br from-[#7B2D8E] to-[#5A1D6A] text-white shadow-xl shadow-[#7B2D8E]/20 scale-[1.02]' 
          : 'bg-white border border-gray-100 hover:border-[#7B2D8E]/30 hover:shadow-lg'
      }`}
    >
      {pkg.popular && (
        <div className="bg-white/20 backdrop-blur-sm text-white text-center py-2 text-xs font-semibold uppercase tracking-wider">
          Most Popular
        </div>
      )}

      <div className="p-6">
        {/* Package Name with Icon */}
        <div className="flex items-center gap-3 mb-5">
          <div 
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              pkg.popular ? 'bg-white/20' : 'bg-gradient-to-br from-gray-50 to-gray-100'
            }`}
            style={{ 
              background: pkg.popular ? undefined : `linear-gradient(135deg, ${pkg.color}10, ${pkg.color}20)`
            }}
          >
            {pkg.type === 'Single' ? (
              <User className="w-5 h-5" style={{ color: pkg.popular ? 'white' : pkg.color }} />
            ) : (
              <Users className="w-5 h-5" style={{ color: pkg.popular ? 'white' : pkg.color }} />
            )}
          </div>
          <div>
            <h3 className={`text-lg font-bold ${pkg.popular ? 'text-white' : 'text-gray-900'}`}>{pkg.name}</h3>
            <span className={`text-xs font-medium ${pkg.popular ? 'text-white/70' : 'text-[#7B2D8E]'}`}>{pkg.type} Package</span>
          </div>
        </div>

        {/* Price */}
        <div className="mb-5">
          <span className={`text-xs ${pkg.popular ? 'text-white/70' : 'text-gray-500'}`}>Starting from</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-3xl font-bold ${pkg.popular ? 'text-white' : 'text-gray-900'}`}>
              <span className="text-lg">N</span>{pkg.price}
            </span>
          </div>
        </div>

        {/* Duration Badge */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5 ${
          pkg.popular 
            ? 'bg-white/20' 
            : 'bg-[#7B2D8E]/5 border border-[#7B2D8E]/10'
        }`}>
          <Clock className={`w-4 h-4 ${pkg.popular ? 'text-white' : 'text-[#7B2D8E]'}`} />
          <span className={`text-sm font-medium ${pkg.popular ? 'text-white' : 'text-[#7B2D8E]'}`}>{pkg.duration}</span>
        </div>

        {/* Features */}
        <ul className="space-y-3 mb-6">
          {pkg.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                pkg.popular ? 'bg-white/20' : 'bg-[#7B2D8E]/10'
              }`}>
                <Check className={`w-3 h-3 ${pkg.popular ? 'text-white' : 'text-[#7B2D8E]'}`} />
              </div>
              <span className={`text-sm leading-relaxed ${pkg.popular ? 'text-white/90' : 'text-gray-600'}`}>{feature}</span>
            </li>
          ))}
        </ul>

        {/* Book Button */}
        <Button
          asChild
          className={`w-full rounded-xl h-12 text-sm font-semibold transition-all ${
            pkg.popular 
              ? 'bg-white text-[#7B2D8E] hover:bg-white/90 shadow-lg' 
              : 'bg-[#7B2D8E] text-white hover:bg-[#5A1D6A]'
          }`}
        >
          <Link href="/booking">Book Now</Link>
        </Button>
      </div>
    </div>
  )
}

export default function PackagesPage() {
  return (
    <main>
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-20 md:py-24 bg-gradient-to-br from-[#7B2D8E] via-[#6B2580] to-[#5A1D6A] overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -translate-x-1/3 translate-y-1/3" />
        <div className="absolute top-1/2 left-12 w-3 h-3 bg-white/30 rounded-full hidden md:block" />
        <div className="absolute top-1/3 right-20 w-2 h-2 bg-white/20 rounded-full hidden md:block" />
        
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 border border-white/20 mb-6">
            <span className="text-sm font-medium text-white uppercase tracking-widest">Spa Packages</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Choose Your <span className="text-white/90">Experience</span>
          </h1>
          <p className="text-base md:text-lg text-white/80 max-w-xl mx-auto">
            Carefully curated packages designed for ultimate relaxation and rejuvenation
          </p>
          
          {/* Decorative line */}
          <div className="flex items-center justify-center gap-2 mt-8">
            <div className="w-12 h-0.5 bg-white/30" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/50" />
            <div className="w-12 h-0.5 bg-white/30" />
          </div>
        </div>
      </section>

      {/* Single Packages */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7B2D8E]/10 to-[#7B2D8E]/20 flex items-center justify-center">
              <User className="w-6 h-6 text-[#7B2D8E]" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">Single Packages</h2>
              <p className="text-sm text-gray-500">Individual pampering sessions designed for you</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {singlePackages.map((pkg) => (
              <PackageCard key={`${pkg.name}-${pkg.type}`} pkg={pkg} />
            ))}
          </div>
        </div>
      </section>

      {/* Couple Packages */}
      <section className="py-16 md:py-20 bg-[#FDFBF9]">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7B2D8E]/10 to-[#7B2D8E]/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-[#7B2D8E]" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">Couple Packages</h2>
              <p className="text-sm text-gray-500">Share the experience with someone special</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {couplePackages.map((pkg) => (
              <PackageCard key={`${pkg.name}-${pkg.type}`} pkg={pkg} />
            ))}
          </div>
        </div>
      </section>

      {/* Gift Cards */}
      <section className="py-12 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div className="relative aspect-[4/3] max-w-xs mx-auto lg:mx-0 rounded-xl overflow-hidden">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/f52f1634-hero-1.png-OVi0BQIsdP8fE20E3t5LI9cQ6RGcgA.webp"
                alt="Gift Cards"
                fill
                className="object-contain"
              />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#7B2D8E]/10 mb-4">
                <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Gift Cards</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">
                Give the Gift of Wellness
              </h2>
              <p className="text-sm text-gray-600 mb-5">
                Surprise your loved ones with a Dermaspace gift card. Let them choose their perfect spa experience.
              </p>
              <Button
                asChild
                className="bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white rounded-lg px-5 h-9 text-xs"
              >
                <Link href="/contact" className="flex items-center gap-2">
                  Inquire About Gift Cards
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
