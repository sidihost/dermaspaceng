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
  
  const demoMessages = [
    { role: 'user', text: "What facial treatment do you recommend for acne-prone skin?" },
    { role: 'assistant', text: "For acne-prone skin, I recommend our **Deep Cleansing Facial**. It includes extraction, salicylic acid treatment, and LED therapy to reduce breakouts." },
    { role: 'user', text: "Can I book an appointment?" },
    { role: 'assistant', text: "Of course! I can help you book an appointment. We have slots available at both our Victoria Island and Ikoyi locations." }
  ]
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % demoMessages.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [demoMessages.length])

  const openChat = () => {
    window.dispatchEvent(new CustomEvent('openDermaAI'))
  }

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-[#FDFBF9] to-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#7B2D8E]/10 rounded-full mb-6">
              <ButterflyLogo className="w-4 h-4 text-[#7B2D8E]" />
              <span className="text-sm font-medium text-[#7B2D8E]">AI-Powered Assistant</span>
            </div>
            
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              Meet <span className="text-[#7B2D8E]">Derma AI</span>, Your Personal Skincare Expert
            </h2>
            
            <p className="text-gray-600 text-lg mb-8 leading-relaxed">
              Get instant skincare advice, personalized treatment recommendations, and book appointments 
              effortlessly. Available 24/7 to answer all your beauty questions.
            </p>
            
            <div className="space-y-4 mb-8">
              {[
                { title: 'Personalized Recommendations', desc: 'AI learns your skin type and preferences' },
                { title: 'Voice-to-Voice Chat', desc: 'Hands-free conversation in natural Nigerian voice' },
                { title: 'Instant Booking', desc: 'Book appointments directly through chat' },
              ].map((feature, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-[#7B2D8E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{feature.title}</p>
                    <p className="text-sm text-gray-500">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <button
              onClick={openChat}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white font-medium rounded-xl hover:bg-[#6B2278] transition-colors"
            >
              <ButterflyLogo className="w-5 h-5" />
              Start Chatting Now
            </button>
          </div>
          
          {/* Right - Chat UI Mockup */}
          <div className="relative">
            {/* Decorative elements */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#7B2D8E]/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-200/30 rounded-full blur-2xl" />
            
            {/* Phone Frame */}
            <div className="relative mx-auto w-full max-w-[320px] lg:max-w-[340px]">
              <div className="bg-gray-900 rounded-[40px] p-3 shadow-2xl">
                {/* Notch */}
                <div className="absolute top-5 left-1/2 -translate-x-1/2 w-24 h-6 bg-gray-900 rounded-full z-10" />
                
                {/* Screen */}
                <div className="bg-white rounded-[32px] overflow-hidden">
                  {/* Chat Header */}
                  <div className="bg-[#7B2D8E] px-4 py-4 pt-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                        <ButterflyLogo className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">Derma AI</p>
                        <p className="text-[10px] text-white/70">Online</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Chat Messages */}
                  <div className="bg-gray-50 p-4 h-[320px] overflow-hidden">
                    <div className="space-y-3">
                      {demoMessages.slice(0, currentMessage + 1).map((msg, idx) => (
                        <div 
                          key={idx} 
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                        >
                          {msg.role === 'assistant' && (
                            <div className="w-6 h-6 rounded-md bg-[#7B2D8E] flex items-center justify-center mr-2 flex-shrink-0">
                              <ButterflyLogo className="w-3.5 h-3.5 text-white" />
                            </div>
                          )}
                          <div className={`max-w-[75%] px-3 py-2 rounded-xl text-xs ${
                            msg.role === 'user' 
                              ? 'bg-[#7B2D8E] text-white rounded-br-md' 
                              : 'bg-white border border-gray-100 text-gray-700 rounded-bl-md'
                          }`}>
                            {msg.text.replace(/\*\*/g, '')}
                          </div>
                        </div>
                      ))}
                      
                      {/* Typing indicator */}
                      {currentMessage < demoMessages.length - 1 && (
                        <div className="flex justify-start">
                          <div className="w-6 h-6 rounded-md bg-[#7B2D8E] flex items-center justify-center mr-2 flex-shrink-0">
                            <ButterflyLogo className="w-3.5 h-3.5 text-white" />
                          </div>
                          <div className="bg-white border border-gray-100 rounded-xl rounded-bl-md px-3 py-2">
                            <div className="flex gap-1">
                              <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Input Area */}
                  <div className="p-3 border-t border-gray-100 bg-white">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                      </div>
                      <div className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-xs text-gray-400">
                        Message Derma AI...
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-[#7B2D8E] flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Home indicator */}
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-600 rounded-full" />
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </section>
  )
}
