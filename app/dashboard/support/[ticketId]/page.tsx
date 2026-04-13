'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { 
  ArrowLeft, Send, Loader2, Clock, User, Headphones,
  AlertCircle, Tag, FileText, MessageCircle
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

const PRIORITY_CONFIG = {
  low: { label: 'Low Priority', color: 'text-gray-500 bg-gray-50' },
  medium: { label: 'Medium Priority', color: 'text-[#7B2D8E] bg-[#7B2D8E]/5' },
  high: { label: 'High Priority', color: 'text-amber-600 bg-amber-50' },
  urgent: { label: 'Urgent', color: 'text-red-600 bg-red-50' }
}

const CATEGORY_LABELS: Record<string, string> = {
  booking: 'Booking Inquiry',
  treatment: 'Treatment Questions',
  account: 'Account Help',
  payment: 'Payment/Billing',
  feedback: 'Feedback',
  other: 'Other'
}

export default function TicketDetailPage() {
  const router = useRouter()
  const params = useParams()
  const ticketId = params.ticketId as string
  
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<UserData | null>(null)
  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [reply, setReply] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reply.trim() || isSending) return
    
    setIsSending(true)
    setError('')
    setSuccess('')

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
      setSuccess('Your reply has been sent successfully.')
      setTimeout(() => setSuccess(''), 3000)
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

  const formatShortDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-NG', {
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
            <div>
              <h1 className="text-base font-semibold text-gray-900">Ticket Details</h1>
              <p className="text-xs text-gray-500">View and respond to your ticket</p>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {/* Ticket Header */}
            <div className="p-4 sm:p-5 border-b border-gray-100">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs font-mono text-[#7B2D8E] bg-[#7B2D8E]/10 px-2 py-0.5 rounded">
                  {ticket.ticket_id}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CONFIG[ticket.status].color}`}>
                  {STATUS_CONFIG[ticket.status].label}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded ${PRIORITY_CONFIG[ticket.priority].color}`}>
                  {PRIORITY_CONFIG[ticket.priority].label}
                </span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">{ticket.subject}</h2>
              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  {CATEGORY_LABELS[ticket.category] || ticket.category}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Created {formatDate(ticket.created_at)}
                </span>
              </div>
            </div>

            {/* Original Message */}
            <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-[#7B2D8E] flex items-center justify-center text-white text-xs font-medium shrink-0">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-medium text-gray-900">{user?.firstName} {user?.lastName}</span>
                    <span className="text-xs text-gray-400">{formatShortDate(ticket.created_at)}</span>
                  </div>
                  <div className="bg-white border border-gray-100 rounded-xl p-4">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{ticket.message}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Responses Section */}
            {ticket.responses.length > 0 && (
              <div className="border-b border-gray-100">
                <div className="px-4 sm:px-5 py-3 bg-gray-50/50 border-b border-gray-100">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                    <MessageCircle className="w-3.5 h-3.5" />
                    Responses ({ticket.responses.length})
                  </h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {ticket.responses.map((response) => (
                    <div key={response.id} className="p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-medium shrink-0 ${
                          response.is_staff ? 'bg-gray-700' : 'bg-[#7B2D8E]'
                        }`}>
                          {response.is_staff ? (
                            <Headphones className="w-4 h-4" />
                          ) : (
                            <>{user?.firstName?.[0]}{user?.lastName?.[0]}</>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-sm font-medium text-gray-900">
                              {response.is_staff ? (response.staff_name || 'DermaSpace Support') : `${user?.firstName} ${user?.lastName}`}
                            </span>
                            {response.is_staff && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 bg-[#7B2D8E]/10 text-[#7B2D8E] rounded">
                                STAFF
                              </span>
                            )}
                            <span className="text-xs text-gray-400">{formatShortDate(response.created_at)}</span>
                          </div>
                          <div className={`rounded-xl p-4 ${
                            response.is_staff 
                              ? 'bg-[#7B2D8E]/5 border border-[#7B2D8E]/10' 
                              : 'bg-gray-50 border border-gray-100'
                          }`}>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{response.message}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reply Section */}
            <div className="p-4 sm:p-5">
              {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700 flex items-center gap-2">
                  <FileText className="w-4 h-4 shrink-0" />
                  {success}
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 bg-[#7B2D8E]/5 border border-[#7B2D8E]/20 rounded-xl text-sm text-[#7B2D8E] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {isTicketClosed ? (
                <div className="text-center py-6 bg-gray-50 rounded-xl">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FileText className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">
                    This ticket has been <span className="font-medium">{ticket.status}</span>. You cannot reply to it.
                  </p>
                  <Link 
                    href="/dashboard/support"
                    className="inline-block mt-3 text-sm text-[#7B2D8E] hover:underline"
                  >
                    Create a new ticket
                  </Link>
                </div>
              ) : (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Send className="w-3.5 h-3.5" />
                    Add a Reply
                  </h3>
                  <form onSubmit={handleSendReply}>
                    <textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Type your reply here..."
                      rows={4}
                      className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none transition-all resize-none mb-3"
                    />
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400">
                        Our team typically responds within 24-48 hours
                      </p>
                      <button
                        type="submit"
                        disabled={!reply.trim() || isSending}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7B2D8E] text-white text-sm font-medium rounded-xl hover:bg-[#6B2278] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSending ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Send Reply
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
