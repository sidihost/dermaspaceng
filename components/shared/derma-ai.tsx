'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, X, Mic, MicOff } from 'lucide-react'

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

// Simple markdown-like formatting
function formatMessage(text: string) {
  // Replace **text** with bold
  let formatted = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  // Replace *text* with italic
  formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>')
  // Replace numbered lists
  formatted = formatted.replace(/^(\d+)\.\s/gm, '<span class="text-[#7B2D8E] font-medium">$1.</span> ')
  // Replace bullet points
  formatted = formatted.replace(/^[-•]\s/gm, '<span class="text-[#7B2D8E]">•</span> ')
  return formatted
}

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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

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

      if (!res.ok) throw new Error('Failed to get response')

      const data = await res.json()
      const responseText = data.content || data.message || "I apologize, I couldn't process that request."
      
      // Streaming effect
      let currentText = ''
      for (let i = 0; i < responseText.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 6))
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
  }, [isLoading, messages])

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
          <div className="w-14 h-14 rounded-full bg-[#7B2D8E] flex items-center justify-center transition-transform group-hover:scale-105">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.557 1.522 4.82 3.889 6.115l-.78 3.77 4.076-2.131c.588.086 1.193.131 1.815.131 4.97 0 9-3.185 9-7.115S16.97 3 12 3z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
        </div>
      </button>

      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/30 backdrop-blur-sm z-[55] transition-opacity duration-300 md:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* Chat Window */}
      <div 
        className={`fixed z-[60] transition-all duration-300 ease-out
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
          inset-0 md:inset-auto
          ${isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0 md:translate-y-4'}
          md:bottom-6 md:right-4 md:w-[400px] md:h-[580px] md:max-h-[85vh]
        `}
      >
        <div className="w-full h-full bg-white md:rounded-2xl flex flex-col overflow-hidden md:border md:border-gray-200">
          {/* Header */}
          <div className="flex-shrink-0 bg-[#7B2D8E] px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.557 1.522 4.82 3.889 6.115l-.78 3.77 4.076-2.131c.588.086 1.193.131 1.815.131 4.97 0 9-3.185 9-7.115S16.97 3 12 3z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Derma AI</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-green-400 rounded-full" />
                    <p className="text-xs text-white/80">Online</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50">
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#7B2D8E] flex items-center justify-center mr-2 mt-0.5">
                      <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.557 1.522 4.82 3.889 6.115l-.78 3.77 4.076-2.131c.588.086 1.193.131 1.815.131 4.97 0 9-3.185 9-7.115S16.97 3 12 3z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                  <div className={`max-w-[80%] ${message.role === 'user' ? '' : ''}`}>
                    <div
                      className={`px-4 py-3 text-[14px] leading-relaxed ${
                        message.role === 'user'
                          ? 'bg-[#7B2D8E] text-white rounded-2xl rounded-br-sm'
                          : 'bg-white text-gray-800 rounded-2xl rounded-tl-sm border border-gray-100'
                      }`}
                    >
                      <div 
                        className="whitespace-pre-wrap [&_strong]:font-semibold [&_em]:italic"
                        dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                      />
                    </div>
                    <p className={`text-[10px] text-gray-400 mt-1.5 ${message.role === 'user' ? 'text-right' : 'ml-1'}`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}

              {/* Streaming Message */}
              {streamingContent && (
                <div className="flex justify-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#7B2D8E] flex items-center justify-center mr-2 mt-0.5">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.557 1.522 4.82 3.889 6.115l-.78 3.77 4.076-2.131c.588.086 1.193.131 1.815.131 4.97 0 9-3.185 9-7.115S16.97 3 12 3z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="max-w-[80%]">
                    <div className="bg-white text-gray-800 rounded-2xl rounded-tl-sm border border-gray-100 px-4 py-3">
                      <div 
                        className="text-[14px] leading-relaxed whitespace-pre-wrap [&_strong]:font-semibold"
                        dangerouslySetInnerHTML={{ __html: formatMessage(streamingContent) }}
                      />
                      <span className="inline-block w-0.5 h-4 bg-[#7B2D8E] ml-0.5 animate-pulse align-middle" />
                    </div>
                  </div>
                </div>
              )}

              {/* Loading Indicator */}
              {isLoading && !streamingContent && (
                <div className="flex justify-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#7B2D8E] flex items-center justify-center mr-2">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.557 1.522 4.82 3.889 6.115l-.78 3.77 4.076-2.131c.588.086 1.193.131 1.815.131 4.97 0 9-3.185 9-7.115S16.97 3 12 3z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="bg-white rounded-2xl rounded-tl-sm border border-gray-100 px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-[#7B2D8E]/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-[#7B2D8E]/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-[#7B2D8E]/50 animate-bounce" style={{ animationDelay: '300ms' }} />
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
              <p className="text-[11px] text-gray-500 mb-2 font-medium uppercase tracking-wide">Quick Actions</p>
              <div className="flex flex-wrap gap-2">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => sendMessage(action.action)}
                    className="px-3 py-1.5 text-xs font-medium text-[#7B2D8E] bg-[#7B2D8E]/5 rounded-full hover:bg-[#7B2D8E]/10 transition-colors border border-[#7B2D8E]/10"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="flex-shrink-0 p-3 bg-white border-t border-gray-100">
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <button
                type="button"
                onClick={toggleListening}
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse'
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
                  placeholder={isListening ? 'Listening...' : 'Type a message...'}
                  rows={1}
                  className="w-full px-4 py-2.5 bg-gray-100 rounded-2xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 max-h-24 placeholder:text-gray-400"
                  style={{ minHeight: '42px' }}
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
          </div>
        </div>
      </div>
    </>
  )
}
