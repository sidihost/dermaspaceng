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
      'Deep Tissue/Swedish Massage',
      'Detox Body Scrub + Steam',
      'Deep Cleansing Facial',
      'ManiPedi or Wax (N20K value)',
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
      'Deep Tissue/Swedish Massage',
      'Detox Body Scrub + Steam',
      'Deep Cleansing Facial',
      'ManiPedi or Wax (N20K value)',
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
      'Deep Tissue/Swedish Massage',
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
      'Couple Deep Tissue/Swedish Massage',
      'Detox Body Scrub + Steam',
      'Deep Cleansing Facial',
      'ManiPedi or Wax (N20K value)',
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
      'Deep Tissue/Detox Scrub + Steam',
      'Deep Cleansing Facial',
      'ManiPedi or Wax (N20K value)',
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
      'Deep Tissue/Swedish Massage',
      'Deep Cleansing Facial',
    ],
    popular: false,
    color: '#B87333',
  },
]

function PackageCard({ pkg }: { pkg: typeof singlePackages[0] }) {
  const isPopular = pkg.popular
  
  return (
    <div className={`relative rounded-xl overflow-hidden transition-all duration-300 ${
      isPopular 
        ? 'bg-[#7B2D8E] text-white shadow-lg' 
        : 'bg-white border border-gray-100 hover:shadow-md'
    }`}>
      {isPopular && (
        <div className="bg-white/15 text-center py-1.5 text-[11px] font-medium uppercase tracking-wide">
          Most Popular
        </div>
      )}

      <div className="p-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isPopular ? 'bg-white/20' : 'bg-gray-50'
          }`}>
            {pkg.type === 'Single' ? (
              <User className="w-5 h-5" style={{ color: isPopular ? 'white' : pkg.color }} />
            ) : (
              <Users className="w-5 h-5" style={{ color: isPopular ? 'white' : pkg.color }} />
            )}
          </div>
          <div>
            <h3 className={`text-sm font-semibold ${isPopular ? 'text-white' : 'text-gray-900'}`}>
              {pkg.name}
            </h3>
            <span className={`text-[11px] ${isPopular ? 'text-white/70' : 'text-[#7B2D8E]'}`}>
              {pkg.type} Package
            </span>
          </div>
        </div>

        {/* Price */}
        <div className="mb-4">
          <span className={`text-[11px] ${isPopular ? 'text-white/60' : 'text-gray-400'}`}>
            Starting from
          </span>
          <div className="flex items-baseline gap-0.5">
            <span className={`text-xl font-bold ${isPopular ? 'text-white' : 'text-gray-900'}`}>
              N{pkg.price}
            </span>
          </div>
        </div>

        {/* Duration */}
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium mb-4 ${
          isPopular ? 'bg-white/20 text-white' : 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
        }`}>
          <Clock className="w-3 h-3" />
          {pkg.duration}
        </div>

        {/* Features */}
        <ul className="space-y-2 mb-5">
          {pkg.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center mt-0.5 ${
                isPopular ? 'bg-white/20' : 'bg-[#7B2D8E]/10'
              }`}>
                <Check className={`w-2.5 h-2.5 ${isPopular ? 'text-white' : 'text-[#7B2D8E]'}`} />
              </div>
              <span className={`text-xs leading-relaxed ${isPopular ? 'text-white/90' : 'text-gray-600'}`}>
                {feature}
              </span>
            </li>
          ))}
        </ul>

        {/* Button */}
        <Button
          asChild
          className={`w-full h-10 text-xs font-medium rounded-lg ${
            isPopular 
              ? 'bg-white text-[#7B2D8E] hover:bg-white/90' 
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
      
      {/* Hero */}
      <section className="relative py-16 md:py-20 bg-[#7B2D8E] overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full -translate-x-1/3 translate-y-1/3" />
        </div>
        
        <div className="relative max-w-4xl mx-auto px-5 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 mb-4">
            <span className="text-xs font-medium text-white uppercase tracking-wide">Spa Packages</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-semibold text-white mb-3">
            Choose Your Experience
          </h1>
          <p className="text-sm text-white/70 max-w-md mx-auto">
            Carefully curated packages designed for ultimate relaxation
          </p>
        </div>
      </section>

      {/* Single Packages */}
      <section className="py-12 bg-white">
        <div className="max-w-5xl mx-auto px-5">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center">
              <User className="w-5 h-5 text-[#7B2D8E]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Single Packages</h2>
              <p className="text-xs text-gray-500">Individual pampering sessions</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {singlePackages.map((pkg) => (
              <PackageCard key={`${pkg.name}-${pkg.type}`} pkg={pkg} />
            ))}
          </div>
        </div>
      </section>

      {/* Couple Packages */}
      <section className="py-12 bg-[#FDFBF9]">
        <div className="max-w-5xl mx-auto px-5">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-[#7B2D8E]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Couple Packages</h2>
              <p className="text-xs text-gray-500">Share the experience together</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {couplePackages.map((pkg) => (
              <PackageCard key={`${pkg.name}-${pkg.type}`} pkg={pkg} />
            ))}
          </div>
        </div>
      </section>

      {/* Gift Cards */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-5">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="relative w-48 h-48 flex-shrink-0">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/f52f1634-hero-1.png-OVi0BQIsdP8fE20E3t5LI9cQ6RGcgA.webp"
                alt="Gift Cards"
                fill
                className="object-contain"
              />
            </div>
            <div className="text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7B2D8E]/10 mb-3">
                <span className="text-[11px] font-medium text-[#7B2D8E] uppercase tracking-wide">Gift Cards</span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Give the Gift of Wellness
              </h2>
              <p className="text-sm text-gray-500 mb-4 max-w-sm">
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
