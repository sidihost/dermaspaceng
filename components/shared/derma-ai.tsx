'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, X, Mic, MicOff, Volume2, VolumeX, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  actions?: ActionCard[]
}

interface ActionCard {
  title: string
  description: string
  link: string
  icon: string
}

// Beautiful Dermaspace butterfly logo
function ButterflyLogo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className}>
      <defs>
        <linearGradient id="wingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9B4DAE" />
          <stop offset="100%" stopColor="#7B2D8E" />
        </linearGradient>
      </defs>
      {/* Left wing */}
      <path d="M50 45C50 45 30 25 15 30C0 35 5 55 20 60C35 65 50 50 50 50Z" fill="url(#wingGradient)" />
      {/* Right wing */}
      <path d="M50 45C50 45 70 25 85 30C100 35 95 55 80 60C65 65 50 50 50 50Z" fill="url(#wingGradient)" />
      {/* Body */}
      <ellipse cx="50" cy="55" rx="4" ry="20" fill="#5A1D6A" />
      {/* Head */}
      <circle cx="50" cy="32" r="5" fill="#5A1D6A" />
      {/* Antennae */}
      <path d="M48 28Q45 20 42 18" stroke="#5A1D6A" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M52 28Q55 20 58 18" stroke="#5A1D6A" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  )
}

// Simple markdown formatting
function formatMessage(text: string) {
  let formatted = text.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
  formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>')
  formatted = formatted.replace(/^(\d+)\.\s/gm, '<span class="text-[#7B2D8E] font-medium">$1.</span> ')
  formatted = formatted.replace(/^[-•]\s/gm, '<span class="text-[#7B2D8E]">•</span> ')
  return formatted
}

// Parse response for action cards
function parseActions(content: string): ActionCard[] {
  const actions: ActionCard[] = []
  const lower = content.toLowerCase()
  
  if (lower.includes('book') || lower.includes('appointment') || lower.includes('schedule')) {
    actions.push({ title: 'Book Appointment', description: 'Schedule your visit', link: '/booking', icon: '📅' })
  }
  if (lower.includes('service') || lower.includes('treatment') || lower.includes('facial')) {
    actions.push({ title: 'Our Services', description: 'View all treatments', link: '/services', icon: '✨' })
  }
  if (lower.includes('location') || lower.includes('visit') || lower.includes('address') || lower.includes('where')) {
    actions.push({ title: 'Find Us', description: 'Victoria Island & Ikoyi', link: '/contact', icon: '📍' })
  }
  if (lower.includes('price') || lower.includes('cost') || lower.includes('package')) {
    actions.push({ title: 'View Packages', description: 'See our pricing', link: '/packages', icon: '💎' })
  }
  if (lower.includes('gift') || lower.includes('voucher')) {
    actions.push({ title: 'Gift Cards', description: 'Give the gift of beauty', link: '/gift-cards', icon: '🎁' })
  }
  
  return actions.slice(0, 2) // Max 2 actions
}

