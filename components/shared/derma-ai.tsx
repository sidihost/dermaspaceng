'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, X, Mic, MicOff, Volume2, VolumeX, ArrowRight, MessageSquare, Plus, Trash2, Menu, Phone, Calendar } from 'lucide-react'
import Link from 'next/link'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  actions?: ActionCard[]
  showBooking?: boolean
  bookingStep?: 'service' | 'location' | 'date' | 'time' | 'confirm'
}

interface ActionCard {
  title: string
  description: string
  link?: string
  icon: string
  onClick?: () => void
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

interface BookingState {
  service?: string
  location?: string
  date?: string
  time?: string
}

// Simple markdown formatting
function formatMessage(text: string) {
  let formatted = text.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
  formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>')
  formatted = formatted.replace(/^(\d+)\.\s/gm, '<span class="text-[#7B2D8E] font-medium">$1.</span> ')
  formatted = formatted.replace(/^[-•]\s/gm, '<span class="text-[#7B2D8E]">•</span> ')
  return formatted
}

// Enhanced action parsing
function parseActions(content: string): ActionCard[] {
  const actions: ActionCard[] = []
  const lower = content.toLowerCase()
  
  if (lower.includes('book') || lower.includes('appointment') || lower.includes('schedule')) {
    actions.push({ title: 'Book Now', description: 'Schedule visit', link: '/booking', icon: 'calendar' })
  }
  if (lower.includes('facial') || lower.includes('face treatment')) {
    actions.push({ title: 'Facials', description: 'View treatments', link: '/services/facial-treatments', icon: 'sparkles' })
  } else if (lower.includes('massage') || lower.includes('body treatment')) {
    actions.push({ title: 'Body Care', description: 'View services', link: '/services/body-treatments', icon: 'sparkles' })
  } else if (lower.includes('nail') || lower.includes('manicure') || lower.includes('pedicure')) {
    actions.push({ title: 'Nail Care', description: 'View services', link: '/services/nail-care', icon: 'sparkles' })
  } else if (lower.includes('wax')) {
    actions.push({ title: 'Waxing', description: 'View services', link: '/services/waxing', icon: 'sparkles' })
  } else if (lower.includes('service') || lower.includes('treatment') || lower.includes('offer')) {
    actions.push({ title: 'All Services', description: 'Browse', link: '/services', icon: 'sparkles' })
  }
  if (lower.includes('location') || lower.includes('address') || lower.includes('where')) {
    actions.push({ title: 'Locations', description: 'Find us', link: '/contact', icon: 'map' })
  }
  if (lower.includes('about') || lower.includes('story')) {
    actions.push({ title: 'About Us', description: 'Our story', link: '/about', icon: 'info' })
  }
  if (lower.includes('price') || lower.includes('cost') || lower.includes('package')) {
    actions.push({ title: 'Packages', description: 'View pricing', link: '/packages', icon: 'gift' })
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
  const [voiceCallMode, setVoiceCallMode] = useState(false)
  const [callStatus, setCallStatus] = useState<'idle' | 'listening' | 'speaking' | 'processing'>('idle')
  const [showBookingWidget, setShowBookingWidget] = useState(false)
  const [bookingState, setBookingState] = useState<BookingState>({})
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

  // Set initial welcome message
  useEffect(() => {
    const greeting = userInfo.name 
      ? `Hello ${userInfo.name}! Welcome to Dermaspace. How can I help you today?`
      : "Hello! Welcome to Dermaspace. How can I help you today?"
    
    const prefsNote = userInfo.preferences?.concerns?.length 
      ? ` Based on your preferences, I see you're interested in ${userInfo.preferences.concerns.slice(0, 2).join(' and ')}.`
      : ''
    
    setMessages([{
      id: '1',
      role: 'assistant',
      content: greeting + prefsNote,
      timestamp: new Date(),
      actions: [
        { title: 'Book Appointment', description: 'Schedule visit', icon: 'calendar' },
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

  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('derma-chat-sessions', JSON.stringify(sessions))
    }
  }, [sessions])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent, showBookingWidget])

  useEffect(() => {
    if (isOpen && inputRef.current && !voiceCallMode) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, voiceCallMode])

  // Listen for custom event to open chat
  useEffect(() => {
    const handleOpen = () => setIsOpen(true)
    window.addEventListener('openDermaAI', handleOpen)
    return () => window.removeEventListener('openDermaAI', handleOpen)
  }, [])

  // Text to speech
  const speakText = useCallback(async (text: string) => {
    if (!voiceEnabled || isSpeaking) return
    
    try {
      setIsSpeaking(true)
      setCallStatus('speaking')
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
        audioRef.current.onended = () => {
          setIsSpeaking(false)
          if (voiceCallMode && recognitionRef.current) {
            setCallStatus('listening')
            try {
              recognitionRef.current.start()
              setIsListening(true)
            } catch { /* ignore */ }
          } else {
            setCallStatus('idle')
          }
        }
        await audioRef.current.play()
      } else {
        setIsSpeaking(false)
        setCallStatus('idle')
      }
    } catch {
      setIsSpeaking(false)
      setCallStatus('idle')
    }
  }, [voiceEnabled, isSpeaking, voiceCallMode])

  // Speech recognition setup
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = 'en-NG'

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript
        setIsListening(false)
        if (transcript.trim()) {
          if (voiceCallMode) {
            setCallStatus('processing')
          }
          sendMessage(transcript)
        }
      }

      recognitionRef.current.onerror = () => {
        setIsListening(false)
        if (voiceCallMode) {
          setTimeout(() => {
            if (voiceCallMode && !isSpeaking && recognitionRef.current) {
              try {
                recognitionRef.current.start()
                setIsListening(true)
                setCallStatus('listening')
              } catch { /* ignore */ }
            }
          }, 500)
        }
      }
      
      recognitionRef.current.onend = () => {
        if (voiceCallMode && !isSpeaking && callStatus === 'listening') {
          setTimeout(() => {
            if (voiceCallMode && !isSpeaking && recognitionRef.current) {
              try {
                recognitionRef.current.start()
                setIsListening(true)
              } catch { /* ignore */ }
            }
          }, 300)
        } else {
          setIsListening(false)
        }
      }
    }
  }, [voiceCallMode, isSpeaking, callStatus])

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

  const startVoiceCall = () => {
    setVoiceCallMode(true)
    setVoiceEnabled(true)
    setCallStatus('listening')
    setIsListening(true)
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start()
      } catch { /* ignore */ }
    }
  }

  const endVoiceCall = () => {
    setVoiceCallMode(false)
    setCallStatus('idle')
    setIsListening(false)
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch { /* ignore */ }
    }
    if (audioRef.current) {
      audioRef.current.pause()
    }
    setIsSpeaking(false)
  }

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
        { title: 'Book Appointment', description: 'Schedule visit', icon: 'calendar' },
        { title: 'Browse Services', description: 'View all', link: '/services', icon: 'sparkles' },
      ]
    }])
    setCurrentSessionId('')
    setShowSidebar(false)
    setShowBookingWidget(false)
    setBookingState({})
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

  // Booking flow handlers
  const initiateBooking = () => {
    setShowBookingWidget(true)
    const assistantMsg: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: "I'd love to help you book an appointment! What service are you interested in?",
      timestamp: new Date(),
      showBooking: true,
      bookingStep: 'service'
    }
    setMessages(prev => [...prev, assistantMsg])
  }

  const handleBookingSelection = (step: string, value: string) => {
    const newBookingState = { ...bookingState, [step]: value }
    setBookingState(newBookingState)
    
    // User confirmation message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: value,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMsg])
    
    // Determine next step
    setTimeout(() => {
      let nextStep: 'service' | 'location' | 'date' | 'time' | 'confirm' | null = null
      let assistantContent = ''
      
      if (step === 'service') {
        nextStep = 'location'
        assistantContent = `${value} - great choice! Which location would you prefer?`
      } else if (step === 'location') {
        nextStep = 'date'
        assistantContent = `Perfect! ${value} it is. What date works for you?`
      } else if (step === 'date') {
        nextStep = 'time'
        assistantContent = `${value} - got it! What time would you like?`
      } else if (step === 'time') {
        nextStep = 'confirm'
        assistantContent = `Here's your booking summary:\n\n**Service:** ${newBookingState.service}\n**Location:** ${newBookingState.location}\n**Date:** ${newBookingState.date}\n**Time:** ${value}\n\nShall I confirm this booking?`
      }
      
      if (nextStep) {
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: assistantContent,
          timestamp: new Date(),
          showBooking: true,
          bookingStep: nextStep
        }
        setMessages(prev => [...prev, assistantMsg])
      }
    }, 500)
  }

  const confirmBooking = () => {
    setShowBookingWidget(false)
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: 'Yes, confirm my booking',
      timestamp: new Date()
    }
    const assistantMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: `Your appointment has been booked!\n\n**${bookingState.service}** at **${bookingState.location}**\n${bookingState.date} at ${bookingState.time}\n\nYou'll receive a confirmation via email. See you soon!`,
      timestamp: new Date(),
      actions: [
        { title: 'View Dashboard', description: 'See bookings', link: '/dashboard', icon: 'calendar' }
      ]
    }
    setMessages(prev => [...prev, userMsg, assistantMsg])
    setBookingState({})
  }

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return

    // Check if user wants to book
    const lower = content.toLowerCase()
    if ((lower.includes('book') || lower.includes('appointment') || lower.includes('schedule')) && !showBookingWidget) {
      const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date()
      }
      setMessages(prev => [...prev, userMsg])
      setInput('')
      setTimeout(() => initiateBooking(), 300)
      return
    }

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
      const responseText = data.message || "Please try again or call us at +234 901 797 2919."
      
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
        content: "I'm having trouble. Please try again or call +234 901 797 2919.",
        timestamp: new Date()
      }])
      setStreamingContent('')
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, messages, userInfo, voiceEnabled, speakText, showBookingWidget])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  // Booking options
  const services = ['Facial Treatment', 'Body Massage', 'Nail Care', 'Waxing', 'Package Deal']
  const locations = ['Victoria Island', 'Ikoyi']
  const dates = ['Today', 'Tomorrow', 'This Saturday', 'Next Week']
  const times = ['10:00 AM', '12:00 PM', '2:00 PM', '4:00 PM', '6:00 PM']

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
        <div className="w-14 h-14 md:w-[60px] md:h-[60px] rounded-full bg-[#7B2D8E] flex items-center justify-center transition-transform hover:scale-105 shadow-lg shadow-[#7B2D8E]/20">
          <ButterflyLogo className="w-7 h-7 md:w-8 md:h-8 text-white" />
        </div>
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[58] md:bg-transparent md:backdrop-blur-none"
          onClick={() => { setIsOpen(false); setShowSidebar(false); endVoiceCall(); }}
        />
      )}

      {/* Chat Modal */}
      <div 
        className={`fixed z-[60] transition-all duration-300 ease-out
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
          inset-0 md:inset-auto md:bottom-6 md:right-4 md:w-[400px] md:h-[600px]
          ${isOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-4'}
        `}
      >
        <div className="w-full h-full bg-white md:rounded-2xl flex overflow-hidden md:shadow-2xl md:border md:border-gray-200">
          
          {/* Sidebar */}
          <div className={`absolute md:relative inset-y-0 left-0 w-64 bg-gray-50 border-r border-gray-100 flex flex-col transition-transform duration-300 z-10 ${
            showSidebar ? 'translate-x-0' : '-translate-x-full'
          }`}>
            <div className="p-3 border-b border-gray-100">
              <button
                onClick={startNewChat}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#7B2D8E] text-white text-sm font-medium rounded-lg hover:bg-[#6B2278] transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Chat
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              <p className="text-xs text-gray-400 px-2 py-1">Recent</p>
              {sessions.length === 0 ? (
                <p className="text-xs text-gray-400 px-2 py-4 text-center">No chat history</p>
              ) : (
                sessions.slice(0, 10).map(session => (
                  <div
                    key={session.id}
                    className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer hover:bg-white transition-colors ${
                      currentSessionId === session.id ? 'bg-white' : ''
                    }`}
                    onClick={() => loadSession(session)}
                  >
                    <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="flex-1 text-xs text-gray-700 truncate">{session.title}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded transition-all"
                    >
                      <Trash2 className="w-3 h-3 text-gray-400" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Main Chat */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Voice Call Mode */}
            {voiceCallMode ? (
              <div className="flex-1 flex flex-col items-center justify-center bg-[#7B2D8E] p-6">
                <div className="relative mb-8">
                  <div className={`w-32 h-32 rounded-full bg-white/10 flex items-center justify-center ${
                    callStatus === 'speaking' ? 'animate-pulse' : ''
                  }`}>
                    <ButterflyLogo className="w-16 h-16 text-white" />
                  </div>
                  {callStatus === 'listening' && (
                    <div className="absolute inset-0 rounded-full border-4 border-white/30 animate-ping" />
                  )}
                </div>
                
                <p className="text-white font-semibold text-lg mb-2">Derma AI</p>
                <p className="text-white/70 text-sm mb-8">
                  {callStatus === 'listening' && 'Listening...'}
                  {callStatus === 'speaking' && 'Speaking...'}
                  {callStatus === 'processing' && 'Processing...'}
                </p>
                
                <button
                  onClick={endVoiceCall}
                  className="flex items-center gap-2 px-6 py-3 bg-white text-[#7B2D8E] font-medium rounded-full hover:bg-gray-100 transition-colors"
                >
                  <Phone className="w-5 h-5" />
                  End Call
                </button>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="bg-[#7B2D8E] px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowSidebar(!showSidebar)}
                      className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <Menu className="w-5 h-5 text-white" />
                    </button>
                    <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                      <ButterflyLogo className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-sm">Derma AI</h3>
                      <p className="text-[10px] text-white/70">Skincare Assistant</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={startVoiceCall}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      title="Voice Call"
                    >
                      <Phone className="w-4 h-4 text-white" />
                    </button>
                    <button
                      onClick={() => setVoiceEnabled(!voiceEnabled)}
                      className={`p-2 rounded-lg transition-colors ${voiceEnabled ? 'bg-white/20' : 'hover:bg-white/10'}`}
                      title="Voice Output"
                    >
                      {voiceEnabled ? <Volume2 className="w-4 h-4 text-white" /> : <VolumeX className="w-4 h-4 text-white/60" />}
                    </button>
                    <button
                      onClick={() => { setIsOpen(false); setShowSidebar(false); }}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-3">
                  {messages.map((message) => (
                    <div key={message.id}>
                      <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {message.role === 'assistant' && (
                          <div className="flex-shrink-0 w-6 h-6 rounded-md bg-[#7B2D8E] flex items-center justify-center mr-2 mt-0.5">
                            <ButterflyLogo className="w-3.5 h-3.5 text-white" />
                          </div>
                        )}
                        <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                          message.role === 'user'
                            ? 'bg-[#7B2D8E] text-white rounded-br-md'
                            : 'bg-white border border-gray-100 text-gray-700 rounded-bl-md'
                        }`}>
                          <div dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }} />
                        </div>
                      </div>
                      
                      {/* Booking Widget */}
                      {message.showBooking && message.bookingStep && (
                        <div className="ml-8 mt-2 bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                          {message.bookingStep === 'service' && (
                            <div className="space-y-2">
                              <p className="text-xs text-gray-500 font-medium">Select a service:</p>
                              <div className="flex flex-wrap gap-2">
                                {services.map(s => (
                                  <button
                                    key={s}
                                    onClick={() => handleBookingSelection('service', s)}
                                    className="px-3 py-1.5 text-xs font-medium bg-[#7B2D8E]/5 text-[#7B2D8E] rounded-lg hover:bg-[#7B2D8E]/10 transition-colors"
                                  >
                                    {s}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          {message.bookingStep === 'location' && (
                            <div className="space-y-2">
                              <p className="text-xs text-gray-500 font-medium">Choose location:</p>
                              <div className="flex gap-2">
                                {locations.map(l => (
                                  <button
                                    key={l}
                                    onClick={() => handleBookingSelection('location', l)}
                                    className="px-4 py-2 text-xs font-medium bg-[#7B2D8E]/5 text-[#7B2D8E] rounded-lg hover:bg-[#7B2D8E]/10 transition-colors"
                                  >
                                    {l}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          {message.bookingStep === 'date' && (
                            <div className="space-y-2">
                              <p className="text-xs text-gray-500 font-medium">Pick a date:</p>
                              <div className="flex flex-wrap gap-2">
                                {dates.map(d => (
                                  <button
                                    key={d}
                                    onClick={() => handleBookingSelection('date', d)}
                                    className="px-3 py-1.5 text-xs font-medium bg-[#7B2D8E]/5 text-[#7B2D8E] rounded-lg hover:bg-[#7B2D8E]/10 transition-colors"
                                  >
                                    {d}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          {message.bookingStep === 'time' && (
                            <div className="space-y-2">
                              <p className="text-xs text-gray-500 font-medium">Select time:</p>
                              <div className="flex flex-wrap gap-2">
                                {times.map(t => (
                                  <button
                                    key={t}
                                    onClick={() => handleBookingSelection('time', t)}
                                    className="px-3 py-1.5 text-xs font-medium bg-[#7B2D8E]/5 text-[#7B2D8E] rounded-lg hover:bg-[#7B2D8E]/10 transition-colors"
                                  >
                                    {t}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          {message.bookingStep === 'confirm' && (
                            <div className="flex gap-2">
                              <button
                                onClick={confirmBooking}
                                className="flex-1 px-4 py-2 text-xs font-medium bg-[#7B2D8E] text-white rounded-lg hover:bg-[#6B2278] transition-colors"
                              >
                                Confirm Booking
                              </button>
                              <button
                                onClick={() => { setShowBookingWidget(false); setBookingState({}); }}
                                className="px-4 py-2 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Action Cards */}
                      {message.actions && message.actions.length > 0 && !message.showBooking && (
                        <div className="ml-8 mt-2 flex flex-wrap gap-2">
                          {message.actions.map((action, idx) => (
                            action.link ? (
                              <Link
                                key={idx}
                                href={action.link}
                                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-100 rounded-xl hover:border-[#7B2D8E]/30 hover:bg-[#7B2D8E]/5 transition-all group"
                              >
                                <div className="w-7 h-7 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center text-[#7B2D8E]">
                                  <ActionIcon type={action.icon} />
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-900">{action.title}</p>
                                  <p className="text-[10px] text-gray-500">{action.description}</p>
                                </div>
                                <ArrowRight className="w-3 h-3 text-gray-300 group-hover:text-[#7B2D8E] transition-colors" />
                              </Link>
                            ) : (
                              <button
                                key={idx}
                                onClick={initiateBooking}
                                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-100 rounded-xl hover:border-[#7B2D8E]/30 hover:bg-[#7B2D8E]/5 transition-all group"
                              >
                                <div className="w-7 h-7 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center text-[#7B2D8E]">
                                  <ActionIcon type={action.icon} />
                                </div>
                                <div className="text-left">
                                  <p className="text-xs font-medium text-gray-900">{action.title}</p>
                                  <p className="text-[10px] text-gray-500">{action.description}</p>
                                </div>
                                <ArrowRight className="w-3 h-3 text-gray-300 group-hover:text-[#7B2D8E] transition-colors" />
                              </button>
                            )
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Streaming */}
                  {streamingContent && (
                    <div className="flex justify-start">
                      <div className="flex-shrink-0 w-6 h-6 rounded-md bg-[#7B2D8E] flex items-center justify-center mr-2 mt-0.5">
                        <ButterflyLogo className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="max-w-[80%] px-3 py-2 bg-white border border-gray-100 rounded-2xl rounded-bl-md text-sm text-gray-700">
                        <div dangerouslySetInnerHTML={{ __html: formatMessage(streamingContent) }} />
                        <span className="inline-block w-0.5 h-4 bg-[#7B2D8E] ml-0.5 animate-pulse" />
                      </div>
                    </div>
                  )}
                  
                  {/* Loading */}
                  {isLoading && !streamingContent && (
                    <div className="flex justify-start">
                      <div className="flex-shrink-0 w-6 h-6 rounded-md bg-[#7B2D8E] flex items-center justify-center mr-2">
                        <ButterflyLogo className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-3 py-2">
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-3 border-t border-gray-100 bg-white pb-safe">
                  <form onSubmit={handleSubmit} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleListening}
                      className={`p-2 rounded-lg transition-colors ${
                        isListening ? 'bg-[#7B2D8E] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                    </button>
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Message Derma AI..."
                      className="flex-1 px-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20"
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      className="p-2.5 bg-[#7B2D8E] text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#6B2278] transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
