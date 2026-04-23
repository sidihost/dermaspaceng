'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, X, Mic, MicOff, Volume2, VolumeX, ArrowRight, MessageSquare, Plus, Trash2, Menu, Phone, Calendar, Wallet, MapPin, Gift, Flower2, User, ExternalLink, ShieldCheck, Mail, ArrowUpRight, ArrowDownLeft, TrendingUp, Paperclip, Search, Globe, Copy, Check, RotateCcw, Download, MoreHorizontal, Pencil, LogOut } from 'lucide-react'
import Link from 'next/link'
import { ButterflyLogo } from './butterfly-logo'

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
  banner?: 'access-granted' | 'account-disconnected'
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
  // Markdown-style links `[label](/path)` → real anchors. We keep the
  // styling understated (underline only, inherits text colour) so it
  // reads as a real hyperlink, not as a coloured button or badge.
  formatted = formatted.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="underline underline-offset-2 hover:opacity-80">$1</a>'
  )
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

// Map a tool name to a friendly "in-progress" label shown inside the
// thinking bubble. Keep these short, action-oriented, and present-continuous.
// NOTE: when `toolName` is null we always render plain "Thinking" — this is
// the state while the model is still deciding what (if anything) to do, so
// we must never leak a prior tool's label there (previously users saw
// "Fetching your balance" while the model was mid-reply on an unrelated
// question because activeTool stuck around after the tool finished).
function loaderLabelForTool(toolName: string | null): string {
  if (!toolName) return 'Thinking'
  switch (toolName) {
    case 'getWalletBalance': return 'Checking your wallet'
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
    case 'logoutUser': return 'Preparing sign-out confirmation'
    case 'sendPasswordResetEmail': return 'Sending your reset link'
    case 'resendVerificationEmail': return 'Resending verification email'
    case 'createBooking': return 'Preparing your booking'
    case 'bookConsultation': return 'Booking your consultation'
    case 'joinBookingWaitlist': return 'Adding you to the waitlist'
    case 'createSupportTicket': return 'Opening your support ticket'
    case 'requestCallback': return 'Scheduling your callback'
    case 'navigateToPage': return 'Finding the right page'
    case 'checkLoginStatus': return 'Checking if you\u2019re signed in'
    case 'saveMemory': return 'Remembering that'
    case 'forgetMemory': return 'Forgetting that'
    default: return 'Thinking'
  }
}

