'use client'

import { useState, useEffect } from 'react'

// Butterfly Logo
function ButterflyLogo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="currentColor">
      <path d="M16 4c-3.3 0-6 2.7-6 6 0 2 1 3.7 2.4 4.9-.8.4-1.7 1.1-2.4 1.7-2-1.6-4.7-2.6-7.3-2.6-.8 0-1.3.5-1.3 1.3s.5 1.3 1.3 1.3c1.9 0 3.6.7 5.1 1.7C6 20 5.3 22.3 5.3 24.7c0 .8.5 1.3 1.3 1.3s1.3-.5 1.3-1.3c0-1.9.5-3.6 1.5-5.1.7.4 1.5.8 2.3 1.1-.7 1.5-1.1 3.2-1.1 4.9 0 3.3 2.7 5.7 5.3 5.7s5.3-2.4 5.3-5.7c0-1.7-.4-3.5-1.1-4.9.8-.3 1.6-.7 2.3-1.1 1 1.5 1.5 3.2 1.5 5.1 0 .8.5 1.3 1.3 1.3s1.3-.5 1.3-1.3c0-2.4-.7-4.7-2.4-6.3 1.5-1 3.2-1.7 5.1-1.7.8 0 1.3-.5 1.3-1.3s-.5-1.3-1.3-1.3c-2.7 0-5.3 1.1-7.3 2.6-.7-.7-1.6-1.3-2.4-1.7C21 13.7 22 12 22 10c0-3.3-2.7-6-6-6zm0 2.7c1.9 0 3.3 1.5 3.3 3.3S17.9 13.3 16 13.3s-3.3-1.5-3.3-3.3S14.1 6.7 16 6.7z"/>
    </svg>
  )
}

