'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, X, Mic, MicOff, Volume2, VolumeX, ArrowRight, MessageSquare, Plus, Trash2, Menu, Phone, Calendar, Wallet, MapPin, Gift, Flower2, User, ExternalLink, ShieldCheck, Mail, ArrowUpRight, ArrowDownLeft, TrendingUp, Paperclip, Search, Globe } from 'lucide-react'
import Link from 'next/link'

interface Attachment {
  url: string
  contentType: string
  name: string
}

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  toolResults?: ToolResult[]
  actions?: ActionCard[]
  banner?: 'access-granted'
  attachments?: Attachment[]
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

// Action icons. The `sparkles` action type still exists in responses coming
// from the assistant, but we no longer render the Sparkles glyph anywhere
// in the UI (per brand direction). Rendered as the spa-friendly Flower2
// icon instead, with ArrowRight as a neutral fallback.
function ActionIcon({ type }: { type: string }) {
  const icons: Record<string, JSX.Element> = {
    calendar: <Calendar className="w-4 h-4" />,
    sparkles: <Flower2 className="w-4 h-4" />,
    map: <MapPin className="w-4 h-4" />,
    gift: <Gift className="w-4 h-4" />,
    wallet: <Wallet className="w-4 h-4" />,
    user: <User className="w-4 h-4" />,
    info: <ExternalLink className="w-4 h-4" />,
  }
  return icons[type] || <ArrowRight className="w-4 h-4" />
}

// Butterfly Logo
function ButterflyLogo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="currentColor">
      <path d="M16 4c-3.3 0-6 2.7-6 6 0 2 1 3.7 2.4 4.9-.8.4-1.7 1.1-2.4 1.7-2-1.6-4.7-2.6-7.3-2.6-.8 0-1.3.5-1.3 1.3s.5 1.3 1.3 1.3c1.9 0 3.6.7 5.1 1.7C6 20 5.3 22.3 5.3 24.7c0 .8.5 1.3 1.3 1.3s1.3-.5 1.3-1.3c0-1.9.5-3.6 1.5-5.1.7.4 1.5.8 2.3 1.1-.7 1.5-1.1 3.2-1.1 4.9 0 3.3 2.7 5.7 5.3 5.7s5.3-2.4 5.3-5.7c0-1.7-.4-3.5-1.1-4.9.8-.3 1.6-.7 2.3-1.1 1 1.5 1.5 3.2 1.5 5.1 0 .8.5 1.3 1.3 1.3s1.3-.5 1.3-1.3c0-2.4-.7-4.7-2.4-6.3 1.5-1 3.2-1.7 5.1-1.7.8 0 1.3-.5 1.3-1.3s-.5-1.3-1.3-1.3c-2.7 0-5.3 1.1-7.3 2.6-.7-.7-1.6-1.3-2.4-1.7C21 13.7 22 12 22 10c0-3.3-2.7-6-6-6zm0 2.7c1.9 0 3.3 1.5 3.3 3.3S17.9 13.3 16 13.3s-3.3-1.5-3.3-3.3S14.1 6.7 16 6.7z"/>
    </svg>
  )
}

// Map a tool name to a friendly "in-progress" label shown inside the
// thinking bubble. Keep these short, action-oriented, and present-continuous.
function loaderLabelForTool(toolName: string | null): string {
  if (!toolName) return 'Thinking'
  switch (toolName) {
    case 'getWalletBalance': return 'Fetching your balance'
    case 'getTransactionHistory': return 'Pulling your transactions'
    case 'getBookings': return 'Looking up your appointments'
    case 'getUserProfile': return 'Loading your profile'
    case 'getNotifications': return 'Checking your notifications'
    case 'getSupportTickets': return 'Loading your support tickets'
    case 'searchProducts': return 'Searching the web for products'
    case 'getServices':
    case 'searchServices': return 'Searching our services'
    case 'getLocations': return 'Looking up our locations'
    case 'getPackages': return 'Loading our packages'
    case 'getGiftCards': return 'Loading gift card options'
    case 'getConsultation': return 'Preparing your consultation info'
    case 'getCurrentDateTime': return 'Checking the calendar'
    case 'fundWallet': return 'Preparing your top-up'
    case 'cancelBooking': return 'Cancelling your appointment'
    case 'updateProfile': return 'Updating your profile'
    case 'updatePreferences': return 'Saving your preferences'
    case 'logoutUser': return 'Signing you out'
    case 'sendPasswordResetEmail': return 'Sending your reset link'
    case 'resendVerificationEmail': return 'Resending verification email'
    case 'createBooking': return 'Preparing your booking'
    case 'bookConsultation': return 'Booking your consultation'
    case 'joinBookingWaitlist': return 'Adding you to the waitlist'
    case 'createSupportTicket': return 'Opening your support ticket'
    case 'requestCallback': return 'Scheduling your callback'
    case 'navigateToPage': return 'Finding the right page'
    case 'checkLoginStatus': return 'Checking your session'
    default: return 'Working on it'
  }
}

