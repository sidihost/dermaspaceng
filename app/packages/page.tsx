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
    color: '#D4A853',
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
    color: '#D4A853',
  },
  {
    name: 'Silver Experience',
    type: 'Couple',
    price: '185,000',
    duration: '2 Hours 30 Mins',
    features: [
      'Deep Tissue Massage/Detox Body Scrub (Salt/Sugar) + Steam',
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
      className={`relative rounded-xl overflow-hidden transition-all ${
        pkg.popular 
          ? 'bg-[#7B2D8E] text-white' 
          : 'bg-white border border-gray-200 hover:border-[#7B2D8E]/40'
      }`}
    >
      {pkg.popular && (
        <div className="bg-[#D4A853] text-white text-center py-2 text-xs font-semibold uppercase tracking-wide">
          Most Popular
        </div>
      )}

      <div className="p-6">
        {/* Package Header */}
        <div className="flex items-center gap-3 mb-5">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: pkg.popular ? 'rgba(255,255,255,0.2)' : `${pkg.color}15` }}
          >
            {pkg.type === 'Single' ? (
              <User className="w-5 h-5" style={{ color: pkg.popular ? 'white' : pkg.color }} />
            ) : (
              <Users className="w-5 h-5" style={{ color: pkg.popular ? 'white' : pkg.color }} />
            )}
          </div>
          <div>
            <h3 className={`font-bold ${pkg.popular ? 'text-white' : 'text-gray-900'}`}>{pkg.name}</h3>
            <span className={`text-xs ${pkg.popular ? 'text-white/70' : 'text-[#7B2D8E]'}`}>{pkg.type}</span>
          </div>
        </div>

        {/* Price */}
        <div className="mb-5">
          <span className={`text-xs ${pkg.popular ? 'text-white/70' : 'text-gray-500'}`}>Starting from</span>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-bold ${pkg.popular ? 'text-white' : 'text-gray-900'}`}>N{pkg.price}</span>
          </div>
        </div>

        {/* Duration */}
        <div className={`flex items-center gap-2 mb-5 text-sm ${pkg.popular ? 'text-white/80' : 'text-gray-600'}`}>
          <Clock className="w-4 h-4" />
          <span>{pkg.duration}</span>
        </div>

        {/* Features */}
        <ul className="space-y-2.5 mb-6">
          {pkg.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5">
              <div className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center mt-0.5 ${
                pkg.popular ? 'bg-white/20' : 'bg-[#7B2D8E]/10'
              }`}>
                <Check className={`w-2.5 h-2.5 ${pkg.popular ? 'text-white' : 'text-[#7B2D8E]'}`} />
              </div>
              <span className={`text-sm ${pkg.popular ? 'text-white/90' : 'text-gray-600'}`}>{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <Button
          asChild
          className={`w-full rounded-lg h-10 text-sm ${
            pkg.popular 
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
      
      {/* Hero Section */}
      <section className="py-20 bg-[#FDFBF9]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest mb-4">
            Spa Packages
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Choose Your <span className="text-[#7B2D8E]">Experience</span>
          </h1>
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-0.5 bg-[#D4A853]" />
            <div className="w-2 h-0.5 bg-[#7B2D8E]/30" />
          </div>
          <p className="text-gray-600 max-w-xl mx-auto">
            Carefully curated packages for ultimate relaxation. Perfect for individuals or couples.
          </p>
        </div>
      </section>

      {/* Single Packages */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center">
              <User className="w-5 h-5 text-[#7B2D8E]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Single Packages</h2>
              <p className="text-sm text-gray-600">Individual pampering sessions</p>
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
      <section className="py-16 bg-[#FDFBF9]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-[#7B2D8E]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Couple Packages</h2>
              <p className="text-sm text-gray-600">Share the experience together</p>
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
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div className="relative aspect-[4/3] max-w-md mx-auto lg:mx-0 rounded-xl overflow-hidden">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/f52f1634-hero-1.png-OVi0BQIsdP8fE20E3t5LI9cQ6RGcgA.webp"
                alt="Gift Cards"
                fill
                className="object-contain"
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest mb-3">
                Gift Cards
              </p>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Give the Gift of <span className="text-[#7B2D8E]">Wellness</span>
              </h2>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-0.5 bg-[#D4A853]" />
                <div className="w-2 h-0.5 bg-[#7B2D8E]/30" />
              </div>
              <p className="text-gray-600 mb-6">
                Surprise your loved ones with a Dermaspace gift card. Let them choose their perfect spa experience.
              </p>
              <Button
                asChild
                className="bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white rounded-lg px-6"
              >
                <Link href="/contact" className="flex items-center gap-2">
                  Inquire About Gift Cards
                  <ArrowRight className="w-4 h-4" />
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
