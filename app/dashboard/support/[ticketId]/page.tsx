'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { 
  ArrowLeft, Send, Loader2, Clock, User, Headphones,
  AlertCircle
} from 'lucide-react'

interface UserData {
  id: string
  firstName: string
  lastName: string
  email: string
}

interface TicketResponse {
  id: number
  message: string
  is_staff: boolean
  created_at: string
  staff_name?: string
}

interface TicketDetail {
  id: number
  ticket_id: string
  category: string
  subject: string
  message: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  created_at: string
  updated_at: string
  responses: TicketResponse[]
}

const STATUS_CONFIG = {
  open: { label: 'Open', color: 'bg-[#7B2D8E]/10 text-[#7B2D8E]' },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700' },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-700' },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-600' }
}

export default function TicketDetailPage() {
  const router = useRouter()
  const params = useParams()
  const ticketId = params.ticketId as string
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<UserData | null>(null)
  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [reply, setReply] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    const init = async () => {
      try {
        // Check auth
        const authRes = await fetch('/api/auth/me')
        if (!authRes.ok) {
          router.push('/signin?redirect=/dashboard/support')
          return
        }
        const authData = await authRes.json()
        setUser(authData.user)

        // Fetch ticket details
        const ticketRes = await fetch(`/api/tickets/${ticketId}`)
        if (!ticketRes.ok) {
          router.push('/dashboard/support')
          return
        }
        const ticketData = await ticketRes.json()
        setTicket(ticketData.ticket)
      } catch {
        router.push('/dashboard/support')
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [router, ticketId])

  useEffect(() => {
    scrollToBottom()
  }, [ticket?.responses])

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reply.trim() || isSending) return
    
    setIsSending(true)
    setError('')

    try {
      const res = await fetch(`/api/tickets/${ticketId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: reply })
      })

      if (!res.ok) {
        throw new Error('Failed to send reply')
      }

      const data = await res.json()
      
      // Update ticket with new response
      setTicket(prev => prev ? {
        ...prev,
        responses: [...prev.responses, data.response]
      } : null)
      
      setReply('')
    } catch {
      setError('Failed to send your reply. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <>
        <Header />
        <main className="bg-gray-50 pt-2">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#7B2D8E]" />
          </div>
        </main>
        <Footer />
      </>
    )
  }

  if (!ticket) {
    return (
      <>
        <Header />
        <main className="bg-gray-50 pt-2 pb-4">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center py-12">
            <p className="text-gray-500">Ticket not found</p>
            <Link href="/dashboard/support" className="text-[#7B2D8E] hover:underline mt-2 inline-block">
              Back to Support
            </Link>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  const isTicketClosed = ticket.status === 'closed' || ticket.status === 'resolved'

  return (
    <>
      <Header />
      <main className="bg-gray-50 pt-2 pb-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="flex items-center gap-3 py-2">
            <Link 
              href="/dashboard/support"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-mono text-[#7B2D8E] bg-[#7B2D8E]/10 px-2 py-0.5 rounded">
                  {ticket.ticket_id}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CONFIG[ticket.status].color}`}>
                  {STATUS_CONFIG[ticket.status].label}
                </span>
              </div>
              <h1 className="text-base font-semibold text-gray-900 truncate">{ticket.subject}</h1>
            </div>
          </div>

          {/* Chat Container */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 220px)', minHeight: '400px' }}>
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Original Message */}
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-[#7B2D8E] flex items-center justify-center text-white text-xs font-medium shrink-0">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">You</span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(ticket.created_at)}
                    </span>
                  </div>
                  <div className="bg-[#7B2D8E]/5 rounded-2xl rounded-tl-md p-3">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.message}</p>
                  </div>
                </div>
              </div>

              {/* Responses */}
              {ticket.responses.map((response) => (
                <div key={response.id} className={`flex gap-3 ${response.is_staff ? '' : 'flex-row-reverse'}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-medium shrink-0 ${
                    response.is_staff ? 'bg-gray-700' : 'bg-[#7B2D8E]'
                  }`}>
                    {response.is_staff ? (
                      <Headphones className="w-4 h-4" />
                    ) : (
                      <>{user?.firstName?.[0]}{user?.lastName?.[0]}</>
                    )}
                  </div>
                  <div className={`flex-1 min-w-0 ${response.is_staff ? '' : 'flex flex-col items-end'}`}>
                    <div className={`flex items-center gap-2 mb-1 ${response.is_staff ? '' : 'flex-row-reverse'}`}>
                      <span className="text-sm font-medium text-gray-900">
                        {response.is_staff ? (response.staff_name || 'Support Team') : 'You'}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(response.created_at)}
                      </span>
                    </div>
                    <div className={`rounded-2xl p-3 max-w-[85%] ${
                      response.is_staff 
                        ? 'bg-gray-100 rounded-tl-md' 
                        : 'bg-[#7B2D8E]/5 rounded-tr-md'
                    }`}>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{response.message}</p>
                    </div>
                  </div>
                </div>
              ))}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Input */}
            <div className="border-t border-gray-100 p-4">
              {error && (
                <div className="mb-3 p-3 bg-[#7B2D8E]/5 border border-[#7B2D8E]/20 rounded-lg text-sm text-[#7B2D8E] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
              
              {isTicketClosed ? (
                <div className="text-center py-3 text-sm text-gray-500">
                  This ticket has been {ticket.status}. You cannot reply to it.
                </div>
              ) : (
                <form onSubmit={handleSendReply} className="flex items-end gap-3">
                  <div className="flex-1">
                    <textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Type your reply..."
                      rows={2}
                      className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none transition-all resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!reply.trim() || isSending}
                    className="p-3 bg-[#7B2D8E] text-white rounded-xl hover:bg-[#6B2278] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
