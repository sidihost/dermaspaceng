'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, X, Mic, MicOff, Volume2, VolumeX, ArrowRight, MessageSquare, Plus, Trash2, Menu } from 'lucide-react'
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

interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
}

interface UserInfo {
  name?: string
  email?: string
  preferences?: {
    skinType?: string
    concerns?: string[]
    services?: string[]
    location?: string
  }
}

// Simple markdown formatting
function formatMessage(text: string) {
  let formatted = text.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
  formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>')
  formatted = formatted.replace(/^(\d+)\.\s/gm, '<span class="text-[#7B2D8E] font-medium">$1.</span> ')
  formatted = formatted.replace(/^[-•]\s/gm, '<span class="text-[#7B2D8E]">•</span> ')
  return formatted
}

// Enhanced action parsing - site-aware
function parseActions(content: string): ActionCard[] {
  const actions: ActionCard[] = []
  const lower = content.toLowerCase()
  
  // Booking actions
  if (lower.includes('book') || lower.includes('appointment') || lower.includes('schedule') || lower.includes('reserve')) {
    actions.push({ title: 'Book Appointment', description: 'Schedule your visit', link: '/booking', icon: 'calendar' })
  }
  
  // Service pages
  if (lower.includes('facial') || lower.includes('face treatment')) {
    actions.push({ title: 'Facial Treatments', description: 'View facials', link: '/services/facial-treatments', icon: 'sparkles' })
  } else if (lower.includes('massage') || lower.includes('body treatment') || lower.includes('body scrub')) {
    actions.push({ title: 'Body Treatments', description: 'View massages', link: '/services/body-treatments', icon: 'sparkles' })
  } else if (lower.includes('nail') || lower.includes('manicure') || lower.includes('pedicure')) {
    actions.push({ title: 'Nail Care', description: 'View nail services', link: '/services/nail-care', icon: 'sparkles' })
  } else if (lower.includes('wax')) {
    actions.push({ title: 'Waxing Services', description: 'View waxing', link: '/services/waxing', icon: 'sparkles' })
  } else if (lower.includes('service') || lower.includes('treatment') || lower.includes('offer')) {
    actions.push({ title: 'All Services', description: 'Browse services', link: '/services', icon: 'sparkles' })
  }
  
  // Location/Contact
  if (lower.includes('location') || lower.includes('address') || lower.includes('find us') || lower.includes('where') || lower.includes('visit')) {
    actions.push({ title: 'Our Locations', description: 'Find us', link: '/contact', icon: 'map' })
  }
  
  // About
  if (lower.includes('about') || lower.includes('story') || lower.includes('team') || lower.includes('who')) {
    actions.push({ title: 'About Us', description: 'Our story', link: '/about', icon: 'info' })
  }
  
  // Packages/Pricing
  if (lower.includes('price') || lower.includes('cost') || lower.includes('package') || lower.includes('membership')) {
    actions.push({ title: 'Packages', description: 'View pricing', link: '/packages', icon: 'gift' })
  }
  
  // Gift cards
  if (lower.includes('gift')) {
    actions.push({ title: 'Gift Cards', description: 'Buy gift cards', link: '/gift-cards', icon: 'gift' })
  }
  
  // Gallery
  if (lower.includes('gallery') || lower.includes('photo') || lower.includes('picture') || lower.includes('see the spa')) {
    actions.push({ title: 'Gallery', description: 'View photos', link: '/gallery', icon: 'image' })
  }
  
  // Consultation
  if (lower.includes('consultation') || lower.includes('assess') || lower.includes('recommendation')) {
    actions.push({ title: 'Free Consultation', description: 'Get assessed', link: '/free-consultation', icon: 'calendar' })
  }
  
  return actions.slice(0, 2)
}

// Action icons
function ActionIcon({ type }: { type: string }) {
  const icons: Record<string, JSX.Element> = {
    calendar: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>,
    sparkles: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>,
    map: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>,
    gift: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1012 10.125M12 4.875A2.625 2.625 0 1012 10.125M12 10.125V21" /></svg>,
    info: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>,
    image: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>,
  }
  return icons[type] || icons.sparkles
}

// Butterfly Logo
function ButterflyLogo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="currentColor">
      <path d="M16 4c-3.3 0-6 2.7-6 6 0 2 1 3.7 2.4 4.9-.8.4-1.7 1.1-2.4 1.7-2-1.6-4.7-2.6-7.3-2.6-.8 0-1.3.5-1.3 1.3s.5 1.3 1.3 1.3c1.9 0 3.6.7 5.1 1.7C6 20 5.3 22.3 5.3 24.7c0 .8.5 1.3 1.3 1.3s1.3-.5 1.3-1.3c0-1.9.5-3.6 1.5-5.1.7.4 1.5.8 2.3 1.1-.7 1.5-1.1 3.2-1.1 4.9 0 3.3 2.7 5.7 5.3 5.7s5.3-2.4 5.3-5.7c0-1.7-.4-3.5-1.1-4.9.8-.3 1.6-.7 2.3-1.1 1 1.5 1.5 3.2 1.5 5.1 0 .8.5 1.3 1.3 1.3s1.3-.5 1.3-1.3c0-2.4-.7-4.7-2.4-6.3 1.5-1 3.2-1.7 5.1-1.7.8 0 1.3-.5 1.3-1.3s-.5-1.3-1.3-1.3c-2.7 0-5.3 1.1-7.3 2.6-.7-.7-1.6-1.3-2.4-1.7C21 13.7 22 12 22 10c0-3.3-2.7-6-6-6zm0 2.7c1.9 0 3.3 1.5 3.3 3.3S17.9 13.3 16 13.3s-3.3-1.5-3.3-3.3S14.1 6.7 16 6.7z"/>
    </svg>
  )
}

