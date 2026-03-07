'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { MessageCircle, X, Send, Mic, MicOff, Volume2, VolumeX, Search, Bot, User, Loader2, Globe } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  isSearchResult?: boolean
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm Derma, your personal spa wellness assistant. I can help you with treatments, bookings, skincare advice, and answer any questions about Dermaspace. I can also search the web for you! How can I assist you today?"
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = false
        recognitionRef.current.interimResults = false
        recognitionRef.current.lang = 'en-US'
        
        recognitionRef.current.onresult = (event) => {
          const transcript = event.results[0][0].transcript
          setInput(transcript)
          setIsListening(false)
          // Auto-send after voice input
          setTimeout(() => {
            sendMessage(transcript)
          }, 500)
        }
        
        recognitionRef.current.onerror = () => setIsListening(false)
        recognitionRef.current.onend = () => setIsListening(false)
      }
    }
  }, [])

  const speakText = (text: string) => {
    if (!voiceEnabled || !synthRef.current) return
    
    synthRef.current.cancel()
    const cleanText = text.replace(/[*_~`]/g, '')
    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.rate = 0.95
    utterance.pitch = 1.1
    
    const voices = synthRef.current.getVoices()
    const femaleVoice = voices.find(v => v.name.includes('Samantha') || v.name.includes('Female') || v.name.includes('Google UK English Female'))
    if (femaleVoice) utterance.voice = femaleVoice
    
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    
    synthRef.current.speak(utterance)
  }

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Voice input is not supported in your browser')
      return
    }
    
    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      try {
        recognitionRef.current.start()
        setIsListening(true)
      } catch {
        setIsListening(false)
      }
    }
  }

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel()
      setIsSpeaking(false)
    }
  }

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    const lowerContent = content.toLowerCase()
    const needsSearch = lowerContent.includes('search') || 
                        lowerContent.includes('find out') ||
                        lowerContent.includes('look up') ||
                        lowerContent.includes('google') ||
                        lowerContent.includes('latest') ||
                        lowerContent.includes('news')

    if (needsSearch) setIsSearching(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          search: needsSearch
        })
      })

      const data = await response.json()
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message || "I apologize, but I couldn't process that. Please try again.",
        isSearchResult: needsSearch && data.searchUsed
      }

      setMessages(prev => [...prev, assistantMessage])
      
      if (voiceEnabled) {
        speakText(assistantMessage.content)
      }
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting. Please try again or call us at +234 901 797 2919."
      }])
    } finally {
      setIsLoading(false)
      setIsSearching(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const quickReplies = [
    "What services do you offer?",
    "Book an appointment",
    "Skincare tips for dry skin",
    "Search latest beauty trends"
  ]

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-24 md:bottom-6 right-4 md:right-6 z-50 group transition-all duration-300 ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
        aria-label="Open chat"
      >
        <div className="relative">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#7B2D8E] to-[#5A1D6A] text-white shadow-lg flex items-center justify-center group-hover:shadow-xl group-hover:scale-105 transition-all">
            <MessageCircle className="w-6 h-6" />
          </div>
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
          <div className="absolute -top-8 right-0 bg-white px-3 py-1 rounded-full shadow-md text-xs text-gray-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            Chat with Derma AI
          </div>
        </div>
      </button>

      {/* Chat Window */}
      <div className={`fixed bottom-24 md:bottom-6 right-4 md:right-6 z-50 w-[calc(100vw-32px)] md:w-[400px] bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-[#7B2D8E] to-[#5A1D6A] px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 p-1 flex items-center justify-center">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/415302924_1075146177064225_6577577843482783337_n.png-e95maF9TCmUwX5S85lZBjxTzCvbVuH.webp"
                  alt="Dermaspace"
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Derma AI Assistant</h3>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-white/80 text-xs">Always here to help</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                title={voiceEnabled ? "Disable voice responses" : "Enable voice responses"}
              >
                {voiceEnabled ? <Volume2 className="w-4 h-4 text-white" /> : <VolumeX className="w-4 h-4 text-white/60" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="h-[350px] overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-2.5 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.role === 'user' 
                  ? 'bg-[#7B2D8E] text-white' 
                  : 'bg-gradient-to-br from-[#7B2D8E]/10 to-[#7B2D8E]/5 border border-[#7B2D8E]/20'
              }`}>
                {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-[#7B2D8E]" />}
              </div>
              <div className={`max-w-[80%] ${message.role === 'user' ? 'text-right' : ''}`}>
                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  message.role === 'user'
                    ? 'bg-[#7B2D8E] text-white rounded-tr-sm'
                    : 'bg-white text-gray-700 rounded-tl-sm shadow-sm border border-gray-100'
                }`}>
                  {message.isSearchResult && (
                    <div className="flex items-center gap-1.5 text-xs text-[#7B2D8E] mb-2 pb-2 border-b border-gray-100">
                      <Globe className="w-3 h-3" />
                      <span>Web search result</span>
                    </div>
                  )}
                  {message.content}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7B2D8E]/10 to-[#7B2D8E]/5 border border-[#7B2D8E]/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-[#7B2D8E]" />
              </div>
              <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100">
                <div className="flex items-center gap-2">
                  {isSearching && <Search className="w-3 h-3 text-[#7B2D8E] animate-pulse" />}
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-[#7B2D8E] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-[#7B2D8E] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-[#7B2D8E] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-gray-400">{isSearching ? 'Searching web...' : 'Thinking...'}</span>
                </div>
              </div>
            </div>
          )}
          
          {isSpeaking && (
            <div className="flex justify-center">
              <button
                onClick={stopSpeaking}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#7B2D8E]/10 text-[#7B2D8E] rounded-full text-xs hover:bg-[#7B2D8E]/20 transition-colors"
              >
                <Volume2 className="w-3 h-3 animate-pulse" />
                Speaking... Tap to stop
              </button>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Replies */}
        {messages.length <= 2 && (
          <div className="px-4 py-2 bg-white border-t border-gray-50">
            <p className="text-xs text-gray-400 mb-2">Try asking:</p>
            <div className="flex flex-wrap gap-1.5">
              {quickReplies.map((reply) => (
                <button
                  key={reply}
                  onClick={() => sendMessage(reply)}
                  className="px-3 py-1.5 text-xs bg-[#7B2D8E]/5 text-[#7B2D8E] rounded-full hover:bg-[#7B2D8E]/10 transition-colors border border-[#7B2D8E]/10"
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-gray-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleListening}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                isListening 
                  ? 'bg-red-500 text-white animate-pulse' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={isListening ? "Stop listening" : "Voice input"}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? "Listening..." : "Ask me anything..."}
              disabled={isLoading || isListening}
              className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 disabled:opacity-50 transition-all"
            />
            
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="w-10 h-10 bg-[#7B2D8E] text-white rounded-full flex items-center justify-center hover:bg-[#5A1D6A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
