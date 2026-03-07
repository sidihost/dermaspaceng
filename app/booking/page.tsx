"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { Calendar, Clock, Sparkles, ArrowRight, Gift, CreditCard, Percent, Phone, MessageCircle } from "lucide-react"

export default function BookingPage() {
  const [activeTab, setActiveTab] = useState<'online' | 'consultation'>('online')

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--derma-cream)]">
        {/* Hero Section */}
        <section className="relative pt-32 pb-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--derma-purple)] via-[var(--derma-purple-dark)] to-[var(--derma-magenta)]" />
          
          {/* Decorative Elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-[var(--derma-magenta)]/30 blur-3xl" />
            <div className="absolute top-1/2 -left-32 w-64 h-64 rounded-full bg-[var(--derma-gold)]/20 blur-3xl" />
            <div className="absolute bottom-0 right-1/3 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
          </div>
          
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/90 text-sm font-medium mb-6 backdrop-blur-sm">
                  <Sparkles className="w-4 h-4" />
                  Book Your Experience
                </span>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                  Your Journey to{" "}
                  <span className="text-[var(--derma-gold)]">Wellness</span>{" "}
                  Starts Here
                </h1>
                <p className="text-lg md:text-xl text-white/80 mb-8 leading-relaxed">
                  Book your appointment online or schedule a free consultation with our expert estheticians to discover the perfect treatments for you.
                </p>
                
                {/* Quick Stats */}
                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
                      <Calendar className="w-6 h-6 text-[var(--derma-gold)]" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">Easy Booking</p>
                      <p className="text-white/60 text-sm">Online & Offline</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
                      <Clock className="w-6 h-6 text-[var(--derma-gold)]" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">Flexible Hours</p>
                      <p className="text-white/60 text-sm">7 Days a Week</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot_55-SAfBrHHb9LcLPNW7pEtKSIkAVLBxnu.webp"
                    alt="Gift"
                    width={80}
                    height={80}
                    className="mb-4"
                  />
                  <h3 className="text-white font-bold text-lg mb-2">Gift Vouchers Available</h3>
                  <p className="text-white/70 text-sm">Surprise your loved ones with the gift of wellness</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-3xl p-5 border border-white/20">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot_54-NVfn8QSj1KeH3S45VlhgeTdlekrOGo.webp"
                    alt="Discounts"
                    width={60}
                    height={60}
                    className="mb-3"
                  />
                  <h4 className="text-white font-semibold mb-1">Member Discounts</h4>
                  <p className="text-white/60 text-xs">Up to 10% off</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-3xl p-5 border border-white/20">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot_53-piF1WJUKcbW7XkKutBpZRqPp8XL7xe.webp"
                    alt="Payments"
                    width={60}
                    height={60}
                    className="mb-3"
                  />
                  <h4 className="text-white font-semibold mb-1">Easy Payments</h4>
                  <p className="text-white/60 text-xs">Multiple options</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Booking Tabs */}
        <section className="py-16 -mt-8 relative z-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Tab Switcher */}
            <div className="flex justify-center mb-10">
              <div className="inline-flex bg-white rounded-2xl p-1.5">
                <button
                  onClick={() => setActiveTab('online')}
                  className={`px-8 py-3 rounded-xl font-medium text-sm transition-all duration-300 ${
                    activeTab === 'online'
                      ? 'bg-gradient-to-r from-[var(--derma-purple)] to-[var(--derma-magenta)] text-white'
                      : 'text-gray-600 hover:text-[var(--derma-purple)]'
                  }`}
                >
                  Book Online
                </button>
                <button
                  onClick={() => setActiveTab('consultation')}
                  className={`px-8 py-3 rounded-xl font-medium text-sm transition-all duration-300 ${
                    activeTab === 'consultation'
                      ? 'bg-gradient-to-r from-[var(--derma-purple)] to-[var(--derma-magenta)] text-white'
                      : 'text-gray-600 hover:text-[var(--derma-purple)]'
                  }`}
                >
                  Free Consultation
                </button>
              </div>
            </div>

            {/* Online Booking */}
            {activeTab === 'online' && (
              <div className="bg-white rounded-3xl overflow-hidden animate-fade-in">
                <div className="p-8 border-b border-gray-100">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--derma-purple)] to-[var(--derma-magenta)] flex items-center justify-center">
                      <Calendar className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-[var(--derma-purple-dark)]">Book Your Appointment</h2>
                      <p className="text-gray-500">Select your preferred service, date, and time</p>
                    </div>
                  </div>
                </div>
                
                {/* Splice Booking Embed */}
                <div className="relative">
                  <iframe
                    src="https://app.withsplice.com/s/dermaspaceng"
                    width="100%"
                    height="600"
                    style={{ border: 'none' }}
                    title="Dermaspace Booking"
                  />
                </div>
              </div>
            )}

            {/* Consultation Form */}
            {activeTab === 'consultation' && (
              <div className="bg-white rounded-3xl p-8 md:p-10 animate-fade-in">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--derma-purple)] to-[var(--derma-magenta)] flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-[var(--derma-purple-dark)]">Free Consultation</h2>
                    <p className="text-gray-500">Let our experts help you find the perfect treatment</p>
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-10">
                  <div>
                    <p className="text-gray-600 mb-6 leading-relaxed">
                      Not sure which treatment is right for you? Schedule a free consultation with our certified estheticians who will analyze your skin and recommend personalized treatments tailored to your needs.
                    </p>

                    <div className="space-y-4 mb-8">
                      {[
                        "Personalized skin analysis",
                        "Expert treatment recommendations",
                        "No obligation to book",
                        "Available at both branches"
                      ].map((item, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-[var(--derma-purple)]/10 flex items-center justify-center">
                            <svg className="w-4 h-4 text-[var(--derma-purple)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <span className="text-gray-700">{item}</span>
                        </div>
                      ))}
                    </div>

                    {/* Contact Options */}
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-gray-700 mb-3">Contact us to schedule:</p>
                      <Link
                        href="https://wa.me/+2349013134945"
                        target="_blank"
                        className="flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-green-500 hover:bg-green-50 transition-all group"
                      >
                        <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0">
                          <MessageCircle className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">WhatsApp (Ikoyi)</p>
                          <p className="text-sm text-gray-500">+234 901 313 4945</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-green-500 group-hover:translate-x-1 transition-all" />
                      </Link>
                      <Link
                        href="https://wa.me/+2349061836625"
                        target="_blank"
                        className="flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-green-500 hover:bg-green-50 transition-all group"
                      >
                        <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0">
                          <MessageCircle className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">WhatsApp (V.I)</p>
                          <p className="text-sm text-gray-500">+234 906 183 6625</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-green-500 group-hover:translate-x-1 transition-all" />
                      </Link>
                      <Link
                        href="tel:+2349017972919"
                        className="flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-[var(--derma-purple)] hover:bg-[var(--derma-purple)]/5 transition-all group"
                      >
                        <div className="w-12 h-12 rounded-xl bg-[var(--derma-purple)] flex items-center justify-center flex-shrink-0">
                          <Phone className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">Call Us</p>
                          <p className="text-sm text-gray-500">+234 901 797 2919</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[var(--derma-purple)] group-hover:translate-x-1 transition-all" />
                      </Link>
                    </div>
                  </div>

                  {/* Image */}
                  <div className="relative rounded-3xl overflow-hidden h-[400px] lg:h-auto">
                    <Image
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/franca-1-ZLFTvxIeaKIywWjr4amphoEGwfmuOe.webp"
                      alt="Dermaspace Expert Consultation"
                      fill
                      className="object-cover object-top"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--derma-purple)]/60 to-transparent" />
                    <div className="absolute bottom-6 left-6 right-6">
                      <p className="text-white font-semibold text-lg">Meet Our Experts</p>
                      <p className="text-white/80 text-sm">Licensed estheticians ready to help</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Why Book With Us */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-2 rounded-full bg-[var(--derma-purple)]/10 text-[var(--derma-purple)] text-sm font-medium mb-4">
                Why Choose Us
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-[var(--derma-purple-dark)] mb-4">
                The Dermaspace Difference
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6462-2048x1463.jpg-768x549-2-aOLyIQYjwEGezoOTEw78F0jLOjfkia.webp",
                  title: "Expert Treatments",
                  description: "World-class facial and body treatments by certified professionals"
                },
                {
                  image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6401-1024x731.jpg-2JIwk298ibQ6byxSACK1nUh6Fnqjcw.webp",
                  title: "Luxurious Environment",
                  description: "Relax in our elegantly designed spa with premium amenities"
                },
                {
                  image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-african-woman-resting-relaxing-with-sea-salt-back-spa-salon-5-768x512-1.jpg-qzDnc9aVQiTjypUgkMMu2l5wqwyRZG.webp",
                  title: "Premium Products",
                  description: "We use only the finest skincare products for optimal results"
                }
              ].map((item, index) => (
                <div
                  key={index}
                  className="group relative bg-white rounded-3xl overflow-hidden"
                >
                  <div className="aspect-[4/3] relative overflow-hidden">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--derma-purple-dark)] via-transparent to-transparent opacity-80" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-white/80 text-sm">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Popular Services Quick Book */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-[var(--derma-purple-dark)] mb-4">
                Popular Services
              </h2>
              <p className="text-gray-600">Quick access to our most requested treatments</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6468-2-2048x1463.jpg-1024x732-1-dKeUu4w0K7uutGPH5gmeN7nXrcuOu2.webp",
                  title: "Facial Treatments",
                  price: "From N25,000"
                },
                {
                  image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-young-girl-beauty-salon-1024x681.jpg-oxGrqVSRoD400FZKPP5mLOdN42EJvX.webp",
                  title: "Waxing Services",
                  price: "From N5,000"
                },
                {
                  image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/young-woman-getting-her-nails-done-salon-scaled.jpg-768x512-1-dTT1qPz9fJm1tSGBMYraVrKPoDeTdC.webp",
                  title: "Nail Care",
                  price: "From N10,000"
                },
                {
                  image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-african-woman-resting-relaxing-with-sea-salt-back-spa-salon-5-768x512-1.jpg-qzDnc9aVQiTjypUgkMMu2l5wqwyRZG.webp",
                  title: "Body Massage",
                  price: "From N30,000"
                }
              ].map((service, index) => (
                <Link
                  key={index}
                  href="#"
                  onClick={() => setActiveTab('online')}
                  className="group relative bg-[var(--derma-cream)] rounded-2xl overflow-hidden"
                >
                  <div className="aspect-square relative overflow-hidden">
                    <Image
                      src={service.image}
                      alt={service.title}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-[var(--derma-purple)]/0 group-hover:bg-[var(--derma-purple)]/40 transition-colors duration-300" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <span className="px-6 py-3 bg-white text-[var(--derma-purple)] font-semibold rounded-full">
                        Book Now
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-[var(--derma-purple-dark)]">{service.title}</h3>
                    <p className="text-sm text-[var(--derma-purple)]">{service.price}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