export default function DermaAI() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Welcome to Dermaspace! I'm here to help you with bookings, services, and skincare advice. How can I assist you today?",
      timestamp: new Date(),
      actions: [
        { title: 'Book Appointment', description: 'Schedule your visit', link: '/booking', icon: '📅' },
        { title: 'Our Services', description: 'Explore treatments', link: '/services', icon: '✨' },
      ]
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = 'en-NG'

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        setInput(transcript)
        setIsListening(false)
      }

      recognitionRef.current.onerror = () => setIsListening(false)
      recognitionRef.current.onend = () => setIsListening(false)
    }
  }, [])

  const toggleListening = () => {
    if (!recognitionRef.current) return
    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  // Text to speech using ElevenLabs
  const speakText = async (text: string) => {
    if (!voiceEnabled || isSpeaking) return
    
    try {
      setIsSpeaking(true)
      // Clean text for speech (remove markdown, limit length)
      const cleanText = text.replace(/\*\*/g, '').replace(/\*/g, '').substring(0, 400)
      
      const response = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText })
      })
      
      if (response.ok) {
        const audioBlob = await response.blob()
        const audioUrl = URL.createObjectURL(audioBlob)
        
        if (!audioRef.current) {
          audioRef.current = new Audio()
        }
        audioRef.current.src = audioUrl
        audioRef.current.onended = () => setIsSpeaking(false)
        await audioRef.current.play()
      }
    } catch (error) {
      console.error('Voice error:', error)
    } finally {
      if (!audioRef.current?.paused === false) {
        setIsSpeaking(false)
      }
    }
  }

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setStreamingContent('')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      })

      if (!res.ok) throw new Error('Failed')

      const data = await res.json()
      const responseText = data.content || data.message || "I apologize, please try again or call us at +234 901 797 2919."
      
      // Streaming effect
      let currentText = ''
      for (let i = 0; i < responseText.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 10))
        currentText += responseText[i]
        setStreamingContent(currentText)
      }

      const actions = parseActions(responseText)
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText,
        timestamp: new Date(),
        actions: actions.length > 0 ? actions : undefined
      }

      setMessages(prev => [...prev, assistantMessage])
      setStreamingContent('')
      
      // Speak response if voice enabled
      if (voiceEnabled) {
        speakText(responseText)
      }
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting. Please try again or contact us directly.",
        timestamp: new Date()
      }])
      setStreamingContent('')
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, messages, voiceEnabled])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-28 md:bottom-6 right-4 z-[55] transition-all duration-300 ${
          isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
        }`}
        aria-label="Open chat"
      >
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-[#7B2D8E] flex items-center justify-center transition-transform hover:scale-105">
            <ButterflyLogo className="w-9 h-9" />
          </div>
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-white rounded-full border-2 border-[#7B2D8E]" />
        </div>
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[58] md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Chat Modal */}
      <div 
        className={`fixed z-[60] transition-all duration-300 ease-out
          ${isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full pointer-events-none'}
          inset-0 md:inset-auto md:bottom-6 md:right-4 md:w-[380px] md:h-[560px] md:translate-x-0
          ${isOpen ? '' : 'md:opacity-0 md:translate-y-4'}
        `}
      >
        <div className="w-full h-full bg-white md:rounded-2xl flex flex-col overflow-hidden md:border md:border-gray-200">
          {/* Header */}
          <div className="flex-shrink-0 bg-[#7B2D8E] px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                  <ButterflyLogo className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Derma AI</h3>
                  <p className="text-[11px] text-white/60">Skincare Assistant</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    voiceEnabled ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white/80'
                  }`}
                  title={voiceEnabled ? 'Disable voice' : 'Enable voice'}
                >
                  {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50/80">
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-[#7B2D8E] flex items-center justify-center mr-2 mt-0.5">
                      <ButterflyLogo className="w-5 h-5" />
                    </div>
                  )}
                  <div className="max-w-[85%]">
                    <div
                      className={`px-3.5 py-2.5 text-[13px] leading-relaxed ${
                        message.role === 'user'
                          ? 'bg-[#7B2D8E] text-white rounded-2xl rounded-br-sm'
                          : 'bg-white text-gray-700 rounded-2xl rounded-tl-sm border border-gray-100'
                      }`}
                    >
                      <div 
                        className="whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                      />
                    </div>
                    
                    {/* Action Cards */}
                    {message.actions && message.actions.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {message.actions.map((action, idx) => (
                          <Link
                            key={idx}
                            href={action.link}
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-2.5 p-2.5 bg-white border border-gray-100 rounded-xl hover:border-[#7B2D8E]/30 transition-colors group"
                          >
                            <span className="text-base">{action.icon}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-800">{action.title}</p>
                              <p className="text-[10px] text-gray-500">{action.description}</p>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#7B2D8E] transition-colors" />
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Streaming */}
              {streamingContent && (
                <div className="flex justify-start">
                  <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-[#7B2D8E] flex items-center justify-center mr-2 mt-0.5">
                    <ButterflyLogo className="w-5 h-5" />
                  </div>
                  <div className="max-w-[85%]">
                    <div className="bg-white text-gray-700 rounded-2xl rounded-tl-sm border border-gray-100 px-3.5 py-2.5">
                      <div 
                        className="text-[13px] leading-relaxed whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ __html: formatMessage(streamingContent) }}
                      />
                      <span className="inline-block w-0.5 h-3.5 bg-[#7B2D8E] ml-0.5 animate-pulse align-middle" />
                    </div>
                  </div>
                </div>
              )}

              {/* Loading */}
              {isLoading && !streamingContent && (
                <div className="flex justify-start">
                  <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-[#7B2D8E] flex items-center justify-center mr-2">
                    <ButterflyLogo className="w-5 h-5" />
                  </div>
                  <div className="bg-white rounded-2xl rounded-tl-sm border border-gray-100 px-4 py-3">
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E]/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E]/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E]/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Speaking indicator */}
          {isSpeaking && (
            <div className="px-4 py-2 bg-[#7B2D8E]/5 border-t border-[#7B2D8E]/10">
              <p className="text-xs text-[#7B2D8E] flex items-center gap-1.5">
                <Volume2 className="w-3 h-3 animate-pulse" />
                Speaking...
              </p>
            </div>
          )}

          {/* Input */}
          <div className="flex-shrink-0 p-3 pb-28 md:pb-3 bg-white border-t border-gray-100">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleListening}
                className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? 'Listening...' : 'Ask me anything...'}
                className="flex-1 px-3.5 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 placeholder:text-gray-400"
                disabled={isLoading || isListening}
              />
              
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="flex-shrink-0 w-9 h-9 rounded-xl bg-[#7B2D8E] text-white flex items-center justify-center hover:bg-[#6B2278] transition-colors disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
