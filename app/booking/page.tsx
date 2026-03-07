"use client"

import { useState } from "react"
import Image from "next/image"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { BookingFrame } from "@/components/booking/booking-frame"
import { Phone, MessageCircle, Check, ArrowRight } from "lucide-react"

export default function BookingPage() {
  const [activeTab, setActiveTab] = useState<'online' | 'consultation'>('online')

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#FDFBF9]">
        {/* Hero Section */}
        <section className="bg-[#7B2D8E] py-16">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <p className="text-xs font-semibold text-white/70 uppercase tracking-widest mb-4">
              Book Your Experience
            </p>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Your Journey to Wellness Starts Here
            </h1>
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-8 h-0.5 bg-[#D4A853]" />
              <div className="w-2 h-0.5 bg-white/30" />
            </div>
            <p className="text-sm text-white/80 max-w-lg mx-auto">
              Book your appointment online or schedule a free consultation
            </p>
          </div>
        </section>

        {/* Booking Section */}
        <section className="py-12">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            {/* Tab Switcher */}
            <div className="flex justify-center mb-10">
              <div className="inline-flex bg-white rounded-xl p-1.5 border border-gray-200">
                <button
                  onClick={() => setActiveTab('online')}
                  className={`px-8 py-3 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'online'
                      ? 'bg-[#7B2D8E] text-white'
                      : 'text-gray-600 hover:text-[#7B2D8E]'
                  }`}
                >
                  Book Online
                </button>
                <button
                  onClick={() => setActiveTab('consultation')}
                  className={`px-8 py-3 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'consultation'
                      ? 'bg-[#7B2D8E] text-white'
                      : 'text-gray-600 hover:text-[#7B2D8E]'
                  }`}
                >
                  Free Consultation
                </button>
              </div>
            </div>

            {/* Online Booking */}
            {activeTab === 'online' && (
              <BookingFrame minHeight={700} />
            )}

            {/* Consultation */}
            {activeTab === 'consultation' && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="grid lg:grid-cols-2">
                  <div className="p-8 lg:p-10">
                    <p className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest mb-3">
                      Get Expert Advice
                    </p>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Free Consultation</h2>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-0.5 bg-[#D4A853]" />
                      <div className="w-2 h-0.5 bg-[#7B2D8E]/30" />
                    </div>
                    <p className="text-gray-600 mb-6">
                      Not sure which treatment is right for you? Schedule a free consultation with our experts.
                    </p>

                    <div className="space-y-3 mb-8">
                      {[
                        "Personalized skin analysis",
                        "Expert treatment recommendations",
                        "No obligation to book",
                        "Available at both branches"
                      ].map((item, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center">
                            <Check className="w-3 h-3 text-[#7B2D8E]" />
                          </div>
                          <span className="text-sm text-gray-700">{item}</span>
                        </div>
                      ))}
                    </div>

                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
                      Contact us to schedule
                    </p>
                    
                    <div className="space-y-3">
                      <a
                        href="https://wa.me/+2349013134945"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-[#7B2D8E]/30 hover:bg-[#7B2D8E]/5 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
                          <MessageCircle className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">WhatsApp (Ikoyi)</p>
                          <p className="text-sm text-gray-500">+234 901 313 4945</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </a>
                      <a
                        href="https://wa.me/+2349061836625"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-[#7B2D8E]/30 hover:bg-[#7B2D8E]/5 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
                          <MessageCircle className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">WhatsApp (V.I)</p>
                          <p className="text-sm text-gray-500">+234 906 183 6625</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </a>
                      <a
                        href="tel:+2349017972919"
                        className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-[#7B2D8E]/30 hover:bg-[#7B2D8E]/5 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-lg bg-[#7B2D8E] flex items-center justify-center">
                          <Phone className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">Call Us</p>
                          <p className="text-sm text-gray-500">+234 901 797 2919</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </a>
                    </div>
                  </div>

                  <div className="relative h-64 lg:h-auto">
                    <Image
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/franca-1-ZLFTvxIeaKIywWjr4amphoEGwfmuOe.webp"
                      alt="Dermaspace Expert"
                      fill
                      className="object-cover object-top"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
