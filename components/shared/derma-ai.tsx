'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, X, Mic, MicOff, Volume2, VolumeX, ArrowRight, MessageSquare, Plus, Trash2, Menu, Phone, Calendar, Wallet, MapPin, Gift, Sparkles, User, ExternalLink, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  toolResults?: ToolResult[]
  actions?: ActionCard[]
}

interface ToolResult {
  toolName: string
  result: Record<string, unknown>
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

// Simple markdown formatting
function formatMessage(text: string) {
  let formatted = text.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
  formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>')
  formatted = formatted.replace(/^(\d+)\.\s/gm, '<span class="text-[#7B2D8E] font-medium">$1.</span> ')
  formatted = formatted.replace(/^[-•]\s/gm, '<span class="text-[#7B2D8E]">•</span> ')
  formatted = formatted.replace(/\n/g, '<br/>')
  return formatted
}

// Parse actions from AI response
function parseActionsFromText(content: string): ActionCard[] {
  const actions: ActionCard[] = []
  const lower = content.toLowerCase()
  
  if (lower.includes('book') || lower.includes('appointment') || lower.includes('schedule')) {
    actions.push({ title: 'Book Now', description: 'Schedule visit', link: '/booking', icon: 'calendar' })
  }
  if (lower.includes('/services/facial') || lower.includes('facial')) {
    actions.push({ title: 'Facials', description: 'View treatments', link: '/services/facial-treatments', icon: 'sparkles' })
  } else if (lower.includes('/services/body') || lower.includes('massage')) {
    actions.push({ title: 'Body Care', description: 'View services', link: '/services/body-treatments', icon: 'sparkles' })
  } else if (lower.includes('/services/nail') || lower.includes('nail')) {
    actions.push({ title: 'Nail Care', description: 'View services', link: '/services/nail-care', icon: 'sparkles' })
  } else if (lower.includes('/services/wax') || lower.includes('wax')) {
    actions.push({ title: 'Waxing', description: 'View services', link: '/services/waxing', icon: 'sparkles' })
  }
  if (lower.includes('wallet') || lower.includes('balance')) {
    actions.push({ title: 'Wallet', description: 'View balance', link: '/dashboard', icon: 'wallet' })
  }
  if (lower.includes('location') || lower.includes('address')) {
    actions.push({ title: 'Locations', description: 'Find us', link: '/contact', icon: 'map' })
  }
  if (lower.includes('gift')) {
    actions.push({ title: 'Gift Cards', description: 'Buy now', link: '/gift-cards', icon: 'gift' })
  }
  if (lower.includes('membership') || lower.includes('package')) {
    actions.push({ title: 'Packages', description: 'View deals', link: '/packages', icon: 'gift' })
  }
  
  return actions.slice(0, 2)
}

// Action icons
function ActionIcon({ type }: { type: string }) {
  const icons: Record<string, JSX.Element> = {
    calendar: <Calendar className="w-4 h-4" />,
    sparkles: <Sparkles className="w-4 h-4" />,
    map: <MapPin className="w-4 h-4" />,
    gift: <Gift className="w-4 h-4" />,
    wallet: <Wallet className="w-4 h-4" />,
    user: <User className="w-4 h-4" />,
    info: <ExternalLink className="w-4 h-4" />,
  }
  return icons[type] || <Sparkles className="w-4 h-4" />
}

// Butterfly Logo
function ButterflyLogo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="currentColor">
      <path d="M16 4c-3.3 0-6 2.7-6 6 0 2 1 3.7 2.4 4.9-.8.4-1.7 1.1-2.4 1.7-2-1.6-4.7-2.6-7.3-2.6-.8 0-1.3.5-1.3 1.3s.5 1.3 1.3 1.3c1.9 0 3.6.7 5.1 1.7C6 20 5.3 22.3 5.3 24.7c0 .8.5 1.3 1.3 1.3s1.3-.5 1.3-1.3c0-1.9.5-3.6 1.5-5.1.7.4 1.5.8 2.3 1.1-.7 1.5-1.1 3.2-1.1 4.9 0 3.3 2.7 5.7 5.3 5.7s5.3-2.4 5.3-5.7c0-1.7-.4-3.5-1.1-4.9.8-.3 1.6-.7 2.3-1.1 1 1.5 1.5 3.2 1.5 5.1 0 .8.5 1.3 1.3 1.3s1.3-.5 1.3-1.3c0-2.4-.7-4.7-2.4-6.3 1.5-1 3.2-1.7 5.1-1.7.8 0 1.3-.5 1.3-1.3s-.5-1.3-1.3-1.3c-2.7 0-5.3 1.1-7.3 2.6-.7-.7-1.6-1.3-2.4-1.7C21 13.7 22 12 22 10c0-3.3-2.7-6-6-6zm0 2.7c1.9 0 3.3 1.5 3.3 3.3S17.9 13.3 16 13.3s-3.3-1.5-3.3-3.3S14.1 6.7 16 6.7z"/>
    </svg>
  )
}

