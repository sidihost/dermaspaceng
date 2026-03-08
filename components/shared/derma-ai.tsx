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
    actions.push({ title: 'Book Appointment', description: 'Schedule your visit', link: '/booking', icon: 'calendar' })
  }
  if (lower.includes('service') || lower.includes('treatment') || lower.includes('facial')) {
    actions.push({ title: 'Our Services', description: 'View all treatments', link: '/services', icon: 'sparkles' })
  }
  if (lower.includes('location') || lower.includes('visit') || lower.includes('address') || lower.includes('where')) {
    actions.push({ title: 'Find Us', description: 'Victoria Island & Ikoyi', link: '/contact', icon: 'map' })
  }
  if (lower.includes('price') || lower.includes('cost') || lower.includes('package')) {
    actions.push({ title: 'View Packages', description: 'See our pricing', link: '/packages', icon: 'gift' })
  }
  if (lower.includes('gift') || lower.includes('voucher')) {
    actions.push({ title: 'Gift Cards', description: 'Give the gift of beauty', link: '/gift-cards', icon: 'heart' })
  }
  
  return actions.slice(0, 2)
}

// Action icon component
function ActionIcon({ type }: { type: string }) {
  switch (type) {
    case 'calendar':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      )
    case 'sparkles':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
      )
    case 'map':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
      )
    case 'gift':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1012 10.125M12 4.875A2.625 2.625 0 1012 10.125M12 10.125V21m0-10.875h9.75m-9.75 0H3" />
        </svg>
      )
    case 'heart':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
      )
    default:
      return null
  }
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
        { title: 'Book Appointment', description: 'Schedule your visit', link: '/booking', icon: 'calendar' },
        { title: 'Our Services', description: 'Explore treatments', link: '/services', icon: 'sparkles' },
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
        // Auto send after voice input
        if (transcript.trim()) {
          setTimeout(() => sendMessage(transcript), 300)
        }
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
  const speakText = useCallback(async (text: string) => {
    if (!voiceEnabled || isSpeaking) return
    
    try {
      setIsSpeaking(true)
      const cleanText = text.replace(/\*\*/g, '').replace(/\*/g, '').substring(0, 500)
      
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
      } else {
        setIsSpeaking(false)
      }
    } catch {
      setIsSpeaking(false)
    }
  }, [voiceEnabled, isSpeaking])

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
        await new Promise(resolve => setTimeout(resolve, 8))
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
        content: "I'm having trouble connecting. Please try again or contact us directly at +234 901 797 2919.",
        timestamp: new Date()
      }])
      setStreamingContent('')
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, messages, voiceEnabled, speakText])

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
        <div className="relative group">
          <div className="w-14 h-14 md:w-[60px] md:h-[60px] rounded-full bg-[#7B2D8E] flex items-center justify-center transition-all group-hover:scale-105">
            {/* Butterfly Icon */}
            <svg className="w-8 h-8 md:w-9 md:h-9 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C9.5 2 7.5 4 7.5 6.5c0 1.5.7 2.8 1.8 3.7-.6.3-1.3.8-1.8 1.3-1.5-1.2-3.5-2-5.5-2-.6 0-1 .4-1 1s.4 1 1 1c1.4 0 2.7.5 3.8 1.3C4.5 13.5 4 15.2 4 17c0 .6.4 1 1 1s1-.4 1-1c0-1.4.4-2.7 1.1-3.8.5.3 1.1.6 1.7.8-.5 1.1-.8 2.4-.8 3.7 0 2.5 2 4.3 4 4.3s4-1.8 4-4.3c0-1.3-.3-2.6-.8-3.7.6-.2 1.2-.5 1.7-.8.7 1.1 1.1 2.4 1.1 3.8 0 .6.4 1 1 1s1-.4 1-1c0-1.8-.5-3.5-1.8-4.7 1.1-.8 2.4-1.3 3.8-1.3.6 0 1-.4 1-1s-.4-1-1-1c-2 0-4 .8-5.5 2-.5-.5-1.2-1-1.8-1.3 1.1-.9 1.8-2.2 1.8-3.7C16.5 4 14.5 2 12 2zm0 2c1.4 0 2.5 1.1 2.5 2.5S13.4 9 12 9s-2.5-1.1-2.5-2.5S10.6 4 12 4z"/>
            </svg>
          </div>
          {/* Pulse indicator */}
          <span className="absolute top-0 right-0 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-400 border-2 border-white"></span>
          </span>
        </div>
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[58] md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Chat Modal */}
      <div 
        className={`fixed z-[60] transition-all duration-300 ease-out
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
          inset-0 md:inset-auto md:bottom-6 md:right-4 md:w-[380px] md:h-[580px]
          ${isOpen ? 'translate-y-0 md:translate-y-0' : 'translate-y-full md:translate-y-4'}
        `}
      >
        <div className="w-full h-full bg-white md:rounded-2xl flex flex-col overflow-hidden md:border md:border-gray-200">
          {/* Header */}
          <div className="flex-shrink-0 bg-gradient-to-r from-[#7B2D8E] to-[#5A1D6A] px-4 py-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C9.5 2 7.5 4 7.5 6.5c0 1.5.7 2.8 1.8 3.7-.6.3-1.3.8-1.8 1.3-1.5-1.2-3.5-2-5.5-2-.6 0-1 .4-1 1s.4 1 1 1c1.4 0 2.7.5 3.8 1.3C4.5 13.5 4 15.2 4 17c0 .6.4 1 1 1s1-.4 1-1c0-1.4.4-2.7 1.1-3.8.5.3 1.1.6 1.7.8-.5 1.1-.8 2.4-.8 3.7 0 2.5 2 4.3 4 4.3s4-1.8 4-4.3c0-1.3-.3-2.6-.8-3.7.6-.2 1.2-.5 1.7-.8.7 1.1 1.1 2.4 1.1 3.8 0 .6.4 1 1 1s1-.4 1-1c0-1.8-.5-3.5-1.8-4.7 1.1-.8 2.4-1.3 3.8-1.3.6 0 1-.4 1-1s-.4-1-1-1c-2 0-4 .8-5.5 2-.5-.5-1.2-1-1.8-1.3 1.1-.9 1.8-2.2 1.8-3.7C16.5 4 14.5 2 12 2zm0 2c1.4 0 2.5 1.1 2.5 2.5S13.4 9 12 9s-2.5-1.1-2.5-2.5S10.6 4 12 4z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Derma AI</h3>
                  <p className="text-[11px] text-white/70">Skincare Assistant</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                    voiceEnabled ? 'bg-white text-[#7B2D8E]' : 'bg-white/15 text-white hover:bg-white/25'
                  }`}
                  title={voiceEnabled ? 'Voice On' : 'Voice Off'}
                >
                  {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/15 text-white hover:bg-white/25 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 bg-[#FAFAFA]">
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-[#7B2D8E] flex items-center justify-center mr-2 mt-0.5">
                      <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C9.5 2 7.5 4 7.5 6.5c0 1.5.7 2.8 1.8 3.7-.6.3-1.3.8-1.8 1.3-1.5-1.2-3.5-2-5.5-2-.6 0-1 .4-1 1s.4 1 1 1c1.4 0 2.7.5 3.8 1.3C4.5 13.5 4 15.2 4 17c0 .6.4 1 1 1s1-.4 1-1c0-1.4.4-2.7 1.1-3.8.5.3 1.1.6 1.7.8-.5 1.1-.8 2.4-.8 3.7 0 2.5 2 4.3 4 4.3s4-1.8 4-4.3c0-1.3-.3-2.6-.8-3.7.6-.2 1.2-.5 1.7-.8.7 1.1 1.1 2.4 1.1 3.8 0 .6.4 1 1 1s1-.4 1-1c0-1.8-.5-3.5-1.8-4.7 1.1-.8 2.4-1.3 3.8-1.3.6 0 1-.4 1-1s-.4-1-1-1c-2 0-4 .8-5.5 2-.5-.5-1.2-1-1.8-1.3 1.1-.9 1.8-2.2 1.8-3.7C16.5 4 14.5 2 12 2zm0 2c1.4 0 2.5 1.1 2.5 2.5S13.4 9 12 9s-2.5-1.1-2.5-2.5S10.6 4 12 4z"/>
                      </svg>
                    </div>
                  )}
                  <div className={`max-w-[80%] ${message.role === 'user' ? '' : ''}`}>
                    <div
                      className={`px-4 py-3 text-[13px] leading-relaxed ${
                        message.role === 'user'
                          ? 'bg-[#7B2D8E] text-white rounded-2xl rounded-br-md'
                          : 'bg-white text-gray-700 rounded-2xl rounded-tl-md border border-gray-100'
                      }`}
                    >
                      <div 
                        className="whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                      />
                    </div>
                    
                    {/* Action Cards */}
                    {message.actions && message.actions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {message.actions.map((action, idx) => (
                          <Link
                            key={idx}
                            href={action.link}
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl hover:border-[#7B2D8E] hover:bg-[#7B2D8E]/5 transition-all group"
                          >
                            <span className="text-[#7B2D8E]">
                              <ActionIcon type={action.icon} />
                            </span>
                            <span className="text-xs font-medium text-gray-700 group-hover:text-[#7B2D8E]">{action.title}</span>
                            <ArrowRight className="w-3 h-3 text-gray-300 group-hover:text-[#7B2D8E] transition-colors" />
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
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C9.5 2 7.5 4 7.5 6.5c0 1.5.7 2.8 1.8 3.7-.6.3-1.3.8-1.8 1.3-1.5-1.2-3.5-2-5.5-2-.6 0-1 .4-1 1s.4 1 1 1c1.4 0 2.7.5 3.8 1.3C4.5 13.5 4 15.2 4 17c0 .6.4 1 1 1s1-.4 1-1c0-1.4.4-2.7 1.1-3.8.5.3 1.1.6 1.7.8-.5 1.1-.8 2.4-.8 3.7 0 2.5 2 4.3 4 4.3s4-1.8 4-4.3c0-1.3-.3-2.6-.8-3.7.6-.2 1.2-.5 1.7-.8.7 1.1 1.1 2.4 1.1 3.8 0 .6.4 1 1 1s1-.4 1-1c0-1.8-.5-3.5-1.8-4.7 1.1-.8 2.4-1.3 3.8-1.3.6 0 1-.4 1-1s-.4-1-1-1c-2 0-4 .8-5.5 2-.5-.5-1.2-1-1.8-1.3 1.1-.9 1.8-2.2 1.8-3.7C16.5 4 14.5 2 12 2zm0 2c1.4 0 2.5 1.1 2.5 2.5S13.4 9 12 9s-2.5-1.1-2.5-2.5S10.6 4 12 4z"/>
                    </svg>
                  </div>
                  <div className="max-w-[80%]">
                    <div className="bg-white text-gray-700 rounded-2xl rounded-tl-md border border-gray-100 px-4 py-3">
                      <div 
                        className="text-[13px] leading-relaxed whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ __html: formatMessage(streamingContent) }}
                      />
                      <span className="inline-block w-0.5 h-4 bg-[#7B2D8E] ml-0.5 animate-pulse align-middle" />
                    </div>
                  </div>
                </div>
              )}

              {/* Loading */}
              {isLoading && !streamingContent && (
                <div className="flex justify-start">
                  <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-[#7B2D8E] flex items-center justify-center mr-2">
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C9.5 2 7.5 4 7.5 6.5c0 1.5.7 2.8 1.8 3.7-.6.3-1.3.8-1.8 1.3-1.5-1.2-3.5-2-5.5-2-.6 0-1 .4-1 1s.4 1 1 1c1.4 0 2.7.5 3.8 1.3C4.5 13.5 4 15.2 4 17c0 .6.4 1 1 1s1-.4 1-1c0-1.4.4-2.7 1.1-3.8.5.3 1.1.6 1.7.8-.5 1.1-.8 2.4-.8 3.7 0 2.5 2 4.3 4 4.3s4-1.8 4-4.3c0-1.3-.3-2.6-.8-3.7.6-.2 1.2-.5 1.7-.8.7 1.1 1.1 2.4 1.1 3.8 0 .6.4 1 1 1s1-.4 1-1c0-1.8-.5-3.5-1.8-4.7 1.1-.8 2.4-1.3 3.8-1.3.6 0 1-.4 1-1s-.4-1-1-1c-2 0-4 .8-5.5 2-.5-.5-1.2-1-1.8-1.3 1.1-.9 1.8-2.2 1.8-3.7C16.5 4 14.5 2 12 2zm0 2c1.4 0 2.5 1.1 2.5 2.5S13.4 9 12 9s-2.5-1.1-2.5-2.5S10.6 4 12 4z"/>
                    </svg>
                  </div>
                  <div className="bg-white rounded-2xl rounded-tl-md border border-gray-100 px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-[#7B2D8E] animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-[#7B2D8E]/70 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-[#7B2D8E]/40 animate-bounce" style={{ animationDelay: '300ms' }} />
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
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  <div className="w-1 h-3 bg-[#7B2D8E] rounded-full animate-pulse" />
                  <div className="w-1 h-4 bg-[#7B2D8E] rounded-full animate-pulse" style={{ animationDelay: '100ms' }} />
                  <div className="w-1 h-2 bg-[#7B2D8E] rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
                  <div className="w-1 h-5 bg-[#7B2D8E] rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                  <div className="w-1 h-3 bg-[#7B2D8E] rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
                </div>
                <p className="text-xs text-[#7B2D8E] font-medium">Speaking...</p>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="flex-shrink-0 p-3 pb-28 md:pb-3 bg-white border-t border-gray-100">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleListening}
                className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  isListening
                    ? 'bg-red-500 text-white'
                    : 'bg-[#7B2D8E]/10 text-[#7B2D8E] hover:bg-[#7B2D8E]/20'
                }`}
              >
                {isListening ? (
                  <div className="relative">
                    <MicOff className="w-4 h-4" />
                    <span className="absolute inset-0 rounded-full animate-ping bg-red-400/50" />
                  </div>
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
              
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? 'Listening...' : 'Type a message...'}
                className="flex-1 px-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:bg-white placeholder:text-gray-400 transition-all"
                disabled={isLoading || isListening}
              />
              
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#7B2D8E] text-white flex items-center justify-center hover:bg-[#6B2278] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            
            {/* Voice hint */}
            {!isListening && (
              <p className="text-[10px] text-gray-400 text-center mt-2">
                Tap the mic to speak or type your message
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
