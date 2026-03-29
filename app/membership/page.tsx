import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { Check, Crown, ArrowRight, Percent, Gift, Calendar, Users } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Platinum Membership | Dermaspace',
  description: 'Join the Dermaspace Platinum Subscription for exclusive benefits. 10% off treatments, priority booking, and unlimited access for 1 year.',
}

const benefits = [
  {
    icon: Percent,
    title: '10% Off Treatments',
    description: 'Enjoy 10% off all facial & body treatments, plus 5% off waxing and mani-pedi services',
  },
  {
    icon: Gift,
    title: 'Bonus Credit',
    description: 'Receive 10% of the amount you funded added to your capital as bonus credit',
  },
  {
    icon: Calendar,
    title: 'Priority Booking',
    description: 'Skip the queue with priority booking access for all appointments',
  },
  {
    icon: Users,
    title: 'Transferable',
    description: 'Transfer your subscription benefits to a third party when needed',
  },
]

const terms = [
  'We reserve the right to change or modify our rates',
  'Memberships are not refundable, non-exchangeable and cannot be used to purchase gift vouchers',
  'Pre-booking is required at all times but priority is given to platinum subscribers',
  'Funded account cannot be used to purchase beauty products',
  'Reservations are required. All appointments are subject to availability',
]

export default function MembershipPage() {
  return (
    <main>
      <Header />
      
      {/* Hero Section - Compact */}
      <section className="relative py-12 md:py-16 bg-[#7B2D8E] overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -translate-x-1/3 translate-y-1/3" />
        
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 mb-3">
            <Crown className="w-3.5 h-3.5 text-white" />
            <span className="text-xs font-medium text-white uppercase tracking-widest">Exclusive</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Platinum <span className="text-white/90">Subscription</span>
          </h1>
          <p className="text-sm text-white/80">
            Premium benefits, priority access, and savings on all treatments
          </p>
        </div>
        
        {/* Curved Bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 40" fill="none" preserveAspectRatio="none" className="w-full h-6 md:h-10">
            <path d="M0,40 C360,0 1080,0 1440,40 L1440,40 L0,40 Z" fill="#FDFBF9" />
          </svg>
        </div>
      </section>

      {/* Main Membership Card - Compact */}
      <section className="py-8 md:py-12 bg-[#FDFBF9]">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-[#7B2D8E] flex items-center justify-center flex-shrink-0">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-gray-900">Platinum Subscription</h2>
                  <p className="text-sm text-gray-500">Valid for 1 Year</p>
                </div>
                <div className="sm:text-right">
                  <span className="text-xs text-gray-500">Investment from</span>
                  <div className="text-xl md:text-2xl font-bold text-[#7B2D8E]">N500,000</div>
                  <span className="text-xs text-gray-500">& Above</span>
                </div>
              </div>

              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                At Dermaspace, we take pride in our quality of rejuvenating spa treatments, excellent customer service, and a wide range of spa services. Our platinum subscription avails you with incredible perks such as unlimited access, priority booking, free consultation, and more.
              </p>

              <Link 
                href="/contact"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7B2D8E] text-white font-semibold rounded-full hover:bg-[#5A1D6A] transition-colors text-sm"
              >
                Register for Membership
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits - Compact Cards */}
      <section className="py-8 md:py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-6">
            <p className="text-xs font-medium text-[#7B2D8E] uppercase tracking-widest mb-1">Member Benefits</p>
            <h2 className="text-lg md:text-xl font-bold text-gray-900">Exclusive Perks</h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {benefits.map((benefit) => (
              <div 
                key={benefit.title}
                className="bg-[#FDFBF9] rounded-xl p-4"
              >
                <div className="w-10 h-10 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center mb-3">
                  <benefit.icon className="w-5 h-5 text-[#7B2D8E]" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{benefit.title}</h3>
                <p className="text-xs text-gray-600 leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works - Compact */}
      <section className="py-8 md:py-12 bg-[#FDFBF9]">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <p className="text-xs font-medium text-[#7B2D8E] uppercase tracking-widest mb-1">How It Works</p>
              <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3">
                Start Your Journey
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Dermaspace Platinum Subscription Package is the most cost-effective way to treat yourself, indulge in self-pampering, and save money.
              </p>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#7B2D8E] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">Register & Fund</h4>
                    <p className="text-xs text-gray-600 mt-0.5">Sign up and fund your account with N500,000 or above</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#7B2D8E] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">Get 10% Bonus</h4>
                    <p className="text-xs text-gray-600 mt-0.5">Receive 10% bonus credit added to your funded amount</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#7B2D8E] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">Enjoy Benefits</h4>
                    <p className="text-xs text-gray-600 mt-0.5">Access all treatments with priority booking and discounts</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6401-1024x731.jpg-2JIwk298ibQ6byxSACK1nUh6Fnqjcw.webp"
                  alt="Spa Interior"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden mt-4">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6462-2048x1463.jpg-768x549-2-aOLyIQYjwEGezoOTEw78F0jLOjfkia.webp"
                  alt="Facial Treatment"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Terms - Compact */}
      <section className="py-8 md:py-12 bg-white">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center mb-4">
            <h2 className="text-base font-bold text-gray-900">Terms & Conditions</h2>
          </div>

          <div className="bg-[#FDFBF9] rounded-xl p-4 md:p-5">
            <ul className="space-y-2">
              {terms.map((term, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5 text-[#7B2D8E]" />
                  </div>
                  <span className="text-xs text-gray-600">{term}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-600">
                Questions? Contact <a href="mailto:info@dermaspaceng.com" className="text-[#7B2D8E] font-medium hover:underline">info@dermaspaceng.com</a>
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
