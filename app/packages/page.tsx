import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { Clock, Check, ArrowRight, Users, User } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Spa Packages',
  description: 'Discover our curated spa packages at Dermaspace Lagos. Gold, Silver, and Bronze experiences for singles and couples. Ultimate relaxation and rejuvenation.',
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
    color: '#C0C0C0',
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
    color: '#CD7F32',
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
    color: '#C0C0C0',
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
    color: '#CD7F32',
  },
]

function PackageCard({ pkg }: { pkg: typeof singlePackages[0] }) {
  return (
    <div 
      className={`relative rounded-2xl border-2 overflow-hidden transition-all ${
        pkg.popular 
          ? 'border-[#7B2D8E] bg-gradient-to-b from-[#7B2D8E]/5 to-white' 
          : 'border-gray-200 bg-white hover:border-[#7B2D8E]/30'
      }`}
    >
      {pkg.popular && (
        <div className="absolute top-0 left-0 right-0 bg-[#7B2D8E] text-white text-center py-2 text-sm font-medium">
          Most Popular
        </div>
      )}

      <div className={`p-8 ${pkg.popular ? 'pt-14' : ''}`}>
        {/* Package Header */}
        <div className="flex items-center gap-3 mb-6">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${pkg.color}20` }}
          >
            {pkg.type === 'Single' ? (
              <User className="w-6 h-6" style={{ color: pkg.color }} />
            ) : (
              <Users className="w-6 h-6" style={{ color: pkg.color }} />
            )}
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">{pkg.name}</h3>
            <span className="text-sm text-[#7B2D8E] font-medium">{pkg.type}</span>
          </div>
        </div>

        {/* Price */}
        <div className="mb-6">
          <span className="text-sm text-gray-500">Starting from</span>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-gray-900">N{pkg.price}</span>
          </div>
        </div>

        {/* Duration */}
        <div className="flex items-center gap-2 mb-6 text-gray-600">
          <Clock className="w-5 h-5 text-[#7B2D8E]" />
          <span>{pkg.duration}</span>
        </div>

        {/* Features */}
        <ul className="space-y-3 mb-8">
          {pkg.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mt-0.5">
                <Check className="w-3 h-3 text-[#7B2D8E]" />
              </div>
              <span className="text-sm text-gray-600">{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <Button
          asChild
          className={`w-full rounded-full h-12 ${
            pkg.popular 
              ? 'bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white' 
              : 'bg-white border-2 border-[#7B2D8E] text-[#7B2D8E] hover:bg-[#7B2D8E] hover:text-white'
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
      <section className="relative py-24 bg-gradient-to-br from-[#FBF8F4] via-white to-[#f5f0ff]">
        <div className="absolute top-10 right-10 w-40 h-40 opacity-30">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot_55-SAfBrHHb9LcLPNW7pEtKSIkAVLBxnu.webp"
            alt=""
            fill
            className="object-contain"
          />
        </div>
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-[#7B2D8E] text-sm font-semibold tracking-wider uppercase">
              Spa Packages
            </span>
            <h1 className="mt-4 text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 text-balance">
              Choose Your <span className="gradient-text">Experience</span>
            </h1>
            <p className="mt-6 text-lg text-gray-600 text-pretty">
              Indulge in our carefully curated spa packages designed for ultimate relaxation and rejuvenation. Perfect for individuals or couples seeking premium wellness experiences.
            </p>
          </div>
        </div>
      </section>

      {/* Single Packages */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-12 h-12 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center">
              <User className="w-6 h-6 text-[#7B2D8E]" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Single Packages</h2>
              <p className="text-gray-600">Perfect for individual pampering sessions</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {singlePackages.map((pkg) => (
              <PackageCard key={`${pkg.name}-${pkg.type}`} pkg={pkg} />
            ))}
          </div>
        </div>
      </section>

      {/* Couple Packages */}
      <section className="py-24 bg-gradient-to-b from-[#FBF8F4] to-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-12 h-12 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-[#7B2D8E]" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Couple Packages</h2>
              <p className="text-gray-600">Share the experience with your loved one</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {couplePackages.map((pkg) => (
              <PackageCard key={`${pkg.name}-${pkg.type}`} pkg={pkg} />
            ))}
          </div>
        </div>
      </section>

      {/* Gift Cards Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative aspect-square max-w-md mx-auto lg:mx-0">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/f52f1634-hero-1.png-OVi0BQIsdP8fE20E3t5LI9cQ6RGcgA.webp"
                alt="Gift Cards"
                fill
                className="object-contain"
              />
            </div>
            <div>
              <span className="text-[#7B2D8E] text-sm font-semibold tracking-wider uppercase">
                Gift Cards
              </span>
              <h2 className="mt-4 text-3xl md:text-4xl font-bold text-gray-900 text-balance">
                Give the Gift of <span className="gradient-text">Wellness</span>
              </h2>
              <p className="mt-6 text-lg text-gray-600 text-pretty">
                Surprise your loved ones with a Dermaspace gift card. Let them choose their perfect spa experience from our wide range of treatments and packages.
              </p>
              <Button
                asChild
                className="mt-8 bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white rounded-full px-8"
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
