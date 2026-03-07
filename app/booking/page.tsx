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
        <section className="relative py-16 md:py-20 bg-[#7B2D8E] overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 left-1/4 w-24 h-24 bg-[#D4A853]/10 rounded-full -translate-y-1/2" />
          <div className="absolute bottom-0 right-1/4 w-36 h-36 bg-white/5 rounded-full translate-y-1/2" />
          <div className="absolute top-1/3 right-8 w-2 h-2 bg-[#D4A853] rounded-full hidden md:block" />
          <div className="absolute bottom-1/3 left-8 w-3 h-3 bg-white/20 rounded-full hidden md:block" />
          
          <div className="relative max-w-4xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-4">
              <span className="text-xs font-medium text-[#D4A853] uppercase tracking-widest">Book Your Experience</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-bold text-white mb-3">
              Book An <span className="text-[#D4A853]">Appointment</span>
            </h1>
            <p className="text-sm md:text-base text-white/80">
              Your journey to wellness starts here
            </p>
            
            {/* Decorative line */}
            <div className="flex items-center justify-center gap-2 mt-6">
              <div className="w-8 h-0.5 bg-[#D4A853]/50" />
              <div className="w-2 h-2 rounded-full bg-[#D4A853]" />
              <div className="w-8 h-0.5 bg-[#D4A853]/50" />
            </div>
          </div>
        </section>

        {/* Booking Section - Full Width */}
        <section className="py-8">
          <div className="w-full px-0 sm:px-4 lg:px-6">
            {/* Tab Switcher */}
            <div className="flex justify-center mb-8 px-4">
              <div className="inline-flex bg-white rounded-2xl p-1.5 border border-gray-200 shadow-sm">
                <button
                  onClick={() => setActiveTab('online')}
                  className={`px-8 py-3.5 rounded-xl text-base font-semibold transition-all ${
                    activeTab === 'online'
                      ? 'bg-[#7B2D8E] text-white shadow-md'
                      : 'text-gray-600 hover:text-[#7B2D8E]'
                  }`}
                >
                  Book Online
                </button>
                <button
                  onClick={() => setActiveTab('consultation')}
                  className={`px-8 py-3.5 rounded-xl text-base font-semibold transition-all ${
                    activeTab === 'consultation'
                      ? 'bg-[#7B2D8E] text-white shadow-md'
                      : 'text-gray-600 hover:text-[#7B2D8E]'
                  }`}
                >
                  Free Consultation
                </button>
              </div>
            </div>

            {/* Online Booking - Full Width */}
            {activeTab === 'online' && (
              <div className="w-full">
                <BookingFrame minHeight={750} className="rounded-none sm:rounded-2xl" />
              </div>
            )}

            {/* Consultation */}
            {activeTab === 'consultation' && (
              <div className="max-w-5xl mx-auto px-4">
                <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="grid lg:grid-cols-2">
                    <div className="p-8 lg:p-12">
                      <p className="text-sm font-semibold text-[#7B2D8E] uppercase tracking-widest mb-3">
                        Get Expert Advice
                      </p>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Free Consultation</h2>
                      <div className="flex items-center gap-2 mb-6">
                        <div className="w-12 h-0.5 bg-[#D4A853]" />
                        <div className="w-3 h-0.5 bg-[#7B2D8E]/30" />
                      </div>
                      <p className="text-lg text-gray-600 mb-8">
                        Not sure which treatment is right for you? Schedule a free consultation with our experts.
                      </p>

                      <div className="space-y-4 mb-10">
                        {[
                          "Personalized skin analysis",
                          "Expert treatment recommendations",
                          "No obligation to book",
                          "Available at both branches"
                        ].map((item, index) => (
                          <div key={index} className="flex items-center gap-4">
                            <div className="w-6 h-6 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center">
                              <Check className="w-4 h-4 text-[#7B2D8E]" />
                            </div>
                            <span className="text-base text-gray-700">{item}</span>
                          </div>
                        ))}
                      </div>

                      <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-5">
                        Contact us to schedule
                      </p>
                      
                      <div className="space-y-4">
                        <a
                          href="https://wa.me/+2349013134945"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-4 p-5 rounded-2xl border border-gray-100 hover:border-[#7B2D8E]/30 hover:bg-[#7B2D8E]/5 transition-all group"
                        >
                          <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center">
                            <MessageCircle className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 text-lg">WhatsApp (Ikoyi)</p>
                            <p className="text-base text-gray-500">+234 901 313 4945</p>
                          </div>
                          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#7B2D8E] group-hover:translate-x-1 transition-all" />
                        </a>
                        <a
                          href="https://wa.me/+2349061836625"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-4 p-5 rounded-2xl border border-gray-100 hover:border-[#7B2D8E]/30 hover:bg-[#7B2D8E]/5 transition-all group"
                        >
                          <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center">
                            <MessageCircle className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 text-lg">WhatsApp (V.I)</p>
                            <p className="text-base text-gray-500">+234 906 183 6625</p>
                          </div>
                          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#7B2D8E] group-hover:translate-x-1 transition-all" />
                        </a>
                        <a
                          href="tel:+2349017972919"
                          className="flex items-center gap-4 p-5 rounded-2xl border border-gray-100 hover:border-[#7B2D8E]/30 hover:bg-[#7B2D8E]/5 transition-all group"
                        >
                          <div className="w-12 h-12 rounded-xl bg-[#7B2D8E] flex items-center justify-center">
                            <Phone className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 text-lg">Call Us</p>
                            <p className="text-base text-gray-500">+234 901 797 2919</p>
                          </div>
                          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#7B2D8E] group-hover:translate-x-1 transition-all" />
                        </a>
                      </div>
                    </div>

                    <div className="relative h-72 lg:h-auto">
                      <Image
                        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/franca-1-ZLFTvxIeaKIywWjr4amphoEGwfmuOe.webp"
                        alt="Dermaspace Expert"
                        fill
                        className="object-cover object-top"
                      />
                    </div>
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
