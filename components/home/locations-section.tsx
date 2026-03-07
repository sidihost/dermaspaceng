'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Phone, Clock, ArrowRight, Navigation, Sparkles } from 'lucide-react'

const locations = [
  {
    id: 'vi',
    name: 'Victoria Island',
    shortName: 'VI',
    address: '237b Muri Okunola Street, Victoria Island, Lagos',
    phone: '+234 901 797 2919',
    hours: 'Mon - Sat: 9am - 7pm',
    mapUrl: 'https://maps.google.com/maps?q=6.4281,3.4219',
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&h=300&fit=crop'
  },
  {
    id: 'ikoyi',
    name: 'Ikoyi',
    shortName: 'IKY',
    address: '44A, Awolowo Road, Ikoyi, Lagos',
    phone: '+234 816 776 4757',
    hours: 'Mon - Sat: 9am - 7pm',
    mapUrl: 'https://maps.google.com/maps?q=6.4461,3.4384',
    image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&h=300&fit=crop'
  }
]

export default function LocationsSection() {
  const [activeLocation, setActiveLocation] = useState(locations[0])

  return (
    <section className="py-20 bg-white overflow-hidden">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#7B2D8E]/10 mb-4">
            <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Find Us</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Our <span className="text-[#7B2D8E]">Locations</span>
          </h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Visit us at our premium spa locations in Lagos for an unforgettable wellness experience
          </p>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-5 gap-8 items-start">
          {/* Location Selector - Left */}
          <div className="lg:col-span-2 space-y-4">
            {locations.map((loc) => (
              <button
                key={loc.id}
                onClick={() => setActiveLocation(loc)}
                className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-300 ${
                  activeLocation.id === loc.id
                    ? 'border-[#7B2D8E] bg-gradient-to-br from-[#7B2D8E] to-[#5A1D6A] text-white shadow-xl shadow-[#7B2D8E]/20'
                    : 'border-gray-100 bg-white hover:border-[#7B2D8E]/30 hover:shadow-md'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 text-lg font-bold ${
                    activeLocation.id === loc.id ? 'bg-white/20 text-white' : 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
                  }`}>
                    {loc.shortName}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold text-lg mb-1 ${activeLocation.id === loc.id ? 'text-white' : 'text-gray-900'}`}>
                      {loc.name}
                    </h3>
                    <p className={`text-sm truncate ${activeLocation.id === loc.id ? 'text-white/80' : 'text-gray-500'}`}>
                      {loc.address}
                    </p>
                  </div>
                </div>
              </button>
            ))}

            {/* Quick Contact */}
            <div className="mt-6 p-5 rounded-2xl bg-[#FDFBF9] border border-[#7B2D8E]/10">
              <p className="text-sm font-medium text-gray-900 mb-3">Quick Contact</p>
              <div className="space-y-2">
                <a href="tel:+2349017972919" className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#7B2D8E]">
                  <Phone className="w-4 h-4 text-[#7B2D8E]" />
                  +234 901 797 2919
                </a>
                <p className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4 text-[#7B2D8E]" />
                  Mon - Sat: 9am - 7pm
                </p>
              </div>
            </div>
          </div>

          {/* Map Display - Right */}
          <div className="lg:col-span-3">
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#7B2D8E]/5 to-[#7B2D8E]/10 border border-[#7B2D8E]/10">
              {/* Map Header */}
              <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs font-medium text-gray-700">Lagos, Nigeria</span>
                </div>
              </div>

              {/* Interactive Map Visualization */}
              <div className="relative aspect-[4/3] p-8">
                {/* Decorative Grid */}
                <div className="absolute inset-0 opacity-20">
                  <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#7B2D8E" strokeWidth="0.5"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                  </svg>
                </div>

                {/* Animated Connection Lines */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300">
                  <defs>
                    <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#7B2D8E" stopOpacity="0" />
                      <stop offset="50%" stopColor="#7B2D8E" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#7B2D8E" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Animated path between locations */}
                  <path 
                    d="M 120 180 Q 200 100 280 150" 
                    stroke="url(#lineGradient)" 
                    strokeWidth="2" 
                    fill="none"
                    strokeDasharray="8 4"
                  >
                    <animate attributeName="stroke-dashoffset" from="0" to="24" dur="1.5s" repeatCount="indefinite"/>
                  </path>

                  {/* Location Markers */}
                  {/* Victoria Island */}
                  <g className="cursor-pointer" onClick={() => setActiveLocation(locations[0])}>
                    <circle cx="120" cy="180" r="35" fill={activeLocation.id === 'vi' ? '#7B2D8E' : '#7B2D8E'} opacity={activeLocation.id === 'vi' ? '0.15' : '0.08'}>
                      <animate attributeName="r" values={activeLocation.id === 'vi' ? "35;45;35" : "30;35;30"} dur="2s" repeatCount="indefinite"/>
                    </circle>
                    <circle cx="120" cy="180" r="20" fill={activeLocation.id === 'vi' ? '#7B2D8E' : '#7B2D8E'} opacity={activeLocation.id === 'vi' ? '0.25' : '0.12'}/>
                    <circle cx="120" cy="180" r={activeLocation.id === 'vi' ? '10' : '6'} fill="#7B2D8E" className="transition-all duration-300"/>
                    <text x="120" y="230" textAnchor="middle" className="text-xs font-semibold" fill="#7B2D8E">Victoria Island</text>
                  </g>

                  {/* Ikoyi */}
                  <g className="cursor-pointer" onClick={() => setActiveLocation(locations[1])}>
                    <circle cx="280" cy="150" r="35" fill={activeLocation.id === 'ikoyi' ? '#7B2D8E' : '#7B2D8E'} opacity={activeLocation.id === 'ikoyi' ? '0.15' : '0.08'}>
                      <animate attributeName="r" values={activeLocation.id === 'ikoyi' ? "35;45;35" : "30;35;30"} dur="2s" repeatCount="indefinite"/>
                    </circle>
                    <circle cx="280" cy="150" r="20" fill={activeLocation.id === 'ikoyi' ? '#7B2D8E' : '#7B2D8E'} opacity={activeLocation.id === 'ikoyi' ? '0.25' : '0.12'}/>
                    <circle cx="280" cy="150" r={activeLocation.id === 'ikoyi' ? '10' : '6'} fill="#7B2D8E" className="transition-all duration-300"/>
                    <text x="280" y="200" textAnchor="middle" className="text-xs font-semibold" fill="#7B2D8E">Ikoyi</text>
                  </g>
                </svg>

                {/* Location Detail Card */}
                <div className="absolute bottom-4 left-4 right-4 bg-white rounded-2xl p-5 shadow-xl border border-gray-100">
                  <div className="flex items-start gap-4">
                    <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                      <Image
                        src={activeLocation.image}
                        alt={activeLocation.name}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 mb-1">{activeLocation.name}</h4>
                      <p className="text-xs text-gray-500 mb-3 line-clamp-2">{activeLocation.address}</p>
                      <div className="flex items-center gap-2">
                        <a
                          href={activeLocation.mapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#7B2D8E] text-white text-xs font-medium rounded-lg hover:bg-[#5A1D6A] transition-colors"
                        >
                          <Navigation className="w-3 h-3" />
                          Directions
                        </a>
                        <Link
                          href="/consultation"
                          className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#7B2D8E]/20 text-[#7B2D8E] text-xs font-medium rounded-lg hover:bg-[#7B2D8E]/5 transition-colors"
                        >
                          Book
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