// Tool Result Card Component
function ToolResultCard({ toolName, result }: { toolName: string; result: Record<string, unknown> }) {
  const getIcon = () => {
    switch (toolName) {
      case 'getWalletBalance': return <Wallet className="w-4 h-4" />
      case 'getBookings': return <Calendar className="w-4 h-4" />
      case 'getServices': return <Sparkles className="w-4 h-4" />
      case 'getLocations': return <MapPin className="w-4 h-4" />
      case 'getUserProfile': return <User className="w-4 h-4" />
      case 'getPackages': return <Gift className="w-4 h-4" />
      default: return <Sparkles className="w-4 h-4" />
    }
  }

  const getTitle = () => {
    switch (toolName) {
      case 'getWalletBalance': return 'Wallet Balance'
      case 'getBookings': return 'Your Bookings'
      case 'getTransactionHistory': return 'Transactions'
      case 'getServices': return 'Services'
      case 'getLocations': return 'Locations'
      case 'getUserProfile': return 'Your Profile'
      case 'getPackages': return 'Packages'
      case 'getGiftCards': return 'Gift Cards'
      case 'getConsultation': return 'Consultation'
      default: return 'Info'
    }
  }

  // Render wallet balance
  if (toolName === 'getWalletBalance' && result.success) {
    return (
      <div className="bg-[#7B2D8E]/10 rounded-xl p-3 border border-[#7B2D8E]/20">
        <div className="flex items-center gap-2 mb-2">
          {getIcon()}
          <span className="text-xs font-semibold text-[#7B2D8E]">{getTitle()}</span>
        </div>
        <p className="text-2xl font-bold text-gray-900">{result.formatted as string}</p>
      </div>
    )
  }

  // Render bookings
  if (toolName === 'getBookings' && result.success) {
    const bookings = result.bookings as Array<{ service: string; location: string; date: string; time: string }>
    if (bookings.length === 0) {
      return (
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            {getIcon()}
            <span className="text-xs font-semibold text-gray-600">{getTitle()}</span>
          </div>
          <p className="text-sm text-gray-500">No upcoming appointments</p>
          <Link href="/booking" className="text-xs text-[#7B2D8E] font-medium hover:underline mt-1 inline-block">
            Book now
          </Link>
        </div>
      )
    }
    return (
      <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 space-y-2">
        <div className="flex items-center gap-2 mb-2">
          {getIcon()}
          <span className="text-xs font-semibold text-gray-600">{getTitle()}</span>
        </div>
        {bookings.slice(0, 2).map((b, i) => (
          <div key={i} className="bg-white rounded-lg p-2 text-xs">
            <p className="font-medium text-gray-900">{b.service}</p>
            <p className="text-gray-500">{b.location} • {b.date} at {b.time}</p>
          </div>
        ))}
      </div>
    )
  }

  // Render locations
  if (toolName === 'getLocations' && result.success) {
    const locations = result.locations as Array<{ name: string; address: string; phone: string; hours: string }>
    return (
      <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 space-y-2">
        <div className="flex items-center gap-2 mb-2">
          {getIcon()}
          <span className="text-xs font-semibold text-gray-600">{getTitle()}</span>
        </div>
        {locations.map((loc, i) => (
          <div key={i} className="bg-white rounded-lg p-2 text-xs">
            <p className="font-medium text-[#7B2D8E]">{loc.name}</p>
            <p className="text-gray-600">{loc.address}</p>
            <p className="text-gray-500">{loc.phone}</p>
          </div>
        ))}
      </div>
    )
  }

  // Generic result card
  if (result.success === false) {
    return null
  }

  return null
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
  const [voiceEnabled, setVoiceEnabled] = useState(true) // Voice enabled by default
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voiceCallMode, setVoiceCallMode] = useState(false)
  const [callStatus, setCallStatus] = useState<'idle' | 'listening' | 'speaking' | 'processing'>('idle')
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
              preferences: data.preferences || undefined
            })
          }
        }
      } catch { /* ignore */ }
    }
    fetchUser()
  }, [])

  // Set initial welcome message
  useEffect(() => {
    const greeting = userInfo.name 
      ? `Hello ${userInfo.name}! I'm Derma, your personal spa assistant. I can help you check your wallet balance, view your appointments, book services, and more. How can I help you today?`
      : "Hello! I'm Derma, your personal spa assistant at Dermaspace. I can help you book appointments, check services and prices, find our locations, and answer any questions. How can I help you today?"
    
    setMessages([{
      id: '1',
      role: 'assistant',
      content: greeting,
      timestamp: new Date(),
      actions: [
        { title: 'Book Appointment', description: 'Schedule visit', link: '/booking', icon: 'calendar' },
        { title: 'Browse Services', description: 'View all', link: '/services', icon: 'sparkles' },
      ]
    }])
  }, [userInfo.name])

  // Load chat sessions
  useEffect(() => {
    const saved = localStorage.getItem('derma-chat-sessions')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setSessions(parsed.map((s: ChatSession) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          messages: s.messages.map((m: Message) => ({ ...m, timestamp: new Date(m.timestamp) }))
        })))
      } catch { /* ignore */ }
    }
  }, [])

  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('derma-chat-sessions', JSON.stringify(sessions))
    }
  }, [sessions])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

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

  // Text to speech - automatically speak assistant responses
  const speakText = useCallback(async (text: string) => {
    if (!voiceEnabled || isSpeaking) return
    
    try {
      setIsSpeaking(true)
      setCallStatus('speaking')
      const cleanText = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/\n/g, ' ').substring(0, 500)
      
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
          URL.revokeObjectURL(audioUrl)
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

    const currentMessages = [...messages, userMessage]
    setMessages(currentMessages)
    setInput('')
    setIsLoading(true)
    setStreamingContent('')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: currentMessages.map(m => ({
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

      let fullContent = ''
      const toolResults: ToolResult[] = []

      // Parse AI SDK 6 stream format
      const reader = res.body?.getReader()
      if (!reader) throw new Error('No reader')
      
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          
          // AI SDK 6 UIMessageStream format uses protocol codes
          // Format: "CODE:JSON" where CODE is a single character or number
          // 0 = text delta, 9 = tool result, a = tool call, etc.
          
          // Handle protocol format: "0:\"text\"" or "9:{...}"
          const match = trimmed.match(/^([0-9a-f]):(.+)$/i)
          if (match) {
            const typeCode = match[1]
            const jsonData = match[2]
            
            try {
              const parsed = JSON.parse(jsonData)
              
              // Type 0 = text delta (string)
              if (typeCode === '0' && typeof parsed === 'string') {
                fullContent += parsed
                setStreamingContent(fullContent)
              }
              
              // Type 9 = tool result
              if (typeCode === '9' && parsed && typeof parsed === 'object') {
                if (parsed.toolName && parsed.result) {
                  toolResults.push({
                    toolName: parsed.toolName,
                    result: parsed.result
                  })
                }
              }
              
              // Type f = finish reason (ignore)
              // Type e = error - logged for debugging
              if (typeCode === 'e') {
                console.error('AI stream error:', parsed)
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      // Generate actions from the response
      const actions = parseActionsFromText(fullContent)

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: fullContent || "I'm here to help! What would you like to know about Dermaspace?",
        timestamp: new Date(),
        toolResults: toolResults.length > 0 ? toolResults : undefined,
        actions: actions.length > 0 ? actions : undefined
      }

      setMessages(prev => [...prev, assistantMessage])
      setStreamingContent('')
      
      // Auto-speak response if voice is enabled
      if (voiceEnabled && fullContent) {
        speakText(fullContent)
      }
    } catch (err) {
      console.error('[v0] Chat error:', err)
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting. Please try again or call +234 901 797 2919.",
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
          <div className="absolute inset-0 bg-[#7B2D8E] rounded-full blur-md opacity-40 group-hover:opacity-60 transition-opacity" />
          <div className="relative w-14 h-14 md:w-[60px] md:h-[60px] rounded-full bg-[#7B2D8E] flex items-center justify-center transition-transform group-hover:scale-105 shadow-xl shadow-[#7B2D8E]/30">
            <ButterflyLogo className="w-7 h-7 md:w-8 md:h-8 text-white" />
          </div>
          <span className="absolute inset-0 rounded-full border-2 border-[#7B2D8E]/50 animate-ping opacity-75" />
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
          inset-0 md:inset-auto md:bottom-6 md:right-4 md:w-[420px] md:h-[650px]
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
                
                <p className="text-white font-semibold text-xl mb-2">Derma AI</p>
                <p className="text-white/70 text-sm mb-8">
                  {callStatus === 'listening' && 'Listening...'}
                  {callStatus === 'speaking' && 'Speaking...'}
                  {callStatus === 'processing' && 'Processing...'}
                </p>
                
                <div className="flex items-center gap-4">
                  <button
                    onClick={endVoiceCall}
                    className="flex items-center gap-2 px-6 py-3 bg-white text-[#7B2D8E] font-medium rounded-full hover:bg-gray-100 transition-colors shadow-lg"
                  >
                    <Phone className="w-5 h-5" />
                    End Call
                  </button>
                </div>
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
                      <p className="text-[10px] text-white/70">Your Personal Spa Assistant</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={startVoiceCall}
                      className="p-2.5 hover:bg-white/10 rounded-xl transition-colors"
                      title="Voice Call"
                    >
                      <Phone className="w-4 h-4 text-white" />
                    </button>
                    <button
                      onClick={() => setVoiceEnabled(!voiceEnabled)}
                      className={`p-2.5 rounded-xl transition-colors ${voiceEnabled ? 'bg-white/20' : 'hover:bg-white/10'}`}
                      title={voiceEnabled ? 'Voice On' : 'Voice Off'}
                    >
                      {voiceEnabled ? <Volume2 className="w-4 h-4 text-white" /> : <VolumeX className="w-4 h-4 text-white/60" />}
                    </button>
                    <button
                      onClick={() => { setIsOpen(false); setShowSidebar(false); }}
                      className="p-2.5 hover:bg-white/10 rounded-xl transition-colors"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 bg-[#FAFAFA] space-y-4">
                  {messages.map((message) => (
                    <div key={message.id}>
                      <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {message.role === 'assistant' && (
                          <div className="flex-shrink-0 w-7 h-7 rounded-xl bg-[#7B2D8E] flex items-center justify-center mr-2.5 mt-0.5 shadow-sm shadow-[#7B2D8E]/20">
                            <ButterflyLogo className="w-4 h-4 text-white" />
                          </div>
                        )}
                        <div className={`max-w-[80%] px-4 py-2.5 text-sm leading-relaxed ${
                          message.role === 'user'
                            ? 'bg-[#7B2D8E] text-white rounded-2xl rounded-br-sm shadow-sm shadow-[#7B2D8E]/20'
                            : 'bg-white text-gray-700 rounded-2xl rounded-bl-sm shadow-sm border border-gray-100/80'
                        }`}>
                          <div dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }} />
                        </div>
                      </div>
                      
                      {/* Tool Results */}
                      {message.toolResults && message.toolResults.length > 0 && (
                        <div className="ml-9 mt-3 space-y-2">
                          {message.toolResults.map((tr, idx) => (
                            <ToolResultCard key={idx} toolName={tr.toolName} result={tr.result} />
                          ))}
                        </div>
                      )}
                      
                      {/* Action Cards */}
                      {message.actions && message.actions.length > 0 && (
                        <div className="ml-9 mt-3 flex flex-wrap gap-2">
                          {message.actions.map((action, idx) => (
                            <Link
                              key={idx}
                              href={action.link || '#'}
                              className="flex items-center gap-2.5 px-3.5 py-2.5 bg-white border border-gray-200 rounded-2xl hover:border-[#7B2D8E]/40 hover:shadow-md hover:shadow-[#7B2D8E]/5 transition-all group"
                            >
                              <div className="w-8 h-8 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center text-[#7B2D8E]">
                                <ActionIcon type={action.icon} />
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-900">{action.title}</p>
                                <p className="text-[10px] text-gray-500">{action.description}</p>
                              </div>
                              <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#7B2D8E] group-hover:translate-x-0.5 transition-all" />
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Streaming */}
                  {streamingContent && (
                    <div className="flex justify-start">
                      <div className="flex-shrink-0 w-7 h-7 rounded-xl bg-[#7B2D8E] flex items-center justify-center mr-2.5 mt-0.5 shadow-sm shadow-[#7B2D8E]/20">
                        <ButterflyLogo className="w-4 h-4 text-white" />
                      </div>
                      <div className="max-w-[80%] px-4 py-2.5 bg-white border border-gray-100/80 rounded-2xl rounded-bl-sm text-sm text-gray-700 shadow-sm leading-relaxed">
                        <div dangerouslySetInnerHTML={{ __html: formatMessage(streamingContent) }} />
                        <span className="inline-block w-0.5 h-4 bg-[#7B2D8E] ml-0.5 animate-pulse" />
                      </div>
                    </div>
                  )}
                  
                  {/* Loading */}
                  {isLoading && !streamingContent && (
                    <div className="flex justify-start">
                      <div className="flex-shrink-0 w-7 h-7 rounded-xl bg-[#7B2D8E] flex items-center justify-center mr-2.5 shadow-sm shadow-[#7B2D8E]/20">
                        <ButterflyLogo className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-white border border-gray-100/80 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 text-[#7B2D8E] animate-spin" />
                          <span className="text-xs text-gray-500">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-gray-100 bg-white">
                  <form onSubmit={handleSubmit} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleListening}
                      className={`p-3 rounded-xl transition-colors ${
                        isListening 
                          ? 'bg-red-500 text-white animate-pulse' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>
                    
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask me anything..."
                      className="flex-1 px-4 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:bg-white transition-colors"
                      disabled={isLoading}
                    />
                    
                    <button
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      className="p-3 bg-[#7B2D8E] text-white rounded-xl hover:bg-[#6B2278] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                  
                  <p className="text-center text-[10px] text-gray-400 mt-2">
                    Derma AI can check balances, book appointments & more
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
