import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { Check, Crown, ArrowRight, Percent, Gift, Calendar, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Platinum Membership',
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
    icon: Star,
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
      
      {/* Hero Section */}
      <section className="relative py-24 bg-gradient-to-br from-[#7B2D8E] via-[#5A1D6A] to-[#7B2D8E] overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-[#D4A853] blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-white blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 lg:px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D4A853]/20 text-[#D4A853] text-sm font-medium mb-6">
              <Crown className="w-4 h-4" />
              <span>Exclusive Membership</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white text-balance">
              Platinum <span className="text-[#D4A853]">Subscription</span>
            </h1>
            <p className="mt-6 text-lg text-white/70 text-pretty">
              Join our exclusive membership program and enjoy premium benefits, priority access, and significant savings on all your spa treatments.
            </p>
          </div>
        </div>
      </section>

      {/* Main Membership Card */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="max-w-4xl mx-auto">
            <div className="relative bg-gradient-to-br from-[#7B2D8E] to-[#5A1D6A] rounded-3xl p-8 lg:p-12 text-white overflow-hidden">
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot_55-SAfBrHHb9LcLPNW7pEtKSIkAVLBxnu.webp"
                  alt=""
                  fill
                  className="object-contain"
                />
              </div>

              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-[#D4A853] flex items-center justify-center">
                    <Crown className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Platinum Subscription</h2>
                    <p className="text-white/70">Valid for 1 Year</p>
                  </div>
                </div>

                <div className="mb-8">
                  <span className="text-white/70">Investment from</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold">N500,000</span>
                    <span className="text-white/70">& Above</span>
                  </div>
                </div>

                <p className="text-white/80 text-lg leading-relaxed mb-8">
                  At Dermaspace, we take pride in our quality of rejuvenating spa treatments, excellent customer service, and a wide range of spa services. Our platinum subscription avails you with incredible perks such as unlimited access, priority booking, free consultation, and more.
                </p>

                <Button
                  asChild
                  size="lg"
                  className="bg-[#D4A853] hover:bg-[#c49743] text-white rounded-full px-8 h-14"
                >
                  <Link href="/contact" className="flex items-center gap-2">
                    Register for Membership
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24 bg-gradient-to-b from-[#FBF8F4] to-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="text-center mb-16">
            <span className="text-[#7B2D8E] text-sm font-semibold tracking-wider uppercase">
              Member Benefits
            </span>
            <h2 className="mt-4 text-3xl md:text-4xl font-bold text-gray-900">
              Exclusive <span className="gradient-text">Perks</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit) => (
              <div 
                key={benefit.title}
                className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-[#7B2D8E]/20 transition-colors"
              >
                <div className="w-14 h-14 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center mb-6">
                  <benefit.icon className="w-7 h-7 text-[#7B2D8E]" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-gray-600 text-sm">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-[#7B2D8E] text-sm font-semibold tracking-wider uppercase">
                How It Works
              </span>
              <h2 className="mt-4 text-3xl md:text-4xl font-bold text-gray-900 text-balance">
                Start Your <span className="gradient-text">Journey</span>
              </h2>
              <p className="mt-6 text-lg text-gray-600 text-pretty">
                Dermaspace Platinum Subscription Package is the most cost-effective way to treat yourself, indulge in premium self-pampering, and save money.
              </p>

              <div className="mt-8 space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#7B2D8E] text-white flex items-center justify-center font-bold">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Register & Fund</h4>
                    <p className="text-gray-600 text-sm mt-1">Sign up and fund your account with N500,000 or above</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#7B2D8E] text-white flex items-center justify-center font-bold">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Get 10% Bonus</h4>
                    <p className="text-gray-600 text-sm mt-1">Receive 10% bonus credit added to your funded amount</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#7B2D8E] text-white flex items-center justify-center font-bold">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Enjoy Benefits</h4>
                    <p className="text-gray-600 text-sm mt-1">Access all treatments with priority booking and discounts</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6401-1024x731.jpg-2JIwk298ibQ6byxSACK1nUh6Fnqjcw.webp"
                    alt="Spa Interior"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden mt-8">
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
        </div>
      </section>

      {/* Terms */}
      <section className="py-24 bg-gradient-to-b from-[#FBF8F4] to-white">
        <div className="max-w-4xl mx-auto px-4 lg:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-gray-900">Terms & Conditions</h2>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-8">
            <ul className="space-y-4">
              {terms.map((term, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mt-0.5">
                    <Check className="w-3 h-3 text-[#7B2D8E]" />
                  </div>
                  <span className="text-gray-600">{term}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-gray-600 text-sm">
                Please contact <a href="mailto:info@dermaspaceng.com" className="text-[#7B2D8E] hover:underline">info@dermaspaceng.com</a> for questions and concerns
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
