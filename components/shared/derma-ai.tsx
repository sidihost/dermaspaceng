'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Send, X, Mic, MicOff, Volume2, VolumeX, Search, Sparkles } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isSearchResult?: boolean
}

const quickActions = [
  { label: 'Book Appointment', action: 'I want to book an appointment' },
  { label: 'Our Services', action: 'What services do you offer?' },
  { label: 'Pricing', action: 'What are your prices?' },
  { label: 'Locations', action: 'Where are you located?' },
]

export default function DermaAI() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm Derma AI, your personal wellness assistant at Dermaspace. How can I help you today?",
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = 'en-US'

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        setInput(transcript)
        setIsListening(false)
      }

      recognitionRef.current.onerror = () => {
        setIsListening(false)
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
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

  const speak = (text: string) => {
    if (!voiceEnabled || typeof window === 'undefined' || !window.speechSynthesis) return

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1
    utterance.pitch = 1
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }

  const sendMessage = async (content: string) => {
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

      if (!res.ok) throw new Error('Failed to get response')

      const data = await res.json()
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content || data.message || "I apologize, I couldn't process that request. Please try again.",
        timestamp: new Date(),
        isSearchResult: data.isSearchResult
      }

      setMessages(prev => [...prev, assistantMessage])
      
      if (voiceEnabled) {
        speak(assistantMessage.content)
      }
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date()
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-24 md:bottom-6 right-4 z-40 group transition-all duration-300 ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
        aria-label="Open Derma AI"
      >
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-white border border-gray-200 flex items-center justify-center overflow-hidden transition-colors group-hover:border-[#7B2D8E]/30">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202025-01-09%20at%2022.34.02-LHSfQyUMlRoLNbGOmhKNlUbfSY8V30.jpeg"
              alt="Derma AI"
              width={40}
              height={40}
              className="w-10 h-10 object-cover rounded-lg"
            />
          </div>
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#7B2D8E] text-white text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
            Derma AI
          </div>
        </div>
      </button>

      {/* Chat Window */}
      <div className={`fixed bottom-0 right-0 md:bottom-6 md:right-4 z-50 transition-all duration-300 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full pointer-events-none'}`}>
        <div className="w-full md:w-[400px] h-[100dvh] md:h-[600px] md:max-h-[80vh] bg-white md:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#7B2D8E] to-[#9B4DB0] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center overflow-hidden">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202025-01-09%20at%2022.34.02-LHSfQyUMlRoLNbGOmhKNlUbfSY8V30.jpeg"
                    alt="Derma AI"
                    width={40}
                    height={40}
                    className="w-10 h-10 object-cover rounded-lg"
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    Derma AI
                    <Sparkles className="w-4 h-4 text-white/70" />
                  </h3>
                  <p className="text-xs text-white/70">Your wellness assistant</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                  className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/80 hover:bg-white/20 transition-colors"
                  title={voiceEnabled ? 'Disable voice' : 'Enable voice'}
                >
                  {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/80 hover:bg-white/20 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                  {message.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center overflow-hidden">
                        <Image
                          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202025-01-09%20at%2022.34.02-LHSfQyUMlRoLNbGOmhKNlUbfSY8V30.jpeg"
                          alt=""
                          width={20}
                          height={20}
                          className="w-5 h-5 object-cover rounded"
                        />
                      </div>
                      <span className="text-xs text-gray-500">Derma AI</span>
                      {message.isSearchResult && (
                        <span className="flex items-center gap-1 text-[10px] text-[#7B2D8E] bg-[#7B2D8E]/10 px-2 py-0.5 rounded-full">
                          <Search className="w-3 h-3" />
                          Web Search
                        </span>
                      )}
                    </div>
                  )}
                  <div
                    className={`px-4 py-3 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-[#7B2D8E] text-white rounded-br-md'
                        : 'bg-white text-gray-800 rounded-bl-md shadow-sm border border-gray-100'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  </div>
                  <p className={`text-[10px] text-gray-400 mt-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[85%]">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center overflow-hidden">
                      <Image
                        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202025-01-09%20at%2022.34.02-LHSfQyUMlRoLNbGOmhKNlUbfSY8V30.jpeg"
                        alt=""
                        width={20}
                        height={20}
                        className="w-5 h-5 object-cover rounded"
                      />
                    </div>
                    <span className="text-xs text-gray-500">Derma AI</span>
                  </div>
                  <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-md shadow-sm border border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-[#7B2D8E] animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-[#7B2D8E] animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-[#7B2D8E] animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          {messages.length <= 2 && (
            <div className="px-4 py-3 bg-white border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">Quick actions</p>
              <div className="flex flex-wrap gap-2">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => sendMessage(action.action)}
                    className="px-3 py-1.5 text-xs font-medium bg-[#7B2D8E]/5 text-[#7B2D8E] rounded-full hover:bg-[#7B2D8E]/10 transition-colors"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-gray-100">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleListening}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={isListening ? 'Stop listening' : 'Voice input'}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? 'Listening...' : 'Ask me anything...'}
                className="flex-1 h-10 px-4 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20"
                disabled={isLoading || isListening}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 rounded-xl bg-[#7B2D8E] text-white flex items-center justify-center hover:bg-[#5A1D6A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            {isSpeaking && (
              <p className="text-xs text-[#7B2D8E] mt-2 flex items-center gap-1">
                <Volume2 className="w-3 h-3 animate-pulse" />
                Speaking...
              </p>
            )}
          </form>
        </div>
      </div>
    </>
  )
}