export default function AISection() {
  const [currentMessage, setCurrentMessage] = useState(0)
  const [showBooking, setShowBooking] = useState(false)
  
  const demoMessages = [
    { role: 'user', text: "What facial do you recommend for acne?" },
    { role: 'assistant', text: "I recommend our Deep Cleansing Facial - it includes extraction and LED therapy." },
    { role: 'user', text: "Can I book for Saturday?" },
    { role: 'assistant', text: "Sure! Let me show you available slots.", hasBooking: true }
  ]
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage((prev) => {
        const next = (prev + 1) % demoMessages.length
        if (demoMessages[next].hasBooking) {
          setTimeout(() => setShowBooking(true), 500)
        } else {
          setShowBooking(false)
        }
        return next
      })
    }, 3500)
    return () => clearInterval(interval)
  }, [])

  return (
    <section className="py-12 md:py-16 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Content */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#7B2D8E]/10 rounded-full mb-4">
              <ButterflyLogo className="w-3.5 h-3.5 text-[#7B2D8E]" />
              <span className="text-xs font-medium text-[#7B2D8E]">AI Assistant</span>
            </div>
            
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
              Meet <span className="text-[#7B2D8E]">Derma AI</span>
            </h2>
            
            <p className="text-gray-600 text-sm md:text-base mb-6">
              Get instant skincare advice, personalized recommendations, and book appointments effortlessly.
            </p>
            
            <div className="space-y-3 mb-6">
              {[
                { title: 'Personalized Advice', desc: 'AI learns your skin type' },
                { title: 'Voice Chat', desc: 'Hands-free Nigerian voice' },
                { title: 'Book Instantly', desc: 'Schedule through chat' },
              ].map((feature, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-[#7B2D8E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{feature.title}</p>
                    <p className="text-xs text-gray-500">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <a
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7B2D8E] text-white text-sm font-medium rounded-xl hover:bg-[#6B2278] transition-colors"
            >
              <ButterflyLogo className="w-4 h-4" />
              Start Chatting
            </a>
          </div>
          
          {/* Right - Premium Phone Mockup */}
          <div className="relative flex justify-center">
            {/* Glow effects */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#7B2D8E]/5 rounded-full blur-3xl" />
            
            {/* Phone */}
            <div className="relative w-[280px] md:w-[300px]">
              {/* Phone frame */}
              <div className="relative bg-[#1a1a1a] rounded-[45px] p-2 shadow-2xl shadow-black/30">
                {/* Side buttons */}
                <div className="absolute -left-0.5 top-24 w-0.5 h-8 bg-[#2a2a2a] rounded-l" />
                <div className="absolute -left-0.5 top-36 w-0.5 h-12 bg-[#2a2a2a] rounded-l" />
                <div className="absolute -left-0.5 top-52 w-0.5 h-12 bg-[#2a2a2a] rounded-l" />
                <div className="absolute -right-0.5 top-32 w-0.5 h-16 bg-[#2a2a2a] rounded-r" />
                
                {/* Screen bezel */}
                <div className="bg-black rounded-[40px] p-1">
                  {/* Screen */}
                  <div className="bg-white rounded-[36px] overflow-hidden relative">
                    {/* Dynamic Island */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-6 bg-black rounded-full z-20 flex items-center justify-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#1a1a1a] ring-1 ring-gray-800" />
                    </div>
                    
                    {/* Status bar */}
                    <div className="h-10 bg-[#7B2D8E] flex items-end justify-between px-6 pb-1">
                      <span className="text-[10px] text-white font-medium">9:41</span>
                      <div className="flex items-center gap-1">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9z"/></svg>
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M2 17h20v2H2v-2zm1.15-4.05L4 11.47l.85 1.48 1.3-.75-.85-1.48H7v-1.5H5.3l.85-1.48-1.3-.75L4 8.47l-.85-1.48-1.3.75.85 1.48H1v1.5h1.7l-.85 1.48 1.3.75z"/></svg>
                        <div className="w-6 h-2.5 rounded-sm bg-white/90 relative">
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 -mr-0.5 w-0.5 h-1.5 bg-white rounded-r" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Chat Header */}
                    <div className="bg-[#7B2D8E] px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                          <ButterflyLogo className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-white text-sm">Derma AI</p>
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                            <p className="text-[10px] text-white/70">Active now</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Chat Messages */}
                    <div className="bg-[#f8f8f8] p-3 h-[300px] overflow-hidden">
                      <div className="space-y-2.5">
                        {demoMessages.slice(0, currentMessage + 1).map((msg, idx) => (
                          <div 
                            key={idx} 
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            style={{ animation: 'fadeSlideIn 0.3s ease-out' }}
                          >
                            {msg.role === 'assistant' && (
                              <div className="w-5 h-5 rounded-md bg-[#7B2D8E] flex items-center justify-center mr-1.5 flex-shrink-0 mt-0.5">
                                <ButterflyLogo className="w-3 h-3 text-white" />
                              </div>
                            )}
                            <div className={`max-w-[80%] px-3 py-2 text-[11px] leading-relaxed ${
                              msg.role === 'user' 
                                ? 'bg-[#7B2D8E] text-white rounded-2xl rounded-br-md' 
                                : 'bg-white text-gray-700 rounded-2xl rounded-bl-md shadow-sm'
                            }`}>
                              {msg.text}
                            </div>
                          </div>
                        ))}
                        
                        {/* Booking Card */}
                        {showBooking && (
                          <div 
                            className="ml-6 bg-white rounded-xl p-2.5 shadow-sm border border-gray-100"
                            style={{ animation: 'fadeSlideIn 0.3s ease-out' }}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center">
                                <svg className="w-3 h-3 text-[#7B2D8E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                              <span className="text-[10px] font-medium text-gray-900">Saturday Slots</span>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                              {['10:00', '14:00', '16:00'].map((time) => (
                                <button key={time} className="px-2 py-1.5 text-[9px] font-medium bg-[#7B2D8E]/5 text-[#7B2D8E] rounded-lg hover:bg-[#7B2D8E]/10">
                                  {time}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Typing indicator */}
                        {currentMessage < demoMessages.length - 1 && !showBooking && (
                          <div className="flex justify-start">
                            <div className="w-5 h-5 rounded-md bg-[#7B2D8E] flex items-center justify-center mr-1.5 flex-shrink-0">
                              <ButterflyLogo className="w-3 h-3 text-white" />
                            </div>
                            <div className="bg-white rounded-2xl rounded-bl-md px-3 py-2 shadow-sm">
                              <div className="flex gap-0.5">
                                <span className="w-1 h-1 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1 h-1 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-1 h-1 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Input Area */}
                    <div className="p-2.5 border-t border-gray-100 bg-white">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                        </div>
                        <div className="flex-1 px-3 py-2 bg-gray-100 rounded-full text-[10px] text-gray-400">
                          Message Derma AI...
                        </div>
                        <div className="w-7 h-7 rounded-full bg-[#7B2D8E] flex items-center justify-center">
                          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    {/* Home indicator */}
                    <div className="h-5 flex items-center justify-center">
                      <div className="w-28 h-1 bg-gray-200 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  )
}
