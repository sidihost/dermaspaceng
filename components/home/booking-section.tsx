'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, ArrowRight, Phone, Check, Gift, Home, Search, ChevronRight, RefreshCw } from 'lucide-react'
import Image from 'next/image'
import SectionHeader from '@/components/shared/section-header'

export default function BookingSection() {
  const [animateIn, setAnimateIn] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setAnimateIn(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <section className="py-16 md:py-24 bg-[#F8F2FB] overflow-hidden">
      <div className="max-w-6xl mx-auto px-4">
        <SectionHeader 
          badge="Coming Soon"
          title="Online"
          highlight="Booking"
          description="We're building a seamless booking experience. Soon you'll be able to schedule appointments, purchase gift vouchers, and manage your visits."
        />

        {/* Mockups Display - Both Desktop and Mobile Views */}
        <div className={`mt-8 md:mt-10 transition-all duration-700 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          
          {/* Mockups Container - Fixed Height */}
          <div className="flex items-center md:items-end justify-center h-[260px] sm:h-[290px] md:h-[380px]">
            
            {/* Desktop Browser Mockup */}
            <div className="w-[180px] sm:w-[220px] md:w-[280px] lg:w-[340px] transform -rotate-1 flex-shrink-0">
              <div className="bg-white rounded-xl overflow-hidden shadow-lg border border-gray-200">
                {/* Browser Chrome */}
                <div className="bg-gray-50 px-2 py-1.5 flex items-center gap-2 border-b border-gray-100">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#9B4DB0]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#C48DD0]" />
                  </div>
                  <div className="flex-1">
                    <div className="bg-white rounded px-2 py-0.5 text-[6px] text-gray-400">
                      dermaspaceng.com/booking
                    </div>
                  </div>
                </div>
                
                {/* App Content */}
                <div className="bg-white">
                  {/* Header */}
                  <div className="bg-[#7B2D8E] px-2 py-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded bg-white flex items-center justify-center">
                        <Image src="/images/dermaspace-logo.png" alt="Dermaspace" width={10} height={10} className="object-contain" />
                      </div>
                      <div>
                        <p className="text-[7px] font-bold text-white">Book Appointment</p>
                        <p className="text-[5px] text-white/70">Select treatment</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Steps */}
                  <div className="px-2 py-1.5 border-b border-gray-50">
                    <div className="flex items-center justify-center gap-1">
                      {[1, 2, 3].map((step, idx) => (
                        <div key={step} className="flex items-center">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[6px] font-bold ${
                            step === 1 ? 'bg-[#7B2D8E] text-white' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {step}
                          </div>
                          {idx < 2 && <div className="w-4 md:w-6 h-px bg-gray-200 mx-1" />}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Category Pills */}
                  <div className="px-2 py-1.5 flex gap-1">
                    {['Facial', 'Body', 'Nails'].map((cat, i) => (
                      <span
                        key={cat}
                        className={`px-1.5 py-0.5 rounded-full text-[6px] font-medium ${
                          i === 0 ? 'bg-[#7B2D8E] text-white' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                  
                  {/* Treatment Cards */}
                  <div className="px-2 pb-2 space-y-1">
                    {[
                      { name: 'Signature Glow', price: '₦45,000', selected: true },
                      { name: 'Hydrafacial', price: '₦35,000', selected: false },
                    ].map((t) => (
                      <div 
                        key={t.name} 
                        className={`flex items-center gap-1.5 p-1.5 rounded border ${
                          t.selected ? 'border-[#7B2D8E] bg-[#7B2D8E]/5' : 'border-gray-100'
                        }`}
                      >
                        <div className={`w-3 h-3 rounded border flex items-center justify-center flex-shrink-0 ${
                          t.selected ? 'bg-[#7B2D8E] border-[#7B2D8E]' : 'border-gray-300'
                        }`}>
                          {t.selected && <Check className="w-2 h-2 text-white" strokeWidth={3} />}
                        </div>
                        <p className="text-[7px] font-medium text-gray-900 flex-1">{t.name}</p>
                        <p className="text-[7px] font-bold text-[#7B2D8E]">{t.price}</p>
                      </div>
                    ))}
                  </div>
                  
                  {/* Continue Button */}
                  <div className="px-2 pb-2">
                    <button className="w-full py-1.5 bg-[#7B2D8E] text-white rounded text-[7px] font-bold">
                      Continue
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Phone Mockup - Purple Frame */}
            <div className="h-[250px] sm:h-[290px] md:h-[330px] lg:h-[370px] aspect-[9/19] transform rotate-2 flex-shrink-0 -ml-4 md:-ml-6">
              {/* Purple device frame */}
              <div className="h-full bg-[#7B2D8E] rounded-[20px] md:rounded-[24px] p-1 shadow-lg">
                <div className="h-full bg-white rounded-[16px] md:rounded-[20px] overflow-hidden flex flex-col">
                  {/* Notch */}
                  <div className="h-4 bg-white flex items-center justify-center">
                    <div className="w-12 h-3 bg-[#7B2D8E] rounded-b-lg" />
                  </div>
                
                  {/* App Header */}
                  <div className="bg-[#7B2D8E] px-2 pb-2">
                    <div className="flex items-center gap-1 mb-1">
                      <div className="w-4 h-4 rounded bg-white flex items-center justify-center">
                        <Image src="/images/dermaspace-logo.png" alt="Dermaspace" width={10} height={10} className="object-contain" />
                      </div>
                      <p className="text-[7px] font-bold text-white">My Bookings</p>
                    </div>
                    
                    {/* Stats */}
                    <div className="bg-white/15 rounded p-1.5">
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-[5px] text-white/60">This Month</p>
                          <p className="text-sm font-bold text-white leading-none">3</p>
                        </div>
                        <div className="flex items-end gap-px">
                          {[4, 7, 5, 9, 6].map((h, i) => (
                            <div key={i} className="w-1 rounded-t bg-white/40" style={{ height: `${h}px` }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="p-1.5 space-y-1 bg-gray-50 flex-1">
                    {[
                      { name: 'Facial', time: 'Today', status: 'Done' },
                      { name: 'Massage', time: 'Tomorrow', status: 'Soon' },
                    ].map((apt, i) => (
                      <div key={i} className="bg-white rounded p-1.5 border border-gray-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[7px] font-semibold text-gray-900">{apt.name}</p>
                            <p className="text-[5px] text-gray-400">{apt.time}</p>
                          </div>
                          <span className={`text-[5px] font-bold px-1 py-0.5 rounded-full ${
                            apt.status === 'Done' ? 'bg-[#7B2D8E] text-white' : 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
                          }`}>
                            {apt.status}
                          </span>
                        </div>
                      </div>
                    ))}
                    
                    {/* Book Button */}
                    <button className="w-full py-1 bg-[#7B2D8E] text-white rounded text-[6px] font-bold">
                      Book New
                    </button>
                  </div>
                  
                  {/* Bottom Navigation */}
                  <div className="bg-[#7B2D8E] py-1.5 px-1">
                    <div className="flex items-end justify-around">
                      <div className="flex flex-col items-center">
                        <div className="w-4 h-4 rounded bg-white/20 flex items-center justify-center">
                          <Home className="w-2 h-2 text-white" />
                        </div>
                        <span className="text-[4px] text-white mt-0.5">Home</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-4 h-4 flex items-center justify-center">
                          <div className="grid grid-cols-2 gap-px">
                            {[1,2,3,4].map(i => <div key={i} className="w-0.5 h-0.5 rounded-full bg-white/60" />)}
                          </div>
                        </div>
                        <span className="text-[4px] text-white/70 mt-0.5">Services</span>
                      </div>
                      <div className="flex flex-col items-center -mt-2">
                        <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                          <Search className="w-3 h-3 text-[#7B2D8E]" />
                        </div>
                        <span className="text-[4px] text-white mt-0.5">Search</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-4 h-4 flex items-center justify-center">
                          <Gift className="w-2 h-2 text-white/60" />
                        </div>
                        <span className="text-[4px] text-white/70 mt-0.5">Packages</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-4 h-4 flex items-center justify-center">
                          <Calendar className="w-2 h-2 text-white/60" />
                        </div>
                        <span className="text-[4px] text-white/70 mt-0.5">Book</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Home Indicator */}
                  <div className="h-3 bg-[#7B2D8E] flex items-center justify-center">
                    <div className="w-8 h-0.5 bg-white/40 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 mt-10 md:mt-12 transition-all duration-700 delay-200 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {[
            { icon: Calendar, title: '24/7 Scheduling', desc: 'Book anytime' },
            { icon: Clock, title: 'Real-time Slots', desc: 'See availability' },
            { icon: Gift, title: 'Gift Vouchers', desc: 'Gift of glow' },
            { icon: RefreshCw, title: 'Easy Manage', desc: 'Reschedule easy' },
          ].map((feature) => (
            <div key={feature.title} className="bg-white border border-gray-100 rounded-xl p-3 md:p-4 hover:shadow-md hover:border-[#7B2D8E]/20 transition-all">
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center mb-2">
                <feature.icon className="w-4 h-4 text-[#7B2D8E]" />
              </div>
              <h3 className="text-xs font-bold text-gray-900 mb-0.5">{feature.title}</h3>
              <p className="text-[10px] text-gray-500">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className={`flex flex-col items-start gap-3 mt-8 transition-all duration-700 delay-300 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <a
            href="tel:+2349017972919"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#7B2D8E] text-white rounded-lg text-sm font-semibold hover:bg-[#6B2D7E] transition-colors"
          >
            <Phone className="w-4 h-4" />
            Call to Book
          </a>
          <a
            href="https://wa.me/+2349013134945"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#7B2D8E] border border-[#7B2D8E] rounded-lg text-sm font-semibold hover:bg-[#7B2D8E]/5 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            WhatsApp Us
          </a>
        </div>
      </div>
    </section>
  )
}