export default function DermaAI() {
  const [isOpen, setIsOpen] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string>('')
  const [userInfo, setUserInfo] = useState<UserInfo>({})
  const [messages, setMessages] = useState<Message[]>([])
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

  // Fetch user info
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            setUserInfo({
              name: data.user.firstName,
              email: data.user.email,
              preferences: data.user.preferences || undefined
            })
          }
        }
      } catch { /* ignore */ }
      
      // Also check localStorage for preferences
      const savedPrefs = localStorage.getItem('dermaspace-user-prefs')
      if (savedPrefs) {
        try {
          const prefs = JSON.parse(savedPrefs)
          setUserInfo(prev => ({
            ...prev,
            preferences: prefs.preferences || prefs
          }))
        } catch { /* ignore */ }
      }
    }
    fetchUser()
  }, [])

  // Set initial welcome message with user name
  useEffect(() => {
    const greeting = userInfo.name 
      ? `Hello ${userInfo.name}! Welcome to Dermaspace. I'm Derma, your personal skincare assistant. How can I help you today?`
      : "Hello! Welcome to Dermaspace. I'm Derma, your personal skincare assistant. How can I help you today?"
    
    const prefsNote = userInfo.preferences?.concerns?.length 
      ? ` Based on your preferences, I see you're interested in ${userInfo.preferences.concerns.slice(0, 2).join(' and ')} treatments.`
      : ''
    
    setMessages([{
      id: '1',
      role: 'assistant',
      content: greeting + prefsNote,
      timestamp: new Date(),
      actions: [
        { title: 'Book Appointment', description: 'Schedule visit', link: '/booking', icon: 'calendar' },
        { title: 'Browse Services', description: 'View all', link: '/services', icon: 'sparkles' },
      ]
    }])
  }, [userInfo.name, userInfo.preferences])

  // Load chat sessions
  useEffect(() => {
    const saved = localStorage.getItem('derma-chat-sessions')
    if (saved) {
      const parsed = JSON.parse(saved)
      setSessions(parsed.map((s: ChatSession) => ({
        ...s,
        createdAt: new Date(s.createdAt),
        messages: s.messages.map((m: Message) => ({ ...m, timestamp: new Date(m.timestamp) }))
      })))
    }
  }, [])

  // Save sessions
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('derma-chat-sessions', JSON.stringify(sessions))
    }
  }, [sessions])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Speech recognition
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

  // Text to speech
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
        
        if (!audioRef.current) audioRef.current = new Audio()
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

  const startNewChat = () => {
    if (messages.length > 1 && currentSessionId === '') {
      const newSession: ChatSession = {
        id: Date.now().toString(),
        title: messages[1]?.content.substring(0, 30) + '...' || 'New Chat',
        messages: messages,
        createdAt: new Date()
      }
      setSessions(prev => [newSession, ...prev])
    }
    
    const greeting = userInfo.name 
      ? `Hello ${userInfo.name}! How can I help you today?`
      : "Hello! How can I help you today?"
    
    setMessages([{
      id: Date.now().toString(),
      role: 'assistant',
      content: greeting,
      timestamp: new Date(),
      actions: [
        { title: 'Book Appointment', description: 'Schedule visit', link: '/booking', icon: 'calendar' },
        { title: 'Browse Services', description: 'View all', link: '/services', icon: 'sparkles' },
      ]
    }])
    setCurrentSessionId('')
    setShowSidebar(false)
  }

  const loadSession = (session: ChatSession) => {
    setMessages(session.messages)
    setCurrentSessionId(session.id)
    setShowSidebar(false)
  }

  const deleteSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id))
    if (currentSessionId === id) startNewChat()
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
          })),
          userInfo: {
            name: userInfo.name,
            preferences: userInfo.preferences
          }
        })
      })

      if (!res.ok) throw new Error('Failed')

      const data = await res.json()
      const responseText = data.message || "I apologize, please try again or call us at +234 901 797 2919."
      
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
      
      if (voiceEnabled) speakText(responseText)
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting. Please try again or contact us at +234 901 797 2919.",
        timestamp: new Date()
      }])
      setStreamingContent('')
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, messages, userInfo, voiceEnabled, speakText])

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
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-[#7B2D8E] to-[#5A1D6A] flex items-center justify-center transition-transform group-hover:scale-105">
            <ButterflyLogo className="w-7 h-7 md:w-8 md:h-8 text-white" />
          </div>
          <span className="absolute top-0 right-0 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-400 border-2 border-white"></span>
          </span>
        </div>
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[58] md:bg-transparent md:backdrop-blur-none"
          onClick={() => { setIsOpen(false); setShowSidebar(false); }}
        />
      )}

      {/* Chat Modal */}
      <div 
        className={`fixed z-[60] transition-all duration-300 ease-out
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
          inset-0 md:inset-auto md:bottom-6 md:right-4 md:w-[420px] md:h-[600px]
          ${isOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-4'}
        `}
      >
        <div className="w-full h-full bg-white md:rounded-2xl flex overflow-hidden md:border md:border-gray-200">
          
          {/* Sidebar */}
          <div className={`absolute md:relative inset-y-0 left-0 w-64 bg-gray-50 border-r border-gray-100 flex flex-col transition-transform duration-300 z-10 ${
            showSidebar ? 'translate-x-0' : '-translate-x-full'
          }`}>
            <div className="p-3 border-b border-gray-100">
              <button
                onClick={startNewChat}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#7B2D8E] text-white text-sm font-medium rounded-xl hover:bg-[#6B2278] transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Chat
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {sessions.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">No chat history yet</p>
              ) : (
                sessions.map(session => (
                  <div
                    key={session.id}
                    className={`group flex items-center gap-2 p-2.5 rounded-xl cursor-pointer mb-1 ${
                      currentSessionId === session.id ? 'bg-[#7B2D8E]/10' : 'hover:bg-gray-100'
                    }`}
                    onClick={() => loadSession(session)}
                  >
                    <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-600 truncate flex-1">{session.title}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Main Chat */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <div className="flex-shrink-0 bg-gradient-to-r from-[#7B2D8E] to-[#9B4DAE] px-3 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setShowSidebar(!showSidebar)}
                    className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-white hover:bg-white/25 transition-colors"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                  <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center">
                    <ButterflyLogo className="w-5 h-5 text-[#7B2D8E]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">Derma AI</h3>
                    {isSpeaking ? (
                      <div className="flex items-center gap-1">
                        <span className="flex gap-0.5">
                          {[1,2,3].map(i => (
                            <span key={i} className="w-0.5 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                          ))}
                        </span>
                        <span className="text-[10px] text-white/80">Speaking</span>
                      </div>
                    ) : (
                      <p className="text-[10px] text-white/70">Your skincare assistant</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setVoiceEnabled(!voiceEnabled)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                      voiceEnabled ? 'bg-white text-[#7B2D8E]' : 'bg-white/15 text-white hover:bg-white/25'
                    }`}
                    title={voiceEnabled ? 'Voice on' : 'Voice off'}
                  >
                    {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => { setIsOpen(false); setShowSidebar(false); }}
                    className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/15 text-white hover:bg-white/25 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 bg-[#FAFAFA]">
              <div className="space-y-3">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#7B2D8E] flex items-center justify-center mr-2 mt-0.5">
                        <ButterflyLogo className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                    <div className="max-w-[80%]">
                      <div
                        className={`px-3.5 py-2.5 text-[13px] leading-relaxed ${
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
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {message.actions.map((action, idx) => (
                            <Link
                              key={idx}
                              href={action.link}
                              onClick={() => setIsOpen(false)}
                              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-700 hover:border-[#7B2D8E] hover:text-[#7B2D8E] transition-colors group"
                            >
                              <span className="text-[#7B2D8E]"><ActionIcon type={action.icon} /></span>
                              {action.title}
                              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
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
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#7B2D8E] flex items-center justify-center mr-2 mt-0.5">
                      <ButterflyLogo className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="max-w-[80%]">
                      <div className="px-3.5 py-2.5 bg-white text-gray-700 rounded-2xl rounded-tl-md text-[13px] leading-relaxed border border-gray-100">
                        <span dangerouslySetInnerHTML={{ __html: formatMessage(streamingContent) }} />
                        <span className="inline-block w-1.5 h-4 bg-[#7B2D8E] ml-0.5 animate-pulse" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Loading */}
                {isLoading && !streamingContent && (
                  <div className="flex justify-start">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#7B2D8E] flex items-center justify-center mr-2">
                      <ButterflyLogo className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="px-4 py-3 bg-white rounded-2xl rounded-tl-md border border-gray-100">
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <span key={i} className="w-2 h-2 bg-[#7B2D8E]/40 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input */}
            <div className="flex-shrink-0 px-3 py-3 bg-white border-t border-gray-100 pb-6 md:pb-3">
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
                    isListening
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isListening ? 'Listening...' : 'Ask me anything...'}
                  className="flex-1 h-10 px-4 bg-gray-100 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20"
                  disabled={isLoading || isListening}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="w-10 h-10 bg-[#7B2D8E] text-white rounded-xl flex items-center justify-center hover:bg-[#6B2278] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
