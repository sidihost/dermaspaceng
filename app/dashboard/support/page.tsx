'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { 
  ArrowLeft, Ticket, Send, Phone, Mail, Clock, 
  Check, AlertCircle, ChevronRight, Plus, Loader2,
  MessageSquare, Calendar, Filter
} from 'lucide-react'

// WhatsApp SVG Icon
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

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
  open: { label: 'Open', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700' },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-700' },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-600' }
}

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'text-gray-500' },
  medium: { label: 'Medium', color: 'text-blue-600' },
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
        <main className="min-h-screen bg-gray-50 pt-20">
          <div className="flex items-center justify-center py-32">
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
      <main className="min-h-screen bg-gray-50 pt-20 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="flex items-center gap-3 py-6">
            <Link 
              href="/dashboard"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Support</h1>
              <p className="text-sm text-gray-500">Get help or track your tickets</p>
            </div>
          </div>

          {/* Quick Contact Options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <a
              href="https://wa.me/+2349017972919"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-[#7B2D8E]/20 transition-colors"
            >
              <div className="w-10 h-10 bg-[#7B2D8E]/10 rounded-lg flex items-center justify-center shrink-0">
                <WhatsAppIcon className="w-5 h-5 text-[#7B2D8E]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">WhatsApp</p>
                <p className="text-xs text-gray-500 truncate">Chat with us</p>
              </div>
            </a>
            <a
              href="tel:+2349017972919"
              className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-[#7B2D8E]/20 transition-colors"
            >
              <div className="w-10 h-10 bg-[#7B2D8E]/10 rounded-lg flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5 text-[#7B2D8E]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">Call Us</p>
                <p className="text-xs text-gray-500 truncate">+234 901 797 2919</p>
              </div>
            </a>
            <a
              href="mailto:info@dermaspaceng.com"
              className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-[#7B2D8E]/20 transition-colors"
            >
              <div className="w-10 h-10 bg-[#7B2D8E]/10 rounded-lg flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-[#7B2D8E]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">Email</p>
                <p className="text-xs text-gray-500 truncate">info@dermaspaceng.com</p>
              </div>
            </a>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => setActiveView('list')}
                className={`flex-1 py-4 px-4 text-sm font-medium transition-colors ${
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
                className={`flex-1 py-4 px-4 text-sm font-medium transition-colors ${
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

            <div className="p-5 md:p-6">
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
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Ticket className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {tickets.length === 0 ? 'No tickets yet' : 'No matching tickets'}
                      </h3>
                      <p className="text-sm text-gray-500 mb-6">
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
                        <div 
                          key={ticket.id}
                          className="p-4 border border-gray-100 rounded-xl hover:border-gray-200 transition-colors"
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
                            <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
                          </div>
                          <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                            {ticket.message}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-3.5 h-3.5" />
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
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* New Ticket View */}
              {activeView === 'new' && (
                <div>
                  {submitSuccess ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check className="w-8 h-8 text-green-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Ticket Submitted!</h3>
                      <p className="text-sm text-gray-600 mb-2">
                        Your ticket ID is:
                      </p>
                      <p className="text-lg font-mono font-semibold text-[#7B2D8E] mb-4">
                        {submitSuccess.ticketId}
                      </p>
                      <p className="text-sm text-gray-500 mb-6">
                        We&apos;ve sent a confirmation to {user?.email}. Our team will respond within 24-48 hours.
                      </p>
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={resetForm}
                          className="px-4 py-2 bg-[#7B2D8E] text-white text-sm font-medium rounded-lg hover:bg-[#6B2278] transition-colors"
                        >
                          View My Tickets
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
                          className="px-4 py-2 text-gray-600 text-sm font-medium hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          Submit Another
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* User Info Display */}
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-5">
                        <div className="w-10 h-10 rounded-full bg-[#7B2D8E] flex items-center justify-center text-white text-sm font-medium">
                          {user?.firstName?.[0]}{user?.lastName?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
                          <p className="text-xs text-gray-500">{user?.email}</p>
                        </div>
                      </div>

                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            rows={5}
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
                          <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            {error}
                          </div>
                        )}

                        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                          <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                          <p className="text-xs text-blue-700">
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
