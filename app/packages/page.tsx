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
      className={`relative rounded-xl overflow-hidden transition-all ${
        pkg.popular 
          ? 'bg-[#7B2D8E] text-white' 
          : 'bg-white border border-gray-200 hover:border-[#7B2D8E]/40'
      }`}
    >
      {pkg.popular && (
        <div className="bg-[#D4A853] text-white text-center py-1.5 text-[10px] font-semibold uppercase tracking-wide">
          Most Popular
        </div>
      )}

      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div 
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: pkg.popular ? 'rgba(255,255,255,0.2)' : `${pkg.color}15` }}
          >
            {pkg.type === 'Single' ? (
              <User className="w-4 h-4" style={{ color: pkg.popular ? 'white' : pkg.color }} />
            ) : (
              <Users className="w-4 h-4" style={{ color: pkg.popular ? 'white' : pkg.color }} />
            )}
          </div>
          <div>
            <h3 className={`text-sm font-bold ${pkg.popular ? 'text-white' : 'text-gray-900'}`}>{pkg.name}</h3>
            <span className={`text-[10px] ${pkg.popular ? 'text-white/70' : 'text-[#7B2D8E]'}`}>{pkg.type}</span>
          </div>
        </div>

        <div className="mb-4">
          <span className={`text-[10px] ${pkg.popular ? 'text-white/70' : 'text-gray-500'}`}>Starting from</span>
          <div className="flex items-baseline gap-1">
            <span className={`text-xl font-bold ${pkg.popular ? 'text-white' : 'text-gray-900'}`}>N{pkg.price}</span>
          </div>
        </div>

        <div className={`flex items-center gap-2 mb-4 text-xs ${pkg.popular ? 'text-white/80' : 'text-gray-600'}`}>
          <Clock className="w-3.5 h-3.5" />
          <span>{pkg.duration}</span>
        </div>

        <ul className="space-y-2 mb-5">
          {pkg.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <div className={`flex-shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center mt-0.5 ${
                pkg.popular ? 'bg-white/20' : 'bg-[#7B2D8E]/10'
              }`}>
                <Check className={`w-2 h-2 ${pkg.popular ? 'text-white' : 'text-[#7B2D8E]'}`} />
              </div>
              <span className={`text-[11px] leading-relaxed ${pkg.popular ? 'text-white/90' : 'text-gray-600'}`}>{feature}</span>
            </li>
          ))}
        </ul>

        <Button
          asChild
          className={`w-full rounded-lg h-9 text-xs ${
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
      <section className="relative py-16 md:py-20 bg-[#7B2D8E] overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-[#D4A853]/10 rounded-full translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -translate-x-1/3 translate-y-1/3" />
        <div className="absolute top-1/2 left-8 w-2 h-2 bg-[#D4A853] rounded-full hidden md:block" />
        
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-4">
            <span className="text-xs font-medium text-[#D4A853] uppercase tracking-widest">Spa Packages</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-3">
            Choose Your <span className="text-[#D4A853]">Experience</span>
          </h1>
          <p className="text-sm md:text-base text-white/80">
            Carefully curated packages for ultimate relaxation
          </p>
          
          {/* Decorative line */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <div className="w-8 h-0.5 bg-[#D4A853]/50" />
            <div className="w-2 h-2 rounded-full bg-[#D4A853]" />
            <div className="w-8 h-0.5 bg-[#D4A853]/50" />
          </div>
        </div>
      </section>

      {/* Single Packages */}
      <section className="py-12 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center">
              <User className="w-4 h-4 text-[#7B2D8E]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Single Packages</h2>
              <p className="text-xs text-gray-500">Individual pampering sessions</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {singlePackages.map((pkg) => (
              <PackageCard key={`${pkg.name}-${pkg.type}`} pkg={pkg} />
            ))}
          </div>
        </div>
      </section>

      {/* Couple Packages */}
      <section className="py-12 bg-[#FDFBF9]">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-[#7B2D8E]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Couple Packages</h2>
              <p className="text-xs text-gray-500">Share the experience together</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
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
              <p className="text-xs font-semibold text-[#D4A853] uppercase tracking-widest mb-2">
                Gift Cards
              </p>
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
