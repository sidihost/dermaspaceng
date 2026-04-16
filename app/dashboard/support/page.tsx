'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { 
  ArrowLeft, Ticket, Send, Clock, 
  Check, AlertCircle, ChevronRight, Plus, Loader2,
  Tag, Calendar, Filter
} from 'lucide-react'

interface UserData {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
}

interface SupportTicket {
  id: number
  ticket_id: string
  category: string
  subject: string
  message: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  created_at: string
  updated_at: string
}

const TICKET_CATEGORIES = [
  { value: 'booking', label: 'Booking Inquiry' },
  { value: 'treatment', label: 'Treatment Questions' },
  { value: 'account', label: 'Account Help' },
  { value: 'payment', label: 'Payment/Billing' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'other', label: 'Other' }
]

const STATUS_CONFIG = {
  open: { label: 'Open', color: 'bg-[#7B2D8E]/10 text-[#7B2D8E]' },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700' },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-700' },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-600' }
}

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'text-gray-500' },
  medium: { label: 'Medium', color: 'text-[#7B2D8E]' },
  high: { label: 'High', color: 'text-amber-600' },
  urgent: { label: 'Urgent', color: 'text-red-600' }
}

export default function SupportPage() {
  const router = useRouter()
  const captchaRef = useRef<HCaptcha>(null)
  
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<UserData | null>(null)
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [activeView, setActiveView] = useState<'list' | 'new'>('list')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  
  // Form state
  const [category, setCategory] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [priority, setPriority] = useState('medium')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState<{ ticketId: string } | null>(null)
  const [error, setError] = useState('')

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

        // Fetch tickets
        const ticketsRes = await fetch('/api/tickets')
        if (ticketsRes.ok) {
          const ticketsData = await ticketsRes.json()
          setTickets(ticketsData.tickets || [])
        }
      } catch {
        router.push('/signin')
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [router])

  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token)
    setError('')
  }

  const handleCaptchaExpire = () => {
    setCaptchaToken(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!captchaToken) {
      setError('Please complete the captcha verification')
      return
    }

    setIsSubmitting(true)
    
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          subject,
          message,
          priority
        })
      })
      
      const data = await res.json()
      
      if (res.ok) {
        setSubmitSuccess({ ticketId: data.ticketId })
        // Refresh tickets list
        const ticketsRes = await fetch('/api/tickets')
        if (ticketsRes.ok) {
          const ticketsData = await ticketsRes.json()
          setTickets(ticketsData.tickets || [])
        }
      } else {
        setError(data.error || 'Something went wrong. Please try again.')
        captchaRef.current?.resetCaptcha()
        setCaptchaToken(null)
      }
    } catch {
      setError('Something went wrong. Please try again.')
      captchaRef.current?.resetCaptcha()
      setCaptchaToken(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setCategory('')
    setSubject('')
    setMessage('')
    setPriority('medium')
    setCaptchaToken(null)
    setSubmitSuccess(null)
    setActiveView('list')
  }

  const filteredTickets = statusFilter === 'all' 
    ? tickets 
    : tickets.filter(t => t.status === statusFilter)

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

  return (
    <>
      <Header />
      <main className="bg-gray-50 pt-2 pb-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="flex items-center gap-3 py-2">
            <Link 
              href="/dashboard"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-base font-semibold text-gray-900">Support</h1>
              <p className="text-xs text-gray-500">Get help or track your tickets</p>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => setActiveView('list')}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                  activeView === 'list' 
                    ? 'text-[#7B2D8E] border-b-2 border-[#7B2D8E]' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <Ticket className="w-4 h-4" />
                  My Tickets
                  {tickets.length > 0 && (
                    <span className="px-2 py-0.5 text-xs bg-gray-100 rounded-full">
                      {tickets.length}
                    </span>
                  )}
                </span>
              </button>
              <button
                onClick={() => {
                  setSubmitSuccess(null)
                  setActiveView('new')
                }}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                  activeView === 'new' 
                    ? 'text-[#7B2D8E] border-b-2 border-[#7B2D8E]' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" />
                  New Ticket
                </span>
              </button>
            </div>

            <div className="p-4">
              {/* Ticket List View */}
              {activeView === 'list' && (
                <div>
                  {/* Filter */}
                  {tickets.length > 0 && (
                    <div className="flex items-center gap-2 mb-4">
                      <Filter className="w-4 h-4 text-gray-400" />
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="text-sm border-0 bg-transparent text-gray-600 focus:ring-0 cursor-pointer"
                      >
                        <option value="all">All Tickets</option>
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  )}

                  {filteredTickets.length === 0 ? (
                    <div className="text-center py-6">
                      <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Ticket className="w-7 h-7 text-gray-400" />
                      </div>
                      <h3 className="text-base font-medium text-gray-900 mb-1">
                        {tickets.length === 0 ? 'No tickets yet' : 'No matching tickets'}
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">
                        {tickets.length === 0 
                          ? 'Submit a ticket to get help from our support team'
                          : 'Try adjusting your filter'
                        }
                      </p>
                      {tickets.length === 0 && (
                        <button
                          onClick={() => setActiveView('new')}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-[#7B2D8E] text-white text-sm font-medium rounded-lg hover:bg-[#6B2278] transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          Create Ticket
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredTickets.map((ticket) => (
                        <Link 
                          key={ticket.id}
                          href={`/dashboard/support/${ticket.ticket_id}`}
                          className="block p-4 border border-gray-100 rounded-xl hover:border-[#7B2D8E]/30 hover:bg-[#7B2D8E]/5 transition-colors cursor-pointer"
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-mono text-[#7B2D8E] bg-[#7B2D8E]/10 px-2 py-0.5 rounded">
                                  {ticket.ticket_id}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CONFIG[ticket.status].color}`}>
                                  {STATUS_CONFIG[ticket.status].label}
                                </span>
                              </div>
                              <h4 className="font-medium text-gray-900 truncate">
                                {ticket.subject}
                              </h4>
                            </div>
                            <ChevronRight className="w-5 h-5 text-[#7B2D8E]/40 shrink-0" />
                          </div>
                          <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                            {ticket.message}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Tag className="w-3.5 h-3.5" />
                              {ticket.category}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatDate(ticket.created_at)}
                            </span>
                            <span className={PRIORITY_CONFIG[ticket.priority].color}>
                              {PRIORITY_CONFIG[ticket.priority].label} Priority
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* New Ticket View */}
              {activeView === 'new' && (
                <div>
                  {submitSuccess ? (
                    <div className="text-center py-4">
                      <div className="w-14 h-14 bg-[#7B2D8E]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Check className="w-7 h-7 text-[#7B2D8E]" />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 mb-1">Ticket Submitted!</h3>
                      <p className="text-sm text-gray-600 mb-2">
                        Your ticket ID is:
                      </p>
                      <p className="text-lg font-mono font-semibold text-[#7B2D8E] mb-3">
                        {submitSuccess.ticketId}
                      </p>
                      <p className="text-sm text-gray-500 mb-4">
                        We&apos;ve sent a confirmation to {user?.email}. Our team will respond within 24-48 hours.
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/dashboard/support/${submitSuccess.ticketId}`}
                          className="px-3 py-2 bg-[#7B2D8E] text-white text-xs font-medium rounded-lg hover:bg-[#6B2278] transition-colors"
                        >
                          View Ticket
                        </Link>
                        <button
                          onClick={resetForm}
                          className="px-3 py-2 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          All Tickets
                        </button>
                        <button
                          onClick={() => {
                            setCategory('')
                            setSubject('')
                            setMessage('')
                            setPriority('medium')
                            setCaptchaToken(null)
                            setSubmitSuccess(null)
                          }}
                          className="px-3 py-2 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          New Ticket
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* User Info Display */}
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-4">
                        <div className="w-10 h-10 rounded-full bg-[#7B2D8E] flex items-center justify-center text-white text-sm font-medium">
                          {user?.firstName?.[0]}{user?.lastName?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
                          <p className="text-xs text-gray-500">{user?.email}</p>
                        </div>
                      </div>

                      <form onSubmit={handleSubmit} className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                              Category <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={category}
                              onChange={(e) => setCategory(e.target.value)}
                              required
                              className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none transition-all"
                            >
                              <option value="">Select a category</option>
                              {TICKET_CATEGORIES.map((cat) => (
                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                              Priority
                            </label>
                            <select
                              value={priority}
                              onChange={(e) => setPriority(e.target.value)}
                              className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none transition-all"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="urgent">Urgent</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                            Subject <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none transition-all"
                            placeholder="Brief description of your issue"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                            Message <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            required
                            rows={4}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none transition-all resize-none"
                            placeholder="Please describe your issue in detail. Include any relevant information like booking IDs, dates, or error messages."
                          />
                        </div>

                        {/* hCaptcha */}
                        <div className="flex justify-center overflow-x-auto">
                          <HCaptcha
                            ref={captchaRef}
                            sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || "10000000-ffff-ffff-ffff-000000000001"}
                            onVerify={handleCaptchaVerify}
                            onExpire={handleCaptchaExpire}
                            theme="light"
                          />
                        </div>

                        {error && (
                          <div className="p-3 bg-[#7B2D8E]/5 border border-[#7B2D8E]/20 rounded-lg text-sm text-[#7B2D8E] flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            {error}
                          </div>
                        )}

                        <div className="flex items-center gap-2 p-3 bg-[#7B2D8E]/5 border border-[#7B2D8E]/10 rounded-lg">
                          <Clock className="w-4 h-4 text-[#7B2D8E] shrink-0" />
                          <p className="text-xs text-[#7B2D8E]">
                            Our typical response time is 24-48 hours. For urgent matters, please call us directly.
                          </p>
                        </div>

                        <button
                          type="submit"
                          disabled={isSubmitting || !captchaToken}
                          className="w-full py-3 bg-[#7B2D8E] text-white text-sm font-semibold rounded-lg hover:bg-[#6B2278] transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              Submit Ticket
                            </>
                          )}
                        </button>
                      </form>
                    </>
                  )}
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
