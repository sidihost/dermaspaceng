'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Send, X, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
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
  const [streamingContent, setStreamingContent] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

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

      if (!res.ok) throw new Error('Failed to get response')

      const data = await res.json()
      const responseText = data.content || data.message || "I apologize, I couldn't process that request."
      
      // Simulate streaming effect
      let currentText = ''
      for (let i = 0; i < responseText.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 8))
        currentText += responseText[i]
        setStreamingContent(currentText)
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
      setStreamingContent('')
      
      if (voiceEnabled) speak(assistantMessage.content)
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again.",
        timestamp: new Date()
      }])
      setStreamingContent('')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-28 md:bottom-6 right-4 z-[45] transition-all duration-300 ${
          isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'
        }`}
        aria-label="Open Derma AI"
      >
        <div className="relative group">
          <div className="w-14 h-14 rounded-full bg-[#7B2D8E] flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202025-01-09%20at%2022.34.02-LHSfQyUMlRoLNbGOmhKNlUbfSY8V30.jpeg"
              alt="Derma AI"
              width={48}
              height={48}
              className="w-12 h-12 object-cover rounded-full"
            />
          </div>
          <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
        </div>
      </button>

      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-[55] transition-opacity duration-300 md:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* Chat Window - Slide from right on mobile, popup on desktop */}
      <div 
        className={`fixed z-[60] transition-all duration-300 ease-out
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
          
          /* Mobile: Full screen slide from right */
          inset-0 md:inset-auto
          ${isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0 md:translate-y-4'}
          
          /* Desktop: Bottom right corner */
          md:bottom-6 md:right-4 md:w-[420px] md:h-[600px] md:max-h-[85vh]
        `}
      >
        <div className="w-full h-full bg-white md:rounded-2xl flex flex-col overflow-hidden border-0 md:border md:border-gray-200">
          {/* Header */}
          <div className="flex-shrink-0 bg-white border-b border-gray-100 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-[#7B2D8E]/10">
                    <Image
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202025-01-09%20at%2022.34.02-LHSfQyUMlRoLNbGOmhKNlUbfSY8V30.jpeg"
                      alt="Derma AI"
                      width={40}
                      height={40}
                      className="w-10 h-10 object-cover"
                    />
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">Derma AI</h3>
                  <p className="text-xs text-green-600">Online</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    voiceEnabled ? 'bg-[#7B2D8E]/10 text-[#7B2D8E]' : 'text-gray-400 hover:bg-gray-100'
                  }`}
                  title={voiceEnabled ? 'Disable voice' : 'Enable voice'}
                >
                  {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 bg-[#FAFAFA]">
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] ${message.role === 'user' ? '' : 'flex gap-2'}`}>
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0 w-7 h-7 rounded-full overflow-hidden bg-[#7B2D8E]/10 mt-0.5">
                        <Image
                          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202025-01-09%20at%2022.34.02-LHSfQyUMlRoLNbGOmhKNlUbfSY8V30.jpeg"
                          alt=""
                          width={28}
                          height={28}
                          className="w-7 h-7 object-cover"
                        />
                      </div>
                    )}
                    <div>
                      <div
                        className={`px-4 py-2.5 text-[14px] leading-relaxed ${
                          message.role === 'user'
                            ? 'bg-[#7B2D8E] text-white rounded-2xl rounded-br-md'
                            : 'bg-white text-gray-800 rounded-2xl rounded-tl-md border border-gray-100'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                      <p className={`text-[10px] text-gray-400 mt-1 px-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Streaming Message */}
              {streamingContent && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] flex gap-2">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full overflow-hidden bg-[#7B2D8E]/10 mt-0.5">
                      <Image
                        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202025-01-09%20at%2022.34.02-LHSfQyUMlRoLNbGOmhKNlUbfSY8V30.jpeg"
                        alt=""
                        width={28}
                        height={28}
                        className="w-7 h-7 object-cover"
                      />
                    </div>
                    <div className="bg-white text-gray-800 rounded-2xl rounded-tl-md border border-gray-100 px-4 py-2.5">
                      <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{streamingContent}<span className="inline-block w-0.5 h-4 bg-[#7B2D8E] ml-0.5 animate-pulse" /></p>
                    </div>
                  </div>
                </div>
              )}

              {/* Loading Dots */}
              {isLoading && !streamingContent && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] flex gap-2">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full overflow-hidden bg-[#7B2D8E]/10 mt-0.5">
                      <Image
                        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202025-01-09%20at%2022.34.02-LHSfQyUMlRoLNbGOmhKNlUbfSY8V30.jpeg"
                        alt=""
                        width={28}
                        height={28}
                        className="w-7 h-7 object-cover"
                      />
                    </div>
                    <div className="bg-white rounded-2xl rounded-tl-md border border-gray-100 px-4 py-3">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-[#7B2D8E]/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 rounded-full bg-[#7B2D8E]/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 rounded-full bg-[#7B2D8E]/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Quick Actions */}
          {messages.length <= 2 && !isLoading && (
            <div className="flex-shrink-0 px-4 py-3 bg-white border-t border-gray-100">
              <p className="text-[11px] text-gray-500 mb-2 font-medium">Suggestions</p>
              <div className="flex flex-wrap gap-2">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => sendMessage(action.action)}
                    className="px-3 py-1.5 text-xs font-medium text-[#7B2D8E] bg-[#7B2D8E]/5 rounded-full hover:bg-[#7B2D8E]/10 transition-colors"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="flex-shrink-0 p-4 bg-white border-t border-gray-100">
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <button
                type="button"
                onClick={toggleListening}
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  isListening
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
                title={isListening ? 'Stop listening' : 'Voice input'}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isListening ? 'Listening...' : 'Message Derma AI...'}
                  rows={1}
                  className="w-full px-4 py-2.5 bg-gray-100 rounded-2xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 max-h-32"
                  style={{ minHeight: '40px' }}
                  disabled={isLoading || isListening}
                />
              </div>
              
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="flex-shrink-0 w-10 h-10 rounded-full bg-[#7B2D8E] text-white flex items-center justify-center hover:bg-[#6B2278] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            
            {isSpeaking && (
              <p className="text-[11px] text-[#7B2D8E] mt-2 flex items-center gap-1">
                <Volume2 className="w-3 h-3 animate-pulse" />
                Speaking...
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