// Tool Result Card Component
function ToolResultCard({ toolName, result }: { toolName: string; result: Record<string, unknown> }) {
  const getIcon = () => {
    switch (toolName) {
      case 'getWalletBalance': return <Wallet className="w-4 h-4" />
      case 'getBookings': return <Calendar className="w-4 h-4" />
      // Spa services / treatments → Flower2 (on-brand, calm)
      case 'getServices': return <Flower2 className="w-4 h-4" />
      case 'getLocations': return <MapPin className="w-4 h-4" />
      case 'getUserProfile': return <User className="w-4 h-4" />
      case 'getPackages': return <Gift className="w-4 h-4" />
      case 'sendPasswordResetEmail': return <Mail className="w-4 h-4" />
      case 'resendVerificationEmail': return <Mail className="w-4 h-4" />
      case 'getSupportTickets': return <MessageSquare className="w-4 h-4" />
      case 'createSupportTicket': return <MessageSquare className="w-4 h-4" />
      // Notifications → Bell makes more semantic sense than a decorative
      // Sparkles (which the rest of the site no longer uses).
      case 'getNotifications': return <Mail className="w-4 h-4" />
      case 'joinBookingWaitlist': return <Calendar className="w-4 h-4" />
      case 'bookConsultation': return <Calendar className="w-4 h-4" />
      // Search results header explicitly asked for "no sparkle" — use the
      // Search glyph instead so the icon matches the UI affordance.
      case 'searchServices': return <Search className="w-4 h-4" />
      default: return <ArrowRight className="w-4 h-4" />
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
      case 'sendPasswordResetEmail': return 'Password Reset'
      case 'resendVerificationEmail': return 'Email Verification'
      case 'getSupportTickets': return 'Support Tickets'
      case 'createSupportTicket': return 'Ticket Opened'
      case 'getNotifications': return 'Recent Activity'
      case 'joinBookingWaitlist': return 'Booking Waitlist'
      case 'bookConsultation': return 'Consultation'
      case 'searchServices': return 'Service Search'
      default: return 'Info'
    }
  }

  // Render wallet balance — premium "card" treatment that feels like a real
  // bank/fintech debit card. Big number, currency, decorative orbs, plus two
  // action chips so the user can act on the balance immediately.
  if (toolName === 'getWalletBalance' && result.success) {
    const currency = (result.currency as string) || 'NGN'
    const balance = Number(result.balance ?? 0)
    const formatted =
      (result.formatted as string) ||
      `₦${balance.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    // Split "₦12,345.67" into the symbol + the number for big-on-small typography
    const symbolMatch = formatted.match(/^[^\d-]+/)
    const symbol = symbolMatch ? symbolMatch[0] : '₦'
    const amount = formatted.slice(symbol.length)

    return (
      <div className="relative overflow-hidden rounded-2xl bg-[#7B2D8E] text-white shadow-lg shadow-[#7B2D8E]/25">
        {/* Decorative orbs */}
        <div className="pointer-events-none absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-10 -left-6 w-28 h-28 rounded-full bg-white/5 blur-2xl" aria-hidden="true" />

        <div className="relative p-4">
          {/* Header row */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-white/70 leading-none">
                  Available Balance
                </p>
                <p className="text-[10px] text-white/60 mt-1 leading-none">Dermaspace Wallet</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/15 ring-1 ring-white/20">
              {currency}
            </span>
          </div>

          {/* Big amount */}
          <div className="flex items-baseline gap-1 mb-4">
            <span className="text-xl font-semibold text-white/80 leading-none">{symbol}</span>
            <span className="text-3xl font-bold tracking-tight tabular-nums leading-none">{amount}</span>
          </div>

          {/* Action chips */}
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/wallet"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[#7B2D8E] text-xs font-semibold hover:bg-white/90 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
              Top up
            </Link>
            <Link
              href="/dashboard/wallet"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 text-white text-xs font-semibold hover:bg-white/25 transition-colors ring-1 ring-white/20"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Transactions
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Render Tavily web-search product recommendations
  if (toolName === 'searchProducts' && result.success) {
    const products = (result.products as Array<{
      title: string
      url: string
      snippet: string
      source: string
      image: string | null
    }>) || []
    const summary = (result.summary as string) || ''

    if (products.length === 0) {
      return (
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-semibold text-gray-600">Web Search</span>
          </div>
          <p className="text-sm text-gray-500">
            {summary || 'No product results found. Try a more specific query.'}
          </p>
        </div>
      )
    }

    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center">
              <Search className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-900 leading-none">Recommended Products</p>
              <p className="text-[10px] text-gray-500 mt-1 leading-none">
                From the web · {products.length} result{products.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
        </div>

        <ul className="divide-y divide-gray-100">
          {products.map((p, i) => (
            <li key={i}>
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 hover:bg-gray-50 transition-colors group"
              >
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.image}
                    alt=""
                    className="w-14 h-14 rounded-xl object-cover bg-gray-100 flex-shrink-0 ring-1 ring-gray-100"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      // Hide broken images gracefully
                      ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0 ring-1 ring-[#7B2D8E]/10">
                    <Flower2 className="w-5 h-5 text-[#7B2D8E]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-medium text-[#7B2D8E] uppercase tracking-wide truncate">
                      {p.source}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-[#7B2D8E] transition-colors">
                    {p.title}
                  </p>
                  {p.snippet && (
                    <p className="text-[11px] text-gray-500 leading-snug mt-1 line-clamp-2">
                      {p.snippet}
                    </p>
                  )}
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#7B2D8E] flex-shrink-0 mt-1" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  // Render transaction history — clean list with credit/debit indicators
  if (toolName === 'getTransactionHistory' && result.success) {
    const txs = (result.transactions as Array<{
      type: string
      amount: string
      description: string
      status: string
      date: string
    }>) || []
    if (txs.length === 0) {
      return (
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-semibold text-gray-600">Recent Transactions</span>
          </div>
          <p className="text-sm text-gray-500">No transactions yet.</p>
          <Link href="/dashboard/wallet" className="text-xs text-[#7B2D8E] font-medium hover:underline mt-1 inline-block">
            Open wallet
          </Link>
        </div>
      )
    }
    return (
      <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-semibold text-gray-800">Recent Transactions</span>
          </div>
          <Link href="/dashboard/wallet" className="text-[10px] text-[#7B2D8E] font-semibold hover:underline">
            See all
          </Link>
        </div>
        <ul className="divide-y divide-gray-100">
          {txs.slice(0, 4).map((t, i) => {
            const isCredit = t.type === 'credit' || t.type === 'refund'
            return (
              <li key={i} className="flex items-center gap-3 py-2">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                  }`}
                >
                  {isCredit ? (
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate leading-tight">
                    {t.description || (isCredit ? 'Wallet top-up' : 'Wallet payment')}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{t.date}</p>
                </div>
                <p
                  className={`text-xs font-semibold tabular-nums ${
                    isCredit ? 'text-emerald-600' : 'text-gray-900'
                  }`}
                >
                  {isCredit ? '+' : '−'}
                  {t.amount.replace(/^-?/, '')}
                </p>
              </li>
            )
          })}
        </ul>
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

  // Password reset email sent
  if (toolName === 'sendPasswordResetEmail' && result.success) {
    return (
      <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
        <div className="flex items-center gap-2 mb-1.5">
          <Mail className="w-4 h-4 text-emerald-700" />
          <span className="text-xs font-semibold text-emerald-800">Password Reset Link Sent</span>
        </div>
        <p className="text-xs text-emerald-800/90 leading-relaxed">
          {(result.message as string) || `A reset link was sent to ${(result.email as string) || 'your inbox'}. It expires in 1 hour.`}
        </p>
      </div>
    )
  }

  // Verification email resent
  if (toolName === 'resendVerificationEmail' && result.success) {
    if (result.alreadyVerified) {
      return (
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-semibold text-gray-700">Email Already Verified</span>
          </div>
        </div>
      )
    }
    return (
      <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
        <div className="flex items-center gap-2 mb-1.5">
          <Mail className="w-4 h-4 text-emerald-700" />
          <span className="text-xs font-semibold text-emerald-800">Verification Email Sent</span>
        </div>
        <p className="text-xs text-emerald-800/90 leading-relaxed">
          {(result.message as string) || `Verification email sent to ${(result.email as string) || 'your inbox'}.`}
        </p>
      </div>
    )
  }

  // Booking waitlist joined
  if (toolName === 'joinBookingWaitlist' && result.success) {
    return (
      <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
        <div className="flex items-center gap-2 mb-1.5">
          <Calendar className="w-4 h-4 text-emerald-700" />
          <span className="text-xs font-semibold text-emerald-800">
            {result.alreadyOnList ? 'Already on Waitlist' : 'Added to Waitlist'}
          </span>
        </div>
        <p className="text-xs text-emerald-800/90 leading-relaxed">
          {(result.message as string) || 'You are on the booking waitlist.'}
        </p>
      </div>
    )
  }

  // Consultation booked
  if (toolName === 'bookConsultation' && result.success) {
    return (
      <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
        <div className="flex items-center gap-2 mb-1.5">
          <Calendar className="w-4 h-4 text-emerald-700" />
          <span className="text-xs font-semibold text-emerald-800">Consultation Booked</span>
        </div>
        <p className="text-xs text-emerald-800/90 leading-relaxed">
          {(result.message as string) || 'Your free consultation is booked.'}
        </p>
        {(result.location || result.date) && (
          <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
            {result.location ? (
              <span className="px-2 py-0.5 rounded-full bg-white border border-emerald-200 text-emerald-800">
                {String(result.location)}
              </span>
            ) : null}
            {result.date ? (
              <span className="px-2 py-0.5 rounded-full bg-white border border-emerald-200 text-emerald-800">
                {String(result.date)} {result.time ? `• ${String(result.time)}` : ''}
              </span>
            ) : null}
          </div>
        )}
      </div>
    )
  }

  // Support ticket created
  if (toolName === 'createSupportTicket' && result.success) {
    return (
      <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
        <div className="flex items-center gap-2 mb-1.5">
          <MessageSquare className="w-4 h-4 text-emerald-700" />
          <span className="text-xs font-semibold text-emerald-800">Ticket Opened</span>
        </div>
        <p className="text-xs text-emerald-800/90 leading-relaxed">
          {(result.message as string) || 'Your support ticket has been created.'}
        </p>
        {result.ticketId ? (
          <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white border border-emerald-200 text-[11px] font-mono text-emerald-800">
            {String(result.ticketId)}
          </div>
        ) : null}
      </div>
    )
  }

  // Service search results
  if (toolName === 'searchServices' && result.success) {
    const matches = result.matches as Array<{ name: string; price: string; category: string; link: string }>
    if (!matches || matches.length === 0) {
      return (
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
          <p className="text-xs text-gray-600">
            {'No direct match for '}
            <span className="font-medium">{String(result.query)}</span>
            {'. Try browsing all services.'}
          </p>
          <Link href="/services" className="text-xs text-[#7B2D8E] font-medium hover:underline mt-1 inline-block">
            Browse services
          </Link>
        </div>
      )
    }
    return (
      <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 space-y-2">
        {/* Search-results header uses the Search glyph now — the user
            asked us to stop using Sparkles on the search surface. */}
        <div className="flex items-center gap-2 mb-1">
          <Search className="w-4 h-4 text-[#7B2D8E]" />
          <span className="text-xs font-semibold text-gray-700">
            {`Results for "${String(result.query)}"`}
          </span>
        </div>
        {matches.slice(0, 4).map((m, i) => (
          <Link
            key={i}
            href={m.link}
            className="block bg-white rounded-lg p-2 border border-gray-100 hover:border-[#7B2D8E]/40 transition-colors"
          >
            <p className="text-sm font-medium text-gray-900">{m.name}</p>
            <p className="text-xs text-gray-500">
              {m.category} {'• '}
              <span className="text-[#7B2D8E] font-medium">{m.price}</span>
            </p>
          </Link>
        ))}
      </div>
    )
  }

  // Support tickets
  if (toolName === 'getSupportTickets' && result.success) {
    const tickets = result.tickets as Array<{ id: string | number; subject: string; status: string; priority: string }>
    if (!tickets || tickets.length === 0) {
      return (
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            {getIcon()}
            <span className="text-xs font-semibold text-gray-600">Support Tickets</span>
          </div>
          <p className="text-sm text-gray-500">No tickets yet.</p>
          <Link href="/dashboard/support" className="text-xs text-[#7B2D8E] font-medium hover:underline mt-1 inline-block">
            Open support
          </Link>
        </div>
      )
    }
    return (
      <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 space-y-2">
        <div className="flex items-center gap-2 mb-1">
          {getIcon()}
          <span className="text-xs font-semibold text-gray-600">Support Tickets</span>
        </div>
        {tickets.slice(0, 3).map((t, i) => (
          <div key={i} className="bg-white rounded-lg p-2 text-xs">
            <p className="font-medium text-gray-900 truncate">{t.subject}</p>
            <p className="text-gray-500 capitalize">{t.status} • {t.priority}</p>
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

// Turn a raw user message into a clean, human chat title
function generateChatTitle(raw: string): string {
  if (!raw) return 'New conversation'
  // Strip markdown/emoji/extra whitespace
  const clean = raw
    .replace(/[*_`#>]/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!clean) return 'New conversation'

  const MAX = 40
  if (clean.length <= MAX) {
    return clean.charAt(0).toUpperCase() + clean.slice(1)
  }
  // Cut at last word boundary before MAX
  const slice = clean.slice(0, MAX)
  const lastSpace = slice.lastIndexOf(' ')
  const cut = lastSpace > 20 ? slice.slice(0, lastSpace) : slice
  return (cut.charAt(0).toUpperCase() + cut.slice(1)).replace(/[,.;:!?-]+$/, '') + '…'
}

// Format a timestamp as a friendly relative label for the chat list
function formatChatTime(date: Date): string {
  const now = Date.now()
  const ts = date.getTime()
  const diff = now - ts
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function DermaAI() {
  const [isOpen, setIsOpen] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string>('')
  const [userInfo, setUserInfo] = useState<UserInfo>({})
  const [messages, setMessages] = useState<Message[]>([])
  const [hasHydrated, setHasHydrated] = useState(false)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  // Tracks the most recently invoked tool so the loader can show
  // a context-aware label like "Fetching your balance…"
  const [activeTool, setActiveTool] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true) // Voice enabled by default
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voiceCallMode, setVoiceCallMode] = useState(false)
  const [callStatus, setCallStatus] = useState<'idle' | 'listening' | 'speaking' | 'processing'>('idle')
  const [accountAccessConsent, setAccountAccessConsent] = useState(false)
  const [showConsentPrompt, setShowConsentPrompt] = useState(false)
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)
  // Images staged in the composer (already uploaded to Blob) waiting to be
  // attached to the next outgoing message.
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  // Lightweight, elegant chime generator using Web Audio API.
  // Plays a short two-note sequence with a soft exponential envelope so it feels
  // airy and premium (think iMessage/Telegram) without shipping any audio assets.
  const playChime = useCallback(
    (type: 'send' | 'receive') => {
      if (!voiceEnabled || typeof window === 'undefined') return
      try {
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!AC) return
        if (!audioCtxRef.current) audioCtxRef.current = new AC()
        const ctx = audioCtxRef.current
        if (ctx.state === 'suspended') ctx.resume().catch(() => {})

        const now = ctx.currentTime
        // Send = rising "pop" (F5 -> A5); Receive = softer "ding-dong" (A5 -> E5)
        const notes =
          type === 'send'
            ? [{ f: 698.46, t: 0, d: 0.11 }, { f: 880, t: 0.06, d: 0.14 }]
            : [{ f: 880, t: 0, d: 0.16 }, { f: 659.25, t: 0.11, d: 0.22 }]
        const peakGain = type === 'send' ? 0.09 : 0.11

        // Master gain with a gentle low-pass for warmth
        const master = ctx.createGain()
        master.gain.value = 1
        const filter = ctx.createBiquadFilter()
        filter.type = 'lowpass'
        filter.frequency.value = 4200
        filter.Q.value = 0.6
        master.connect(filter).connect(ctx.destination)

        notes.forEach(({ f, t, d }) => {
          const osc = ctx.createOscillator()
          osc.type = 'sine'
          osc.frequency.value = f

          const gain = ctx.createGain()
          // Attack -> exponential decay envelope
          gain.gain.setValueAtTime(0.0001, now + t)
          gain.gain.exponentialRampToValueAtTime(peakGain, now + t + 0.012)
          gain.gain.exponentialRampToValueAtTime(0.0001, now + t + d)

          osc.connect(gain).connect(master)
          osc.start(now + t)
          osc.stop(now + t + d + 0.02)
        })
      } catch {
        // Silent failure — audio is an enhancement, never break UX
      }
    },
    [voiceEnabled]
  )

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

  // ONE-TIME hydration: restore saved sessions + active conversation from localStorage
  // so refreshing the page keeps the user exactly where they were.
  useEffect(() => {
    try {
      const savedSessions = localStorage.getItem('derma-chat-sessions')
      if (savedSessions) {
        const parsed = JSON.parse(savedSessions) as ChatSession[]
        const restored = parsed.map(s => ({
          ...s,
          createdAt: new Date(s.createdAt),
          messages: s.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })),
        }))
        setSessions(restored)
      }

      const savedActive = localStorage.getItem('derma-chat-active')
      if (savedActive) {
        const { sessionId, messages: activeMessages, isOpen: wasOpen } = JSON.parse(savedActive) as {
          sessionId: string
          messages: Message[]
          isOpen?: boolean
        }
        if (Array.isArray(activeMessages) && activeMessages.length > 0) {
          setCurrentSessionId(sessionId || '')
          setMessages(
            activeMessages.map(m => ({ ...m, timestamp: new Date(m.timestamp) }))
          )
          if (wasOpen) setIsOpen(true)
          setHasHydrated(true)
          return
        }
      }
    } catch { /* ignore corrupt storage */ }
    setHasHydrated(true)
  }, [])

  // Set welcome message ONLY on first mount (after hydration, if no active chat)
  useEffect(() => {
    if (!hasHydrated) return
    if (messages.length > 0) return
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
  }, [hasHydrated, userInfo.name, messages.length])

  // Persist the saved sessions list to localStorage whenever it changes.
  useEffect(() => {
    if (!hasHydrated) return
    try {
      localStorage.setItem('derma-chat-sessions', JSON.stringify(sessions))
    } catch { /* quota */ }
  }, [sessions, hasHydrated])

  // Persist the ACTIVE conversation (messages + sessionId + open state) on every
  // change so a page refresh restores the exact chat + open-modal state.
  useEffect(() => {
    if (!hasHydrated) return
    const hasRealContent = messages.some(m => m.role === 'user')
    try {
      if (hasRealContent) {
        localStorage.setItem(
          'derma-chat-active',
          JSON.stringify({ sessionId: currentSessionId, messages, isOpen })
        )
      } else if (!isOpen) {
        localStorage.removeItem('derma-chat-active')
      }
    } catch { /* quota */ }
  }, [messages, currentSessionId, hasHydrated, isOpen])

  // Auto-upsert the active conversation into the saved sessions list. Uses a
  // stable id so the chat appears in "Recent" the moment the user starts talking
  // and stays in sync on every reply.
  useEffect(() => {
    if (!hasHydrated) return
    const firstUserMsg = messages.find(m => m.role === 'user')
    if (!firstUserMsg) return
    const id = currentSessionId || firstUserMsg.id
    if (!currentSessionId) setCurrentSessionId(id)

    const title = generateChatTitle(firstUserMsg.content)
    const createdAt = messages[0]?.timestamp instanceof Date
      ? messages[0].timestamp
      : new Date()

    setSessions(prev => {
      const existing = prev.find(s => s.id === id)
      const next: ChatSession = {
        id,
        title,
        messages,
        createdAt: existing?.createdAt ?? createdAt,
      }
      const without = prev.filter(s => s.id !== id)
      return [next, ...without].slice(0, 50) // keep last 50
    })
  }, [messages, currentSessionId, hasHydrated])

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
    // Active conversation is already auto-saved via the upsert effect, so we
    // just need a fresh blank slate with a new greeting.
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
    // Clear the active-chat slot so a refresh lands on the welcome screen
    try { localStorage.removeItem('derma-chat-active') } catch {}
  }

  const loadSession = (session: ChatSession) => {
    setMessages(session.messages)
    setCurrentSessionId(session.id)
    setShowSidebar(false)
  }

  const deleteSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id))
    if (currentSessionId === id) {
      // Also wipe the persisted active slot immediately
      try { localStorage.removeItem('derma-chat-active') } catch {}
      startNewChat()
    }
  }

  // Check if message requires account access
  const requiresAccountAccess = (content: string) => {
    const accountKeywords = [
      'balance', 'wallet', 'money', 'transaction', 'payment', 'history',
      'booking', 'appointment', 'schedule', 'my account', 'my profile',
      'profile', 'my order', 'order history', 'my info', 'my details'
    ]
    const lower = content.toLowerCase()
    return accountKeywords.some(keyword => lower.includes(keyword))
  }

  // Handle consent grant
  const handleConsentGrant = () => {
    setAccountAccessConsent(true)
    setShowConsentPrompt(false)
    // Store consent in localStorage
    localStorage.setItem('derma-account-consent', 'granted')

    // Show an "Access granted" confirmation message in the chat
    const grantMessage: Message = {
      id: `grant-${Date.now()}`,
      role: 'assistant',
      content: "Access granted. I can now view your wallet, bookings, profile, transactions, and notifications, and help you with secure actions like password resets and email verification.",
      timestamp: new Date(),
      banner: 'access-granted'
    }
    setMessages(prev => [...prev, grantMessage])

    // Send the pending message with an explicit consent=true override so the
    // fetch call doesn't see stale React state (setState hasn't applied yet).
    if (pendingMessage) {
      const toSend = pendingMessage
      setPendingMessage(null)
      // Defer slightly so the banner renders before the new request spinner appears
      setTimeout(() => sendMessageWithConsent(toSend, true), 50)
    }
  }

  // Handle consent deny
  const handleConsentDeny = () => {
    setShowConsentPrompt(false)
    setPendingMessage(null)
    // Add a message explaining they need to grant access
    const denyMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: "No problem! I respect your privacy. If you change your mind, just ask about your account again and I'll request permission. In the meantime, I can still help you with general questions about our services, locations, and pricing.",
      timestamp: new Date()
    }
    setMessages(prev => [...prev, denyMessage])
  }

  // Load consent from localStorage
  useEffect(() => {
    const storedConsent = localStorage.getItem('derma-account-consent')
    if (storedConsent === 'granted') {
      setAccountAccessConsent(true)
    }
  }, [])

  const sendMessageWithConsent = useCallback(async (
    content: string,
    consentOverride?: boolean,
    attachmentsOverride?: Attachment[]
  ) => {
    // Allow sending with no text as long as at least one image is attached —
    // that's how users say "analyse this photo and suggest products" hands-free.
    const attachments = attachmentsOverride ?? pendingAttachments
    if (!content.trim() && attachments.length === 0) return

    // Read consent freshly from storage as a fallback so we never send stale false
    // after the user just clicked "Grant Access" (React state update hasn't applied yet).
    let effectiveConsent = consentOverride ?? accountAccessConsent
    if (!effectiveConsent && typeof window !== 'undefined') {
      effectiveConsent = localStorage.getItem('derma-account-consent') === 'granted'
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
      attachments: attachments.length > 0 ? attachments : undefined,
    }

    const currentMessages = [...messages, userMessage]
    setMessages(currentMessages)
    setInput('')
    setPendingAttachments([])
    setUploadError(null)
    setIsLoading(true)
    setStreamingContent('')
    setActiveTool(null)
    playChime('send')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: currentMessages
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .map(m => ({
              role: m.role,
              content: m.content,
              // Forward image URLs so the server can build a multimodal payload
              attachments: m.attachments
                ? m.attachments.map(a => ({ url: a.url, contentType: a.contentType }))
                : undefined,
            })),
          userInfo: {
            name: userInfo.name,
            preferences: userInfo.preferences
          },
          accountAccessConsent: effectiveConsent
        })
      })

      console.log('[v0] Chat API response status:', res.status)
      
      if (!res.ok) {
        const errorText = await res.text()
        console.error('[v0] Chat API error response:', errorText)
        throw new Error(`API error: ${res.status} - ${errorText}`)
      }

      let fullContent = ''
      let streamError: string | null = null
      const toolResults: ToolResult[] = []
      // Track in-flight tool calls by id so we can attach results when they arrive
      const toolCalls: Record<string, { toolName: string }> = {}

      // Parse AI SDK 6 UI Message Stream (SSE-encoded JSON events)
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
          if (!trimmed || !trimmed.startsWith('data:')) continue

          const data = trimmed.slice(5).trim()
          if (data === '[DONE]') continue

          let event: Record<string, unknown>
          try {
            event = JSON.parse(data)
          } catch {
            continue
          }

          const type = event.type as string | undefined

          // Text streaming: { type: 'text-delta', delta: '...' }
          // Some AI SDK versions emit `delta`, older ones used `textDelta`,
          // and `text` is a defensive fallback — accept any of them.
          if (type === 'text-delta') {
            const delta =
              (typeof event.delta === 'string' && event.delta) ||
              (typeof event.textDelta === 'string' && (event.textDelta as string)) ||
              (typeof event.text === 'string' && (event.text as string)) ||
              ''
            if (delta) {
              fullContent += delta
              setStreamingContent(fullContent)
            }
            continue
          }

          // Tool call started - remember the tool name by id and surface it
          // to the UI so the loader can show "Fetching your balance…" etc.
          if (
            type === 'tool-input-start' ||
            type === 'tool-input-available' ||
            type === 'tool-call'
          ) {
            const toolCallId = event.toolCallId as string | undefined
            const toolName = event.toolName as string | undefined
            if (toolCallId && toolName) {
              toolCalls[toolCallId] = { toolName }
              setActiveTool(toolName)
            }
            continue
          }

          // Tool result: { type: 'tool-output-available', toolCallId, output }
          if (type === 'tool-output-available' || type === 'tool-result') {
            const toolCallId = event.toolCallId as string | undefined
            const output = (event.output ?? event.result) as Record<string, unknown> | undefined
            const toolName =
              (event.toolName as string | undefined) ||
              (toolCallId ? toolCalls[toolCallId]?.toolName : undefined)
            if (toolName && output && typeof output === 'object') {
              toolResults.push({ toolName, result: output })
            }
            continue
          }

          if (type === 'error') {
            console.error('[v0] AI stream error event:', event)
            const msg =
              (typeof event.errorText === 'string' && (event.errorText as string)) ||
              (typeof event.error === 'string' && (event.error as string)) ||
              (event.error && typeof (event.error as { message?: unknown }).message === 'string'
                ? ((event.error as { message: string }).message)
                : '')
            if (msg) streamError = msg
          }
        }
      }

      console.log('[v0] Stream finished. Final content length:', fullContent.length)
      console.log('[v0] Final content preview:', fullContent.substring(0, 200))

      // If the model returned nothing AND no tool output was attached, show
      // a real failure message (or the captured stream error) instead of the
      // misleading "I'm here to help!" canned reply that used to mask bugs.
      let finalContent = fullContent
      if (!finalContent && toolResults.length === 0) {
        finalContent = streamError
          ? `I hit an error generating a reply: ${streamError}. Please try again.`
          : "I couldn't generate a reply just now — please try rephrasing or try again in a moment."
      } else if (!finalContent && toolResults.length > 0) {
        // We have tool output but no natural-language summary. Give a short,
        // helpful sentence instead of the old generic fallback.
        finalContent = "Here's what I found:"
      }

      // Generate actions from the response
      const actions = parseActionsFromText(finalContent)

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: finalContent,
        timestamp: new Date(),
        toolResults: toolResults.length > 0 ? toolResults : undefined,
        actions: actions.length > 0 ? actions : undefined
      }

      setMessages(prev => [...prev, assistantMessage])
      setStreamingContent('')
      playChime('receive')

      // Auto-speak response if voice is enabled
      if (voiceEnabled && fullContent) {
        speakText(fullContent)
      }

      // Side effects from action tools
      for (const tr of toolResults) {
        const r = tr.result as Record<string, unknown>
        // Open Paystack checkout in a new tab for wallet funding
        if (tr.toolName === 'fundWallet' && r?.success && typeof r.paymentLink === 'string') {
          try { window.open(r.paymentLink, '_blank', 'noopener,noreferrer') } catch {}
        }
        // After a real logout, hit the logout endpoint (clears cookie) + redirect
        if (tr.toolName === 'logoutUser' && r?.success && r?.action === 'logout') {
          setTimeout(async () => {
            try { await fetch('/api/auth/logout', { method: 'POST' }) } catch {}
            localStorage.removeItem('derma-account-consent')
            window.location.href = '/'
          }, 1200)
        }
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
      setActiveTool(null)
    }
  }, [messages, userInfo, voiceEnabled, speakText, accountAccessConsent, playChime, pendingAttachments])

  // Main sendMessage function that checks for consent
  const sendMessage = useCallback((content: string) => {
    const hasAttachments = pendingAttachments.length > 0
    if ((!content.trim() && !hasAttachments) || isLoading) return

    // Check if this message requires account access and consent hasn't been granted
    if (requiresAccountAccess(content) && !accountAccessConsent) {
      // Store the message and show consent prompt
      setPendingMessage(content)
      setShowConsentPrompt(true)
      return
    }

    // Proceed with sending the message
    sendMessageWithConsent(content)
  }, [isLoading, accountAccessConsent, sendMessageWithConsent, pendingAttachments])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // If the user attached a photo without typing anything, fill in a sensible
    // default prompt so the model always gets something to work with.
    const text =
      input.trim() ||
      (pendingAttachments.length > 0
        ? 'Please analyse this photo and recommend the best products for my skin.'
        : '')
    sendMessage(text)
  }

  // Upload a selected file to Vercel Blob and stage it as an attachment
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // Reset input so selecting the same file again still triggers onChange
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setUploadError('Only image files are supported.')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setUploadError('Image too large (max 8 MB).')
      return
    }

    setUploadError(null)
    setIsUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/chat/upload', { method: 'POST', body: fd })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Upload failed')
      }
      const data = (await res.json()) as Attachment
      setPendingAttachments(prev => [...prev, data])
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const removeAttachment = (url: string) => {
    setPendingAttachments(prev => prev.filter(a => a.url !== url))
  }

  return (
    <>
      {/* Floating Button — sized to match the dashboard's app-chrome
          vocabulary (same footprint as primary action pills). Flat brand
          fill with a single soft glow below; no double shadow. */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-28 md:bottom-6 right-4 z-[55] transition-all duration-300 ${
          isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
        }`}
        aria-label="Open Derma AI"
      >
        <div className="relative group">
          <div
            className="absolute inset-0 rounded-full bg-[#7B2D8E] blur-lg opacity-25 group-hover:opacity-40 transition-opacity"
            aria-hidden="true"
          />
          <div className="relative w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#7B2D8E] flex items-center justify-center transition-transform group-hover:scale-[1.04] group-active:scale-95">
            <ButterflyLogo className="w-6 h-6 md:w-7 md:h-7 text-white" />
          </div>
        </div>
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[58] md:bg-transparent md:backdrop-blur-none"
          onClick={() => { setIsOpen(false); setShowSidebar(false); endVoiceCall(); }}
        />
      )}

      {/* Chat Modal — dashboard-native sizing. On mobile it covers the
          viewport (full bleed), on desktop it's a 400x640 floating panel
          with a single soft shadow and a 1px border for the flat-card
          language we use elsewhere in the dashboard. */}
      <div
        className={`fixed z-[60] transition-all duration-300 ease-out
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
          inset-0 md:inset-auto md:bottom-6 md:right-4 md:w-[400px] md:h-[640px]
          ${isOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-4'}
        `}
      >
        <div className="w-full h-full bg-white md:rounded-2xl flex overflow-hidden md:border md:border-gray-200 md:shadow-[0_20px_48px_-12px_rgba(123,45,142,0.18)]">
          
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
            
            <div className="flex-1 overflow-y-auto px-2 py-2">
              <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400 px-2 pt-1 pb-2">
                Recent chats
              </p>
              {sessions.length === 0 ? (
                <div className="px-3 py-8 text-center">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-2.5">
                    <MessageSquare className="w-4 h-4 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500">Your conversations will appear here.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {sessions.slice(0, 20).map(session => {
                    const isActive = currentSessionId === session.id
                    // Preview = last assistant message, or last message content
                    const lastMsg = session.messages[session.messages.length - 1]
                    const preview = lastMsg?.content
                      ?.replace(/[*_`#>]/g, '')
                      .replace(/\n/g, ' ')
                      .trim()
                      .slice(0, 60) || ''
                    return (
                      <div
                        key={session.id}
                        className={`group relative flex items-start gap-2.5 px-2.5 py-2.5 rounded-xl cursor-pointer transition-all ${
                          isActive
                            ? 'bg-white shadow-sm ring-1 ring-[#7B2D8E]/10'
                            : 'hover:bg-white/70'
                        }`}
                        onClick={() => loadSession(session)}
                      >
                        {/* Active indicator bar */}
                        {isActive && (
                          <span
                            className="absolute left-0 top-2.5 bottom-2.5 w-0.5 rounded-r-full bg-[#7B2D8E]"
                            aria-hidden="true"
                          />
                        )}
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isActive ? 'bg-[#7B2D8E]/10 text-[#7B2D8E]' : 'bg-gray-100 text-gray-400'
                        }`}>
                          <MessageSquare className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <p className={`text-xs font-semibold truncate ${
                              isActive ? 'text-gray-900' : 'text-gray-800'
                            }`}>
                              {session.title}
                            </p>
                            <span className="text-[10px] text-gray-400 flex-shrink-0 whitespace-nowrap">
                              {formatChatTime(session.createdAt)}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 leading-snug line-clamp-1">
                            {preview || 'Start chatting…'}
                          </p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded-md transition-all self-center"
                          aria-label="Delete chat"
                        >
                          <Trash2 className="w-3 h-3 text-gray-400 hover:text-red-500" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
          
          {/* Main Chat */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Voice Call Mode — brand-filled canvas with a pulsing
                avatar and a single clear end-call pill. Matches the
                rest of the chat's flat language (no extra shadows). */}
            {voiceCallMode ? (
              <div className="flex-1 flex flex-col items-center justify-center bg-[#7B2D8E] p-6">
                <div className="relative mb-8">
                  <div
                    className={`w-28 h-28 rounded-full bg-white/10 flex items-center justify-center ${
                      callStatus === 'speaking' ? 'animate-pulse' : ''
                    }`}
                  >
                    <ButterflyLogo className="w-14 h-14 text-white" />
                  </div>
                  {callStatus === 'listening' && (
                    <div className="absolute inset-0 rounded-full border-4 border-white/30 animate-ping" aria-hidden="true" />
                  )}
                </div>

                <p className="text-white font-semibold text-lg leading-none">Derma AI</p>
                <p className="text-white/70 text-xs mt-2 mb-8" aria-live="polite">
                  {callStatus === 'listening' && 'Listening…'}
                  {callStatus === 'speaking' && 'Speaking…'}
                  {callStatus === 'processing' && 'Processing…'}
                </p>

                <button
                  onClick={endVoiceCall}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white text-[#7B2D8E] text-sm font-semibold rounded-full hover:bg-white/90 active:scale-95 transition-all"
                >
                  <Phone className="w-4 h-4" />
                  End call
                </button>
              </div>
            ) : (
              <>
                {/* Header — brand bar with compact 8x8 control buttons
                    (matching the dashboard's standard header chrome) and
                    a live status dot next to "Derma AI" so the panel
                    feels alive without needing an animated glow. */}
                <div className="bg-[#7B2D8E] px-3 py-2.5 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      onClick={() => setShowSidebar(!showSidebar)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
                      aria-label="Toggle chat history"
                    >
                      <Menu className="w-4 h-4 text-white" />
                    </button>
                    <div className="relative w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                      <ButterflyLogo className="w-4 h-4 text-white" />
                      {/* Online pulse — a small green dot in the corner
                          of the avatar so the bar feels live. */}
                      <span
                        className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#7B2D8E]"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-white text-[13px] leading-none">Derma AI</h3>
                      <p className="text-[10px] text-white/70 leading-none mt-1">Always here to help</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button
                      onClick={startVoiceCall}
                      className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors"
                      aria-label="Start voice call"
                      title="Voice call"
                    >
                      <Phone className="w-4 h-4 text-white" />
                    </button>
                    <button
                      onClick={() => setVoiceEnabled(!voiceEnabled)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                        voiceEnabled ? 'bg-white/20' : 'hover:bg-white/10'
                      }`}
                      aria-label={voiceEnabled ? 'Disable voice responses' : 'Enable voice responses'}
                      title={voiceEnabled ? 'Voice on' : 'Voice off'}
                    >
                      {voiceEnabled ? (
                        <Volume2 className="w-4 h-4 text-white" />
                      ) : (
                        <VolumeX className="w-4 h-4 text-white/60" />
                      )}
                    </button>
                    <button
                      onClick={() => { setIsOpen(false); setShowSidebar(false); }}
                      className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors"
                      aria-label="Close chat"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>

                {/* Messages — neutral surface that matches the dashboard's
                    "panel on a soft canvas" pattern. Bubbles use the
                    dashboard's flat card language (thin border, no drop
                    shadow) so they slot cleanly alongside the tool-result
                    cards that render under them. */}
                <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50 space-y-4">
                  {messages.map((message) => (
                    <div key={message.id}>
                      {message.banner === 'access-granted' ? (
                        <div className="flex justify-center my-1" role="status" aria-live="polite">
                          <div className="flex items-start gap-2.5 max-w-[90%] bg-emerald-50 border border-emerald-200 rounded-2xl px-3.5 py-2.5">
                            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center">
                              <ShieldCheck className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-emerald-800">Access granted</p>
                              <p className="text-xs text-emerald-700/90 leading-relaxed mt-0.5">
                                {message.content}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          {message.role === 'assistant' && (
                            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#7B2D8E] flex items-center justify-center mr-2 mt-0.5">
                              <ButterflyLogo className="w-3.5 h-3.5 text-white" />
                            </div>
                          )}
                          <div className={`flex flex-col gap-1.5 max-w-[82%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                            {/* Attached images (user messages only) */}
                            {message.role === 'user' && message.attachments && message.attachments.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 justify-end">
                                {message.attachments.map((a) => (
                                  <a
                                    key={a.url}
                                    href={a.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-24 h-24 rounded-xl overflow-hidden border border-gray-200 hover:border-[#7B2D8E]/40 transition-colors"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={a.url}
                                      alt={a.name || 'Attached image'}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                    />
                                  </a>
                                ))}
                              </div>
                            )}
                            {/* Text bubble — only render when there's actual text */}
                            {message.content.trim() && (
                              <div className={`px-3.5 py-2.5 text-sm leading-relaxed ${
                                message.role === 'user'
                                  ? 'bg-[#7B2D8E] text-white rounded-2xl rounded-br-md'
                                  : 'bg-white text-gray-800 rounded-2xl rounded-bl-md border border-gray-200'
                              }`}>
                                <div dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }} />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Tool Results — product cards / wallet cards / etc.
                          Use a tiny left offset on mobile so the cards are as
                          wide as possible (the Tavily "Recommended Products"
                          card in particular looked cramped inside the 80%
                          bubble), and only indent to avatar alignment on
                          sm+ where there's room for it. */}
                      {message.toolResults && message.toolResults.length > 0 && (
                        <div className="ml-2 sm:ml-9 mt-3 space-y-2">
                          {message.toolResults.map((tr, idx) => (
                            <ToolResultCard key={idx} toolName={tr.toolName} result={tr.result} />
                          ))}
                        </div>
                      )}
                      
                      {/* Action Cards */}
                      {message.actions && message.actions.length > 0 && (
                        <div className="ml-2 sm:ml-9 mt-3 flex flex-wrap gap-2">
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
                  
                  {/* Streaming — same bubble language as static assistant
                      messages, plus a blinking caret to signal liveness. */}
                  {streamingContent && (
                    <div className="flex justify-start">
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#7B2D8E] flex items-center justify-center mr-2 mt-0.5">
                        <ButterflyLogo className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="max-w-[82%] px-3.5 py-2.5 bg-white border border-gray-200 rounded-2xl rounded-bl-md text-sm text-gray-800 leading-relaxed">
                        <div dangerouslySetInnerHTML={{ __html: formatMessage(streamingContent) }} />
                        <span className="inline-block w-0.5 h-4 bg-[#7B2D8E] ml-0.5 align-middle animate-pulse" />
                      </div>
                    </div>
                  )}

                  {/* Loading — context-aware "Fetching your balance…"
                      label in a flat card. The single subtle pulse ring
                      around the avatar hints at activity without the
                      noisy double-shadow we used to have. */}
                  {isLoading && !streamingContent && (
                    <div className="flex justify-start">
                      <div className="relative flex-shrink-0 w-7 h-7 rounded-full bg-[#7B2D8E] flex items-center justify-center mr-2">
                        <ButterflyLogo className="w-3.5 h-3.5 text-white" />
                        <span className="absolute inset-0 rounded-full ring-2 ring-[#7B2D8E]/30 animate-ping" aria-hidden="true" />
                      </div>
                      <div
                        className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-3.5 py-2.5 min-w-[180px]"
                        role="status"
                        aria-live="polite"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="flex items-center gap-1" aria-hidden="true">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E] animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E] animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E] animate-bounce" />
                          </span>
                          <span className="text-xs font-medium text-gray-700 leading-none">
                            {loaderLabelForTool(activeTool)}
                            <span className="text-gray-400">…</span>
                          </span>
                        </div>
                        <span className="sr-only">{loaderLabelForTool(activeTool)}</span>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Account Access Consent Prompt */}
                {showConsentPrompt && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20 p-4">
                    <div className="bg-white rounded-2xl p-5 max-w-[320px] shadow-xl">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center">
                          <User className="w-5 h-5 text-[#7B2D8E]" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 text-sm">Account Access</h4>
                          <p className="text-xs text-gray-500">Privacy consent required</p>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                        Allow <span className="font-semibold text-[#7B2D8E]">Derma AI</span> to access your account information? This includes your wallet balance, bookings, profile, and transaction history.
                      </p>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={handleConsentDeny}
                          className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                        >
                          Deny
                        </button>
                        <button
                          onClick={handleConsentGrant}
                          className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-[#7B2D8E] rounded-xl hover:bg-[#6B2278] transition-colors"
                        >
                          Allow
                        </button>
                      </div>
                      
                      <p className="text-[10px] text-gray-400 mt-3 text-center">
                        Your data is secure and only used to assist you
                      </p>
                    </div>
                  </div>
                )}

                {/* Composer — single unified pill. Instead of four equal-
                    weight buttons fighting for space at the bottom of the
                    panel, we place attach + mic inside the input pill
                    (left-aligned) and keep the send button as the only
                    "loud" control. Matches how the dashboard's search and
                    form fields handle inline icons.
                    Controls are sized at w-8 h-8 inside a 44px-tall pill
                    so the touch target comfortably clears Apple's 40px
                    minimum without dominating the layout. */}
                <div className="px-3 pt-3 pb-3 border-t border-gray-100 bg-white flex-shrink-0">
                  {/* Attachment previews */}
                  {(pendingAttachments.length > 0 || isUploading || uploadError) && (
                    <div className="mb-2.5 flex items-center gap-2 flex-wrap">
                      {pendingAttachments.map((a) => (
                        <div
                          key={a.url}
                          className="relative group w-14 h-14 rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={a.url}
                            alt={a.name || 'Attached image'}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeAttachment(a.url)}
                            aria-label="Remove attachment"
                            className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                      {isUploading && (
                        <div className="w-14 h-14 rounded-lg bg-gray-50 border border-gray-200 flex flex-col items-center justify-center gap-1">
                          <span className="flex items-center gap-0.5" aria-hidden="true">
                            <span className="w-1 h-1 rounded-full bg-[#7B2D8E] animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-1 h-1 rounded-full bg-[#7B2D8E] animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-1 h-1 rounded-full bg-[#7B2D8E] animate-bounce" />
                          </span>
                          <span className="text-[9px] text-gray-500">Uploading</span>
                        </div>
                      )}
                      {uploadError && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-100">
                          <span className="text-[11px] text-red-600">{uploadError}</span>
                          <button
                            type="button"
                            onClick={() => setUploadError(null)}
                            className="text-red-400 hover:text-red-600"
                            aria-label="Dismiss error"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="flex items-end gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/heic"
                      className="sr-only"
                      onChange={handleFileSelect}
                    />

                    {/* Input pill with inline attach + mic icons. The pill
                        rounds-full so focused composition feels soft and
                        app-native (iMessage / WhatsApp pattern). */}
                    <div className="flex-1 min-w-0 flex items-center gap-1 pl-1.5 pr-1 py-1 bg-gray-100 rounded-full focus-within:bg-white focus-within:ring-2 focus-within:ring-[#7B2D8E]/25 transition-colors">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading || isUploading}
                        title="Attach a photo"
                        aria-label="Attach a photo"
                        className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:text-[#7B2D8E] hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={toggleListening}
                        className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors flex-shrink-0 ${
                          isListening
                            ? 'bg-red-500 text-white animate-pulse'
                            : 'text-gray-500 hover:text-[#7B2D8E] hover:bg-white'
                        }`}
                        aria-label={isListening ? 'Stop listening' : 'Start listening'}
                        title={isListening ? 'Listening…' : 'Voice input'}
                      >
                        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </button>

                      <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={
                          pendingAttachments.length > 0
                            ? 'Add a note (optional)…'
                            : 'Ask me anything…'
                        }
                        className="flex-1 min-w-0 bg-transparent px-2 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
                        disabled={isLoading}
                      />
                    </div>

                    {/* Send — only "loud" control in the composer. */}
                    <button
                      type="submit"
                      disabled={
                        (!input.trim() && pendingAttachments.length === 0) ||
                        isLoading ||
                        isUploading
                      }
                      className="w-10 h-10 flex items-center justify-center bg-[#7B2D8E] text-white rounded-full hover:bg-[#6B2278] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                      aria-label="Send message"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>

                  <p className="text-center text-[10px] text-gray-400 mt-2 leading-tight px-4">
                    Derma AI can analyse photos, search products, check balances &amp; book appointments
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