// Tool Result Card Component. `onSendPrompt` lets the card fire a new
// chat turn (e.g. the inline "Cancel" chip on a booking card). When
// null, the card renders in a read-only state so historical tool
// results (from saved sessions) don't accidentally re-trigger actions.
//
// `onNavigate` is invoked when the user clicks a link inside a tool card
// that should take them to another page (e.g. "Edit profile" →
// /dashboard/settings, "View ticket" → /dashboard/support/…). In floating
// mode this closes the chat panel so the user actually sees the
// destination page instead of the same modal sitting on top of it
// (previous bug: tapping "Edit profile" appeared to do nothing because
// the modal covered the newly-loaded settings page).
function ToolResultCard({
  toolName,
  result,
  onSendPrompt,
  onNavigate,
}: {
  toolName: string
  result: Record<string, unknown>
  onSendPrompt?: (prompt: string) => void
  onNavigate?: () => void
}) {
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

          {/* Action chips. onNavigate closes the floating modal so
              the destination page (wallet) is actually visible after
              the click — previously the modal stayed mounted on top of
              the new page, which is why users reported "Top up doesn't
              work". */}
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/wallet"
              onClick={() => onNavigate?.()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[#7B2D8E] text-xs font-semibold hover:bg-white/90 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
              Top up
            </Link>
            <Link
              href="/dashboard/wallet"
              onClick={() => onNavigate?.()}
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
          <Link
            href="/dashboard/wallet"
            onClick={() => onNavigate?.()}
            className="text-xs text-[#7B2D8E] font-medium hover:underline mt-1 inline-block"
          >
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
          <Link
            href="/dashboard/wallet"
            onClick={() => onNavigate?.()}
            className="text-[10px] text-[#7B2D8E] font-semibold hover:underline"
          >
            See all
          </Link>
        </div>
        <ul className="divide-y divide-gray-100">
          {txs.slice(0, 4).map((t, i) => {
            const isCredit = t.type === 'credit' || t.type === 'refund'
            return (
              <li key={i} className="flex items-center gap-3 py-2">
                {/* Credits land on brand purple (positive/in), debits
                    stay neutral gray — keeps the whole card on-brand
                    without relying on green/rose which clashed with
                    everything else Derma renders. */}
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isCredit ? 'bg-[#7B2D8E]/10 text-[#7B2D8E]' : 'bg-gray-100 text-gray-600'
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
                    isCredit ? 'text-[#7B2D8E]' : 'text-gray-900'
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

  // Render bookings — premium card with inline Cancel / Reschedule
  // actions per row. Each action fires a natural-language prompt back
  // through the assistant (via onSendPrompt) so the model runs the
  // real tool (cancelBooking / createBooking) end-to-end. This is the
  // "render actions" behaviour the user wants: the card isn't a
  // passive list, it's an interactive surface.
  if (toolName === 'getBookings' && result.success) {
    const bookings = result.bookings as Array<{
      reference?: string
      service: string
      location: string
      date: string
      time: string
      status?: string
      totalPrice?: string
    }>
    if (!bookings || bookings.length === 0) {
      return (
        <div className="bg-white rounded-2xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-semibold text-gray-800">Your Bookings</span>
          </div>
          <p className="text-sm text-gray-500 mb-3">No upcoming appointments yet.</p>
          <Link
            href="/booking"
            onClick={() => onNavigate?.()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#7B2D8E] text-white text-xs font-semibold hover:bg-[#6B2278] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            Book an appointment
          </Link>
        </div>
      )
    }
    // All booking statuses land on a brand-tinted or neutral chip so
    // the cards read as one palette. "Cancelled" greys out; everything
    // else gets a soft brand wash with slightly different contrast so
    // confirmed still feels like the "strong" positive state.
    const statusColor = (status?: string) => {
      switch ((status || '').toLowerCase()) {
        case 'confirmed':
          return 'bg-[#7B2D8E] text-white ring-[#7B2D8E]'
        case 'pending':
          return 'bg-[#7B2D8E]/10 text-[#7B2D8E] ring-[#7B2D8E]/20'
        case 'cancelled':
          return 'bg-gray-100 text-gray-500 ring-gray-200'
        default:
          return 'bg-[#7B2D8E]/10 text-[#7B2D8E] ring-[#7B2D8E]/15'
      }
    }
    return (
      <div className="bg-white rounded-2xl border border-gray-200 ring-1 ring-[#7B2D8E]/[0.04] overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-900 leading-none">Upcoming Appointments</p>
              <p className="text-[10px] text-gray-500 mt-1 leading-none">
                {bookings.length} booking{bookings.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <Link
            href="/dashboard"
            onClick={() => onNavigate?.()}
            className="text-[10px] font-semibold text-[#7B2D8E] hover:underline"
          >
            See all
          </Link>
        </div>
        <ul className="divide-y divide-gray-100">
          {bookings.slice(0, 3).map((b, i) => (
            <li key={b.reference || i} className="p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-gray-900 leading-tight truncate">
                    {b.service}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {b.location}
                    </span>
                    <span className="mx-1.5 text-gray-300">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {b.date} at {b.time}
                    </span>
                  </p>
                </div>
                {b.status && (
                  <span
                    className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full ring-1 ${statusColor(b.status)} flex-shrink-0`}
                  >
                    {b.status}
                  </span>
                )}
              </div>
              {/* Row actions — only show when we have a reference + a
                  send-prompt channel. Each button phrases a natural
                  instruction that the model will interpret and pipe to
                  the appropriate tool. */}
              {b.reference && onSendPrompt && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      onSendPrompt(
                        `Please cancel my booking ${b.reference} (${b.service} on ${b.date}).`,
                      )
                    }
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-gray-200 hover:border-[#7B2D8E]/30 hover:bg-[#7B2D8E]/5 hover:text-[#7B2D8E] text-[10px] font-semibold text-gray-600 transition-colors"
                  >
                    <X className="w-3 h-3" strokeWidth={2.5} />
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onSendPrompt(
                        `Can you help me reschedule booking ${b.reference}?`,
                      )
                    }
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-gray-200 hover:border-[#7B2D8E]/30 hover:bg-[#7B2D8E]/5 hover:text-[#7B2D8E] text-[10px] font-semibold text-gray-600 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" strokeWidth={2.5} />
                    Reschedule
                  </button>
                  {b.totalPrice && (
                    <span className="ml-auto text-[11px] font-semibold text-[#7B2D8E] tabular-nums">
                      {b.totalPrice}
                    </span>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
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
      <div className="bg-[#7B2D8E]/5 rounded-xl p-3 border border-[#7B2D8E]/20">
        <div className="flex items-center gap-2 mb-1.5">
          <Mail className="w-4 h-4 text-[#7B2D8E]" />
          <span className="text-xs font-semibold text-[#7B2D8E]">Password Reset Link Sent</span>
        </div>
        <p className="text-xs text-gray-700 leading-relaxed">
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
            <ShieldCheck className="w-4 h-4 text-[#7B2D8E]" />
            <span className="text-xs font-semibold text-gray-700">Email Already Verified</span>
          </div>
        </div>
      )
    }
    return (
      <div className="bg-[#7B2D8E]/5 rounded-xl p-3 border border-[#7B2D8E]/20">
        <div className="flex items-center gap-2 mb-1.5">
          <Mail className="w-4 h-4 text-[#7B2D8E]" />
          <span className="text-xs font-semibold text-[#7B2D8E]">Verification Email Sent</span>
        </div>
        <p className="text-xs text-gray-700 leading-relaxed">
          {(result.message as string) || `Verification email sent to ${(result.email as string) || 'your inbox'}.`}
        </p>
      </div>
    )
  }

  // Booking waitlist joined
  if (toolName === 'joinBookingWaitlist' && result.success) {
    return (
      <div className="bg-[#7B2D8E]/5 rounded-xl p-3 border border-[#7B2D8E]/20">
        <div className="flex items-center gap-2 mb-1.5">
          <Calendar className="w-4 h-4 text-[#7B2D8E]" />
          <span className="text-xs font-semibold text-[#7B2D8E]">
            {result.alreadyOnList ? 'Already on Waitlist' : 'Added to Waitlist'}
          </span>
        </div>
        <p className="text-xs text-gray-700 leading-relaxed">
          {(result.message as string) || 'You are on the booking waitlist.'}
        </p>
      </div>
    )
  }

  // Consultation booked
  if (toolName === 'bookConsultation' && result.success) {
    return (
      <div className="bg-[#7B2D8E]/5 rounded-xl p-3 border border-[#7B2D8E]/20">
        <div className="flex items-center gap-2 mb-1.5">
          <Calendar className="w-4 h-4 text-[#7B2D8E]" />
          <span className="text-xs font-semibold text-[#7B2D8E]">Consultation Booked</span>
        </div>
        <p className="text-xs text-gray-700 leading-relaxed">
          {(result.message as string) || 'Your free consultation is booked.'}
        </p>
        {(result.location || result.date) && (
          <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
            {result.location ? (
              <span className="px-2 py-0.5 rounded-full bg-white border border-[#7B2D8E]/20 text-[#7B2D8E] font-medium">
                {String(result.location)}
              </span>
            ) : null}
            {result.date ? (
              <span className="px-2 py-0.5 rounded-full bg-white border border-[#7B2D8E]/20 text-[#7B2D8E] font-medium">
                {String(result.date)} {result.time ? `• ${String(result.time)}` : ''}
              </span>
            ) : null}
          </div>
        )}
      </div>
    )
  }

  // Support ticket created — mirrors the "Ticket Submitted!" success
  // state on /dashboard/support so the confirmation in chat looks and
  // feels like the confirmation the user would see on the dashboard.
  if (toolName === 'createSupportTicket' && result.success) {
    const ticketId = result.ticketId ? String(result.ticketId) : ''
    const subject = (result.subject as string) || ''
    const category = (result.category as string) || ''
    return (
      <div className="bg-white rounded-2xl border border-gray-200 ring-1 ring-[#7B2D8E]/[0.04] overflow-hidden">
        <div className="p-4 flex flex-col items-center text-center">
          <div className="w-11 h-11 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mb-2.5">
            <Check className="w-5 h-5 text-[#7B2D8E]" strokeWidth={2.5} />
          </div>
          <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#7B2D8E]">
            Ticket submitted
          </p>
          <p className="text-[14px] font-semibold text-gray-900 leading-tight mt-0.5">
            We&apos;re on it.
          </p>
          {ticketId && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#7B2D8E]/10 text-[11px] font-mono font-semibold text-[#7B2D8E]">
              {ticketId}
            </div>
          )}
          <p className="text-[11px] text-gray-500 leading-relaxed mt-2 max-w-[240px]">
            {(result.message as string) ||
              'Our team will reply within 24 hours. You can track progress from your dashboard.'}
          </p>
          {(subject || category) && (
            <div className="w-full mt-3 bg-gray-50 rounded-xl px-3 py-2 text-left">
              {subject && (
                <p className="text-[12px] font-medium text-gray-900 leading-snug truncate">
                  {subject}
                </p>
              )}
              {category && (
                <p className="text-[10px] text-gray-500 capitalize mt-0.5">
                  {category}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="px-4 pb-3 flex gap-1.5">
          {ticketId ? (
            <Link
              href={`/dashboard/support/${ticketId}`}
              onClick={() => onNavigate?.()}
              className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-full bg-[#7B2D8E] text-white text-[11px] font-semibold hover:bg-[#6B2278] transition-colors"
            >
              View ticket
            </Link>
          ) : null}
          <Link
            href="/dashboard/support"
            onClick={() => onNavigate?.()}
            className={`${
              ticketId ? '' : 'flex-1'
            } inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-full border border-gray-200 text-[11px] font-semibold text-gray-600 hover:border-[#7B2D8E]/30 hover:bg-[#7B2D8E]/5 hover:text-[#7B2D8E] transition-colors`}
          >
            All tickets
          </Link>
        </div>
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
          <Link
            href="/services"
            onClick={() => onNavigate?.()}
            className="text-xs text-[#7B2D8E] font-medium hover:underline mt-1 inline-block"
          >
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
            onClick={() => onNavigate?.()}
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

  // User profile — polished summary card with an inline "Update" CTA
  // that hands off to settings. Gracefully renders even when some
  // optional fields are missing.
  if (toolName === 'getUserProfile' && result.success) {
    const profile = (result.profile || result) as Record<string, unknown>
    const firstName = (profile.firstName as string) || (profile.first_name as string) || ''
    const lastName = (profile.lastName as string) || (profile.last_name as string) || ''
    const email = (profile.email as string) || ''
    const phone = (profile.phone as string) || ''
    const username = (profile.username as string) || ''
    const displayName = `${firstName} ${lastName}`.trim() || email || 'Your profile'
    const initials = (firstName || email || 'U').slice(0, 1).toUpperCase()
    return (
      <div className="bg-white rounded-2xl border border-gray-200 ring-1 ring-[#7B2D8E]/[0.04] overflow-hidden">
        <div className="p-4 flex items-start gap-3">
          <div className="relative w-11 h-11 rounded-xl bg-[#7B2D8E] text-white flex items-center justify-center flex-shrink-0 text-base font-bold">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#7B2D8E] mb-0.5">
              Your profile
            </p>
            <p className="text-[14px] font-semibold text-gray-900 truncate leading-tight">
              {displayName}
            </p>
            {username && (
              <p className="text-[11px] text-gray-500 truncate">@{username}</p>
            )}
          </div>
        </div>
        <div className="px-4 pb-3 grid grid-cols-1 gap-1.5 text-[11px] text-gray-600">
          {email && (
            <div className="flex items-center gap-2 min-w-0">
              <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <span className="truncate">{email}</span>
            </div>
          )}
          {phone && (
            <div className="flex items-center gap-2 min-w-0">
              <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <span className="truncate">{phone}</span>
            </div>
          )}
        </div>
        <div className="px-4 pb-3 flex gap-1.5">
          <Link
            href="/dashboard/settings"
            onClick={() => onNavigate?.()}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-[#7B2D8E] text-white text-[11px] font-semibold hover:bg-[#6B2278] transition-colors cursor-pointer relative z-10"
          >
            <User className="w-3 h-3" />
            Edit profile
          </Link>
          {onSendPrompt && (
            <button
              type="button"
              onClick={() => onSendPrompt('Update my phone number.')}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-gray-200 text-[11px] font-semibold text-gray-600 hover:border-[#7B2D8E]/30 hover:bg-[#7B2D8E]/5 hover:text-[#7B2D8E] transition-colors"
            >
              Update phone
            </button>
          )}
        </div>
      </div>
    )
  }

  // Notifications — compact timeline with a colored status dot so the
  // list scans at a glance.
  if (toolName === 'getNotifications' && result.success) {
    const notifications = (result.notifications as Array<{
      title: string
      message: string
      type: string
      created_at?: string
      read?: boolean
    }>) || []
    if (notifications.length === 0) {
      return (
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center">
              <Mail className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-semibold text-gray-800">Recent Activity</span>
          </div>
          <p className="text-sm text-gray-500 mt-2">You&apos;re all caught up.</p>
        </div>
      )
    }
    // Notification type → dot color. Success now uses brand purple
    // (keeps the card on-palette) while errors stay rose so failures
    // still jump off the page as an actionable signal. Pending fades
    // to neutral gray since "pending" shouldn't compete with errors.
    const dotColor = (t: string) => {
      switch (t) {
        case 'success':
        case 'payment_success':
          return 'bg-[#7B2D8E]'
        case 'warning':
        case 'pending':
          return 'bg-gray-400'
        case 'error':
        case 'payment_failed':
          return 'bg-rose-500'
        default:
          return 'bg-[#9B4DB0]'
      }
    }
    return (
      <div className="bg-white rounded-2xl border border-gray-200 ring-1 ring-[#7B2D8E]/[0.04] overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center">
              <Mail className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-semibold text-gray-900">Recent Activity</span>
          </div>
          <Link
            href="/dashboard"
            onClick={() => onNavigate?.()}
            className="text-[10px] font-semibold text-[#7B2D8E] hover:underline"
          >
            See all
          </Link>
        </div>
        <ul className="divide-y divide-gray-100">
          {notifications.slice(0, 4).map((n, i) => (
            <li key={i} className="flex items-start gap-2.5 px-3 py-2.5">
              <span className="relative mt-1.5 flex-shrink-0">
                <span className={`block w-2 h-2 rounded-full ${dotColor(n.type)}`} />
                {!n.read && (
                  <span
                    className={`absolute inset-0 rounded-full ${dotColor(n.type)} opacity-60 animate-ping`}
                    aria-hidden="true"
                  />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-gray-900 leading-tight truncate">
                  {n.title}
                </p>
                <p className="text-[11px] text-gray-500 leading-snug line-clamp-2 mt-0.5">
                  {n.message}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  // Support tickets — mirrors the row design on /dashboard/support so
  // the chat preview feels like a mini version of the dashboard list
  // (ticket id chip, status pill, subject, category + date footer).
  if (toolName === 'getSupportTickets' && result.success) {
    const tickets = result.tickets as Array<{
      id: string | number
      ticket_id?: string
      subject: string
      status: string
      priority: string
      category?: string
      created_at?: string
      message?: string
    }>
    // Mirrors STATUS_CONFIG on /dashboard/support/page.tsx.
    const statusPill = (s: string) => {
      switch (s) {
        case 'open':
          return { label: 'Open', cls: 'bg-[#7B2D8E]/10 text-[#7B2D8E]' }
        case 'in_progress':
          return { label: 'In Progress', cls: 'bg-amber-100 text-amber-700' }
        case 'resolved':
          return { label: 'Resolved', cls: 'bg-green-100 text-green-700' }
        case 'closed':
          return { label: 'Closed', cls: 'bg-gray-100 text-gray-600' }
        default:
          return { label: s, cls: 'bg-gray-100 text-gray-600' }
      }
    }
    const fmtDate = (iso?: string) => {
      if (!iso) return ''
      try {
        return new Date(iso).toLocaleDateString('en-NG', {
          month: 'short',
          day: 'numeric',
        })
      } catch {
        return ''
      }
    }
    if (!tickets || tickets.length === 0) {
      return (
        <div className="bg-white rounded-2xl border border-gray-200 ring-1 ring-[#7B2D8E]/[0.04] p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center">
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-semibold text-gray-900">Support Tickets</span>
          </div>
          <p className="text-sm text-gray-500 mb-3">No tickets yet.</p>
          <Link
            href="/dashboard/support"
            onClick={() => onNavigate?.()}
            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-full bg-[#7B2D8E] text-white text-[11px] font-semibold hover:bg-[#6B2278] transition-colors"
          >
            <Plus className="w-3 h-3" strokeWidth={2.5} />
            New ticket
          </Link>
        </div>
      )
    }
    return (
      <div className="bg-white rounded-2xl border border-gray-200 ring-1 ring-[#7B2D8E]/[0.04] overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center">
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-semibold text-gray-900">Support Tickets</span>
          </div>
          <Link
            href="/dashboard/support"
            onClick={() => onNavigate?.()}
            className="text-[10px] font-semibold text-[#7B2D8E] hover:underline"
          >
            See all
          </Link>
        </div>
        <ul className="divide-y divide-gray-100">
          {tickets.slice(0, 3).map((t, i) => {
            const pill = statusPill(t.status)
            const href = t.ticket_id
              ? `/dashboard/support/${t.ticket_id}`
              : '/dashboard/support'
            return (
              <li key={i}>
                <Link
                  href={href}
                  onClick={() => onNavigate?.()}
                  className="block px-3 py-2.5 hover:bg-[#7B2D8E]/5 transition-colors"
                >
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    {t.ticket_id && (
                      <span className="text-[10px] font-mono font-semibold text-[#7B2D8E] bg-[#7B2D8E]/10 px-1.5 py-0.5 rounded">
                        {t.ticket_id}
                      </span>
                    )}
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${pill.cls}`}>
                      {pill.label}
                    </span>
                  </div>
                  <p className="text-[12px] font-medium text-gray-900 truncate leading-snug">
                    {t.subject}
                  </p>
                  <div className="flex items-center gap-2.5 mt-1 text-[10px] text-gray-500">
                    {t.category && (
                      <span className="capitalize truncate">{t.category}</span>
                    )}
                    {t.created_at && (
                      <span className="tabular-nums">{fmtDate(t.created_at)}</span>
                    )}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  // fundWallet — Paystack checkout handoff. We intentionally render
  // the "Pay now" action as a real <a target="_blank"> button INSIDE
  // the card so opening the checkout is a genuine user gesture; the
  // previous auto window.open() fired from the stream handler was
  // silently blocked by every modern browser (Chrome / Safari /
  // Firefox all block popups that don't originate from a trusted
  // click), which is why users told us "top up doesn't work".
  if (toolName === 'fundWallet' && result.success) {
    const paymentLink =
      typeof result.paymentLink === 'string' ? result.paymentLink : ''
    const amountRaw = Number(result.amount ?? 0)
    const currency = (result.currency as string) || 'NGN'
    const symbol = currency === 'NGN' ? '\u20A6' : currency === 'USD' ? '$' : currency === 'GBP' ? '\u00A3' : ''
    const amount = amountRaw > 0
      ? `${symbol}${amountRaw.toLocaleString('en-NG')}`
      : null
    return (
      <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-200 ring-1 ring-[#7B2D8E]/[0.04] shadow-sm">
        {/* Top accent bar for a bit of premium polish */}
        <div className="h-1 bg-[#7B2D8E]" />
        <div className="p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#7B2D8E] leading-none">
                Secure checkout ready
              </p>
              <p className="text-[14px] font-semibold text-gray-900 leading-tight mt-1">
                {amount ? `Top up ${amount}` : 'Top up your wallet'}
              </p>
              <p className="text-[11px] text-gray-500 leading-snug mt-1">
                Paid via Paystack. Funds land in your Dermaspace wallet the moment payment is confirmed.
              </p>
            </div>
          </div>

          {/* Trust strip — helps the card feel safe to tap */}
          <div className="flex items-center gap-2 text-[10px] text-gray-500 mb-3">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-[#7B2D8E]" />
              256-bit SSL
            </span>
            <span className="text-gray-300">·</span>
            <span className="inline-flex items-center gap-1">
              <Check className="w-3 h-3 text-[#7B2D8E]" strokeWidth={2.5} />
              Cards, bank, USSD
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {paymentLink ? (
              <a
                href={paymentLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-[#7B2D8E] text-white text-[12px] font-semibold hover:bg-[#6B2278] transition-colors"
              >
                {amount ? `Pay ${amount} now` : 'Pay now'}
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              </a>
            ) : null}
            <Link
              href="/dashboard/wallet"
              onClick={() => onNavigate?.()}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-full border border-gray-200 text-[11px] font-semibold text-gray-600 hover:border-[#7B2D8E]/30 hover:bg-[#7B2D8E]/5 hover:text-[#7B2D8E] transition-colors"
            >
              Wallet
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // logoutUser — "are you sure?" consent card. The tool deliberately
  // does not end the session server-side; the confirm button below
  // handles POST /api/auth/logout + redirect so the user can still
  // back out if they called this tool by mistake.
  if (toolName === 'logoutUser' && result.success && result.needsConfirmation) {
    return <LogoutConfirmCard message={(result.message as string) || ''} />
  }

  // logoutUser — already signed out (edge case when the tool is called
  // and the cookie is already gone, e.g. session timed out in another tab).
  if (toolName === 'logoutUser' && result.success && result.alreadyLoggedOut) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 ring-1 ring-[#7B2D8E]/[0.04] p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
          <Check className="w-4 h-4" strokeWidth={2.5} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-gray-900 leading-tight">
            You&apos;re already signed out
          </p>
          <p className="text-[11px] text-gray-500 leading-snug mt-0.5">
            Your session has already ended. Sign in again whenever you&apos;re ready.
          </p>
        </div>
        <Link
          href="/signin"
          onClick={() => onNavigate?.()}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#7B2D8E] text-white text-[11px] font-semibold hover:bg-[#6B2278] transition-colors flex-shrink-0"
        >
          Sign in
        </Link>
      </div>
    )
  }

  // Generic result card
  if (result.success === false) {
    return null
  }

  return null
}

/* ---------------------------- LogoutConfirmCard ---------------------------
 *
 * Renders a "Just to be safe — are you sure?" consent card for the
 * logoutUser tool. Three possible states:
 *
 *   idle        — two buttons: "Yes, sign me out" and "Cancel"
 *   signing-out — the user tapped confirm; we POST /api/auth/logout
 *   done        — logout succeeded; we show a success state, wait a beat,
 *                 and redirect to "/"
 *
 * Done this way (instead of a browser confirm()) so the confirmation
 * lives inline in the chat — matching the rest of the assistant's UX
 * — and so the user sees a clear "Signed out" acknowledgement before
 * we redirect, rather than the page simply disappearing on them.
 * ------------------------------------------------------------------------ */
function LogoutConfirmCard({ message }: { message: string }) {
  const [state, setState] = useState<'idle' | 'signing-out' | 'done'>('idle')
  const [cancelled, setCancelled] = useState(false)

  const handleConfirm = async () => {
    if (state !== 'idle') return
    setState('signing-out')
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (err) {
      console.error('[v0] logout fetch failed:', err)
    }
    try {
      localStorage.removeItem('derma-account-consent')
    } catch {
      /* localStorage not available in some environments */
    }
    setState('done')
    // Short delay so the "Signed out" acknowledgement is actually
    // visible before the page navigates away.
    setTimeout(() => {
      window.location.href = '/'
    }, 1400)
  }

  if (cancelled) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 ring-1 ring-[#7B2D8E]/[0.04] p-3.5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center flex-shrink-0">
          <X className="w-4 h-4" strokeWidth={2.5} />
        </div>
        <p className="text-[11.5px] text-gray-600 leading-snug">
          No problem — you&apos;re still signed in.
        </p>
      </div>
    )
  }

  if (state === 'done') {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 ring-1 ring-[#7B2D8E]/[0.04] overflow-hidden">
        <div className="h-1 bg-[#7B2D8E]" />
        <div className="p-4 flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mb-2">
            <Check className="w-5 h-5 text-[#7B2D8E]" strokeWidth={2.5} />
          </div>
          <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#7B2D8E]">
            Signed out
          </p>
          <p className="text-[13px] font-semibold text-gray-900 mt-1">
            You&apos;ve been signed out.
          </p>
          <p className="text-[11px] text-gray-500 leading-snug mt-1 max-w-[240px]">
            Taking you to the homepage now. See you again soon.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 ring-1 ring-[#7B2D8E]/[0.04] overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
            <LogOut className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-gray-900 leading-tight">
              Sign out of Dermaspace?
            </p>
            <p className="text-[11px] text-gray-500 leading-snug mt-1">
              {message ||
                "You'll need to sign in again to access your wallet, bookings, and profile."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={state !== 'idle'}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-[#7B2D8E] text-white text-[12px] font-semibold hover:bg-[#6B2278] transition-colors disabled:opacity-70 disabled:cursor-wait"
          >
            {state === 'signing-out' ? (
              <>
                <span
                  aria-hidden="true"
                  className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin"
                />
                Signing out…
              </>
            ) : (
              <>
                Yes, sign me out
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setCancelled(true)}
            disabled={state !== 'idle'}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-full border border-gray-200 text-[11px] font-semibold text-gray-600 hover:border-[#7B2D8E]/30 hover:bg-[#7B2D8E]/5 hover:text-[#7B2D8E] transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
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

export default function DermaAI({
  mode = 'floating',
}: {
  // `floating` = the draggable launcher + modal panel that lives on every
  // signed-in page.
  // `page` = embedded inside a dedicated /derma-ai route where the chat
  // takes the full container (sidebar persistent on desktop, no launcher,
  // no backdrop, no fixed positioning).
  mode?: 'floating' | 'page'
} = {}) {
  const isPageMode = mode === 'page'
  // In page mode the chat is always "open" and the sidebar is persistent
  // on desktop — we still allow toggling on mobile so the chat body has
  // breathing room on small screens.
  const [isOpen, setIsOpen] = useState(isPageMode)
  const [showSidebar, setShowSidebar] = useState(isPageMode)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string>('')
  // Inline-rename state — used by the sidebar to let the user give a
  // conversation a custom title (ChatGPT-style double-click-to-rename).
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null)
  const [renameInput, setRenameInput] = useState('')
  // Per-row menu popover (the "⋯" kebab on each sidebar chat). Only one
  // menu can be open at a time; clicking another row's kebab swaps it.
  const [openMenuSessionId, setOpenMenuSessionId] = useState<string | null>(null)
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
  // Tracks whether the viewer is signed in. `null` = not yet known (the
  // /api/auth/me check is still in flight). We only branch on the
  // explicit `false` case so first-paint never flashes a sign-in card
  // to a logged-in user whose auth check hasn't resolved yet.
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
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
  // AbortController for the in-flight /api/chat request. Letting the user
  // cancel a long-running generation is THE signature feature of premium
  // AI chats (ChatGPT, Claude, Gemini all have it) — keep the stream's
  // controller on a ref so the send-turned-stop button in the composer
  // can tear it down without stale-closure issues.
  const abortControllerRef = useRef<AbortController | null>(null)
  // Tracks which assistant message just had its text copied so we can flip
  // the copy icon to a check for ~1.5s (reset via a timer).
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  // Which assistant message currently has its overflow actions menu
  // open. `null` means none. We collapse Copy / Regenerate / etc.
  // behind a single "more" trigger (same pattern ChatGPT uses on
  // mobile) so the bubble tail stays clean.
  const [openActionsMenuId, setOpenActionsMenuId] = useState<string | null>(null)
  const actionsMenuRef = useRef<HTMLDivElement | null>(null)

  // --- Draggable floating button ----------------------------------------
  // The launcher can be dragged anywhere on the viewport and will snap to
  // the nearest horizontal edge on release (iOS AssistiveTouch style).
  // Position persists across reloads via localStorage so the user's
  // preferred placement follows them. We track drag state on a ref to
  // avoid re-renders during the move, and only flip the `dragging` flag
  // to suppress the button's click handler when the pointer has moved
  // more than a small threshold (so a tap still opens the chat).
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const dragStateRef = useRef<{
    startX: number
    startY: number
    originX: number
    originY: number
    moved: boolean
    pointerId: number
  } | null>(null)
  const [launcherPos, setLauncherPos] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // --- Long-term memory -------------------------------------------------
  // A short list of human-readable facts the assistant has learned about
  // the user across conversations (e.g. "prefers oily-skin products",
  // "allergic to parabens", "saves for the Ikoyi branch"). These are:
  //   - Forwarded with every chat request (injected into the system
  //     prompt), so the model answers with real continuity.
  //   - Written to by the `saveMemory` tool the model can call when it
  //     learns something worth remembering.
  //   - Viewable / deletable by the user in /dashboard/settings (memory
  //     tab) so nothing is stored behind their back.
  // Kept client-side (localStorage) so it survives across sessions on the
  // same device without requiring a server round-trip.
  const [memories, setMemories] = useState<string[]>([])
  const [recentlyRemembered, setRecentlyRemembered] = useState<string | null>(null)

  // Hydrate once on mount. Schema: { memories: string[] }.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem('derma-ai-memories')
      if (raw) {
        const parsed = JSON.parse(raw) as { memories?: unknown }
        if (Array.isArray(parsed.memories)) {
          setMemories(parsed.memories.filter((m): m is string => typeof m === 'string'))
        }
      }
    } catch {
      /* ignore corrupt */
    }
  }, [])

  // Persist memory list whenever it changes. Cap at 30 so we never send
  // an unbounded prompt to the model.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(
        'derma-ai-memories',
        JSON.stringify({ memories: memories.slice(0, 30) }),
      )
    } catch {
      /* quota */
    }
  }, [memories])

  // Push a new fact. Dedup by lowercase string so we don't fill the
  // list with near-duplicates.
  const addMemory = useCallback((fact: string) => {
    const trimmed = fact.trim()
    if (!trimmed) return
    setMemories((prev) => {
      const lower = trimmed.toLowerCase()
      if (prev.some((m) => m.toLowerCase() === lower)) return prev
      return [trimmed, ...prev].slice(0, 30)
    })
    // Flash a tiny "Remembered…" toast for 2.5s.
    setRecentlyRemembered(trimmed)
    setTimeout(() => {
      setRecentlyRemembered((current) => (current === trimmed ? null : current))
    }, 2500)
  }, [])

  const removeMemory = useCallback((fact: string) => {
    setMemories((prev) => prev.filter((m) => m !== fact))
  }, [])

  const clearAllMemories = useCallback(() => {
    setMemories([])
  }, [])
  // Expose memory helpers globally so the settings page can read/write
  // the same list without needing a React context. Namespaced under
  // __dermaAI so it doesn't collide with anything else.
  useEffect(() => {
    if (typeof window === 'undefined') return
    ;(window as unknown as { __dermaAI?: Record<string, unknown> }).__dermaAI = {
      getMemories: () => memories,
      addMemory,
      removeMemory,
      clearAllMemories,
    }
  }, [memories, addMemory, removeMemory, clearAllMemories])

  // Restore persisted launcher position once on mount. We store window-
  // viewport pixel coordinates; if the viewport has since shrunk we
  // clamp them so the button never ends up off-screen.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = localStorage.getItem('derma-launcher-pos')
      if (saved) {
        const { x, y } = JSON.parse(saved) as { x: number; y: number }
        if (Number.isFinite(x) && Number.isFinite(y)) {
          const maxX = Math.max(0, window.innerWidth - 64)
          const maxY = Math.max(0, window.innerHeight - 64)
          setLauncherPos({
            x: Math.min(Math.max(0, x), maxX),
            y: Math.min(Math.max(0, y), maxY),
          })
        }
      }
    } catch {
      /* ignore corrupt */
    }
  }, [])

  // Clear all chat sessions — belt-and-braces: wipe state + localStorage
  // so a refresh lands in the pristine welcome state. Also resets the
  // active conversation so the sidebar + main pane stay in sync.
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false)
  const clearAllSessions = useCallback(() => {
    setSessions([])
    setCurrentSessionId('')
    try {
      localStorage.removeItem('derma-chat-sessions')
      localStorage.removeItem('derma-chat-active')
    } catch {
      /* quota */
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
      ],
    }])
    setShowClearAllConfirm(false)
    setShowSidebar(false)
  }, [userInfo.name])

  // Export the CURRENT conversation as a tidy plain-text transcript.
  // Tool results are flattened to a short summary line so the file is
  // readable outside the app. Falls back to a no-op if there's nothing
  // yet to export.
  const exportCurrentChat = useCallback(() => {
    if (messages.length === 0) return
    const lines: string[] = []
    lines.push('Derma AI — Conversation export')
    lines.push(`Exported: ${new Date().toLocaleString()}`)
    if (userInfo.name) lines.push(`User: ${userInfo.name}`)
    lines.push('')
    for (const m of messages) {
      if (m.banner) continue
      const who = m.role === 'user' ? 'You' : 'Derma'
      const time =
        m.timestamp instanceof Date
          ? m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : ''
      lines.push(`[${time}] ${who}: ${m.content}`)
      if (m.toolResults && m.toolResults.length > 0) {
        for (const tr of m.toolResults) {
          lines.push(`    • ${tr.toolName}: ${JSON.stringify(tr.result).slice(0, 300)}`)
        }
      }
      lines.push('')
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const ts = new Date().toISOString().slice(0, 10)
    a.download = `derma-ai-${ts}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, [messages, userInfo.name])

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
            setIsLoggedIn(true)
          } else {
            setIsLoggedIn(false)
          }
        } else {
          // 401 / 403 / anything non-OK means no session.
          setIsLoggedIn(false)
        }
      } catch {
        // Network error — treat as anonymous so the assistant still
        // nudges the user to sign in instead of silently asking for
        // permission to an account it can't read.
        setIsLoggedIn(false)
      }
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

  // Set welcome message ONLY on first mount (after hydration, if no active chat).
  // Greeting + action cards branch on three states:
  //   • anonymous viewer            → suggest Sign in (real /signin link)
  //   • logged in, not yet linked   → suggest Link account in settings
  //   • logged in and linked        → jump straight to useful actions
  useEffect(() => {
    if (!hasHydrated) return
    if (messages.length > 0) return
    // Wait for the auth check to resolve so we don't flash a generic
    // "sign in" card to a user whose /api/auth/me hasn't come back yet.
    if (isLoggedIn === null) return

    const linked =
      typeof window !== 'undefined' &&
      localStorage.getItem('derma-account-consent') === 'granted'

    const greeting = isLoggedIn
      ? userInfo.name
        ? linked
          ? `Hello ${userInfo.name}! I\u2019m Derma, your personal spa assistant. Your account is linked — I can check your wallet, manage bookings, and help with your profile. How can I help you today?`
          : `Hello ${userInfo.name}! I\u2019m Derma, your personal spa assistant. Link your account in one tap and I can check your wallet, manage bookings, and more — otherwise I\u2019m happy to answer general questions.`
        : "Hello! I\u2019m Derma, your personal spa assistant at Dermaspace. I can help you book appointments, check services and prices, find our locations, and answer any questions. How can I help you today?"
      : "Hello! I\u2019m Derma, your Dermaspace spa assistant. Ask me about services, prices, or locations — or [sign in](/signin) and I can check your wallet, manage bookings, and keep things personal."

    const actions: ActionCard[] = !isLoggedIn
      ? [
          { title: 'Browse Services', description: 'View all', link: '/services', icon: 'sparkles' },
          { title: 'Find a Location', description: 'Visit us', link: '/contact', icon: 'map' },
        ]
      : linked
      ? [
          { title: 'Book Appointment', description: 'Schedule visit', link: '/booking', icon: 'calendar' },
          { title: 'Browse Services', description: 'View all', link: '/services', icon: 'sparkles' },
        ]
      : [
          {
            title: 'Link account',
            description: 'Personalise replies',
            link: '/dashboard/settings?section=assistant',
            icon: 'user',
          },
          { title: 'Browse Services', description: 'View all', link: '/services', icon: 'sparkles' },
        ]

    setMessages([{
      id: '1',
      role: 'assistant',
      content: greeting,
      timestamp: new Date(),
      actions,
    }])
  }, [hasHydrated, userInfo.name, messages.length, isLoggedIn])

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
    setOpenMenuSessionId((prev) => (prev === id ? null : prev))
    if (currentSessionId === id) {
      // Also wipe the persisted active slot immediately
      try { localStorage.removeItem('derma-chat-active') } catch {}
      startNewChat()
    }
  }

  // Start an inline rename for a given session. We pre-fill the input
  // with the current title so the user can just edit the tail rather
  // than retype the whole label.
  const beginRenameSession = (id: string, currentTitle: string) => {
    setRenamingSessionId(id)
    setRenameInput(currentTitle)
    setOpenMenuSessionId(null)
  }

  // Commit a rename — trim + clamp to a sensible length, fall back to
  // a safe default if the user wiped the field.
  const commitRenameSession = (id: string) => {
    const next = renameInput.trim().slice(0, 80) || 'Untitled chat'
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title: next } : s)))
    setRenamingSessionId(null)
    setRenameInput('')
  }

  const cancelRenameSession = () => {
    setRenamingSessionId(null)
    setRenameInput('')
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

  // Pick up state-change notices from /dashboard/settings so when the
  // user connects or disconnects their account there, the chat slides
  // in a first-class confirmation banner — exactly like Slack, GitHub
  // or Notion do when an integration flips state. We consume on mount
  // (and re-consume on hydration-after-nav) and also listen to the
  // cross-tab `storage` event in case settings is open in another tab.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!hasHydrated) return

    const consumeNotice = () => {
      const notice = localStorage.getItem('derma-ai-pending-notice')
      if (!notice) return
      localStorage.removeItem('derma-ai-pending-notice')

      if (notice === 'connected') {
        setAccountAccessConsent(true)
        setMessages((prev) => [
          ...prev,
          {
            id: `notice-conn-${Date.now()}`,
            role: 'assistant',
            content:
              "Your account has been connected. I can now view your wallet, bookings, profile, transactions, and notifications, and help with secure actions like password resets. Permission granted.",
            timestamp: new Date(),
            banner: 'access-granted',
          },
        ])
      } else if (notice === 'disconnected') {
        setAccountAccessConsent(false)
        setMessages((prev) => [
          ...prev,
          {
            id: `notice-disc-${Date.now()}`,
            role: 'assistant',
            content:
              "You've disconnected your account from Derma AI. I can still help with general questions about services, pricing and locations, but I can't see your wallet, bookings, or profile until you reconnect. Would you like me to reconnect your account?",
            timestamp: new Date(),
            banner: 'account-disconnected',
          },
        ])
      }
    }

    consumeNotice()

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'derma-ai-pending-notice' && e.newValue) {
        consumeNotice()
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [hasHydrated])

  // One-tap reconnect from the "account-disconnected" banner. Mirrors
  // handleConsentGrant's storage writes so the chat, settings page and
  // the rest of the app all agree on the new state, then drops an
  // "access-granted" confirmation bubble into the conversation so the
  // user gets immediate visual acknowledgement (same pattern as in-chat
  // consent grants).
  const handleReconnectFromBanner = () => {
    setAccountAccessConsent(true)
    try {
      localStorage.setItem('derma-account-consent', 'granted')
    } catch {
      /* ignore storage errors */
    }
    setMessages((prev) => [
      ...prev,
      {
        id: `notice-conn-${Date.now()}`,
        role: 'assistant',
        content:
          "Welcome back — your account is reconnected. I can view your wallet, bookings, profile, and notifications again. How can I help?",
        timestamp: new Date(),
        banner: 'access-granted',
      },
    ])
  }

  const sendMessageWithConsent = useCallback(async (
    content: string,
    consentOverride?: boolean,
    attachmentsOverride?: Attachment[],
    // Regeneration path: caller has already trimmed the trailing
    // assistant turn(s) and wants us to replay off of *this* exact
    // history instead of appending a new user turn on top of the
    // stale React `messages` closure. Without this, regenerate ends
    // up duplicating the user message AND shipping the stale reply
    // back to the server as context.
    historyOverride?: Message[],
  ) => {
    // Allow sending with no text as long as at least one image is attached —
    // that's how users say "analyse this photo and suggest products" hands-free.
    const attachments = attachmentsOverride ?? pendingAttachments
    if (!content.trim() && attachments.length === 0 && !historyOverride) return

    // Read consent freshly from storage as a fallback so we never send stale false
    // after the user just clicked "Grant Access" (React state update hasn't applied yet).
    let effectiveConsent = consentOverride ?? accountAccessConsent
    if (!effectiveConsent && typeof window !== 'undefined') {
      effectiveConsent = localStorage.getItem('derma-account-consent') === 'granted'
    }

    // Either (a) replay an already-trimmed history as-is, or (b)
    // append a brand-new user turn to whatever's currently on screen.
    let currentMessages: Message[]
    if (historyOverride) {
      currentMessages = historyOverride
    } else {
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
        attachments: attachments.length > 0 ? attachments : undefined,
      }
      currentMessages = [...messages, userMessage]
    }
    setMessages(currentMessages)
    setInput('')
    setPendingAttachments([])
    setUploadError(null)
    setIsLoading(true)
    setStreamingContent('')
    setActiveTool(null)
    playChime('send')

    // Spin up a fresh AbortController for this turn. The composer's
    // stop button reads this ref and calls `.abort()` to tear the
    // stream down immediately — same mechanism ChatGPT uses.
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      // Read the granular AI permission grants set in
      // /dashboard/settings so the server prompt can advertise which
      // categories the assistant is allowed to touch. If nothing is
      // stored we default to "all on" — that's the original behaviour
      // for users who granted consent before the granular toggles
      // existed.
      let aiPermissions: Record<string, boolean> | undefined
      try {
        const raw =
          typeof window !== 'undefined'
            ? localStorage.getItem('derma-ai-permissions')
            : null
        if (raw) aiPermissions = JSON.parse(raw)
      } catch {
        /* ignore corrupt */
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
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
          accountAccessConsent: effectiveConsent,
          aiPermissions,
          // Send the user's long-term memory so the model can pick up
          // conversations from yesterday / last week with full continuity.
          memories,
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
            // Clear the active tool so the loader label falls back to the
            // generic "Thinking" state instead of getting stuck on e.g.
            // "Checking your wallet" while the model composes its reply
            // or decides the next step. Previously users saw the old tool
            // label hanging on through the rest of the turn.
            setActiveTool(null)
            continue
          }

          // Text streaming is in progress — we're no longer inside a tool
          // call, so clear any lingering tool label. The generic "Thinking"
          // loader is hidden once text starts rendering anyway, but this
          // keeps accessibility announcements accurate.
          if (type === 'text-start') {
            setActiveTool(null)
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
        // NOTE: fundWallet intentionally does NOT auto-open a window
        // here. Modern browsers block popups that aren't triggered by
        // a genuine user gesture, so the "auto open Paystack" call
        // that used to live here was silently failing. Instead we
        // render a premium "Pay now" button inside the tool card
        // (see ToolResultCard for fundWallet) so the user taps it
        // themselves — that IS a user gesture and always opens.
        // NOTE: logoutUser no longer auto-redirects. The tool now
        // returns `needsConfirmation: true` which renders a consent
        // card with a "Yes, sign me out" button — the button itself
        // is what POSTs /api/auth/logout and redirects. This lets the
        // user back out of an accidental "log me out" message without
        // losing their session.
        // saveMemory — the server echoes the fact; we persist client-side
        // so it survives a page refresh and is available to the next
        // request. The little "Remembered" pill is driven by addMemory.
        if (tr.toolName === 'saveMemory' && r?.success && typeof r.fact === 'string') {
          addMemory(r.fact)
        }
        // forgetMemory — model was asked to forget something. Match
        // case-insensitively so it doesn't get tripped up by casing.
        if (tr.toolName === 'forgetMemory' && r?.success && typeof r.fact === 'string') {
          const needle = (r.fact as string).toLowerCase()
          setMemories((prev) => prev.filter((m) => !m.toLowerCase().includes(needle)))
        }
      }
    } catch (err) {
      // User hit the stop button — not an error. Commit whatever we
      // streamed so far as a normal assistant message (with a subtle
      // "stopped" marker) so the conversation doesn't lose context.
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('[v0] Generation stopped by user')
        setStreamingContent((current) => {
          if (current.trim()) {
            setMessages(prev => [...prev, {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: current + '\n\n_Stopped._',
              timestamp: new Date(),
            }])
          }
          return ''
        })
      } else {
        console.error('[v0] Chat error:', err)
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "I'm having trouble connecting. Please try again or call +234 901 797 2919.",
          timestamp: new Date()
        }])
        setStreamingContent('')
      }
    } finally {
      setIsLoading(false)
      setActiveTool(null)
      abortControllerRef.current = null
    }
  }, [messages, userInfo, voiceEnabled, speakText, accountAccessConsent, playChime, pendingAttachments, memories, addMemory])

  // Stop the in-flight generation. Exposed as a callback so the
  // composer's stop button can call it without prop drilling.
  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  // Copy an assistant reply to the clipboard and flash a checkmark on
  // the action button for 1.5s — the standard affordance users expect
  // from ChatGPT / Claude / Gemini.
  const copyMessage = useCallback(async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedMessageId(messageId)
      setOpenActionsMenuId(null)
      setTimeout(() => {
        setCopiedMessageId((prev) => (prev === messageId ? null : prev))
      }, 1500)
    } catch (err) {
      console.error('[v0] Copy failed:', err)
    }
  }, [])

  // Close the per-message overflow menu on an outside click or Escape
  // press — same dismiss pattern as the session rename/delete menu.
  useEffect(() => {
    if (!openActionsMenuId) return
    const onDown = (e: MouseEvent) => {
      if (
        actionsMenuRef.current &&
        !actionsMenuRef.current.contains(e.target as Node)
      ) {
        setOpenActionsMenuId(null)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenActionsMenuId(null)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [openActionsMenuId])

  // Regenerate the most recent assistant reply by replaying the last
  // user message. We trim off every message AFTER the last user turn
  // (so any trailing assistant reply is gone) and hand that exact
  // history to sendMessageWithConsent via `historyOverride` — without
  // that override the function would read the stale `messages`
  // closure, re-append the user turn, and ship the old reply back to
  // the model as context.
  const regenerateLastResponse = useCallback(() => {
    if (isLoading) return
    setOpenActionsMenuId(null)
    const lastUserIdx = [...messages].reverse().findIndex((m) => m.role === 'user')
    if (lastUserIdx === -1) return
    const cutAt = messages.length - 1 - lastUserIdx
    const lastUser = messages[cutAt]
    // Keep the user message in place, drop everything after it.
    const trimmed = messages.slice(0, cutAt + 1)
    sendMessageWithConsent(lastUser.content, undefined, lastUser.attachments, trimmed)
  }, [isLoading, messages, sendMessageWithConsent])

  // Main sendMessage function that checks for consent
  const sendMessage = useCallback((content: string) => {
    const hasAttachments = pendingAttachments.length > 0
    if ((!content.trim() && !hasAttachments) || isLoading) return

    // Check if this message requires account access.
    if (requiresAccountAccess(content)) {
      // Only show the consent modal when we have *confirmed* the viewer
      // is signed in. While the auth check is still in flight
      // (`isLoggedIn === null`) we treat the viewer as anonymous so a
      // logged-out user can never see an "Allow Derma AI to access your
      // account" popup for an account that doesn't exist.
      if (isLoggedIn !== true) {
        const userMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: content.trim(),
          timestamp: new Date(),
        }
        // Plain-English reply with a real inline hyperlink — no button
        // cards, no query-string path showing, no colour fill. Matches
        // how ChatGPT / Intercom say "you need to log in to do that".
        const signInMessage: Message = {
          id: `signin-${Date.now()}`,
          role: 'assistant',
          content:
            'To check your wallet, bookings or profile I need to know who you are. Please [sign in](/signin) first, or [create an account](/signup) if you\u2019re new to Dermaspace.',
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, userMessage, signInMessage])
        setInput('')
        playChime('send')
        return
      }

      // Logged in but hasn't granted in-chat consent yet — show the
      // consent prompt as before.
      if (!accountAccessConsent) {
        setPendingMessage(content)
        setShowConsentPrompt(true)
        return
      }
    }

    // Proceed with sending the message
    sendMessageWithConsent(content)
  }, [isLoading, accountAccessConsent, sendMessageWithConsent, pendingAttachments, isLoggedIn, playChime])

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
      {/* Floating Launcher — draggable. Tap to open, long-press and drag
          to reposition. On release we snap to the nearest horizontal edge
          (iOS AssistiveTouch pattern) and persist the position to
          localStorage so it sticks across reloads / navigations. Kept
          flat (no blur halo) — the user wants a crisp, shadow-free chip.
          In page mode (the dedicated /derma-ai route) the chat fills the
          page itself so the floating launcher is unnecessary — we gate
          on `isPageMode` to skip it entirely. */}
      {!isPageMode && (
      <button
        ref={buttonRef}
        onClick={() => {
          // Suppress the click if the pointer moved more than the drag
          // threshold — otherwise lifting your finger after dragging
          // would also open the chat.
          if (isDragging) return
          setIsOpen(true)
        }}
        onPointerDown={(e) => {
          if (!buttonRef.current) return
          const rect = buttonRef.current.getBoundingClientRect()
          dragStateRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            originX: rect.left,
            originY: rect.top,
            moved: false,
            pointerId: e.pointerId,
          }
          try { buttonRef.current.setPointerCapture(e.pointerId) } catch { /* ignore */ }
        }}
        onPointerMove={(e) => {
          const s = dragStateRef.current
          if (!s || s.pointerId !== e.pointerId) return
          const dx = e.clientX - s.startX
          const dy = e.clientY - s.startY
          // Only treat as a drag after 6px of movement — lets gentle
          // fingers still register as a tap.
          if (!s.moved && Math.hypot(dx, dy) < 6) return
          s.moved = true
          if (!isDragging) setIsDragging(true)
          const size = 56
          const maxX = Math.max(0, window.innerWidth - size)
          const maxY = Math.max(0, window.innerHeight - size)
          const x = Math.min(Math.max(0, s.originX + dx), maxX)
          const y = Math.min(Math.max(0, s.originY + dy), maxY)
          setLauncherPos({ x, y })
        }}
        onPointerUp={(e) => {
          const s = dragStateRef.current
          dragStateRef.current = null
          if (!s || !s.moved) {
            // Simple tap — let the onClick fire naturally.
            setIsDragging(false)
            return
          }
          // Snap to the nearest horizontal edge for a tidy resting
          // position, then persist and reset the drag flag in the next
          // tick so the synthetic click after pointerup is swallowed.
          const size = 56
          const rect = buttonRef.current?.getBoundingClientRect()
          if (rect) {
            const centerX = rect.left + size / 2
            const snappedX =
              centerX < window.innerWidth / 2 ? 8 : window.innerWidth - size - 8
            const maxY = Math.max(0, window.innerHeight - size)
            const y = Math.min(Math.max(8, rect.top), maxY - 8)
            setLauncherPos({ x: snappedX, y })
            try {
              localStorage.setItem(
                'derma-launcher-pos',
                JSON.stringify({ x: snappedX, y }),
              )
            } catch {
              /* quota */
            }
          }
          try { buttonRef.current?.releasePointerCapture(e.pointerId) } catch { /* ignore */ }
          // Wait a tick before clearing so the onClick guard has a chance
          // to see isDragging === true.
          setTimeout(() => setIsDragging(false), 0)
        }}
        onPointerCancel={() => {
          dragStateRef.current = null
          setIsDragging(false)
        }}
        style={
          launcherPos
            ? { position: 'fixed', top: launcherPos.y, left: launcherPos.x, right: 'auto', bottom: 'auto' }
            : undefined
        }
        className={`${launcherPos ? '' : 'fixed bottom-28 md:bottom-6 right-4'} z-[55] touch-none select-none group transition-[opacity,transform] duration-300 ${
          isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'
        } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        aria-label="Open Derma AI — drag to reposition"
      >
        {/* The launcher is a compact brand chip. Previous iterations
            layered a pulsing brand-ring halo + a soft drop shadow on
            the button itself, which made the launcher read visually
            much bigger than its 48/52px footprint (the reason users
            flagged it as "big" on the profile page). We now render
            a clean purple circle with the brand butterfly — no halo,
            no shadow, just the dot. A tiny memory badge in the
            top-right appears only when the user has memories on
            file, and a hover-only "Ask Derma" label slides in from
            the launcher on desktop so first-time visitors know what
            the icon does. A subtle status dot (green when Available)
            mirrors the Namecheap-style live-chat launcher so people
            immediately parse this as a real-time assistant. */}
        <div
          className={`relative w-12 h-12 md:w-[52px] md:h-[52px] rounded-full bg-[#7B2D8E] flex items-center justify-center transition-transform ring-1 ring-black/5 ${
            isDragging ? 'scale-110' : 'group-hover:scale-[1.04] group-active:scale-95'
          }`}
        >
          <ButterflyLogo className="w-5 h-5 md:w-6 md:h-6 text-white" />
          {memories.length > 0 && (
            // Memory badge — appears only when the user has
            // remembered items, keeping the launcher visually quiet
            // the rest of the time.
            <span
              aria-hidden="true"
              className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-white text-[#7B2D8E] ring-2 ring-[#7B2D8E] text-[9px] font-bold flex items-center justify-center tabular-nums"
              title={`${memories.length} things remembered`}
            >
              {memories.length > 9 ? '9+' : memories.length}
            </span>
          )}
        </div>

        {/* Hover label — renders to the LEFT of the launcher so it
            doesn't clip off the right edge of the viewport. Hidden on
            touch to avoid a stuck tooltip after a tap. */}
        <span
          className="pointer-events-none hidden md:inline-flex absolute right-full top-1/2 -translate-y-1/2 mr-2 items-center px-2.5 py-1 rounded-full bg-gray-900 text-white text-[11px] font-medium whitespace-nowrap opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"
          aria-hidden="true"
        >
          Ask Derma
        </span>
      </button>
      )}

      {/* Backdrop — only shown in floating mode, and only when the modal
          is open. In page mode there's nothing to dim behind. */}
      {!isPageMode && isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[58] md:bg-transparent md:backdrop-blur-none"
          onClick={() => { setIsOpen(false); setShowSidebar(false); endVoiceCall(); }}
        />
      )}

      {/* Chat panel. Two layouts share the SAME internal structure
          (sidebar + conversation) but differ in positioning:
          - `floating` (default): covers the mobile viewport, becomes a
            400×640 floating card on desktop, fades out when `isOpen`
            flips to false.
          - `page`: fills its container (the /derma-ai route) — sized to
            the page width, no fixed positioning, no open/close animation.
          The 1px gray border + flat white fill match the flat-card
          language used elsewhere in the dashboard. */}
      <div
        className={
          isPageMode
            ? 'relative w-full h-full'
            : `fixed z-[60] transition-all duration-300 ease-out
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
          inset-0 md:inset-auto md:bottom-6 md:right-4 md:w-[400px] md:h-[640px]
          ${isOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-4'}`
        }
      >
        {/* Flat card — no drop-shadow per brand direction. A 1px
            gray border keeps the panel separated from the content
            underneath on desktop without adding any visual weight. */}
        <div className={`w-full h-full bg-white flex overflow-hidden ${
          isPageMode
            ? 'rounded-2xl border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
            : 'md:rounded-2xl md:border md:border-gray-200'
        }`}>
          
          {/* Sidebar — slide-in panel. We pair it with a tap-anywhere
              backdrop (rendered just below) so users can dismiss the
              drawer by clicking outside it, not only by toggling the
              hamburger. That's the UX escape hatch you'd expect from any
              real side drawer. */}
          {showSidebar && !isPageMode && (
            <button
              type="button"
              onClick={() => setShowSidebar(false)}
              className="absolute inset-0 z-[9] bg-black/10 md:hidden"
              aria-label="Close chat history"
            />
          )}
          {/* Sidebar — slide-in on mobile, persistent on md+ when in
              page mode (so the chat-history rail is always visible on
              the dedicated /derma-ai route, like ChatGPT / Claude).
              In floating mode the sidebar keeps its original behaviour
              of toggling on both breakpoints. */}
          <div className={`absolute md:relative inset-y-0 left-0 ${
            isPageMode ? 'w-72' : 'w-64'
          } bg-gray-50 border-r border-gray-100 flex flex-col transition-transform duration-300 z-10 ${
            showSidebar ? 'translate-x-0' : '-translate-x-full'
          } ${isPageMode ? 'md:translate-x-0' : ''}`}>
            {/* Sidebar header — New chat pill + (floating mode only) an
                explicit close affordance. In page mode on desktop the
                sidebar is always visible, so we skip the close X; on
                mobile users dismiss it via the hamburger in the header. */}
            <div className="p-3 border-b border-gray-100 flex items-center gap-2">
              <button
                onClick={startNewChat}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#7B2D8E] text-white text-sm font-semibold rounded-full hover:bg-[#6B2278] active:scale-[0.98] transition-all"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
                New chat
              </button>
              <button
                type="button"
                onClick={() => setShowSidebar(false)}
                className={`w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:text-[#7B2D8E] hover:bg-[#7B2D8E]/10 transition-colors flex-shrink-0 ${
                  isPageMode ? 'md:hidden' : ''
                }`}
                aria-label="Close chat history"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-2 py-2">
              {sessions.length === 0 ? (
                <div className="px-3 py-10 text-center">
                  <div className="w-11 h-11 rounded-2xl bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-3 ring-1 ring-[#7B2D8E]/15">
                    <MessageSquare className="w-5 h-5 text-[#7B2D8E]" />
                  </div>
                  <p className="text-xs font-semibold text-gray-700">No chats yet</p>
                  <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                    Your conversations with Derma AI will appear here.
                  </p>
                </div>
              ) : (
                (() => {
                  // Group sessions by "Today / Yesterday / Older" so the
                  // list reads like a real messaging surface (WhatsApp,
                  // Messages, Claude) instead of an undifferentiated flat
                  // stack. Kept inline so we don't leak another top-level
                  // helper for a single-use grouping.
                  const now = new Date()
                  const startOfDay = (d: Date) =>
                    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
                  const today = startOfDay(now)
                  const yesterday = today - 86400000
                  const buckets: { label: string; items: typeof sessions }[] = [
                    { label: 'Today', items: [] },
                    { label: 'Yesterday', items: [] },
                    { label: 'Earlier', items: [] },
                  ]
                  for (const s of sessions.slice(0, 40)) {
                    const created = new Date(s.createdAt)
                    const day = startOfDay(created)
                    if (day === today) buckets[0].items.push(s)
                    else if (day === yesterday) buckets[1].items.push(s)
                    else buckets[2].items.push(s)
                  }

                  return (
                    <>
                      {buckets
                        .filter((b) => b.items.length > 0)
                        .map((bucket) => (
                          <div key={bucket.label} className="mb-3">
                            <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-gray-400 px-2 pt-1 pb-1.5">
                              {bucket.label}
                            </p>
                            <div className="space-y-0.5">
                              {bucket.items.map((session) => {
                                const isActive = currentSessionId === session.id
                                const isRenaming = renamingSessionId === session.id
                                const isMenuOpen = openMenuSessionId === session.id
                                const lastMsg =
                                  session.messages[session.messages.length - 1]
                                const preview =
                                  lastMsg?.content
                                    ?.replace(/[*_`#>]/g, '')
                                    .replace(/\n/g, ' ')
                                    .trim()
                                    .slice(0, 64) || 'Start chatting…'

                                return (
                                  <div
                                    key={session.id}
                                    className={`group relative flex items-center gap-2 pl-2.5 pr-1.5 py-2 rounded-xl transition-colors ${
                                      isActive
                                        ? 'bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.02)] ring-1 ring-[#7B2D8E]/15'
                                        : 'hover:bg-white'
                                    }`}
                                  >
                                    {/* Active indicator bar */}
                                    {isActive && (
                                      <span
                                        className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[#7B2D8E]"
                                        aria-hidden="true"
                                      />
                                    )}

                                    {/* Avatar tile */}
                                    <div
                                      className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                                        isActive
                                          ? 'bg-[#7B2D8E] text-white'
                                          : 'bg-gray-100 text-gray-400 group-hover:bg-[#7B2D8E]/10 group-hover:text-[#7B2D8E]'
                                      }`}
                                      aria-hidden="true"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5" />
                                    </div>

                                    {/* Title + preview (or rename input) */}
                                    <div className="flex-1 min-w-0">
                                      {isRenaming ? (
                                        <input
                                          autoFocus
                                          value={renameInput}
                                          onChange={(e) => setRenameInput(e.target.value)}
                                          onBlur={() => commitRenameSession(session.id)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              e.preventDefault()
                                              commitRenameSession(session.id)
                                            } else if (e.key === 'Escape') {
                                              e.preventDefault()
                                              cancelRenameSession()
                                            }
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                          maxLength={80}
                                          className="w-full px-2 py-1 text-xs font-semibold text-gray-900 bg-white border border-[#7B2D8E]/40 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/30"
                                          placeholder="Untitled chat"
                                        />
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => loadSession(session)}
                                          onDoubleClick={() =>
                                            beginRenameSession(session.id, session.title)
                                          }
                                          className="w-full text-left"
                                        >
                                          <div className="flex items-center justify-between gap-2">
                                            <p
                                              className={`text-[13px] font-semibold truncate leading-tight ${
                                                isActive ? 'text-gray-900' : 'text-gray-800'
                                              }`}
                                            >
                                              {session.title}
                                            </p>
                                            <span className="text-[10px] text-gray-400 flex-shrink-0 whitespace-nowrap tabular-nums">
                                              {formatChatTime(session.createdAt)}
                                            </span>
                                          </div>
                                          <p className="text-[11px] text-gray-500 leading-snug line-clamp-1 mt-0.5">
                                            {preview}
                                          </p>
                                        </button>
                                      )}
                                    </div>

                                    {/* Kebab menu — rename + delete. Stays
                                        visible on the active row, fades
                                        in on hover for inactive rows. */}
                                    {!isRenaming && (
                                      <div className="relative flex-shrink-0">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setOpenMenuSessionId((prev) =>
                                              prev === session.id ? null : session.id,
                                            )
                                          }}
                                          className={`w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-[#7B2D8E] hover:bg-[#7B2D8E]/10 transition-all ${
                                            isActive || isMenuOpen
                                              ? 'opacity-100'
                                              : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
                                          }`}
                                          aria-label="Chat options"
                                          aria-haspopup="true"
                                          aria-expanded={isMenuOpen}
                                        >
                                          <MoreHorizontal className="w-4 h-4" />
                                        </button>
                                        {isMenuOpen && (
                                          <>
                                            <button
                                              type="button"
                                              className="fixed inset-0 z-30"
                                              onClick={() => setOpenMenuSessionId(null)}
                                              aria-label="Close menu"
                                              tabIndex={-1}
                                            />
                                            <div
                                              role="menu"
                                              className="absolute right-0 top-8 z-40 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-1 overflow-hidden"
                                            >
                                              <button
                                                type="button"
                                                role="menuitem"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  beginRenameSession(session.id, session.title)
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-[#7B2D8E]/5 hover:text-[#7B2D8E] transition-colors"
                                              >
                                                <Pencil className="w-3.5 h-3.5" />
                                                Rename
                                              </button>
                                              <button
                                                type="button"
                                                role="menuitem"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  deleteSession(session.id)
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-[#7B2D8E]/5 hover:text-[#7B2D8E] transition-colors"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                Delete
                                              </button>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                    </>
                  )
                })()
              )}
            </div>

            {/* Sidebar footer — manage-all actions for the chat history.
                Export downloads the CURRENT conversation as a plain-text
                transcript (readable + lightweight), and Clear all wipes
                every saved session after a short confirm step. These are
                the two housekeeping affordances users expect from any
                polished AI chat surface. */}
            <div className="border-t border-gray-100 p-2 flex items-center gap-1">
              <button
                type="button"
                onClick={exportCurrentChat}
                disabled={!messages.some((m) => m.role === 'user')}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-[11px] font-semibold text-gray-600 hover:text-[#7B2D8E] hover:bg-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Export this conversation"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
              <button
                type="button"
                onClick={() => setShowClearAllConfirm(true)}
                disabled={sessions.length === 0}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-[11px] font-semibold text-gray-600 hover:text-[#7B2D8E] hover:bg-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Clear all chat history"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear all
              </button>
            </div>

            {/* Clear-all confirmation — inline (not a full-screen modal)
                so it feels contained within the sidebar drawer. */}
            {showClearAllConfirm && (
              <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-[2px] flex items-center justify-center p-3">
                <div className="w-full bg-white rounded-xl border border-gray-200 p-4">
                  <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center mb-3">
                    <Trash2 className="w-5 h-5 text-[#7B2D8E]" />
                  </div>
                  <p className="text-sm font-semibold text-gray-900">Clear all chats?</p>
                  <p className="text-xs text-gray-500 mt-1 leading-snug">
                    This will permanently delete every saved conversation on this device.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowClearAllConfirm(false)}
                      className="flex-1 py-2 text-xs font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={clearAllSessions}
                      className="flex-1 py-2 text-xs font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
                    >
                      Delete all
                    </button>
                  </div>
                </div>
              </div>
            )}
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
                {/* Header — live-chat style (Namecheap / Intercom /
                    Drift), reinterpreted in Dermaspace's brand.
                    A clean white bar with a circular purple avatar,
                    the assistant name, and a green "Available"
                    status makes it instantly read as a real-time
                    concierge instead of a generic chatbot. The
                    previous solid-purple bar used too much brand
                    color in the header AND every bubble, which made
                    the panel feel heavy. All icon buttons now use
                    neutral gray → brand-on-hover so the header
                    stays quiet until you interact with it. */}
                <div className="relative px-3.5 py-2.5 flex items-center justify-between flex-shrink-0 bg-white border-b border-gray-100">
                  <div className="relative flex items-center gap-2.5 min-w-0">
                    <button
                      onClick={() => setShowSidebar(!showSidebar)}
                      className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-[#7B2D8E] hover:bg-[#7B2D8E]/10 rounded-full transition-colors flex-shrink-0"
                      aria-label="Toggle chat history"
                    >
                      <Menu className="w-4 h-4" />
                    </button>
                    {/* Circular brand avatar — clean, brand-only. We
                        intentionally drop the old green availability
                        dot: it's a "live agent" affordance that misled
                        users into thinking a human was on the line. */}
                    <div className="relative flex-shrink-0">
                      <div className="w-9 h-9 rounded-full bg-[#7B2D8E] flex items-center justify-center">
                        <ButterflyLogo className="w-4.5 h-4.5 text-white" />
                      </div>
                    </div>
                    <div className="min-w-0 leading-tight">
                      <h3 className="font-semibold text-gray-900 text-[14px] tracking-tight">
                        Derma AI
                      </h3>
                      {/* Dynamic status line — quiet brand tone on
                          idle, switches to active state when the
                          assistant is working. */}
                      <p className="text-[11px] leading-none mt-0.5">
                        {isLoading ? (
                          <span className="text-gray-500">Thinking…</span>
                        ) : isSpeaking ? (
                          <span className="text-gray-500">Speaking…</span>
                        ) : memories.length > 0 ? (
                          <span className="text-[#7B2D8E] font-medium">
                            Concierge · remembers {memories.length}
                          </span>
                        ) : (
                          <span className="text-gray-500">Concierge</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="relative flex items-center gap-0.5 flex-shrink-0">
                    <button
                      onClick={startVoiceCall}
                      className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-[#7B2D8E] hover:bg-[#7B2D8E]/10 rounded-full transition-colors"
                      aria-label="Start voice call"
                      title="Voice call"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setVoiceEnabled(!voiceEnabled)}
                      className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                        voiceEnabled
                          ? 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
                          : 'text-gray-500 hover:text-[#7B2D8E] hover:bg-[#7B2D8E]/10'
                      }`}
                      aria-label={voiceEnabled ? 'Disable voice responses' : 'Enable voice responses'}
                      title={voiceEnabled ? 'Voice on' : 'Voice off'}
                    >
                      {voiceEnabled ? (
                        <Volume2 className="w-4 h-4" />
                      ) : (
                        <VolumeX className="w-4 h-4" />
                      )}
                    </button>
                    {!isPageMode && (
                      <button
                        onClick={() => { setIsOpen(false); setShowSidebar(false); }}
                        className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-[#7B2D8E] hover:bg-[#7B2D8E]/10 rounded-full transition-colors"
                        aria-label="Close chat"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Remembered toast — quiet, in-header chip that slides
                    in for ~2.5s whenever the model calls saveMemory. It
                    sits under the header (positioned absolutely) so it
                    doesn't shift the conversation layout. */}
                {recentlyRemembered && (
                  <div className="relative z-10 mx-3 -mt-px" aria-live="polite">
                    <div className="bg-[#7B2D8E]/[0.06] border-x border-b border-[#7B2D8E]/15 rounded-b-xl px-3 py-1.5 flex items-center gap-2 animate-[derma-msg-in_0.3s_ease-out_both]">
                      <span className="w-5 h-5 rounded-full bg-[#7B2D8E] flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      </span>
                      <p className="text-[11px] text-[#7B2D8E] font-medium leading-tight truncate">
                        Remembered · <span className="font-normal text-[#7B2D8E]/80">{recentlyRemembered}</span>
                      </p>
                    </div>
                  </div>
                )}

                {/* Messages — soft neutral canvas with a barely-there
                    brand wash at the very top so the header blends into
                    the conversation instead of slicing a hard line. The
                    bubbles themselves do the heavy visual lifting. */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50 relative">
                  {/* Welcome hero — replaces the ordinary greeting bubble
                      when this is a brand new chat (just the assistant
                      intro, no user turns yet). A large, warm, name-led
                      hello sets a completely different tone from a plain
                      chat bubble and signals that the assistant is
                      premium and personal. */}
                  {messages.length === 1 &&
                    messages[0]?.role === 'assistant' &&
                    !isLoading &&
                    !streamingContent && (
                      <div
                        className="animate-[derma-msg-in_0.4s_ease-out_both] pt-4 pb-2 flex flex-col items-center text-center"
                      >
                        {/* Welcome avatar — full circle to match the
                            header avatar and the live-chat pattern
                            where the mascot is always round. No
                            availability dot (the emerald dot clashed
                            with the brand palette and added visual
                            noise on a panel that is meant to feel
                            quiet). No outer blur halo either. */}
                        <div className="relative mb-4">
                          <div className="relative w-16 h-16 rounded-full bg-[#7B2D8E] flex items-center justify-center">
                            <ButterflyLogo className="w-8 h-8 text-white" />
                          </div>
                        </div>
                        <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-[#7B2D8E] mb-1.5">
                          Derma AI · Concierge
                        </p>
                        <h4 className="text-[22px] font-semibold text-gray-900 tracking-tight leading-tight text-balance">
                          {userInfo.name ? `Hello, ${userInfo.name}.` : 'Hello there.'}
                        </h4>
                        <p className="text-[13px] text-gray-500 mt-1 leading-relaxed max-w-[280px] text-pretty">
                          {userInfo.name
                            ? memories.length > 0
                              ? `I remember ${memories.length} thing${memories.length === 1 ? '' : 's'} about you. What shall we do today?`
                              : 'I can book, check your wallet, cancel visits and more. What shall we do today?'
                            : 'I can help you book, browse services, find branches and more. What shall we do today?'}
                        </p>

                        {/* Inline memory chip — quiet signal that the
                            assistant has context on you. Not clickable
                            here; users manage memory in settings. */}
                        {memories.length > 0 && (
                          <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-[#7B2D8E]/15 text-[10px] font-semibold text-[#7B2D8E]">
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E]"
                              aria-hidden="true"
                            />
                            Memory on · {memories.length} remembered
                          </div>
                        )}
                      </div>
                    )}

                  {messages.map((message) => {
                    // Hide the default welcome message bubble — the hero
                    // above takes its place. We still keep it in state
                    // so downstream code (history, export) has a real
                    // first turn.
                    const isWelcomeStub =
                      messages.length === 1 &&
                      message.role === 'assistant' &&
                      message.id === '1'
                    if (isWelcomeStub) return null
                    return (
                    <div
                      key={message.id}
                      className="animate-[derma-msg-in_0.35s_ease-out_both]"
                    >
                      {message.banner === 'access-granted' ? (
                        <div className="flex justify-center my-1" role="status" aria-live="polite">
                          <div className="flex items-start gap-2.5 max-w-[90%] bg-[#7B2D8E]/5 border border-[#7B2D8E]/20 rounded-2xl px-3.5 py-2.5">
                            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#7B2D8E] flex items-center justify-center">
                              <ShieldCheck className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-[#7B2D8E]">Account connected · permission granted</p>
                              <p className="text-xs text-gray-700 leading-relaxed mt-0.5">
                                {message.content}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : message.banner === 'account-disconnected' ? (
                        // Disconnect banner — same visual language as the
                        // "access granted" confirmation (so the pair feels
                        // like one system), but with a one-tap
                        // "Reconnect" pill the user can fire from the
                        // chat instead of bouncing back to settings.
                        <div className="flex justify-center my-1" role="status" aria-live="polite">
                          <div className="flex items-start gap-2.5 max-w-[90%] bg-[#7B2D8E]/5 border border-[#7B2D8E]/20 rounded-2xl px-3.5 py-2.5">
                            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#7B2D8E]/15 flex items-center justify-center">
                              <ButterflyLogo className="w-4 h-4 text-[#7B2D8E]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-[#7B2D8E]">Account disconnected</p>
                              <p className="text-xs text-gray-700 leading-relaxed mt-0.5">
                                {message.content}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={handleReconnectFromBanner}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#7B2D8E] text-white text-[11px] font-semibold hover:bg-[#6B2278] transition-colors shadow-sm shadow-[#7B2D8E]/25"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  Yes, reconnect
                                </button>
                                <Link
                                  href="/dashboard/settings?section=assistant"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#7B2D8E]/20 text-[#7B2D8E] text-[11px] font-semibold hover:bg-[#7B2D8E]/5 transition-colors"
                                >
                                  Manage in settings
                                </Link>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          {message.role === 'assistant' && (
                            // Tiny assistant avatar — white circle with
                            // a purple butterfly. The tinted bubble
                            // beside it already carries the brand
                            // colour, so flipping the avatar to white
                            // avoids a double dose of purple in the
                            // same row and matches the inverted chip
                            // patterns used by modern support chats.
                            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-white border border-[#7B2D8E]/20 flex items-center justify-center mr-2 mt-0.5">
                              <ButterflyLogo className="w-3.5 h-3.5 text-[#7B2D8E]" />
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
                            {/* Text bubble — live-chat pairing:
                                • User turns keep the solid brand
                                  purple fill, white copy, asymmetric
                                  tail on the right.
                                • Assistant turns wear a soft brand-
                                  tinted wash instead of a bordered
                                  white card.
                                Tapping an assistant bubble opens an
                                actions popover (Copy / Regenerate) —
                                same native pattern iMessage, WhatsApp
                                and Telegram use. No separate trigger
                                button clutters the chat tail. */}
                            {message.content.trim() && (() => {
                              const isAssistantAction =
                                message.role === 'assistant' &&
                                !message.banner &&
                                message.id !== 'welcome'
                              const isLatest = messages[messages.length - 1]?.id === message.id
                              const justCopied = copiedMessageId === message.id
                              const isOpen = openActionsMenuId === message.id

                              const bubbleInner = (
                                <div dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }} />
                              )

                              // Non-actionable bubble (user turn, banner,
                              // or welcome) — render as a plain div.
                              if (!isAssistantAction) {
                                return (
                                  <div
                                    className={`relative px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
                                      message.role === 'user'
                                        ? 'bg-[#7B2D8E] text-white rounded-2xl rounded-br-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]'
                                        : 'bg-[#7B2D8E]/[0.08] text-gray-800 rounded-2xl rounded-bl-md'
                                    }`}
                                  >
                                    {bubbleInner}
                                  </div>
                                )
                              }

                              // Actionable assistant bubble — the
                              // whole surface toggles the actions
                              // popover. We use a div with role=button
                              // (not <button>) so inline <a> tags
                              // inside the rendered markdown remain
                              // valid HTML and still navigate on click
                              // without the menu intercepting.
                              const toggleMenu = () =>
                                setOpenActionsMenuId((prev) => (prev === message.id ? null : message.id))
                              return (
                                <div
                                  ref={isOpen ? actionsMenuRef : undefined}
                                  className="relative"
                                >
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => {
                                      // Don't open the menu when the
                                      // user tapped an inline link —
                                      // let the browser navigate.
                                      if ((e.target as HTMLElement).closest('a')) return
                                      toggleMenu()
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        if ((e.target as HTMLElement).closest('a')) return
                                        e.preventDefault()
                                        toggleMenu()
                                      }
                                    }}
                                    aria-haspopup="menu"
                                    aria-expanded={isOpen}
                                    aria-label="Tap for message actions"
                                    className={`relative px-3.5 py-2.5 text-[13.5px] leading-relaxed bg-[#7B2D8E]/[0.08] text-gray-800 rounded-2xl rounded-bl-md cursor-pointer transition-colors select-text ${
                                      isOpen
                                        ? 'ring-2 ring-[#7B2D8E]/25 bg-[#7B2D8E]/[0.12]'
                                        : 'hover:bg-[#7B2D8E]/[0.11] active:bg-[#7B2D8E]/[0.14]'
                                    }`}
                                  >
                                    {bubbleInner}
                                    {justCopied && !isOpen && (
                                      <span className="absolute -top-2 -right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#7B2D8E] text-white text-[10px] font-medium shadow-sm">
                                        <Check className="w-3 h-3" strokeWidth={3} />
                                        Copied
                                      </span>
                                    )}
                                  </div>
                                  {isOpen && (
                                    <div
                                      role="menu"
                                      className="absolute left-2 top-[calc(100%+6px)] z-20 min-w-[180px] rounded-xl border border-gray-200 bg-white shadow-[0_12px_32px_-8px_rgba(17,24,39,0.22)] py-1 overflow-hidden animate-[derma-msg-in_0.15s_ease-out]"
                                    >
                                      <button
                                        type="button"
                                        role="menuitem"
                                        onClick={() => copyMessage(message.id, message.content)}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] text-gray-700 hover:bg-[#7B2D8E]/5 hover:text-[#7B2D8E] transition-colors"
                                      >
                                        <Copy className="w-3.5 h-3.5" />
                                        <span>Copy message</span>
                                      </button>
                                      {isLatest && !isLoading && (
                                        <button
                                          type="button"
                                          role="menuitem"
                                          onClick={regenerateLastResponse}
                                          className="w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] text-gray-700 hover:bg-[#7B2D8E]/5 hover:text-[#7B2D8E] transition-colors"
                                        >
                                          <RotateCcw className="w-3.5 h-3.5" />
                                          <span>Regenerate reply</span>
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            })()}
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
                            <ToolResultCard
                              key={idx}
                              toolName={tr.toolName}
                              result={tr.result}
                              onSendPrompt={
                                // Only wire action chips for the most
                                // recent assistant turn — replaying
                                // history shouldn't cancel a live
                                // booking by accident.
                                message.id === messages[messages.length - 1]?.id
                                  ? sendMessage
                                  : undefined
                              }
                              onNavigate={
                                // Floating mode: close the modal so the
                                // user actually sees the destination page
                                // (otherwise the modal stays mounted over
                                // the newly-loaded page and clicks appear
                                // to do nothing). Page mode has no modal
                                // to close so this is a no-op there.
                                !isPageMode
                                  ? () => {
                                      setIsOpen(false)
                                      setShowSidebar(false)
                                    }
                                  : undefined
                              }
                            />
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
                    )
                  })}
                  
                  {/* Streaming — same bubble language as static assistant
                      messages, plus a blinking caret to signal liveness. */}
                  {streamingContent && (
                    <div className="flex justify-start">
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#7B2D8E] flex items-center justify-center mr-2 mt-0.5">
                        <ButterflyLogo className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="max-w-[82%] px-3.5 py-2.5 bg-white border border-gray-200 rounded-2xl rounded-bl-md text-sm text-gray-800 leading-relaxed">
                        <div dangerouslySetInnerHTML={{ __html: formatMessage(streamingContent) }} />
                        {/* Steady caret — a thin brand-colored bar that
                            sits at the end of the streamed text without
                            pulsing. Signals "still writing" via its
                            presence alone; the shimmer loader above
                            carries the motion. */}
                        <span className="inline-block w-0.5 h-4 bg-[#7B2D8E] ml-0.5 align-middle" />
                      </div>
                    </div>
                  )}

                  {/* Loading — premium, confident, on-brand. A breathing
                      brand ring behind the butterfly avatar, a
                      pulsing-ping "alive" dot on the label, and a
                      polished shimmer bar underneath. Three distinct
                      motion layers — each slow enough to feel
                      considered, not frantic — so the loader reads as
                      deliberate assistant work rather than a generic
                      spinner. The label itself is tool-aware ("Checking
                      your wallet", "Pulling transactions", …) so the
                      user can see exactly what Derma is doing. */}
                  {isLoading && !streamingContent && (
                    <div className="flex justify-start animate-[derma-msg-in_0.25s_ease-out_both]">
                      <div className="relative flex-shrink-0 w-8 h-8 rounded-full bg-[#7B2D8E] flex items-center justify-center mr-2">
                        <ButterflyLogo className="w-4 h-4 text-white" />
                        {/* Two nested rings at different speeds for a
                            richer "breathing" effect — similar to
                            Google's Gemini / OpenAI's ChatGPT idle
                            indicator. Both use pure brand colour so
                            nothing clashes with the surrounding UI. */}
                        <span
                          aria-hidden="true"
                          className="absolute inset-0 rounded-full ring-2 ring-[#7B2D8E]/30 animate-[derma-breathe_2.4s_ease-out_infinite]"
                        />
                        <span
                          aria-hidden="true"
                          className="absolute -inset-1 rounded-full ring-2 ring-[#7B2D8E]/15 animate-[derma-breathe_2.4s_ease-out_0.8s_infinite]"
                        />
                      </div>
                      <div
                        className="bg-white border border-gray-200/80 ring-1 ring-[#7B2D8E]/[0.04] rounded-2xl rounded-bl-md px-3.5 py-2.5 min-w-[220px] shadow-sm"
                        role="status"
                        aria-live="polite"
                      >
                        <div className="flex items-center gap-1.5">
                          {/* Live-status dot with a ping halo. Reads as
                              "actively working" without pushing into
                              noisy territory — one pulse, brand
                              coloured, plus a steady inner dot. */}
                          <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                            <span
                              aria-hidden="true"
                              className="absolute inline-flex h-full w-full rounded-full bg-[#7B2D8E] opacity-70 animate-ping"
                            />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#7B2D8E]" />
                          </span>
                          <span className="block text-xs font-semibold text-[#7B2D8E] leading-none tracking-tight">
                            {loaderLabelForTool(activeTool)}
                          </span>
                        </div>
                        {/* Shimmer track — a thin brand-tinted bar with
                            a moving highlight that slides left→right.
                            All brand color, no flashing. */}
                        <span
                          aria-hidden="true"
                          className="mt-2.5 block h-[3px] w-full rounded-full bg-[#7B2D8E]/10 overflow-hidden relative"
                        >
                          <span className="absolute inset-y-0 -left-1/3 w-1/3 bg-[#7B2D8E] rounded-full animate-[derma-shimmer_1.6s_ease-in-out_infinite]" />
                        </span>
                        <span className="sr-only">{loaderLabelForTool(activeTool)}</span>
                      </div>
                    </div>
                  )}

                  {/* Quick-action suggestion grid — appears only on a
                      fresh chat and sits directly under the welcome
                      hero. These are the four "most useful things you
                      can ask the concierge" shortcut cards, designed
                      like premium app tiles (vertical icon + label,
                      roomier padding, subtle lift on hover). */}
                  {messages.length === 1 && !isLoading && !streamingContent && (
                    <div className="pt-2 pb-2 animate-[derma-msg-in_0.5s_ease-out_0.1s_both]">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="flex-1 h-px bg-gray-200" aria-hidden="true" />
                        <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-gray-400">
                          Try asking
                        </p>
                        <span className="flex-1 h-px bg-gray-200" aria-hidden="true" />
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        {(
                          // Broader starter prompts — services, skin
                          // advice, locations and pricing work for
                          // everyone. The wallet / "my bookings"
                          // suggestions only appear for signed-in
                          // viewers so anonymous users aren't offered
                          // actions that immediately bounce them to
                          // the sign-in wall.
                          isLoggedIn === true
                            ? [
                                { icon: Calendar, label: 'Book a facial', hint: 'Any branch', prompt: "I'd like to book a facial appointment." },
                                { icon: Wallet, label: 'Check my balance', hint: 'Live wallet', prompt: 'What is my wallet balance?' },
                                { icon: Search, label: 'Product match', hint: 'For my skin', prompt: 'Recommend products for dry skin.' },
                                { icon: MapPin, label: 'Find a branch', hint: 'Hours · map', prompt: 'Where are your branches located?' },
                              ]
                            : [
                                { icon: Flower2, label: 'Popular services', hint: 'What we offer', prompt: 'What are your most popular services?' },
                                { icon: Search, label: 'Skin advice', hint: 'For my skin type', prompt: 'Recommend a routine for dry skin.' },
                                { icon: Calendar, label: 'How booking works', hint: 'Step by step', prompt: 'How do I book an appointment?' },
                                { icon: MapPin, label: 'Find a branch', hint: 'Hours · map', prompt: 'Where are your branches located?' },
                              ]
                        ).map(({ icon: Icon, label, hint, prompt }) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => sendMessage(prompt)}
                            className="group relative flex flex-col items-start gap-2 p-3 bg-white border border-gray-200 rounded-2xl hover:border-[#7B2D8E]/40 hover:bg-[#7B2D8E]/[0.035] active:scale-[0.98] transition-all text-left overflow-hidden"
                          >
                            {/* Faint corner flourish — brand warmth
                                without another color. */}
                            <span
                              aria-hidden="true"
                              className="pointer-events-none absolute -top-6 -right-6 w-16 h-16 rounded-full bg-[#7B2D8E]/5 group-hover:bg-[#7B2D8E]/10 transition-colors"
                            />
                            <span className="relative w-8 h-8 rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center group-hover:bg-[#7B2D8E] group-hover:text-white transition-colors">
                              <Icon className="w-4 h-4" />
                            </span>
                            <span className="relative min-w-0">
                              <span className="block text-[12px] font-semibold text-gray-900 leading-tight">
                                {label}
                              </span>
                              <span className="block text-[10px] text-gray-500 mt-0.5">
                                {hint}
                              </span>
                            </span>
                          </button>
                        ))}
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
                        <div className="w-14 h-14 rounded-lg bg-[#7B2D8E]/5 border border-[#7B2D8E]/15 flex flex-col items-center justify-center gap-1">
                          {/* Brand-colored ring spinner replaces the
                              bouncing dots — calmer and clearly on-brand. */}
                          <span
                            aria-hidden="true"
                            className="w-4 h-4 rounded-full border-2 border-[#7B2D8E]/25 border-t-[#7B2D8E] animate-spin"
                          />
                          <span className="text-[9px] text-[#7B2D8E] font-medium">Uploading</span>
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
                        className="w-8 h-8 flex items-center justify-center rounded-full text-[#7B2D8E] hover:bg-[#7B2D8E]/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={toggleListening}
                        className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors flex-shrink-0 ${
                          isListening
                            ? 'bg-[#7B2D8E] text-white'
                            : 'text-[#7B2D8E] hover:bg-[#7B2D8E]/10'
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

                    {/* Send / Stop — while a generation is in flight
                        the send arrow morphs into a stop square that
                        aborts the stream mid-flight. No pulsing halo or
                        ring here — the shimmer in the loading bubble
                        already signals "thinking", so this button stays
                        calm and clearly clickable. */}
                    {isLoading ? (
                      <button
                        type="button"
                        onClick={stopGeneration}
                        className="w-10 h-10 flex items-center justify-center bg-[#7B2D8E] text-white rounded-full hover:bg-[#6B2278] active:scale-95 transition-all flex-shrink-0"
                        aria-label="Stop generating"
                        title="Stop"
                      >
                        <span className="block w-3 h-3 rounded-sm bg-white" aria-hidden="true" />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={
                          (!input.trim() && pendingAttachments.length === 0) ||
                          isUploading
                        }
                        className="w-10 h-10 flex items-center justify-center bg-[#7B2D8E] text-white rounded-full hover:bg-[#6B2278] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                        aria-label="Send message"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    )}
                  </form>

                  {/* Footnote — subtle reassurance that the assistant
                      remembers across sessions + a quick link to manage
                      memory. Keeps the composer honest about privacy. */}
                  <div className="flex items-center justify-center gap-1.5 mt-2 px-4">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        memories.length > 0 ? 'bg-[#7B2D8E]' : 'bg-gray-300'
                      }`}
                      aria-hidden="true"
                    />
                    <p className="text-center text-[10px] text-gray-400 leading-tight">
                      {memories.length > 0
                        ? `Memory on · ${memories.length} remembered`
                        : 'Derma remembers your preferences across chats'}
                      {' · '}
                      <Link
                        href="/dashboard/settings?section=assistant"
                        className="underline decoration-dotted underline-offset-2 hover:text-[#7B2D8E]"
                      >
                        manage
                      </Link>
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
