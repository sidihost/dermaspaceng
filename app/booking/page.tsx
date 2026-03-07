"use client"

import { useState } from "react"
import Image from "next/image"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { BookingFrame } from "@/components/booking/booking-frame"
import { Calendar, Clock, Phone, MessageCircle, Check, ArrowRight } from "lucide-react"

export default function BookingPage() {
  const [activeTab, setActiveTab] = useState<'online' | 'consultation'>('online')

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-[#FBF8F4] to-white">
        {/* Hero Section */}
        <section className="relative pt-28 pb-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#7B2D8E] via-[#9B4DB0] to-[#C41E8E]" />
          
          {/* Pattern overlay */}
          <div 
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
          
          <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-[10px] font-medium uppercase tracking-wider mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-[#D4A853] animate-pulse" />
              <span>Book Your Experience</span>
            </div>
            
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-white mb-3 leading-tight">
              Your Journey to{" "}
              <span className="text-[#D4A853]">Wellness</span>{" "}
              Starts Here
            </h1>
            
            <p className="text-sm text-white/70 max-w-xl mx-auto">
              Book your appointment online or schedule a free consultation with our expert estheticians
            </p>
            
            {/* Quick Stats */}
            <div className="flex flex-wrap justify-center gap-6 mt-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-sm">
                  <Calendar className="w-4 h-4 text-[#D4A853]" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-white font-medium">Easy Booking</p>
                  <p className="text-[10px] text-white/50">Online & Offline</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-sm">
                  <Clock className="w-4 h-4 text-[#D4A853]" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-white font-medium">Flexible Hours</p>
                  <p className="text-[10px] text-white/50">7 Days a Week</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Booking Tabs */}
        <section className="py-12 -mt-6 relative z-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Tab Switcher */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex bg-white rounded-xl p-1 shadow-sm">
                <button
                  onClick={() => setActiveTab('online')}
                  className={`px-6 py-2 rounded-lg font-medium text-xs transition-all duration-300 ${
                    activeTab === 'online'
                      ? 'bg-gradient-to-r from-[#7B2D8E] to-[#C41E8E] text-white'
                      : 'text-gray-600 hover:text-[#7B2D8E]'
                  }`}
                >
                  Book Online
                </button>
                <button
                  onClick={() => setActiveTab('consultation')}
                  className={`px-6 py-2 rounded-lg font-medium text-xs transition-all duration-300 ${
                    activeTab === 'consultation'
                      ? 'bg-gradient-to-r from-[#7B2D8E] to-[#C41E8E] text-white'
                      : 'text-gray-600 hover:text-[#7B2D8E]'
                  }`}
                >
                  Free Consultation
                </button>
              </div>
            </div>

            {/* Online Booking */}
            {activeTab === 'online' && (
              <div className="animate-fade-in">
                <BookingFrame minHeight={650} />
              </div>
            )}

            {/* Consultation Form */}
            {activeTab === 'consultation' && (
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm animate-fade-in">
                <div className="grid lg:grid-cols-2">
                  {/* Content */}
                  <div className="p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7B2D8E]/10 to-[#C41E8E]/10 flex items-center justify-center">
                        <svg className="w-5 h-5 text-[#7B2D8E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">Free Consultation</h2>
                        <p className="text-xs text-gray-500">Let our experts help you</p>
                      </div>
                    </div>

                    <p className="text-xs text-gray-600 mb-5 leading-relaxed">
                      Not sure which treatment is right for you? Schedule a free consultation with our certified estheticians who will analyze your skin and recommend personalized treatments.
                    </p>

                    <div className="space-y-2.5 mb-6">
                      {[
                        "Personalized skin analysis",
                        "Expert treatment recommendations",
                        "No obligation to book",
                        "Available at both branches"
                      ].map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-[#7B2D8E]" />
                          </div>
                          <span className="text-xs text-gray-700">{item}</span>
                        </div>
                      ))}
                    </div>

                    {/* Contact Options */}
                    <div className="space-y-2.5">
                      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">Contact us to schedule:</p>
                      <a
                        href="https://wa.me/+2349013134945"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-green-500 hover:bg-green-50 transition-all group"
                      >
                        <div className="w-9 h-9 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0">
                          <MessageCircle className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-900">WhatsApp (Ikoyi)</p>
                          <p className="text-[10px] text-gray-500">+234 901 313 4945</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-green-500 group-hover:translate-x-0.5 transition-all" />
                      </a>
                      <a
                        href="https://wa.me/+2349061836625"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-green-500 hover:bg-green-50 transition-all group"
                      >
                        <div className="w-9 h-9 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0">
                          <MessageCircle className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-900">WhatsApp (V.I)</p>
                          <p className="text-[10px] text-gray-500">+234 906 183 6625</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-green-500 group-hover:translate-x-0.5 transition-all" />
                      </a>
                      <a
                        href="tel:+2349017972919"
                        className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-[#7B2D8E] hover:bg-[#7B2D8E]/5 transition-all group"
                      >
                        <div className="w-9 h-9 rounded-lg bg-[#7B2D8E] flex items-center justify-center flex-shrink-0">
                          <Phone className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-900">Call Us</p>
                          <p className="text-[10px] text-gray-500">+234 901 797 2919</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#7B2D8E] group-hover:translate-x-0.5 transition-all" />
                      </a>
                    </div>
                  </div>

                  {/* Image */}
                  <div className="relative h-64 lg:h-auto">
                    <Image
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/franca-1-ZLFTvxIeaKIywWjr4amphoEGwfmuOe.webp"
                      alt="Dermaspace Expert Consultation"
                      fill
                      className="object-cover object-top"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#7B2D8E]/60 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <p className="text-white font-medium text-sm">Meet Our Experts</p>
                      <p className="text-white/70 text-xs">Licensed estheticians ready to help</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Why Book Section */}
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Section Title */}
            <div className="text-center max-w-2xl mx-auto mb-10">
              <div className="flex items-center gap-2 justify-center mb-3">
                <div className="h-px w-6 bg-gradient-to-r from-transparent to-[#7B2D8E]/50" />
                <span className="text-[10px] font-semibold text-[#7B2D8E] uppercase tracking-[0.2em]">Why Choose Us</span>
                <div className="h-px w-6 bg-gradient-to-l from-transparent to-[#7B2D8E]/50" />
              </div>
              <h2 className="text-xl md:text-2xl font-semibold text-gray-900">
                The Dermaspace <span className="text-[#7B2D8E]">Difference</span>
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {[
                {
                  image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6462-2048x1463.jpg-768x549-2-aOLyIQYjwEGezoOTEw78F0jLOjfkia.webp",
                  title: "Expert Treatments",
                  description: "World-class facial and body treatments"
                },
                {
                  image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6401-1024x731.jpg-2JIwk298ibQ6byxSACK1nUh6Fnqjcw.webp",
                  title: "Luxurious Environment",
                  description: "Elegantly designed spa with premium amenities"
                },
                {
                  image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-african-woman-resting-relaxing-with-sea-salt-back-spa-salon-5-768x512-1.jpg-qzDnc9aVQiTjypUgkMMu2l5wqwyRZG.webp",
                  title: "Premium Products",
                  description: "Only the finest skincare products"
                }
              ].map((item, index) => (
                <div
                  key={index}
                  className="group relative bg-white rounded-2xl overflow-hidden shadow-sm"
                >
                  <div className="aspect-[4/3] relative overflow-hidden">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/20 to-transparent" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-sm font-semibold text-white mb-0.5">{item.title}</h3>
                    <p className="text-[10px] text-white/70">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
