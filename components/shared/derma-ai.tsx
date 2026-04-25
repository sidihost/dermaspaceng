'use client'

import { useState, useRef, useEffect, useCallback, Component, type ReactNode } from 'react'
import { Send, X, Mic, Volume2, ArrowRight, MessageSquare, Plus, Trash2, Menu, Phone, Calendar, Wallet, MapPin, Gift, Flower2, User, ExternalLink, ShieldCheck, Mail, ArrowUpRight, ArrowDownLeft, TrendingUp, Paperclip, Search, Globe, Copy, Check, RotateCcw, Download, MoreHorizontal, Pencil, LogOut, ThumbsUp, ThumbsDown, Star, AlertTriangle, TextCursor, FilePen, Navigation, Settings as SettingsIcon, ChevronRight, Info, FileText, LifeBuoy, Brain, Zap, Type, Video, Upload, AudioLines } from 'lucide-react'
import { getVapi, voiceToVapiOverrides } from '@/lib/vapi-client'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ButterflyLogo } from './butterfly-logo'
import { DermaLiveVoicePicker } from './derma-live-voice-picker'
import { DEFAULT_LIVE_VOICE_ID } from '@/lib/derma-live-voices'

// Leaflet is SSR-unsafe, so the interactive map must be dynamic-imported
// with `ssr: false`. We render a small branded placeholder while the
// map bundle is loading so the chat bubble doesn't jump in height.
const ChatInteractiveMap = dynamic(
  () => import('@/components/home/interactive-map'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-56 rounded-2xl ring-1 ring-[#7B2D8E]/15 bg-[#7B2D8E]/5 flex items-center justify-center">
        <div className="flex items-center gap-2 text-[#7B2D8E] text-[11px] font-medium">
          <span className="inline-flex gap-1" aria-hidden="true">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E] animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E] animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E] animate-bounce" />
          </span>
          Preparing your map
        </div>
      </div>
    ),
  }
)

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
  // User reaction + optional written comment on an assistant reply.
  // `feedback` is the thumbs state; `rating` is a 1-5 star score the
  // user can leave after tapping "Bad response" so we can triage the
  // exact turns that failed them rather than a global NPS pulse.
  // `feedbackReasons` stores the quick-pick tags (e.g. "Not accurate",
  // "Didn't follow instructions") the user selects on a thumbs-down —
  // matching the pattern used by ChatGPT, Gemini and YouTube so we
  // can categorise failures without parsing free text.
  feedback?: 'up' | 'down'
  rating?: number
  feedbackComment?: string
  feedbackReasons?: string[]
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
  // Stored so the header avatar button can render the viewer's
  // real profile photo (matches the top navbar). Optional because
  // signed-out viewers won't have one.
  avatarUrl?: string | null
  preferences?: {
  skinType?: string
  concerns?: string[]
  services?: string[]
  location?: string
  }
  }

// Render a subset of markdown into HTML — enough to make longer
// Derma replies read like a polished chat bubble (headings,
// paragraphs, blockquotes, inline code, ordered + unordered lists)
// without pulling in a full markdown parser. We tokenise the text
// block-by-block so list items group into real `<ul>/<ol>` tags
// with proper spacing, not the previous approach of prefixing each
// line with a brand bullet and `<br/>`-joining everything (which
// read as wall-of-text on multi-line answers).
function escapeHtml(raw: string) {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Inline SVGs for the icon vocabulary the model is allowed to use
// inside replies. We ship raw SVG strings (not lucide-react components)
// because formatMessage emits HTML into `dangerouslySetInnerHTML` — we
// can't mount React nodes inside that blob. Paths are copied from
// the corresponding lucide icons so they stay visually identical to
// the rest of the app. `currentColor` lets the icon inherit the
// surrounding text colour (brand purple inside the chat bubble).
const INLINE_ICON_SVGS: Record<string, string> = {
  'map-pin': '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  'check-circle': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  sparkles: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5 4.8 8 0 0 1 4.5 5 4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  flower: '<circle cx="12" cy="12" r="3"/><path d="M12 16.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 1 1 4.5 4.5 4.5 4.5 0 1 1-4.5 4.5"/><path d="M12 7.5V9"/><path d="M7.5 12H9"/><path d="M16.5 12H15"/><path d="M12 16.5V15"/><path d="m8 8 1.88 1.88"/><path d="M14.12 9.88 16 8"/><path d="m8 16 1.88-1.88"/><path d="M14.12 14.12 16 16"/>',
  'credit-card': '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>',
  ticket: '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  compass: '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>',
  navigation: '<polygon points="3 11 22 2 13 21 11 13 3 11"/>',
  'trending-up': '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  droplet: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
}

// Map of common emoji codepoints → icon name. Acts as a belt-and-
// braces fallback if the model slips and emits an emoji anyway: the
// chat still renders a real Dermaspace icon instead of a platform-
// default emoji glyph that would look out of place in our UI.
const EMOJI_TO_ICON: Record<string, string> = {
  '📍': 'map-pin', '💰': 'wallet', '💳': 'credit-card',
  '📅': 'calendar', '🗓️': 'calendar', '🗓': 'calendar',
  '⏰': 'clock', '🕐': 'clock', '🕑': 'clock', '🕒': 'clock',
  '✅': 'check-circle', '☑️': 'check', '✔️': 'check',
  '⚠️': 'alert', '❗': 'alert', '❗️': 'alert',
  'ℹ️': 'info',
  '📞': 'phone', '☎️': 'phone', '📱': 'phone',
  '📧': 'mail', '✉️': 'mail',
  '✨': 'sparkles', '🌟': 'star', '⭐': 'star', '⭐️': 'star',
  '🎁': 'gift', '🎀': 'gift',
  '❤️': 'heart', '♥️': 'heart', '💜': 'heart', '💖': 'heart', '🧡': 'heart', '💛': 'heart',
  '👤': 'user', '🧑': 'user', '👩': 'user', '👨': 'user',
  '🌸': 'flower', '🌷': 'flower', '🌺': 'flower', '💐': 'flower',
  '🎟️': 'ticket', '🎫': 'ticket',
  '🛡️': 'shield', '🔒': 'shield',
  '🧭': 'compass',
  '📈': 'trending-up', '📊': 'trending-up',
  '➡️': 'arrow-right', '👉': 'arrow-right',
  '⚡': 'zap', '⚡️': 'zap',
  '💧': 'droplet', '🌊': 'droplet',
  '☀️': 'sun', '🌞': 'sun',
  '💬': 'message', '💭': 'message',
}

function renderInlineIcon(name: string) {
  const paths = INLINE_ICON_SVGS[name] || INLINE_ICON_SVGS.sparkles
  // inline-block + vertical-align:-2px keeps the icon sitting on the
  // text baseline instead of floating above it; 14px matches the
  // body text's cap height so it looks typographically set, not
  // decorative.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block -translate-y-[1px] mr-1 text-[#7B2D8E]" aria-hidden="true">${paths}</svg>`
}

// Inline markdown — runs on every text fragment inside a block.
// Order matters: code spans are extracted FIRST (via placeholders)
// so bold/italic inside backticks isn't accidentally processed.
function applyInline(raw: string) {
  const codeSpans: string[] = []
  let s = raw.replace(/`([^`]+)`/g, (_m, code: string) => {
    codeSpans.push(code)
    return `\u0000CODE${codeSpans.length - 1}\u0000`
  })

  // Icon tags — `[icon:name]` renders as an inline brand-purple SVG.
  // We process this BEFORE link syntax so `[icon:map-pin]` isn't
  // mistaken for a markdown link.
  s = s.replace(/\[icon:([a-z0-9-]+)\]/gi, (_m, name: string) => renderInlineIcon(name.toLowerCase()))

  // Emoji fallback — swap any bare emoji the model emitted for the
  // equivalent brand icon. Runs AFTER icon-tag parsing so explicit
  // tags take precedence.
  for (const [emoji, iconName] of Object.entries(EMOJI_TO_ICON)) {
    if (s.includes(emoji)) {
      s = s.split(emoji).join(renderInlineIcon(iconName))
    }
  }

  s = s.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
  s = s.replace(/\*(.+?)\*/g, '<em>$1</em>')
  // Markdown-style links `[label](/path)` → real anchors. We keep the
  // styling understated (underline only, inherits text colour) so it
  // reads as a real hyperlink, not as a coloured button or badge.
  s = s.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="underline underline-offset-2 hover:opacity-80">$1</a>'
  )
  // Re-hydrate code spans with a soft brand chip, matching how
  // ChatGPT renders inline `code` inside plain prose.
  s = s.replace(/\u0000CODE(\d+)\u0000/g, (_m, i: string) => {
    const code = escapeHtml(codeSpans[Number(i)] || '')
    return `<code class="font-mono text-[12px] px-1 py-0.5 rounded bg-[#7B2D8E]/8 text-[#7B2D8E]">${code}</code>`
  })
  return s
}

function formatMessage(text: string) {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // Blank line — emits a small vertical gap between blocks.
    if (!trimmed) {
      out.push('<div class="h-2" aria-hidden="true"></div>')
      i++
      continue
    }

    // Horizontal rule
    if (/^(---|\*\*\*|___)$/.test(trimmed)) {
      out.push('<hr class="my-3 border-gray-200" />')
      i++
      continue
    }

    // Headings (`# `, `## `, `### `)
    const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed)
    if (heading) {
      const level = heading[1].length
      const sizeCls =
        level === 1
          ? 'text-[15px] font-semibold mt-1'
          : level === 2
            ? 'text-[14px] font-semibold mt-1'
            : 'text-[13px] font-semibold mt-0.5'
      out.push(
        `<p class="${sizeCls} text-gray-900 tracking-tight">${applyInline(heading[2])}</p>`
      )
      i++
      continue
    }

    // Blockquote — single line at a time, joined below.
    if (/^>\s?/.test(trimmed)) {
      const quoteLines: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''))
        i++
      }
      out.push(
        `<blockquote class="border-l-2 border-[#7B2D8E]/40 pl-3 my-1 text-gray-600 italic">${applyInline(
          quoteLines.join(' '),
        )}</blockquote>`,
      )
      continue
    }

    // Ordered list — consume consecutive `1. `, `2. ` lines.
    if (/^\d+\.\s/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^\s*\d+\.\s/.test(lines[i])) {
        const m = /^\s*\d+\.\s+(.*)$/.exec(lines[i])
        if (m) items.push(`<li class="pl-1">${applyInline(m[1])}</li>`)
        i++
      }
      out.push(
        `<ol class="list-decimal pl-5 my-1 space-y-1 marker:text-[#7B2D8E] marker:font-medium">${items.join('')}</ol>`,
      )
      continue
    }

    // Unordered list — `-`, `*`, or `•` bullets.
    if (/^[-*•]\s/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*•]\s/.test(lines[i])) {
        const m = /^\s*[-*•]\s+(.*)$/.exec(lines[i])
        if (m) items.push(`<li class="pl-1">${applyInline(m[1])}</li>`)
        i++
      }
      out.push(
        `<ul class="list-disc pl-5 my-1 space-y-1 marker:text-[#7B2D8E]">${items.join('')}</ul>`,
      )
      continue
    }

    // Default — a paragraph. Consecutive non-blank, non-block lines
    // collapse into a single paragraph with `<br/>` joins so the
    // model can hard-wrap without creating sparse paragraphs.
    const paraLines: string[] = [line]
    i++
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,3}\s|>\s?|\d+\.\s|[-*•]\s|---$|\*\*\*$|___$)/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i])
      i++
    }
    out.push(`<p>${applyInline(paraLines.join('<br/>'))}</p>`)
  }

  return out.join('')
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
    case 'showLocationsMap': return 'Rendering your map'
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

// Heuristic that looks at the user's outgoing message and picks the
// most likely tool the assistant will call, so we can surface a
// SPECIFIC "Fetching your wallet…" label the instant they tap Send
// instead of a generic "Thinking" that feels unresponsive.
//
// This is purely cosmetic — the real tool label (emitted by the
// streaming API as the model actually calls the tool) overwrites
// this one as soon as it arrives. If the model doesn't call a tool,
// the loader is hidden the moment text starts streaming anyway.
function guessToolFromText(raw: string): string | null {
  const text = raw.toLowerCase()
  // Order matters — check the most specific verbs FIRST so "fund my
  // wallet" doesn't get routed as a plain wallet read, and "cancel
  // my booking" doesn't route to getBookings.
  if (/(fund|top.?up|add.+(to|into).+wallet|recharge)/.test(text)) return 'fundWallet'
  if (/(cancel|cancell).+(booking|appointment|visit|session)/.test(text)) return 'cancelBooking'
  if (/(log\s?out|sign\s?out|end session)/.test(text)) return 'logoutUser'
  if (/(forgot.+password|reset.+password|password reset)/.test(text)) return 'sendPasswordResetEmail'
  if (/(resend|re-send).+(verification|verify.+email)/.test(text)) return 'resendVerificationEmail'
  if (/(open.+ticket|raise.+ticket|file.+ticket|complaint|report.+issue|support.+request)/.test(text)) return 'createSupportTicket'
  if (/(call ?back|call me|reach me|phone me)/.test(text)) return 'requestCallback'
  if (/(book.+consult|free consult|skin consult)/.test(text)) return 'bookConsultation'
  if (/(book|schedule|reschedule|reserve).+(appointment|facial|massage|treatment|session|visit)/.test(text)) return 'createBooking'
  if (/(update|change|edit).+(profile|name|phone|number|details)/.test(text)) return 'updateProfile'
  if (/(change|update|save).+(preference|skin type|concern)/.test(text)) return 'updatePreferences'

  // Read-only / info lookups
  if (/(ticket|complaint|support case|my.+issue)/.test(text)) return 'getSupportTickets'
  if (/(transaction|top.?up history|payment.+history|spend)/.test(text)) return 'getTransactionHistory'
  if (/(wallet|balance|credits?|my money)/.test(text)) return 'getWalletBalance'
  if (/(appointment|booking|visit|session).+(upcoming|next|my|scheduled)|my (appointment|booking|visit|session)s?|upcoming.+(appointment|booking|visit)/.test(text)) return 'getBookings'
  if (/(my (profile|account|details)|who am i|my name)/.test(text)) return 'getUserProfile'
  if (/(notification|activity|updates)/.test(text)) return 'getNotifications'
  // Spatial / visual intent → render the live map. We check this
  // BEFORE the plain getLocations regex so "show me on a map" and
  // "how do I get there" route to the richer UI.
  if (/(show (me|us).+(map|where)|on.+map|open.+map|view.+map|see.+map|see where|pinpoint|plot)/.test(text)) return 'showLocationsMap'
  if (/(direction|how do i get|get there|navigate|route|take me|drive to|get to (you|your|the spa))/.test(text)) return 'showLocationsMap'
  if (/(location|address|where.+(you|located)|which branch)/.test(text)) return 'getLocations'
  if (/(package|membership|deal|bundle|platinum|bridal|couples)/.test(text)) return 'getPackages'
  if (/(gift card|gift voucher|gift.+dermaspace)/.test(text)) return 'getGiftCards'
  if (/(service|treatment|facial|massage|nail|waxing|price list|what.+offer)/.test(text)) return 'getServices'
  if (/(recommend|suggest|should i use|good for|best.+for).+(product|cream|serum|sunscreen|moisturi[sz]er|cleanser|toner|routine)/.test(text)) return 'searchProducts'
  if (/(today|tomorrow|this weekend|next week)/.test(text)) return 'getCurrentDateTime'
  if (/(am i.+(signed|logged).+in|login status)/.test(text)) return 'checkLoginStatus'

  return null
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
  inlineMapsEnabled = true,
}: {
  toolName: string
  result: Record<string, unknown>
  onSendPrompt?: (prompt: string) => void
  onNavigate?: () => void
  // Gated by the Derma AI settings sheet. When false we render a
  // compact address-list card instead of the live Leaflet map.
  inlineMapsEnabled?: boolean
}) {
  const getIcon = () => {
    switch (toolName) {
      case 'getWalletBalance': return <Wallet className="w-4 h-4" />
      case 'getBookings': return <Calendar className="w-4 h-4" />
      // Spa services / treatments → Flower2 (on-brand, calm)
      case 'getServices': return <Flower2 className="w-4 h-4" />
      case 'getLocations': return <MapPin className="w-4 h-4" />
      case 'showLocationsMap': return <MapPin className="w-4 h-4" />
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
      case 'showLocationsMap': return 'Find us on the map'
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
                  {isCredit ? '+' : '��'}
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

  // Render the live interactive map inline. This is the "impressive"
  // upgrade over the plain location list — the same Leaflet component
  // used on /locations, embedded inside a chat bubble with pulsing
  // branch pins, real turn-by-turn directions, and a "use my
  // location" button. The chat bubble has no horizontal padding for
  // this card so the map uses the full bubble width.
  if (toolName === 'showLocationsMap' && result.success) {
    const focal = (result.branchId as 'vi' | 'ikoyi' | null) ?? 'vi'
    // When the user has disabled inline maps in settings (Appearance
    // → Inline maps off) we render a compact address-list card instead
    // of the live Leaflet map. Also used as a graceful fallback when
    // the Leaflet bundle fails to load on flaky networks — the card
    // always works, the map is the enhancement.
    if (!inlineMapsEnabled) {
      const branches =
        (result.branches as Array<{ id: string; name: string }> | undefined) ?? [
          { id: 'vi', name: 'Victoria Island' },
          { id: 'ikoyi', name: 'Ikoyi' },
        ]
      return (
        <div className="rounded-2xl border border-[#7B2D8E]/15 bg-white overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-3 py-2 bg-[#7B2D8E]/5 border-b border-[#7B2D8E]/10">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-flex w-6 h-6 items-center justify-center rounded-md bg-[#7B2D8E] text-white flex-shrink-0">
                <MapPin className="w-3.5 h-3.5" />
              </span>
              <p className="text-[12px] font-semibold text-gray-900 leading-tight truncate">
                Dermaspace branches
              </p>
            </div>
            <Link
              href={(result.fullMapLink as string) || '/locations'}
              onClick={() => onNavigate?.()}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white text-[10.5px] font-semibold text-[#7B2D8E] ring-1 ring-[#7B2D8E]/20 hover:bg-[#7B2D8E]/10 transition-colors flex-shrink-0"
            >
              <Navigation className="w-3 h-3" />
              Open map
            </Link>
          </div>
          <ul className="p-3 space-y-2">
            {branches.map((b) => (
              <li key={b.id} className="flex items-center gap-2 text-[12px] text-gray-800">
                <MapPin className="w-3.5 h-3.5 text-[#7B2D8E] flex-shrink-0" />
                <span className="font-semibold">{b.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )
    }
    return (
      <div className="rounded-2xl border border-[#7B2D8E]/15 bg-white overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-3 py-2 bg-[#7B2D8E]/5 border-b border-[#7B2D8E]/10">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex w-6 h-6 items-center justify-center rounded-md bg-[#7B2D8E] text-white flex-shrink-0">
              <MapPin className="w-3.5 h-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-gray-900 leading-tight truncate">
                Find us on the map
              </p>
              <p className="text-[10.5px] text-gray-500 leading-tight mt-0.5 truncate">
                Tap a pin for directions, or use Locate Me
              </p>
            </div>
          </div>
          <Link
            href={(result.fullMapLink as string) || '/locations'}
            onClick={() => onNavigate?.()}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white text-[10.5px] font-semibold text-[#7B2D8E] ring-1 ring-[#7B2D8E]/20 hover:bg-[#7B2D8E]/10 transition-colors flex-shrink-0"
          >
            <Navigation className="w-3 h-3" />
            Full map
          </Link>
        </div>
        {/* 256px is tall enough to show both branches + reveal the
            compact directions panel when the user locates themselves,
            without dominating the chat transcript. */}
        <div className="relative">
          <ChatInteractiveMap activeBranchId={focal} height="256px" />
        </div>
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

/**
 * Panel-scoped error boundary. Wraps ONLY the chat panel surface so a
 * render error inside the panel (a bad message payload, a stale
 * memory record, an exception inside Vapi etc.) cannot also kill the
 * floating launcher — that was the cause of the long-standing
 * "click the launcher and everything disappears, refresh to see it
 * again" symptom users have been reporting. The launcher renders as
 * a sibling, so it stays alive even when this boundary trips.
 *
 * The fallback renders inside the same flat-card frame the panel
 * uses so the user gets a readable "Something went wrong" with a
 * one-tap retry instead of an empty white sheet.
 */
class DermaAIPanelBoundary extends Component<
  { children: ReactNode; onClose: () => void },
  { hasError: boolean; errorMessage: string }
> {
  state = { hasError: false, errorMessage: '' }
  static getDerivedStateFromError(err: Error) {
    return { hasError: true, errorMessage: err?.message || 'Unknown error' }
  }
  componentDidCatch(error: Error) {
    if (typeof console !== 'undefined') {
      console.error('[v0] DermaAI panel crashed:', error)
    }
  }
  reset = () => this.setState({ hasError: false, errorMessage: '' })
  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="w-full h-full bg-white flex flex-col items-center justify-center text-center p-6 md:rounded-2xl md:border md:border-gray-200">
        <div className="w-12 h-12 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center mb-3">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-gray-900">
          Derma AI hit a snag
        </h3>
        <p className="mt-1 text-sm text-gray-500 max-w-xs">
          We couldn&apos;t open the chat just now. Tap retry to try again, or close and reopen the launcher.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={this.reset}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#7B2D8E] rounded-lg hover:bg-[#6B2278] transition-colors"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={() => {
              this.reset()
              this.props.onClose()
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    )
  }
}

export default function DermaAI({
  mode = 'floating',
  open,
  onOpenChange,
  hideLauncher = false,
}: {
  // `floating` = the draggable launcher + modal panel that lives on every
  // signed-in page.
  // `page` = embedded inside a dedicated /derma-ai route where the chat
  // takes the full container (sidebar persistent on desktop, no launcher,
  // no backdrop, no fixed positioning).
  mode?: 'floating' | 'page'
  // Optional controlled-mode props. When both are provided, DermaAI
  // defers its open/close state to the parent (DermaAIMount) so the
  // launcher + event-listener can live in a trivially simple component
  // that survives even if the heavy chat tree crashes. When omitted
  // (e.g. the /derma-ai page route) DermaAI manages its own state and
  // renders its own floating launcher like before.
  open?: boolean
  onOpenChange?: (open: boolean) => void
  // Tell DermaAI to skip its own launcher render so the parent
  // (DermaAIMount) can render a resilient one that lives OUTSIDE the
  // error boundary — the internal launcher disappears the moment
  // anything in this 6k-line tree throws, which is what users were
  // reporting ("the Derma AI launcher icon isn't even showing
  // anymore"). Keeps the chat component uncontrolled so the existing
  // `openDermaAI` window event + internal state machine keep working.
  hideLauncher?: boolean
} = {}) {
  const isPageMode = mode === 'page'
  // Whether the parent is driving our open state. Captured once on first
  // render so we don't flip between controlled and uncontrolled modes
  // mid-flight (React's canonical controlled-component guideline).
  const isControlled = open !== undefined && typeof onOpenChange === 'function'
  // In page mode the chat is always "open" and the sidebar is persistent
  // on desktop — we still allow toggling on mobile so the chat body has
  // breathing room on small screens.
  const [internalIsOpen, setInternalIsOpen] = useState(isPageMode)
  const isOpen = isControlled ? (open as boolean) : internalIsOpen
  // Wrapper setter so every existing `setIsOpen(...)` call site keeps
  // working unchanged — it updates internal state AND notifies the
  // parent when we're in controlled mode. Supports both a raw value
  // and the functional updater form React uses for concurrent updates.
  const setIsOpen = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      setInternalIsOpen((prev) => {
        const effectivePrev = isControlled ? (open as boolean) : prev
        const next =
          typeof value === 'function'
            ? (value as (p: boolean) => boolean)(effectivePrev)
            : value
        if (isControlled) onOpenChange?.(next)
        // Broadcast state changes so external listeners (the
        // resilient launcher in DermaAIMount, the voice toggle,
        // deep-link openers) can stay in sync. We only dispatch on
        // actual transitions to avoid event storms from no-op
        // updates, and we skip `openDermaAI` — that event is what
        // TRIGGERS us to open in the first place, so echoing it
        // here would re-enter the same handler.
        if (
          typeof window !== 'undefined' &&
          next !== effectivePrev &&
          next === false
        ) {
          try {
            window.dispatchEvent(new Event('closeDermaAI'))
          } catch {
            /* older browsers without Event constructor support —
               launcher will still become visible on next pointer
               interaction / route change */
          }
        }
        return next
      })
    },
    [isControlled, open, onOpenChange],
  )
  const [showSidebar, setShowSidebar] = useState(isPageMode)
  // Timestamp of the most recent open transition. The backdrop
  // ignores clicks within 350ms of this value to defend against
  // iOS phantom clicks (see the backdrop handler far below for the
  // full failure mode this prevents — the long-running "Derma AI
  // launcher disappears the moment I tap it" bug).
  const panelOpenedAtRef = useRef<number>(0)
  // Search within the sidebar's conversation list. Filters on both
  // the session title and the last message preview so users can find
  // an old chat by a word they remember saying in it.
  const [sidebarSearch, setSidebarSearch] = useState('')
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
  // Auto-TTS is OFF by default. It was previously on and read every
  // reply out loud, which was both jarring (surprise audio in a
  // public place) and slow. Users now opt in per message via the
  // Speak button under each assistant bubble — same pattern as
  // ChatGPT / Gemini / Claude. Users can still flip the global
  // auto-read switch back on from Settings → Capabilities.
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  // Which message is currently being read aloud. Drives the spinner
  // + active state on the per-bubble Speak button so users know
  // which reply is playing, and lets a second tap stop playback
  // without also stopping unrelated voice-call audio.
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null)
  const [voiceCallMode, setVoiceCallMode] = useState(false)
  const [callStatus, setCallStatus] = useState<'idle' | 'listening' | 'speaking' | 'processing'>('idle')
  // Vapi session — null when no Live call is running or when Vapi
  // isn't configured (we fall back to Web Speech + ElevenLabs then).
  // `vapiAmp` is a 0..1 volume level from Vapi's `volume-level` event
  // used to drive the Live canvas blob so it scales with the assistant's
  // actual speech rather than a canned animation.
  const vapiRef = useRef<Awaited<ReturnType<typeof getVapi>> | null>(null)
  const [vapiAmp, setVapiAmp] = useState(0)
  const [liveMuted, setLiveMuted] = useState(false)
  const [liveCaptionsOn, setLiveCaptionsOn] = useState(true)
  const [liveCaption, setLiveCaption] = useState('')
  // Live camera — when on we show a mirrored self-view circle over
  // the blob so users can line up their face before analysis. Keeps
  // the MediaStream in a ref so React re-renders don't re-trigger
  // getUserMedia (which would pop the permission prompt again). The
  // `liveAnalyzing` flag locks the Analyze button while we're
  // capturing + uploading + waiting for the model's reply.
  const [liveCamActive, setLiveCamActive] = useState(false)
  const [liveCamError, setLiveCamError] = useState<string | null>(null)
  const [liveAnalyzing, setLiveAnalyzing] = useState(false)
  const liveVideoRef = useRef<HTMLVideoElement | null>(null)
  const liveStreamRef = useRef<MediaStream | null>(null)
  // Continuous vision state — while the Live camera is on we poll
  // `/api/live/analyze` every few seconds so the assistant describes
  // what it sees in real time (Gemini Live-style). `liveDetecting`
  // is the "scanning" indicator on the self-view; `liveHistoryRef`
  // is a rolling window of recent observations so the model knows
  // what it already told the user and doesn't repeat itself.
  const [liveDetecting, setLiveDetecting] = useState(false)
  const liveAnalyzeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const liveAnalyzeInFlightRef = useRef(false)
  const liveHistoryRef = useRef<string[]>([])
  // Forward-declared ref to sendMessageWithConsent so the Live
  // capture/upload helpers (which must be defined above the main
  // send function to satisfy other closures) can still invoke it.
  // Wired up in a useEffect further down once the real function
  // exists in this render.
  const sendMessageRef = useRef<
    | ((content: string, consent?: boolean, attachments?: Attachment[]) => Promise<void>)
    | null
  >(null)
  // Chat-level hint banner telling new users about Live. Persisted
  // so we don't nag returning users — they dismiss once and it's
  // gone forever across reloads and sessions.
  const [liveHintDismissed, setLiveHintDismissed] = useState(true)
  // Hydrate the viewer's last-picked Live voice from localStorage on
  // mount. Kept inside a useEffect (rather than a useState lazy
  // initializer) because localStorage isn't available during SSR.
  useEffect(() => {
    try {
      const saved = localStorage.getItem('derma-live-voice')
      if (saved) {
        setLiveVoiceId(saved)
        liveVoiceIdRef.current = saved
      }
      // Show the Live-mode hint banner to brand-new users. Once
      // dismissed (via the X on the banner) we never show it again.
      // Default is "dismissed" during SSR so the banner never
      // flickers on first paint.
      const hintSeen = localStorage.getItem('derma-live-hint-seen')
      if (!hintSeen) setLiveHintDismissed(false)
    } catch { /* ignore storage errors */ }
  }, [])
  // Derma AI Live voice picker state. `liveVoiceId` is the slug
  // (e.g. "ada") the server resolves against the shared catalog.
  // We hydrate it from localStorage after mount so SSR doesn't
  // render one value and the client another — avoids a hydration
  // mismatch warning in dev. `showVoicePicker` is the full-screen
  // sheet the user sees when they tap the phone icon.
  const [liveVoiceId, setLiveVoiceId] = useState<string>(DEFAULT_LIVE_VOICE_ID)
  const [showVoicePicker, setShowVoicePicker] = useState(false)
  // Keep the picker's "last chosen voice" in a ref so the speak
  // helper (which is memoized) always reads the latest value even
  // when it was called from a handler captured before a voice swap.
  const liveVoiceIdRef = useRef<string>(DEFAULT_LIVE_VOICE_ID)
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
  // When the user picks "Bad response" (or leaves a rating) we open a
  // small inline modal to capture an optional comment + 1-5 star
  // rating. `feedbackTargetId` points at the assistant message being
  // rated; `null` means the modal is closed.
  const [feedbackTargetId, setFeedbackTargetId] = useState<string | null>(null)
  const [feedbackKind, setFeedbackKind] = useState<'up' | 'down'>('down')
  const [feedbackDraft, setFeedbackDraft] = useState('')
  const [feedbackRating, setFeedbackRating] = useState(0)
  // Selected reason chips on the thumbs-down modal. At least one is
  // required before Submit enables (or a 10+ char written comment).
  // Multi-select because a single bad reply can fail on several axes
  // at once (inaccurate *and* off-topic, etc.).
  const [feedbackReasons, setFeedbackReasons] = useState<string[]>([])
  // Two-step delete confirmation for sidebar sessions — first click
  // the kebab's Delete row arms this id, second click (or the confirm
  // sheet's primary button) actually removes the session.
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  // Id of the user turn being edited. When set, the composer shows
  // a Claude-style "Editing message" banner above the input so the
  // user understands the next submit replaces this turn instead of
  // appending to the conversation.
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  // Id of the message whose text we're displaying in the read-only
  // "Select text" modal. Mirrors Claude's Select Text sheet — a
  // large, selectable copy of the message so mobile users can grab
  // exact phrases without fighting the chat's touch handlers.
  const [selectTextId, setSelectTextId] = useState<string | null>(null)
  // Transient micro-toast — used to confirm the feedback submit
  // ("Thanks, this helps Derma improve"). Kept local to this
  // component so it doesn't need a provider. `null` hides the toast.
  const [transientToast, setTransientToast] = useState<string | null>(null)
  // Derma AI Settings sheet — slides up from bottom over the chat.
  // Exposes capability toggles (memory, voice, inline maps, proactive
  // suggestions), text size, privacy actions (clear history, forget
  // memories) and legal links. Design-inspired by Claude's Settings
  // screen but rebuilt in Dermaspace's purple brand tokens.
  const [showSettingsSheet, setShowSettingsSheet] = useState(false)
  // Which settings page is visible. 'root' is the main list; tapping a
  // row drills into a sub-page so the sheet stays readable on phones
  // instead of becoming one long scroll of every possible control.
  const [settingsPage, setSettingsPage] = useState<
    'root' | 'capabilities' | 'appearance' | 'privacy' | 'about'
  >('root')
  // Text-size preference — applied as a className on the chat panel so
  // it scales every message bubble uniformly (headers stay fixed).
  // Persisted to localStorage so it survives reloads.
  const [textSize, setTextSize] = useState<'small' | 'default' | 'large'>('default')
  // Capability toggles (separate from the per-category aiPermissions
  // kept in /dashboard/settings, which gate *which tools* the model
  // can call). These toggles gate *how* the assistant responds.
  const [memoryEnabled, setMemoryEnabled] = useState(true)
  const [proactiveSuggestions, setProactiveSuggestions] = useState(true)
  const [inlineMapsEnabled, setInlineMapsEnabled] = useState(true)

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
  // Ref mirror of the "did the user actually drag this tap?" flag. We can't
  // rely on `isDragging` inside the onClick handler because React's state
  // update from the prior pointermove / pointerup is still batched when the
  // synthetic click fires on mobile — so the closure reads a stale value and
  // the launcher stops responding to taps after the first tiny jitter. A ref
  // is flushed synchronously and never lies to us.
  const draggedRef = useRef(false)

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

  // Hydrate chat-panel UI preferences (text size + capability toggles)
  // on mount. These are shared across all users on the device — they
  // describe how the chat *looks* and *feels*, not who is using it.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const rawPrefs = localStorage.getItem('derma-ai-prefs')
      if (rawPrefs) {
        const p = JSON.parse(rawPrefs) as {
          textSize?: 'small' | 'default' | 'large'
          memoryEnabled?: boolean
          proactiveSuggestions?: boolean
          inlineMapsEnabled?: boolean
          voiceEnabled?: boolean
        }
        if (p.textSize === 'small' || p.textSize === 'default' || p.textSize === 'large') {
          setTextSize(p.textSize)
        }
        if (typeof p.memoryEnabled === 'boolean') setMemoryEnabled(p.memoryEnabled)
        if (typeof p.proactiveSuggestions === 'boolean') setProactiveSuggestions(p.proactiveSuggestions)
        if (typeof p.inlineMapsEnabled === 'boolean') setInlineMapsEnabled(p.inlineMapsEnabled)
        if (typeof p.voiceEnabled === 'boolean') setVoiceEnabled(p.voiceEnabled)
      }
    } catch { /* ignore corrupt */ }
  }, [])

  // Persist UI preferences whenever they change.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(
        'derma-ai-prefs',
        JSON.stringify({ textSize, memoryEnabled, proactiveSuggestions, inlineMapsEnabled, voiceEnabled }),
      )
    } catch { /* ignore quota */ }
  }, [textSize, memoryEnabled, proactiveSuggestions, inlineMapsEnabled, voiceEnabled])

  // Hydrate memories once on mount. Schema: { memories: string[] }.
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

  // Remembers the last resolved auth state so we can detect the
  // SIGN-OUT transition (true → false) and proactively wipe the
  // previous user's on-screen conversation + every local bucket.
  // `undefined` = we haven't resolved auth yet on this mount.
  const previousAuthRef = useRef<boolean | undefined>(undefined)

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
              avatarUrl: data.user.avatarUrl ?? null,
              preferences: data.preferences || undefined
            })
            setIsLoggedIn(true)
            // Sign-in succeeded: clear the anonymous bucket so the
            // pre-login "hello guest" chat doesn't linger on a shared
            // device for the next anonymous visitor.
            try {
              localStorage.removeItem('derma-chat-sessions::__anon__')
              localStorage.removeItem('derma-chat-active::__anon__')
            } catch { /* ignore */ }
          } else {
            setIsLoggedIn(false)
            setUserInfo({})
          }
        } else {
          // 401 / 403 / anything non-OK means no session.
          setIsLoggedIn(false)
          setUserInfo({})
        }
      } catch {
        // Network error — treat as anonymous so the assistant still
        // nudges the user to sign in instead of silently asking for
        // permission to an account it can't read.
        setIsLoggedIn(false)
        setUserInfo({})
      }
    }
    fetchUser()
  }, [])

  // Auth transition watcher. When we detect a sign-OUT (was logged in
  // on a previous tick, now logged out) we:
  //   1. Blank the on-screen conversation so the signed-out viewer
  //      doesn't see the just-departed user's last messages.
  //   2. Close the chat widget so the next opener starts fresh.
  //   3. Close any open consent / sidebar / settings surfaces.
  //   4. Revoke account-access consent — connecting to Derma AI has
  //      to happen again on the next sign-in.
  //   5. Wipe BOTH the previous user's chat bucket AND the anonymous
  //      bucket so a later visitor on the same device starts clean.
  // The hydration effect below will then re-run against the new
  // (anonymous) scope and populate an empty state.
  useEffect(() => {
    if (isLoggedIn === null) return
    const prev = previousAuthRef.current
    previousAuthRef.current = isLoggedIn
    if (prev === true && isLoggedIn === false) {
      setMessages([])
      setSessions([])
      setCurrentSessionId('')
      setIsOpen(false)
      setShowSidebar(false)
      setShowSettingsSheet(false)
      setShowConsentPrompt(false)
      setAccountAccessConsent(false)
      try {
        localStorage.removeItem('derma-account-consent')
        localStorage.removeItem('derma-chat-sessions::__anon__')
        localStorage.removeItem('derma-chat-active::__anon__')
        // Sweep every user-scoped bucket — safest for shared devices.
        // Keys look like `derma-chat-sessions::u:email@x.com`.
        const toRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i)
          if (!k) continue
          if (k.startsWith('derma-chat-sessions::') || k.startsWith('derma-chat-active::')) {
            toRemove.push(k)
          }
        }
        toRemove.forEach((k) => localStorage.removeItem(k))
      } catch { /* ignore quota / storage errors */ }
    }
  }, [isLoggedIn])

  // Per-user storage scope. Chat sessions + active conversation are
  // saved under a key that includes the signed-in user's email so a
  // signed-out visitor (or a DIFFERENT user on the same device) NEVER
  // inherits the previous account's chat history. Anonymous visitors
  // get their own "__anon__" bucket that is cleared the moment
  // somebody signs in, so no crossover leaks the other direction
  // either.
  //
  // We intentionally include the auth state in the bucket so hydration
  // re-runs whenever login / logout happens, and the in-memory
  // messages/sessions are reset to whatever belongs to the new
  // identity (or an empty state for a brand-new anonymous viewer).
  const storageScope =
    isLoggedIn === null
      ? null
      : isLoggedIn && userInfo?.email
        ? `u:${userInfo.email.toLowerCase()}`
        : '__anon__'
  const sessionsKey = storageScope ? `derma-chat-sessions::${storageScope}` : null
  const activeKey = storageScope ? `derma-chat-active::${storageScope}` : null

  // Hydrate from localStorage whenever the storage scope changes (i.e.
  // initial mount once auth resolves, then again on sign-in/sign-out).
  // Previously this was a one-shot effect keyed to [], which meant a
  // user's chats persisted in a shared global key and leaked across
  // sign-out, sign-in as someone else, etc.
  useEffect(() => {
    if (!sessionsKey || !activeKey) return

    let hadActive = false
    try {
      // One-time migration: fold the legacy global keys into the
      // currently-signed-in user's bucket the first time we see them,
      // then delete them. That way an existing user doesn't lose the
      // chat they were in the middle of when we shipped this change.
      const legacySessions = localStorage.getItem('derma-chat-sessions')
      const legacyActive = localStorage.getItem('derma-chat-active')
      if (legacySessions || legacyActive) {
        if (legacySessions && !localStorage.getItem(sessionsKey)) {
          localStorage.setItem(sessionsKey, legacySessions)
        }
        if (legacyActive && !localStorage.getItem(activeKey)) {
          localStorage.setItem(activeKey, legacyActive)
        }
        localStorage.removeItem('derma-chat-sessions')
        localStorage.removeItem('derma-chat-active')
      }

      const savedSessions = localStorage.getItem(sessionsKey)
      if (savedSessions) {
        const parsed = JSON.parse(savedSessions) as ChatSession[]
        const restored = parsed.map((s) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          messages: s.messages.map((m) => ({ ...m, timestamp: new Date(m.timestamp) })),
        }))
        setSessions(restored)
      } else {
        // Nothing saved under this scope → reset the list so the old
        // user's sessions don't linger in React state.
        setSessions([])
      }

      const savedActive = localStorage.getItem(activeKey)
      if (savedActive) {
        const {
          sessionId,
          messages: activeMessages,
          isOpen: wasOpen,
        } = JSON.parse(savedActive) as {
          sessionId: string
          messages: Message[]
          isOpen?: boolean
        }
        if (Array.isArray(activeMessages) && activeMessages.length > 0) {
          setCurrentSessionId(sessionId || '')
          setMessages(
            activeMessages.map((m) => ({ ...m, timestamp: new Date(m.timestamp) })),
          )
          if (wasOpen) setIsOpen(true)
          hadActive = true
        }
      }

      if (!hadActive) {
        // New scope with no active chat → wipe in-memory so the
        // welcome greeting for THIS identity gets re-generated.
        setCurrentSessionId('')
        setMessages([])
      }
    } catch {
      /* ignore corrupt storage */
    }
    setHasHydrated(true)
  }, [sessionsKey, activeKey])

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
  // Writes go to the CURRENT user's bucket — never the global key —
  // so a later sign-out cannot reveal this chat to the next viewer.
  useEffect(() => {
    if (!hasHydrated || !sessionsKey) return
    try {
      localStorage.setItem(sessionsKey, JSON.stringify(sessions))
    } catch { /* quota */ }
  }, [sessions, hasHydrated, sessionsKey])

  // Persist the ACTIVE conversation (messages + sessionId + open state) on every
  // change so a page refresh restores the exact chat + open-modal state.
  useEffect(() => {
    if (!hasHydrated || !activeKey) return
    const hasRealContent = messages.some(m => m.role === 'user')
    try {
      if (hasRealContent) {
        localStorage.setItem(
          activeKey,
          JSON.stringify({ sessionId: currentSessionId, messages, isOpen })
        )
      } else if (!isOpen) {
        localStorage.removeItem(activeKey)
      }
    } catch { /* quota */ }
  }, [messages, currentSessionId, hasHydrated, isOpen, activeKey])

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

  // Listen for custom event to open chat. Skipped when the mount
  // component drives us (it owns the listener so the event still fires
  // even if this heavy component fails to mount).
  useEffect(() => {
    if (isControlled) return
    const handleOpen = () => setIsOpen(true)
    window.addEventListener('openDermaAI', handleOpen)
    return () => window.removeEventListener('openDermaAI', handleOpen)
  }, [isControlled, setIsOpen])

  // Tell the parent `DermaAIMount` that the panel actually
  // rendered, and stamp the moment it opened so the backdrop can
  // ignore iOS phantom clicks that fire ~300ms after the launcher
  // tap (see backdrop handler below for the full rationale).
  useEffect(() => {
    if (!isOpen) return
    panelOpenedAtRef.current = Date.now()
    if (typeof window === 'undefined') return
    try {
      window.dispatchEvent(new Event('dermaAIPanelReady'))
    } catch {
      /* event constructor unavailable in very old browsers; the
         launcher will still recover on the next pointer interaction */
    }
  }, [isOpen])

  // Text to speech. Two entry points use this:
  //  1. The automatic read-out path (voice-call mode, or when the
  //     user has toggled the global auto-read switch on). Those
  //     callers don't pass a messageId and we just skip the
  //     per-bubble tracking.
  //  2. The per-message Speak button — passes the message id so we
  //     can light up the matching bubble, spinner while loading the
  //     audio, "stop" affordance while playing, and auto-restore
  //     when playback finishes.
  // `opts.force` bypasses the global voiceEnabled gate so the
  // per-message button works even when auto-read is off (which is
  // now the default).
  const speakText = useCallback(async (
    text: string,
    opts?: { messageId?: string; force?: boolean },
  ) => {
    if (!opts?.force && !voiceEnabled) return
    if (isSpeaking) {
      // If the user taps Speak again while another message is
      // playing, treat it as "stop current playback" so a tap on
      // the active bubble is intuitive.
      try { audioRef.current?.pause() } catch { /* ignore */ }
      setIsSpeaking(false)
      setSpeakingMessageId(null)
      setCallStatus('idle')
      return
    }
    try {
      setIsSpeaking(true)
      if (opts?.messageId) setSpeakingMessageId(opts.messageId)
      setCallStatus('speaking')
      const cleanText = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/\n/g, ' ').substring(0, 500)

      const response = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // liveVoiceIdRef always holds the latest user-picked voice, even
        // when this callback was memoized before the most recent swap.
        body: JSON.stringify({ text: cleanText, voice: liveVoiceIdRef.current })
      })

      if (response.ok) {
        const audioBlob = await response.blob()
        const audioUrl = URL.createObjectURL(audioBlob)

        if (!audioRef.current) audioRef.current = new Audio()
        audioRef.current.src = audioUrl
        audioRef.current.onended = () => {
          setIsSpeaking(false)
          setSpeakingMessageId(null)
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
        setSpeakingMessageId(null)
        setCallStatus('idle')
      }
    } catch {
      setIsSpeaking(false)
      setSpeakingMessageId(null)
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

  // Tapping the phone icon now opens the voice picker first. The
  // picker sheet handles previews and confirmation; only when the
  // user taps "Start Derma AI Live" do we flip into voice-call mode
  // via `beginVoiceCallWithVoice`.
  const startVoiceCall = () => {
  setShowVoicePicker(true)
  }

  const beginVoiceCallWithVoice = async (voiceId: string) => {
    // Persist the user's pick and keep both the state and the ref
    // in sync — the speak helper reads from the ref so it sees the
    // most recent value even on the very first utterance of the call.
    try { localStorage.setItem('derma-live-voice', voiceId) } catch { /* ignore */ }
    setLiveVoiceId(voiceId)
    liveVoiceIdRef.current = voiceId
    setShowVoicePicker(false)
    setVoiceCallMode(true)
    setVoiceEnabled(true)
    setLiveMuted(false)
    setLiveCaption('')
    setCallStatus('listening')

    // Try to start a real Vapi voice-to-voice session. If credentials
    // aren't configured (or the SDK fails to load) fall back to the
    // legacy Web Speech + ElevenLabs path so Live still works in dev.
    const vapi = await getVapi()
    const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID
    if (vapi && assistantId) {
      vapiRef.current = vapi
      const voice = liveVoiceIdRef.current
      const elevenId = (await import('@/lib/derma-live-voices')).resolveLiveVoice(voice).elevenLabsVoiceId
      try {
        vapi.on('call-start', () => setCallStatus('listening'))
        vapi.on('speech-start', () => setCallStatus('speaking'))
        vapi.on('speech-end', () => setCallStatus('listening'))
        vapi.on('volume-level', (...args: unknown[]) => {
          const v = typeof args[0] === 'number' ? args[0] : 0
          setVapiAmp(Math.max(0, Math.min(1, v)))
        })
        vapi.on('message', (...args: unknown[]) => {
          const msg = args[0] as { type?: string; transcript?: string; role?: string } | undefined
          if (msg?.type === 'transcript' && msg.role === 'assistant' && msg.transcript) {
            setLiveCaption(msg.transcript)
          }
        })
        vapi.on('call-end', () => {
          setVoiceCallMode(false)
          setCallStatus('idle')
          setVapiAmp(0)
          vapiRef.current = null
        })
        vapi.on('error', (...args: unknown[]) => {
          console.error('[v0] Vapi error:', args[0])
        })
        await vapi.start(assistantId, voiceToVapiOverrides(elevenId))
        return
      } catch (err) {
        console.warn('[v0] Vapi start failed, falling back to Web Speech:', err)
        vapiRef.current = null
      }
    }

    // Fallback path.
    setIsListening(true)
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start()
      } catch { /* ignore */ }
    }
  }

  const endVoiceCall = () => {
    // Tear down Vapi first if it's running. The call-end handler
    // also sets voiceCallMode=false, but we set it synchronously
    // here so the UI transitions immediately on tap.
    if (vapiRef.current) {
      try { vapiRef.current.stop() } catch { /* ignore */ }
      vapiRef.current = null
    }
    // Release the camera if it's open — leaving a stream running
    // after the call ends is a privacy footgun and keeps the OS
    // camera indicator lit.
    if (liveStreamRef.current) {
      liveStreamRef.current.getTracks().forEach((t) => {
        try { t.stop() } catch { /* ignore */ }
      })
      liveStreamRef.current = null
    }
    setLiveCamActive(false)
    setLiveCamError(null)
    setLiveAnalyzing(false)
    setLiveDetecting(false)
    if (liveAnalyzeTimerRef.current) {
      clearTimeout(liveAnalyzeTimerRef.current)
      liveAnalyzeTimerRef.current = null
    }
    liveHistoryRef.current = []
    setVoiceCallMode(false)
    setCallStatus('idle')
    setIsListening(false)
    setVapiAmp(0)
    setLiveCaption('')
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

  const toggleLiveMute = () => {
    setLiveMuted((m) => {
      const next = !m
      try { vapiRef.current?.setMuted(next) } catch { /* ignore */ }
      // Fallback path: stop/start recognition to mute user audio.
      if (!vapiRef.current && recognitionRef.current) {
        try {
          if (next) recognitionRef.current.stop()
          else recognitionRef.current.start()
        } catch { /* ignore */ }
      }
      return next
    })
  }

  // ── Live camera ────────────────────────────────────────────────
  // Opens the user-facing camera and pipes its MediaStream into the
  // video element we render on top of the blob. We prefer front-cam
  // (facingMode: 'user') because Live's primary job is face / skin
  // analysis. On denial we surface a small inline error instead of
  // throwing — the rest of the Live session should keep working.
  const stopLiveCamera = useCallback(() => {
    if (liveStreamRef.current) {
      liveStreamRef.current.getTracks().forEach((t) => {
        try { t.stop() } catch { /* ignore */ }
      })
      liveStreamRef.current = null
    }
    if (liveVideoRef.current) {
      try { liveVideoRef.current.srcObject = null } catch { /* ignore */ }
    }
    // Wipe observation history so the next time the user toggles the
    // camera we don't carry over stale context.
    liveHistoryRef.current = []
    setLiveDetecting(false)
    setLiveCamActive(false)
  }, [])

  const startLiveCamera = useCallback(async () => {
    setLiveCamError(null)
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setLiveCamError('Camera not supported on this device.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      liveStreamRef.current = stream
      setLiveCamActive(true)
      // Attach on next tick so the <video> element has definitely
      // rendered — setting srcObject before mount is a silent no-op.
      requestAnimationFrame(() => {
        if (liveVideoRef.current && liveStreamRef.current) {
          liveVideoRef.current.srcObject = liveStreamRef.current
          liveVideoRef.current.play().catch(() => { /* autoplay policy */ })
        }
      })
    } catch (err) {
      console.warn('[v0] Live camera error:', err)
      const msg = err instanceof Error ? err.message : 'Camera unavailable'
      setLiveCamError(
        msg.toLowerCase().includes('denied') || msg.toLowerCase().includes('permission')
          ? 'Camera permission denied. Enable it in your browser settings.'
          : 'Camera unavailable. Try again.',
      )
      setLiveCamActive(false)
    }
  }, [])

  const toggleLiveCamera = useCallback(() => {
    if (liveCamActive) stopLiveCamera()
    else startLiveCamera()
  }, [liveCamActive, startLiveCamera, stopLiveCamera])

  // Grab a JPEG data URL from the current video frame. Centralised so
  // both the one-shot capture path and the continuous-analysis loop
  // read the frame the exact same way (mirror-corrected, quality 0.7
  // for the poll so we don't hammer the network, 0.9 for captures).
  //
  // NOTE — declaration order matters.
  // This used to live BELOW `captureAndAnalyze`, which listed it in
  // its dependency array. Under Turbopack production builds that
  // surfaced as `ReferenceError: Cannot access 'aH' before
  // initialization` on every fresh load (the dep array reads the
  // const before its initializer has run — TDZ). Keep
  // `grabFrameDataUrl` declared BEFORE every callback that depends
  // on it (`captureAndAnalyze` and the continuous-detection loop).
  const grabFrameDataUrl = useCallback((quality = 0.7, maxSide = 720): string | null => {
    const video = liveVideoRef.current
    if (!video || video.readyState < 2) return null
    const vw = video.videoWidth || 720
    const vh = video.videoHeight || 960
    // Downscale so we never ship a full 1080p frame through the API.
    const scale = Math.min(1, maxSide / Math.max(vw, vh))
    const w = Math.max(32, Math.round(vw * scale))
    const h = Math.max(32, Math.round(vh * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(video, 0, 0, w, h)
    try {
      return canvas.toDataURL('image/jpeg', quality)
    } catch {
      return null
    }
  }, [])

  // Capture the current video frame, upload it through the same
  // `/api/chat/upload` endpoint the composer uses, then send it as a
  // chat message so the assistant can describe what it sees. The
  // reply streams back via the normal chat pipeline and we surface
  // the first line as the Live caption so the user gets feedback
  // without leaving the Live canvas.
  const captureAndAnalyze = useCallback(async () => {
    if (!liveCamActive || liveAnalyzing) return
    const video = liveVideoRef.current
    if (!video || video.readyState < 2) {
      setLiveCamError('Camera is still loading — try again in a second.')
      return
    }
    setLiveAnalyzing(true)
    setLiveCamError(null)
    try {
      // Higher-quality frame for the full analysis path (the
      // continuous loop runs at 0.7 / 720; we want 0.9 / 1280 here
      // so the model has the sharpest pixels to work with).
      const dataUrl = grabFrameDataUrl(0.9, 1280)
      if (!dataUrl) throw new Error('Frame capture failed')
      const blob = await (await fetch(dataUrl)).blob()
      const fd = new FormData()
      fd.append('file', new File([blob], `live-capture-${Date.now()}.jpg`, { type: 'image/jpeg' }))
      const res = await fetch('/api/chat/upload', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('Upload failed')
      const attachment = (await res.json()) as Attachment
      // Send through the normal chat pipeline so the reply flows
      // back into the conversation (and any tool calls run). We
      // echo the first 120 chars of the upcoming response into the
      // caption bar via an effect below.
      setLiveCaption('Analyzing your skin…')
      // Read the current sendMessageWithConsent via a ref so this
      // helper can be declared above the function itself without
      // hitting a TDZ error. The ref is wired up below, once
      // sendMessageWithConsent exists.
      const send = sendMessageRef.current
      if (send) {
        await send(
          'I just captured a photo of my face in Live. Please analyze my skin: tone, visible concerns, and suggest Dermaspace services or products that could help.',
          undefined,
          [attachment],
        )
      }
    } catch (err) {
      console.warn('[v0] Live capture failed:', err)
      setLiveCamError(err instanceof Error ? err.message : 'Capture failed')
    } finally {
      setLiveAnalyzing(false)
    }
  }, [liveCamActive, liveAnalyzing, grabFrameDataUrl])

  // (`grabFrameDataUrl` lives above `captureAndAnalyze` — see the
  // TDZ note there.)

  // Continuous detection loop. Runs only while Live's camera is on
  // and we're not already generating a full capture-and-analyze
  // response (that would step on this loop). Poll cadence is 3s,
  // which feels live without melting the phone or the API budget.
  useEffect(() => {
    if (!voiceCallMode || !liveCamActive || liveAnalyzing) {
      setLiveDetecting(false)
      if (liveAnalyzeTimerRef.current) {
        clearTimeout(liveAnalyzeTimerRef.current)
        liveAnalyzeTimerRef.current = null
      }
      return
    }

    let cancelled = false

    const tick = async () => {
      if (cancelled) return
      if (liveAnalyzeInFlightRef.current) {
        // Still waiting on the previous frame — skip this tick and
        // try again on the next cadence so we never queue up.
        liveAnalyzeTimerRef.current = setTimeout(tick, 3000)
        return
      }
      const image = grabFrameDataUrl(0.7, 720)
      if (!image) {
        liveAnalyzeTimerRef.current = setTimeout(tick, 2000)
        return
      }
      liveAnalyzeInFlightRef.current = true
      setLiveDetecting(true)
      try {
        const res = await fetch('/api/live/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image,
            history: liveHistoryRef.current,
          }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as { observation?: string }
        const obs = (data.observation || '').trim()
        if (obs && !cancelled) {
          liveHistoryRef.current = [...liveHistoryRef.current, obs].slice(-5)
          setLiveCaption(obs)
        }
      } catch (err) {
        console.warn('[v0] Live analyze tick failed:', err)
      } finally {
        liveAnalyzeInFlightRef.current = false
        setLiveDetecting(false)
        if (!cancelled) {
          liveAnalyzeTimerRef.current = setTimeout(tick, 3000)
        }
      }
    }

    // Small warm-up delay so the camera has a real frame before the
    // first poll (readyState=2 is also guarded in grabFrameDataUrl).
    liveAnalyzeTimerRef.current = setTimeout(tick, 900)

    return () => {
      cancelled = true
      if (liveAnalyzeTimerRef.current) {
        clearTimeout(liveAnalyzeTimerRef.current)
        liveAnalyzeTimerRef.current = null
      }
    }
  }, [voiceCallMode, liveCamActive, liveAnalyzing, grabFrameDataUrl])

  // Quick "upload from gallery" flow inside Live — piggybacks on the
  // existing hidden <input type="file"> via fileInputRef, but we set
  // a flag so handleFileSelect auto-sends the image with an analysis
  // prompt instead of just sticking it in the composer queue.
  const liveUploadRequestedRef = useRef(false)
  const triggerLiveUpload = useCallback(() => {
    if (!fileInputRef.current) return
    liveUploadRequestedRef.current = true
    fileInputRef.current.click()
  }, [])

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
  // Heuristic: does this message imply the user is asking about
  // THEIR own account data or asking us to take an action on their
  // account? If so, and they aren't signed in, we short-circuit to
  // the in-chat "please sign in" card before the request ever reaches
  // the server (otherwise the model falls through to the "account
  // disconnected" branch and says "Tap Reconnect" to a user who
  // isn't even logged in, which is confusing). Keep the list broad
  // but precise — prefer "my X" phrases over bare nouns so we don't
  // accidentally flag "how do tickets work?" as an account question.
  const requiresAccountAccess = (content: string) => {
    const lower = content.toLowerCase()

    // Fast bare-noun matches for unambiguous personal-data words.
    const bareKeywords = [
      'balance', 'wallet', 'top-up', 'top up', 'topup',
      'my transactions', 'transaction history', 'payment history',
      'my bookings', 'my booking', 'my appointment', 'my appointments',
      'my ticket', 'my tickets', 'support ticket', 'my complaint', 'my complaints',
      'my account', 'my profile', 'my info', 'my details',
      'my order', 'my orders', 'order history',
      'my notifications', 'my activity',
      'my preferences', 'my favorites', 'my favourites',
      'my membership', 'my memberships', 'my gift card', 'my gift cards',
      'my email', 'my phone', 'my username', 'my password',
      'log me out', 'sign me out', 'log out', 'logout', 'sign out', 'signout',
      'reset my password', 'change my password',
    ]
    if (bareKeywords.some((k) => lower.includes(k))) return true

    // Possessive-style patterns: "cancel/reschedule/view/see/show + my/the + booking/appointment/ticket/etc."
    if (
      /\b(cancel|reschedule|view|see|show|open|check|pull up|bring up)\b.*\b(my|the)\b\s+(booking|bookings|appointment|appointments|ticket|tickets|order|orders|profile|account|wallet|balance|notification|notifications|activity|complaint|complaints)\b/.test(
        lower,
      )
    ) {
      return true
    }

    // Things that only make sense for the signed-in user.
    if (/\b(fund|top ?up|add money to)\b.*\bwallet\b/.test(lower)) return true
    if (/\b(pay|paying)\b.*\bfrom my wallet\b/.test(lower)) return true

    return false
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
      content: "Account linked. I can now view your wallet, bookings, profile, transactions, and notifications, and help you with secure actions like password resets and email verification.",
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
              "Account linked. I can now view your wallet, bookings, profile, transactions, and notifications, and help with secure actions like password resets.",
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
    // Optimistic loader label — derive a best-guess tool from the
    // outgoing text so the user sees "Fetching your wallet…" right
    // away. When the real tool-call event arrives from the stream,
    // it overwrites this. When the model answers without tools,
    // text streaming hides the loader anyway.
    const guessed = guessToolFromText(content.trim())
    setActiveTool(guessed)
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
          // conversations from yesterday / last week with full
          // continuity. Respects the Settings > Capabilities >
          // "Long-term memory" switch — when the user turns it off we
          // stop forwarding memories AND stop the model from calling
          // saveMemory / forgetMemory (enforced server-side via
          // `memoryEnabled: false`).
          memories: memoryEnabled ? memories : [],
          memoryEnabled,
          proactiveSuggestions,
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
              // First chunk of prose is arriving — tear down the
              // loader label defensively. Some providers don't emit
              // a `text-start` event, so relying on that alone leaves
              // the label visible (e.g. "Checking your wallet") even
              // after the model has pivoted to composing the reply.
              if (!fullContent) {
                setActiveTool(null)
              }
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

  // Only auto-read inside a live voice call. Everywhere else the
  // user opts in per message via the Speak button (ChatGPT-style).
  // Previously this ran whenever `voiceEnabled` was true, which
  // fired audio unexpectedly and felt intrusive.
  if (voiceCallMode && fullContent) {
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

  // Keep the Live helpers (captureAndAnalyze, triggerLiveUpload) in
  // sync with the latest sendMessageWithConsent closure. We can't
  // put sendMessageWithConsent in their dep arrays because they are
  // declared above it (the hoisting order is driven by how Live
  // state is grouped with the rest of the Live code).
  useEffect(() => {
    sendMessageRef.current = sendMessageWithConsent
  }, [sendMessageWithConsent])

  // While a Live session is active, echo the assistant's streaming
  // reply into the Live caption rail so users who captured a photo
  // or uploaded one from Live can read the analysis without leaving
  // the canvas. Strips markdown formatting for cleaner captions.
  useEffect(() => {
    if (!voiceCallMode) return
    if (!streamingContent) return
    const plain = streamingContent
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/#{1,6}\s*/g, '')
      .replace(/\n+/g, ' ')
      .trim()
    setLiveCaption(plain.slice(-280))
  }, [voiceCallMode, streamingContent])

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

  // Edit a user turn: truncate history back to (but excluding) the
  // message being edited, pre-fill the composer with its text, and
  // focus the input so the user can tweak + resend. This matches
  // ChatGPT / Claude's edit flow where a new reply re-runs from the
  // edited point instead of mutating the old bubble in place.
  const editUserMessage = useCallback((messageId: string) => {
    const idx = messages.findIndex(m => m.id === messageId)
    if (idx < 0) return
    const target = messages[idx]
    if (target.role !== 'user') return
    // Preserve the full history until submit — we only trim it if
    // the user actually sends. That way they can abandon the edit
    // without losing the conversation.
    setEditingMessageId(messageId)
    setInput(target.content)
    setOpenActionsMenuId(null)
    setTimeout(() => inputRef.current?.focus(), 30)
  }, [messages])

  // Abandon an in-progress edit and restore the composer to blank.
  // Called by the banner's close button and by the Escape key.
  const cancelEdit = useCallback(() => {
    setEditingMessageId(null)
    setInput('')
  }, [])

  // Record a thumbs up/down on an assistant reply. Thumbs-up is
  // silent (sets the state, closes the sheet); thumbs-down opens a
  // feedback modal so users can tell us what went wrong + optionally
  // leave a star rating.
  const reactToMessage = useCallback((messageId: string, kind: 'up' | 'down') => {
    // Votes are immutable once cast (YouTube / Gemini / ChatGPT
    // pattern) — further taps on either thumb do nothing rather than
    // silently flipping the stored sentiment, which we'd otherwise
    // send to the backend as a fresh opinion.
    const existing = messages.find(m => m.id === messageId)
    if (existing?.feedback) return
    setOpenActionsMenuId(null)
    if (kind === 'down') {
      // Down is NOT committed here — we only open the modal. The
      // message stays neutral until submitFeedback() runs, so
      // cancelling the sheet leaves no "flagged" indicator behind.
      setFeedbackTargetId(messageId)
      setFeedbackKind('down')
      setFeedbackDraft('')
      setFeedbackRating(0)
      setFeedbackReasons([])
    } else {
      // Thumbs-up has no modal, so commit on tap + surface a toast.
      setMessages(prev => prev.map(m => (
        m.id === messageId
          ? { ...m, feedback: 'up', rating: undefined, feedbackComment: undefined, feedbackReasons: undefined }
          : m
      )))
      const msg = 'Thanks for the feedback.'
      setTransientToast(msg)
      setTimeout(() => {
        setTransientToast(current => (current === msg ? null : current))
      }, 2000)
    }
  }, [messages])

  // Submit the written comment + star rating from the feedback modal
  // onto the target message. We store locally for now; a /api/feedback
  // POST can be wired in once the backend endpoint exists without
  // changing this surface.
  const submitFeedback = useCallback(() => {
    if (!feedbackTargetId) return
    // Mandatory gate (matches YouTube / ChatGPT "send feedback"):
    // require at least one reason chip, or a written comment of 10+
    // chars. Prevents empty "👎 then Submit" noise that's useless for
    // triage. The UI already disables the button in this state — this
    // is belt-and-braces so programmatic submits can't slip through.
    const trimmedDraft = feedbackDraft.trim()
    if (feedbackKind === 'down' && feedbackReasons.length === 0 && trimmedDraft.length < 10) {
      return
    }
    setMessages(prev => prev.map(m => (
      m.id === feedbackTargetId
        ? {
            ...m,
            feedback: feedbackKind,
            rating: feedbackRating || undefined,
            feedbackComment: trimmedDraft || undefined,
            feedbackReasons: feedbackReasons.length > 0 ? feedbackReasons : undefined,
          }
        : m
    )))
    setFeedbackTargetId(null)
    setFeedbackDraft('')
    setFeedbackRating(0)
    setFeedbackReasons([])
    // Surface a small acknowledgement so the user sees their input
    // was received. 2.4s is long enough to read "Thanks" but short
    // enough to fade before they read the next reply.
    setTransientToast('Thanks — this helps Derma improve.')
    setTimeout(() => {
      setTransientToast(current => (current === 'Thanks — this helps Derma improve.' ? null : current))
    }, 2400)
  }, [feedbackTargetId, feedbackKind, feedbackRating, feedbackDraft, feedbackReasons])

  // Close the long-press action sheet on Escape. A dimmed backdrop
  // handles tap-outside dismissal (see the bottom sheet JSX below),
  // so we don't need a document-level mousedown listener here — that
  // listener used to fire before the menuitem click and swallow the
  // action.
  useEffect(() => {
    if (!openActionsMenuId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenActionsMenuId(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
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
    // In edit mode, truncate history back to the message we're
    // replacing so sendMessage() effectively re-runs from that turn.
    // We clear the banner first so the next render reflects the new
    // state, even if sendMessage is async.
    if (editingMessageId) {
      const idx = messages.findIndex(m => m.id === editingMessageId)
      if (idx >= 0) {
        setMessages(messages.slice(0, idx))
      }
      setEditingMessageId(null)
    }
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
      // Live upload path: user tapped the Upload button inside
      // Derma AI Live. Skip the composer queue entirely and send
      // the image straight through with an analysis prompt so the
      // assistant can reply without the user having to type.
      if (liveUploadRequestedRef.current) {
        liveUploadRequestedRef.current = false
        setLiveCaption('Analyzing your photo…')
        const send = sendMessageRef.current
        if (send) {
          await send(
            'I just shared a photo in Live. Please analyze my skin and recommend the right Dermaspace services or products.',
            undefined,
            [data],
          )
        }
      } else {
        setPendingAttachments(prev => [...prev, data])
      }
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
          on `isPageMode` to skip it entirely. When controlled by
          DermaAIMount the parent renders a simpler, always-visible
          launcher + owns the openDermaAI event listener, so we skip
          our own launcher here to avoid two buttons stacking. */}
      {!isPageMode && !isControlled && !hideLauncher && (
      <button
        ref={buttonRef}
        onClick={() => {
          // Suppress the click if the pointer actually moved more than the
          // drag threshold during this gesture — otherwise lifting your
          // finger after dragging would also open the chat. We read a ref
          // (not `isDragging` state) because the synthetic click fires in
          // the same tick as pointerup on mobile and the state update
          // would still be batched.
          if (draggedRef.current) {
            draggedRef.current = false
            return
          }
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
          draggedRef.current = true
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
          draggedRef.current = false
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
          is open. In page mode there's nothing to dim behind.
          
          The 350ms guard on the click handler is iOS phantom-click
          protection. Mobile Safari fires a synthetic `click` event
          ~300ms after `touchend` at the ORIGINAL touch coordinates,
          so when the user taps the launcher and React paints the
          backdrop in the same tick, that delayed click can land on
          the backdrop and slam the panel shut a frame after it
          opened. Refusing to close for a brief window after the
          panel mounts kills that whole class of "tapped the
          launcher and the chat just disappeared" reports without
          affecting genuine outside-clicks. */}
      {!isPageMode && isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[58] md:bg-transparent md:backdrop-blur-none"
          onClick={() => {
            if (Date.now() - panelOpenedAtRef.current < 350) return
            setIsOpen(false)
            setShowSidebar(false)
            endVoiceCall()
          }}
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
            underneath on desktop without adding any visual weight.
            Wrapped in DermaAIPanelBoundary so any render exception
            inside the chat tree (sessions, memories, attachments,
            voice, etc.) shows a recoverable fallback in-place
            instead of unmounting the entire DermaAI tree (which
            would also kill the floating launcher and force the
            user to refresh). */}
        <DermaAIPanelBoundary
          onClose={() => {
            setIsOpen(false)
            setShowSidebar(false)
          }}
        >
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
            isPageMode ? 'w-72' : 'w-72'
          } flex flex-col transition-transform duration-300 z-10 ${
            showSidebar ? 'translate-x-0' : '-translate-x-full'
          } ${isPageMode ? 'md:translate-x-0' : ''}`}
          style={{
            // Soft two-tone rail — a subtle lavender wash at the top
            // fading into pure white. Gives the sidebar a brand feel
            // without colouring the conversation rows themselves.
            background:
              'linear-gradient(180deg, #FAF4FB 0%, #FFFFFF 220px, #FFFFFF 100%)',
            boxShadow: 'inset -1px 0 0 rgba(17, 17, 17, 0.04)',
          }}>
            {/* Brand header — the butterfly mark + "Derma AI" wordmark
                now live inside the sidebar on desktop, giving the rail
                a proper identity instead of the generic "New chat" pill.
                A subtle gradient underline separates it from the list. */}
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-[#7B2D8E] to-[#5A1D6A] flex items-center justify-center shadow-sm shadow-[#7B2D8E]/30 flex-shrink-0">
                    <ButterflyLogo className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0 leading-tight">
                    <p className="text-[13.5px] font-bold text-gray-900 truncate">Derma AI</p>
                    <p className="text-[10px] font-medium tracking-wider uppercase text-[#7B2D8E] truncate">Your skin concierge</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSidebar(false)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-[#7B2D8E] hover:bg-[#7B2D8E]/10 transition-colors flex-shrink-0 ${
                    isPageMode ? 'md:hidden' : ''
                  }`}
                  aria-label="Close chat history"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Primary action — new chat. Gradient brand fill, bigger
                  touch target than the old pill. Matches the launcher
                  button elsewhere in the app. */}
              <button
                onClick={startNewChat}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-white text-[13px] font-semibold rounded-xl active:scale-[0.98] transition-all shadow-sm shadow-[#7B2D8E]/20"
                style={{
                  background:
                    'linear-gradient(135deg, #7B2D8E 0%, #9B4DB0 100%)',
                }}
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
                New chat
              </button>

              {/* Search — filters the conversation list live. Hidden
                  when there are zero sessions so the empty state isn't
                  cluttered. */}
              {sessions.length > 0 && (
                <div className="mt-3 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" aria-hidden="true" />
                  <input
                    type="search"
                    value={sidebarSearch}
                    onChange={(e) => setSidebarSearch(e.target.value)}
                    placeholder="Search chats"
                    className="w-full pl-9 pr-8 py-2 text-[12.5px] text-gray-800 bg-white border border-gray-200/70 rounded-lg placeholder:text-gray-400 focus:outline-none focus:border-[#7B2D8E]/40 focus:ring-2 focus:ring-[#7B2D8E]/10 transition-all"
                    aria-label="Search conversations"
                  />
                  {sidebarSearch && (
                    <button
                      type="button"
                      onClick={() => setSidebarSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full text-gray-400 hover:text-[#7B2D8E] hover:bg-[#7B2D8E]/10 transition-colors"
                      aria-label="Clear search"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto px-2 pb-2">
              {sessions.length === 0 ? (
                <div className="px-3 py-10 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#7B2D8E]/10 to-[#9B4DB0]/20 flex items-center justify-center mx-auto mb-3 ring-1 ring-[#7B2D8E]/15">
                    <MessageSquare className="w-5 h-5 text-[#7B2D8E]" />
                  </div>
                  <p className="text-[13px] font-semibold text-gray-800">No chats yet</p>
                  <p className="text-[11px] text-gray-500 mt-1 leading-relaxed max-w-[200px] mx-auto">
                    Ask Derma AI about your skin, bookings or wallet to start your first chat.
                  </p>
                </div>
              ) : (
                (() => {
                  // Group sessions by "Today / Yesterday / Older" so the
                  // list reads like a real messaging surface. Filter by
                  // the sidebar search query first so empty buckets
                  // drop out entirely.
                  const query = sidebarSearch.trim().toLowerCase()
                  const filtered = query
                    ? sessions.filter((s) => {
                        if (s.title?.toLowerCase().includes(query)) return true
                        return s.messages.some((m) =>
                          m.content?.toLowerCase().includes(query),
                        )
                      })
                    : sessions

                  if (filtered.length === 0) {
                    return (
                      <div className="px-3 py-10 text-center">
                        <p className="text-[12px] font-semibold text-gray-700">No chats match</p>
                        <p className="text-[11px] text-gray-500 mt-1">
                          Try a different word from the conversation.
                        </p>
                      </div>
                    )
                  }

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
                  for (const s of filtered.slice(0, 40)) {
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
                            <div className="flex items-center gap-2 px-2 pt-2 pb-1.5">
                              <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-[#7B2D8E]/70">
                                {bucket.label}
                              </p>
                              <span className="text-[10px] font-medium text-gray-300">
                                {bucket.items.length}
                              </span>
                              <span className="flex-1 h-px bg-gradient-to-r from-[#7B2D8E]/15 to-transparent" aria-hidden="true" />
                            </div>
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
                                    className={`group relative flex items-center gap-2 pl-3 pr-1.5 py-2.5 rounded-xl transition-all ${
                                      isActive
                                        ? 'bg-gradient-to-r from-[#7B2D8E]/8 via-white to-white shadow-[0_1px_2px_rgba(123,45,142,0.06)] ring-1 ring-[#7B2D8E]/15'
                                        : 'hover:bg-[#7B2D8E]/[0.04]'
                                    }`}
                                  >
                                    {/* Active indicator bar — taller and
                                        gradient-filled for a richer
                                        brand feel on the active row. */}
                                    {isActive && (
                                      <span
                                        className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-gradient-to-b from-[#9B4DB0] to-[#7B2D8E]"
                                        aria-hidden="true"
                                      />
                                    )}

                                    {/* Title + preview (or rename input)
                                        — no avatar tile. Rows read as a
                                        clean text list (Claude-style),
                                        using the left accent bar on the
                                        active row as the only graphic
                                        cue. */}
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
                                                  // Route through the confirm
                                                  // sheet instead of deleting
                                                  // immediately — we close the
                                                  // kebab menu first so the
                                                  // confirm sheet takes focus.
                                                  setOpenMenuSessionId(null)
                                                  setDeleteConfirmId(session.id)
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#7B2D8E] hover:bg-[#7B2D8E]/8 transition-colors"
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
            {/* Footer — sits on a white card with a subtle top rule so
                it feels like a dedicated "toolbar" anchored to the
                bottom of the rail rather than an afterthought. */}
            <div className="mx-2 mb-2 bg-white rounded-xl border border-gray-100 shadow-sm p-1 flex items-center gap-0.5">
              <button
                type="button"
                onClick={exportCurrentChat}
                disabled={!messages.some((m) => m.role === 'user')}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-[11px] font-semibold text-gray-600 hover:text-[#7B2D8E] hover:bg-[#7B2D8E]/5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Export this conversation"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
              <span className="w-px h-5 bg-gray-100" aria-hidden="true" />
              <button
                type="button"
                onClick={() => setShowClearAllConfirm(true)}
                disabled={sessions.length === 0}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-[11px] font-semibold text-gray-600 hover:text-[#7B2D8E] hover:bg-[#7B2D8E]/5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
                      className="flex-1 py-2 text-xs font-semibold text-white bg-[#7B2D8E] rounded-lg hover:bg-[#6B2278] transition-colors"
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
              <div className="flex-1 relative flex flex-col bg-black text-white overflow-hidden">
                {/* Header — "Live" label + captions toggle, matching
                    the Gemini Live reference. Icons sit on black so
                    they stay readable over the blob. */}
                <div className="relative z-20 flex items-center justify-center px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-2">
                  <div className="inline-flex items-center gap-2 text-[15px] font-semibold tracking-tight">
                    <AudioLines className="w-4 h-4" />
                    Live
                  </div>
                  <button
                    type="button"
                    onClick={() => setLiveCaptionsOn((v) => !v)}
                    className="absolute right-3 top-[calc(max(env(safe-area-inset-top),1rem))] w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-95 transition"
                    aria-label={liveCaptionsOn ? 'Turn captions off' : 'Turn captions on'}
                    aria-pressed={liveCaptionsOn}
                  >
                    {liveCaptionsOn ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M7 12h3M14 12h3" strokeLinecap="round" /></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M4 4l16 16" strokeLinecap="round" /></svg>
                    )}
                  </button>
                </div>

                {/* Caption / status rail — shares space with the
                    camera self-view when the camera is on. The video
                    goes up top (so you can frame your face against
                    the caption), and the caption rail drops below. */}
                <div className="relative z-20 flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
                  {liveCamActive && (
                    <div className="relative flex flex-col items-center gap-3">
                      <div className="relative w-52 h-52 rounded-full overflow-hidden ring-2 ring-white/20 shadow-2xl shadow-[#7B2D8E]/40">
                        <video
                          ref={liveVideoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover scale-x-[-1]"
                          aria-label="Your camera preview"
                        />
                        {/* Rotating conic ring — only visible while a
                            frame is actively being analyzed by the
                            vision model. Gives users the same signal
                            Gemini Live does ("I'm looking"). */}
                        {liveDetecting && !liveAnalyzing && (
                          <span
                            aria-hidden="true"
                            className="absolute -inset-1 rounded-full opacity-80 pointer-events-none"
                            style={{
                              background:
                                'conic-gradient(from 0deg, transparent 0deg, #ffffff 40deg, transparent 120deg)',
                              animation: 'derma-live-scan 1.4s linear infinite',
                              mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))',
                              WebkitMask:
                                'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))',
                            }}
                          />
                        )}
                        {/* Live indicator pill floating over the cam. */}
                        {!liveAnalyzing && (
                          <span className="absolute top-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-[10px] font-semibold tracking-widest uppercase text-white">
                            <span className={`w-1.5 h-1.5 rounded-full ${liveDetecting ? 'bg-[#ff4d6d] animate-pulse' : 'bg-white/70'}`} />
                            {liveDetecting ? 'Scanning' : 'Live'}
                          </span>
                        )}
                        {liveAnalyzing && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white animate-spin" aria-hidden="true" />
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={captureAndAnalyze}
                        disabled={liveAnalyzing}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-[#7B2D8E] text-sm font-semibold hover:bg-white/90 active:scale-95 transition disabled:opacity-50"
                      >
                        {liveAnalyzing ? 'Analyzing…' : 'Deep analysis'}
                      </button>
                    </div>
                  )}
                  {liveCamError && (
                    <p className="text-[12px] text-red-300 max-w-xs" role="alert">
                      {liveCamError}
                    </p>
                  )}
                  {liveCaptionsOn && liveCaption ? (
                    <p className="text-[15px] leading-relaxed text-white/80 max-w-md text-balance line-clamp-4" aria-live="polite">
                      {liveCaption}
                    </p>
                  ) : (
                    <p className="text-[15px] text-white/60" aria-live="polite">
                      {liveCamActive && !liveCamError
                        ? 'Frame your face, then tap Capture & analyze'
                        : callStatus === 'listening' ? 'Tap or talk to interrupt Derma'
                        : callStatus === 'speaking' ? 'Derma is speaking…'
                        : callStatus === 'processing' ? 'Thinking…'
                        : 'Connecting…'}
                    </p>
                  )}
                </div>

                {/* Ambient reactive blob — bottom portion of canvas. */}
                <div
                  aria-hidden
                  className="absolute left-1/2 -translate-x-1/2 bottom-[20%] w-[180%] h-[55%] pointer-events-none z-0"
                  style={{
                    transform: `translate(-50%, 0) scale(${1 + vapiAmp * 0.35})`,
                    transition: 'transform 90ms linear',
                    filter: `blur(${60 + vapiAmp * 40}px)`,
                    background:
                      'radial-gradient(45% 55% at 30% 55%, rgba(123,45,142,0.95) 0%, rgba(123,45,142,0) 70%), radial-gradient(55% 55% at 70% 50%, rgba(190,120,210,0.85) 0%, rgba(190,120,210,0) 70%), radial-gradient(60% 40% at 50% 60%, rgba(220,170,235,0.8) 0%, rgba(220,170,235,0) 70%)',
                    animation: 'derma-blob-drift 7s ease-in-out infinite',
                  }}
                />
                <div
                  aria-hidden
                  className="absolute left-1/2 -translate-x-1/2 bottom-[10%] w-[140%] h-[40%] pointer-events-none z-0"
                  style={{
                    transform: 'translate(-50%, 0)',
                    filter: 'blur(50px)',
                    background:
                      'radial-gradient(50% 60% at 50% 70%, rgba(235,205,245,0.55) 0%, rgba(235,205,245,0) 60%)',
                    animation: 'derma-blob-drift 9s ease-in-out infinite reverse',
                    opacity: 0.7,
                  }}
                />

                {/* Bottom control bar. Video / Upload / Mic / End.
                    All four controls are live now — Video opens the
                    front camera, Upload sends a photo from the
                    user's gallery, Mic toggles the assistant's
                    ability to hear, and End closes the session. */}
                <div className="relative z-20 px-4 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-2">
                  <div className="max-w-md mx-auto flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={toggleLiveCamera}
                      className={`w-12 h-12 rounded-full active:scale-95 transition flex items-center justify-center ${
                        liveCamActive ? 'bg-white text-[#7B2D8E]' : 'bg-white/10 hover:bg-white/15'
                      }`}
                      aria-label={liveCamActive ? 'Stop camera' : 'Start camera for skin analysis'}
                      aria-pressed={liveCamActive}
                      title={liveCamActive ? 'Stop camera' : 'Analyze my skin'}
                    >
                      <Video className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={triggerLiveUpload}
                      disabled={isUploading}
                      className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/15 active:scale-95 transition flex items-center justify-center disabled:opacity-50"
                      aria-label="Upload a photo for analysis"
                      title="Upload photo"
                    >
                      {isUploading ? (
                        <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" aria-hidden="true" />
                      ) : (
                        <Upload className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={toggleLiveMute}
                      className={`w-12 h-12 rounded-full active:scale-95 transition flex items-center justify-center ${
                        liveMuted ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/15'
                      }`}
                      aria-label={liveMuted ? 'Unmute microphone' : 'Mute microphone'}
                      aria-pressed={liveMuted}
                    >
                      <Mic className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={endVoiceCall}
                      className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 transition flex items-center justify-center"
                      aria-label="End Derma AI Live session"
                    >
                      <X className="w-5 h-5" strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
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
                    {/* Derma AI Live used to live here as a Phone icon
                        in the header. We moved it into the composer
                        (next to Send) so the entry-point sits exactly
                        where Gemini puts its Live button — at the user's
                        thumb, not at the top of the chat. The header now
                        only carries the avatar / settings entry-point. */}
                    {/* The global speaker toggle previously lived
                        here. It was removed — each assistant reply
                        now has its own Speak button, which is both
                        less surprising (no audio unless the user
                        explicitly asks) and obviates the global on/off
                        toggle in the header. The auto-read capability
                        still exists for users who want it — it's
                        controlled from Settings → Capabilities. */}
                    {/* User avatar → opens the in-chat settings sheet.
                        Replaces the old gear icon so the header
                        matches modern messengers (iMessage, WhatsApp)
                        where tapping the other party's avatar opens
                        the conversation settings. Falls back to
                        initials, and to the butterfly glyph when the
                        viewer isn't signed in. */}
                    <button
                      onClick={() => { setSettingsPage('root'); setShowSettingsSheet(true) }}
                      className="ml-0.5 w-8 h-8 rounded-full overflow-hidden ring-1 ring-[#7B2D8E]/15 bg-white hover:ring-[#7B2D8E]/40 transition-[box-shadow,transform] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2D8E]/60 flex items-center justify-center"
                      aria-label="Open Derma AI settings"
                      title="Settings"
                    >
                      {userInfo.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={userInfo.avatarUrl}
                          alt={userInfo.name ? `${userInfo.name} avatar` : 'Your avatar'}
                          className="w-full h-full object-cover"
                        />
                      ) : userInfo.name ? (
                        <span className="text-[11px] font-semibold text-[#7B2D8E]">
                          {userInfo.name.charAt(0).toUpperCase()}
                        </span>
                      ) : (
                        <SettingsIcon className="w-3.5 h-3.5 text-[#7B2D8E]" />
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
                    bubbles themselves do the heavy visual lifting.
                    Text-size classes are applied on the outer scroll
                    container so assistant + user bubbles scale together
                    (rem-based via Tailwind's base scale). */}
                <div
                  className={`flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50 relative ${
                    textSize === 'small'
                      ? 'text-[13px]'
                      : textSize === 'large'
                        ? 'text-[16px]'
                        : 'text-[14px]'
                  }`}
                >
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

                        {/* Live mode hint — one-time pitch for the
                            voice-to-voice + camera experience.
                            Dismissing it writes to localStorage so
                            returning users never see it again. */}
                        {!liveHintDismissed && (
                          <div className="mt-5 w-full max-w-[320px] bg-gradient-to-br from-[#7B2D8E] to-[#5F2270] rounded-2xl p-4 text-left shadow-lg shadow-[#7B2D8E]/20 relative animate-[derma-msg-in_0.4s_ease-out_both]">
                            <button
                              type="button"
                              onClick={() => {
                                setLiveHintDismissed(true)
                                try { localStorage.setItem('derma-live-hint-seen', '1') } catch { /* ignore */ }
                              }}
                              className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                              aria-label="Dismiss Live hint"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center">
                                <AudioLines className="w-3.5 h-3.5 text-white" />
                              </span>
                              <p className="text-[11px] font-semibold tracking-widest uppercase text-white/80">New · Derma AI Live</p>
                            </div>
                            <p className="text-[13px] text-white font-medium leading-snug mb-2.5 text-pretty">
                              Talk to me in real time and let me analyze your skin through your camera.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setLiveHintDismissed(true)
                                try { localStorage.setItem('derma-live-hint-seen', '1') } catch { /* ignore */ }
                                startVoiceCall()
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[#7B2D8E] text-[12px] font-semibold hover:bg-white/90 active:scale-95 transition"
                            >
                              <AudioLines className="w-3.5 h-3.5" />
                              Try Live
                            </button>
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
                                        <p className="text-xs font-semibold text-[#7B2D8E]">Account linked</p>
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
                          {/* Column width: user bubbles stay compact
                              on the right (82%) since they're usually
                              short. Assistant messages get 92% so
                              inline cards (reconnect, ticket, wallet,
                              booking previews) have room to breathe —
                              previously they were pinched into the
                              same 82% column and felt cramped against
                              the rounded container. */}
                          <div className={`flex flex-col gap-1.5 ${message.role === 'user' ? 'items-end max-w-[82%]' : 'items-start max-w-[92%]'}`}>
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
                              const isUser = message.role === 'user'
                              const isAssistant = message.role === 'assistant'
                              const isWelcomeOrBanner = message.banner || message.id === 'welcome'
                              const justCopied = copiedMessageId === message.id
                              const isOpen = openActionsMenuId === message.id
                              const isLatest = messages[messages.length - 1]?.id === message.id

                              const bubbleInner = (
                                <div dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }} />
                              )

                              const bubbleClass = isUser
                                ? 'bg-[#7B2D8E] text-white rounded-2xl rounded-br-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]'
                                : 'bg-[#7B2D8E]/[0.08] text-gray-800 rounded-2xl rounded-bl-md'

                              // Non-actionable (welcome / banners) → plain bubble.
                              if (isWelcomeOrBanner || (!isUser && !isAssistant)) {
                                return (
                                  <div className={`relative px-3.5 py-2.5 text-[13.5px] leading-relaxed ${bubbleClass}`}>
                                    {bubbleInner}
                                  </div>
                                )
                              }

                              // Assistant reply → plain bubble + inline
                              // action row underneath (Copy /
                              // Regenerate / Good / Bad). No long-press,
                              // no hold-to-reveal — the actions are
                              // always visible, same as ChatGPT / Claude
                              // desktop. The icons are low-contrast so
                              // they read as controls without stealing
                              // attention from the reply copy.
                              if (isAssistant) {
                                const ActionIconBtn = ({
                                  label,
                                  onClick,
                                  active,
                                  variant = 'soft',
                                  disabled,
                                  children,
                                }: {
                                  label: string
                                  onClick: () => void
                                  active?: boolean
                                  // 'soft' = low-contrast hover state used
                                  // by Copy/Regenerate; 'solid' = filled
                                  // brand chip used by thumbs-up/down so a
                                  // vote reads clearly as committed.
                                  variant?: 'soft' | 'solid'
                                  // Used for the un-picked thumb once a
                                  // vote has been cast — prevents flipping
                                  // the sentiment after it's locked.
                                  disabled?: boolean
                                  children: React.ReactNode
                                }) => {
                                  const activeCls =
                                    variant === 'solid'
                                      ? 'text-white bg-[#7B2D8E] shadow-[0_1px_0_0_rgba(0,0,0,0.04)]'
                                      : 'text-[#7B2D8E] bg-[#7B2D8E]/10'
                                  const restingCls = disabled
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : 'text-gray-400 hover:text-[#7B2D8E] hover:bg-[#7B2D8E]/8'
                                  return (
                                    <button
                                      type="button"
                                      onClick={onClick}
                                      aria-label={label}
                                      aria-disabled={disabled || undefined}
                                      title={label}
                                      disabled={disabled}
                                      className={`inline-flex w-7 h-7 items-center justify-center rounded-lg transition-colors ${
                                        active ? activeCls : restingCls
                                      }`}
                                    >
                                      {children}
                                    </button>
                                  )
                                }
                                // Once any vote is recorded the opposing
                                // thumb is locked, matching YouTube /
                                // ChatGPT / Gemini. The currently-active
                                // thumb stays rendered so the user can
                                // still see what they chose.
                                const hasVoted = !!message.feedback
                                return (
                                  <div className="relative">
                                    <div className={`relative px-3.5 py-2.5 text-[13.5px] leading-relaxed select-text ${bubbleClass}`}>
                                      {bubbleInner}
                                    </div>
                                    <div className="mt-1 -ml-1 flex items-center gap-0.5">
                                      <ActionIconBtn
                                        label={justCopied ? 'Copied' : 'Copy message'}
                                        onClick={() => copyMessage(message.id, message.content)}
                                        active={justCopied}
                                      >
                                        {justCopied ? (
                                          <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                                        ) : (
                                          <Copy className="w-3.5 h-3.5" />
                                        )}
                                      </ActionIconBtn>
                                      {/* Per-message Speak button. Plays this
                                          specific reply via ElevenLabs on tap.
                                          Tapping the active bubble again (or
                                          tapping Speak on any OTHER bubble
                                          while one is already playing) stops
                                          playback — speakText() handles the
                                          toggle. `force: true` bypasses the
                                          global voiceEnabled gate so the
                                          button works even when auto-read is
                                          off (which is now the default). */}
                                      {(() => {
                                        const isThis = speakingMessageId === message.id
                                        const label = isThis
                                          ? 'Stop speaking'
                                          : isSpeaking
                                            ? 'Replace current audio with this reply'
                                            : 'Speak this reply'
                                        return (
                                          <ActionIconBtn
                                            label={label}
                                            onClick={() => speakText(message.content, { messageId: message.id, force: true })}
                                            active={isThis}
                                            variant="solid"
                                          >
                                            {isThis ? (
                                              <Volume2 className="w-3.5 h-3.5 fill-white" strokeWidth={2.25} />
                                            ) : (
                                              <Volume2 className="w-3.5 h-3.5" />
                                            )}
                                          </ActionIconBtn>
                                        )
                                      })()}
                                      {isLatest && !isLoading && (
                                        <ActionIconBtn
                                          label="Regenerate reply"
                                          onClick={regenerateLastResponse}
                                        >
                                          <RotateCcw className="w-3.5 h-3.5" />
                                        </ActionIconBtn>
                                      )}
                                      <ActionIconBtn
                                        label={
                                          message.feedback === 'up'
                                            ? 'You liked this reply'
                                            : hasVoted
                                              ? 'Feedback already recorded'
                                              : 'Good response'
                                        }
                                        onClick={() => reactToMessage(message.id, 'up')}
                                        active={message.feedback === 'up'}
                                        variant="solid"
                                        disabled={hasVoted && message.feedback !== 'up'}
                                      >
                                        <ThumbsUp
                                          className={`w-3.5 h-3.5 ${message.feedback === 'up' ? 'fill-white' : ''}`}
                                          strokeWidth={message.feedback === 'up' ? 2.25 : 2}
                                        />
                                      </ActionIconBtn>
                                      <ActionIconBtn
                                        label={
                                          message.feedback === 'down'
                                            ? 'You flagged this reply'
                                            : hasVoted
                                              ? 'Feedback already recorded'
                                              : 'Bad response'
                                        }
                                        onClick={() => reactToMessage(message.id, 'down')}
                                        active={message.feedback === 'down'}
                                        variant="solid"
                                        disabled={hasVoted && message.feedback !== 'down'}
                                      >
                                        <ThumbsDown
                                          className={`w-3.5 h-3.5 ${message.feedback === 'down' ? 'fill-white' : ''}`}
                                          strokeWidth={message.feedback === 'down' ? 2.25 : 2}
                                        />
                                      </ActionIconBtn>
                                    </div>
                                  </div>
                                )
                              }

                              // User turn — long-press / right-click
                              // still reveals a Copy / Edit sheet, same
                              // as iMessage. We keep the hold gesture
                              // here because a user turn doesn't need a
                              // permanent action row under it.
                              const openMenu = () => setOpenActionsMenuId(message.id)
                              const pressTimer: { current: ReturnType<typeof setTimeout> | null } = { current: null }
                              const clearPress = () => {
                                if (pressTimer.current) {
                                  clearTimeout(pressTimer.current)
                                  pressTimer.current = null
                                }
                              }
                              return (
                                <div className="relative">
                                  <div
                                    onPointerDown={(e) => {
                                      if ((e.target as HTMLElement).closest('a')) return
                                      clearPress()
                                      pressTimer.current = setTimeout(() => {
                                        openMenu()
                                        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                                          try { (navigator as Navigator & { vibrate?: (pattern: number | number[]) => boolean }).vibrate?.(8) } catch {}
                                        }
                                      }, 450)
                                    }}
                                    onPointerUp={clearPress}
                                    onPointerLeave={clearPress}
                                    onPointerCancel={clearPress}
                                    onContextMenu={(e) => {
                                      if ((e.target as HTMLElement).closest('a')) return
                                      e.preventDefault()
                                      clearPress()
                                      openMenu()
                                    }}
                                    aria-haspopup="menu"
                                    aria-expanded={isOpen}
                                    className={`relative px-3.5 py-2.5 text-[13.5px] leading-relaxed transition-colors select-text ${bubbleClass} ${
                                      isOpen ? 'ring-2 ring-white/40' : ''
                                    }`}
                                    style={{ WebkitTouchCallout: 'none' }}
                                  >
                                    {bubbleInner}
                                    {justCopied && !isOpen && (
                                      <span className="absolute -top-2 -left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#7B2D8E] text-white text-[10px] font-medium shadow-sm">
                                        <Check className="w-3 h-3" strokeWidth={3} />
                                        Copied
                                      </span>
                                    )}
                                  </div>
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
                              inlineMapsEnabled={inlineMapsEnabled}
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
                      
                      {/* Action Cards. Every card falls into one of two
                          buckets:
                          • An `onClick` handler (e.g. "Sign in", "Link
                            account") — we render a <button> so the
                            callback actually fires instead of trying
                            to navigate to `#` and reloading the page.
                          • A `link` target — we render a <Link> and
                            also close the floating panel on tap so
                            the user lands on the destination page
                            instead of staring at the chat panel
                            covering it. In page mode the chat is the
                            page itself, so we skip the close there. */}
                      {message.actions && message.actions.length > 0 && (
                        <div className="ml-2 sm:ml-9 mt-3 flex flex-wrap gap-2">
                          {message.actions.map((action, idx) => {
                            const cardClass =
                              'flex items-center gap-2.5 px-3.5 py-2.5 bg-white border border-gray-200 rounded-2xl hover:border-[#7B2D8E]/40 hover:shadow-md hover:shadow-[#7B2D8E]/5 transition-all group text-left'
                            const cardInner = (
                              <>
                                <div className="w-8 h-8 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center text-[#7B2D8E]">
                                  <ActionIcon type={action.icon} />
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-gray-900">{action.title}</p>
                                  <p className="text-[10px] text-gray-500">{action.description}</p>
                                </div>
                                <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#7B2D8E] group-hover:translate-x-0.5 transition-all" />
                              </>
                            )

                            if (action.onClick) {
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={action.onClick}
                                  className={cardClass}
                                >
                                  {cardInner}
                                </button>
                              )
                            }

                            return (
                              <Link
                                key={idx}
                                href={action.link || '#'}
                                onClick={() => {
                                  if (!isPageMode) {
                                    setIsOpen(false)
                                    setShowSidebar(false)
                                  }
                                }}
                                className={cardClass}
                              >
                                {cardInner}
                              </Link>
                            )
                          })}
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
                      <div className="max-w-[92%] px-3.5 py-2.5 bg-white border border-gray-200 rounded-2xl rounded-bl-md text-sm text-gray-800 leading-relaxed">
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

                {/* Long-press message actions — a bottom sheet that
                    slides up from the panel's lower edge when the user
                    holds an assistant bubble. Mirrors the Claude / iOS
                    pattern (icon + label rows, dimmed backdrop, tap
                    outside to dismiss) but keeps our Dermaspace purple
                    accent and standard 13–14px type scale instead of
                    Claude's serif. We render it once per panel rather
                    than once per message so only one sheet is ever
                    mounted in the tree. */}
                {openActionsMenuId && (() => {
                  const target = messages.find(m => m.id === openActionsMenuId)
                  // Assistant replies use an inline action row instead
                  // of a bottom sheet now, so the sheet only opens for
                  // user turns (Copy + Edit).
                  if (!target || target.role !== 'user') return null
                  const rowCls = 'w-full flex items-center gap-3 px-5 py-3 text-[14px] text-gray-800 hover:bg-[#7B2D8E]/5 active:bg-[#7B2D8E]/10 transition-colors'
                  const iconCls = 'inline-flex w-8 h-8 items-center justify-center rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E] flex-shrink-0'
                  return (
                    <>
                      <div
                        className="absolute inset-0 z-30 bg-black/30 animate-[derma-backdrop-in_0.18s_ease-out]"
                        onClick={() => setOpenActionsMenuId(null)}
                      />
                      <div
                        role="menu"
                        aria-label="Message actions"
                        className="absolute left-0 right-0 bottom-0 z-40 bg-white rounded-t-2xl shadow-[0_-8px_32px_-8px_rgba(17,24,39,0.22)] pt-2 pb-4 animate-[derma-sheet-up_0.22s_cubic-bezier(0.22,1,0.36,1)_both]"
                      >
                        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-gray-200" />
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => copyMessage(target.id, target.content)}
                          className={rowCls}
                        >
                          <span className={iconCls}><Copy className="w-4 h-4" /></span>
                          <span>Copy message</span>
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setSelectTextId(target.id)
                            setOpenActionsMenuId(null)
                          }}
                          className={rowCls}
                        >
                          <span className={iconCls}><TextCursor className="w-4 h-4" /></span>
                          <span>Select text</span>
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => editUserMessage(target.id)}
                          className={rowCls}
                        >
                          <span className={iconCls}><Pencil className="w-4 h-4" /></span>
                          <span>Edit message</span>
                        </button>
                      </div>
                    </>
                  )
                })()}

                {/* Feedback detail modal — opens when the user picks
                    "Bad response" so we can capture an optional star
                    rating + short written comment. Mirrors the Claude
                    "Submit feedback" bottom sheet pattern but stays
                    inside our purple brand palette. */}
                {feedbackTargetId && (
                  <>
                    <div
                      className="absolute inset-0 z-30 bg-black/30 animate-[derma-backdrop-in_0.18s_ease-out]"
                      onClick={() => setFeedbackTargetId(null)}
                    />
                    <div
                      role="dialog"
                      aria-label="Leave feedback"
                      className="absolute left-0 right-0 bottom-0 z-40 bg-white rounded-t-2xl shadow-[0_-8px_32px_-8px_rgba(17,24,39,0.22)] animate-[derma-sheet-up_0.22s_cubic-bezier(0.22,1,0.36,1)_both]"
                    >
                      <div className="mx-auto my-2 h-1 w-10 rounded-full bg-gray-200" />
                      <div className="px-5 pb-5 max-h-[75vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex w-8 h-8 items-center justify-center rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E]">
                              <ThumbsDown className="w-4 h-4" />
                            </span>
                            <div>
                              <p className="text-[14px] font-semibold text-gray-900 leading-tight">Tell us what went wrong</p>
                              <p className="text-[11.5px] text-gray-500 leading-tight mt-0.5">Pick at least one reason so we can fix it.</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFeedbackTargetId(null)}
                            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0"
                            aria-label="Close"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Reason chips — multi-select. The pattern
                            ChatGPT / Gemini / YouTube all use: quick
                            taps on specific failure modes feed better
                            analytics than a free-text blob. At least
                            one MUST be selected (unless the user
                            writes a 10+ char comment). */}
                        <div className="mb-4">
                          <p className="text-[11.5px] font-medium text-gray-600 mb-2">What was the issue?</p>
                          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Reasons">
                            {[
                              'Not accurate',
                              "Didn't follow instructions",
                              'Not helpful',
                              'Off-topic',
                              'Too long',
                              'Offensive or unsafe',
                              'Other',
                            ].map((reason) => {
                              const active = feedbackReasons.includes(reason)
                              return (
                                <button
                                  key={reason}
                                  type="button"
                                  aria-pressed={active}
                                  onClick={() => {
                                    setFeedbackReasons(prev => (
                                      prev.includes(reason)
                                        ? prev.filter(r => r !== reason)
                                        : [...prev, reason]
                                    ))
                                  }}
                                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
                                    active
                                      ? 'bg-[#7B2D8E] border-[#7B2D8E] text-white'
                                      : 'bg-white border-gray-200 text-gray-700 hover:border-[#7B2D8E]/40 hover:bg-[#7B2D8E]/5'
                                  }`}
                                >
                                  {reason}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* Star rating row */}
                        <div className="mb-4">
                          <p className="text-[11.5px] font-medium text-gray-600 mb-1.5">Rate this reply (optional)</p>
                          <div className="flex items-center gap-1" role="radiogroup" aria-label="Star rating">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <button
                                key={n}
                                type="button"
                                role="radio"
                                aria-checked={feedbackRating === n}
                                aria-label={`${n} star${n === 1 ? '' : 's'}`}
                                onClick={() => setFeedbackRating(n)}
                                className="p-1"
                              >
                                <Star
                                  className={`w-6 h-6 transition-colors ${
                                    feedbackRating >= n
                                      ? 'text-[#7B2D8E] fill-[#7B2D8E]'
                                      : 'text-gray-300'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        <label className="block">
                          <span className="text-[11.5px] font-medium text-gray-600">
                            Add more detail
                            {feedbackReasons.length === 0 && (
                              <span className="text-[#7B2D8E]"> (required if no reason picked)</span>
                            )}
                          </span>
                          <textarea
                            value={feedbackDraft}
                            onChange={(e) => setFeedbackDraft(e.target.value)}
                            rows={3}
                            maxLength={500}
                            placeholder="e.g. The price was wrong, or the booking link didn't work."
                            className="mt-1.5 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-[13px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#7B2D8E]/40 focus:ring-2 focus:ring-[#7B2D8E]/15"
                          />
                          <div className="mt-1 flex items-center justify-between text-[10.5px] text-gray-400">
                            <span>We read every report.</span>
                            <span>{feedbackDraft.length}/500</span>
                          </div>
                        </label>

                        {(() => {
                          const canSubmit =
                            feedbackReasons.length > 0 || feedbackDraft.trim().length >= 10
                          return (
                            <button
                              type="button"
                              onClick={submitFeedback}
                              disabled={!canSubmit}
                              className={`mt-4 w-full py-2.5 rounded-xl text-[13px] font-semibold transition-colors ${
                                canSubmit
                                  ? 'bg-[#7B2D8E] text-white hover:bg-[#6B2278]'
                                  : 'bg-[#7B2D8E]/20 text-white/80 cursor-not-allowed'
                              }`}
                            >
                              Submit feedback
                            </button>
                          )
                        })()}
                      </div>
                    </div>
                  </>
                )}

                {/* Delete session confirm — same bottom-sheet language
                    as the actions menu so destructive operations stay
                    visually distinct from casual taps. The "Delete"
                    button is the only one tinted red. */}
                {deleteConfirmId && (() => {
                  const session = sessions.find(s => s.id === deleteConfirmId)
                  if (!session) return null
                  return (
                    <>
                      <div
                        className="absolute inset-0 z-30 bg-black/30 animate-[derma-backdrop-in_0.18s_ease-out]"
                        onClick={() => setDeleteConfirmId(null)}
                      />
                      <div
                        role="alertdialog"
                        aria-label="Delete chat?"
                        className="absolute left-0 right-0 bottom-0 z-40 bg-white rounded-t-2xl shadow-[0_-8px_32px_-8px_rgba(17,24,39,0.22)] animate-[derma-sheet-up_0.22s_cubic-bezier(0.22,1,0.36,1)_both]"
                      >
                        <div className="mx-auto my-2 h-1 w-10 rounded-full bg-gray-200" />
                        <div className="px-5 pb-5">
                          <div className="flex items-start gap-3 mb-4">
                            <span className="inline-flex w-9 h-9 items-center justify-center rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E] flex-shrink-0">
                              <AlertTriangle className="w-4 h-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="text-[14px] font-semibold text-gray-900 leading-tight">Delete this chat?</p>
                              <p className="text-[12px] text-gray-500 leading-snug mt-1">
                                &ldquo;{session.title || 'Untitled chat'}&rdquo; will be permanently removed. This can&apos;t be undone.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const id = deleteConfirmId
                                setDeleteConfirmId(null)
                                setOpenMenuSessionId(null)
                                deleteSession(id)
                              }}
                              className="flex-1 py-2.5 rounded-xl bg-[#7B2D8E] text-white text-[13px] font-semibold hover:bg-[#6B2278] transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )
                })()}

                {/* Select-text modal — a read-only card over the chat
                    that displays the message text in a large, selectable
                    typeface. The sheet now SIZES TO ITS CONTENT instead
                    of always filling the chat panel: a short reply
                    renders a short modal, a long reply grows up to 80%
                    of the panel height before scrolling. Previously the
                    modal was always `inset-x-4 top-12 bottom-12` which
                    felt oversized for a single sentence. */}
                {selectTextId && (() => {
                  const target = messages.find(m => m.id === selectTextId)
                  if (!target) return null
                  return (
                    <>
                      <div
                        className="absolute inset-0 z-30 bg-black/40 animate-[derma-backdrop-in_0.18s_ease-out] flex items-center justify-center p-4"
                        onClick={() => setSelectTextId(null)}
                      >
                        <div
                          role="dialog"
                          aria-label="Select text"
                          onClick={(e) => e.stopPropagation()}
                          className="relative z-40 bg-white rounded-2xl shadow-[0_12px_40px_-8px_rgba(17,24,39,0.28)] flex flex-col w-full max-w-md max-h-[80%] animate-[derma-msg-in_0.2s_ease-out]"
                        >
                          <div className="flex items-center justify-between px-4 pt-3 pb-1.5 flex-shrink-0 border-b border-gray-100">
                            <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-[#7B2D8E]">
                              Select text
                            </p>
                            <button
                              type="button"
                              onClick={() => setSelectTextId(null)}
                              className="w-7 h-7 flex items-center justify-center rounded-full text-gray-500 hover:text-[#7B2D8E] hover:bg-[#7B2D8E]/10 transition-colors"
                              aria-label="Close"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div
                            className="overflow-y-auto px-5 py-4 text-[15px] leading-relaxed text-gray-900 select-text whitespace-pre-wrap break-words"
                            style={{ WebkitUserSelect: 'text', userSelect: 'text' }}
                          >
                            {target.content}
                          </div>
                        </div>
                      </div>
                    </>
                  )
                })()}

                {/* Transient confirmation toast — used by the feedback
                    flow ("Thanks — this helps Derma improve") and the
                    thumbs-up quick action. Rendered near the top of the
                    chat panel so it never collides with the composer. */}
                {transientToast && (
                  <div
                    className="absolute top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
                    aria-live="polite"
                  >
                    <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#7B2D8E] text-white text-[12.5px] font-medium shadow-[0_8px_24px_-8px_rgba(123,45,142,0.35)] animate-[derma-msg-in_0.25s_ease-out]">
                      <span className="inline-flex w-4 h-4 items-center justify-center rounded-full bg-white/20">
                        <Check className="w-2.5 h-2.5" strokeWidth={3} />
                      </span>
                      {transientToast}
                    </div>
                  </div>
                )}

                {/* Derma AI Settings sheet — slides up from bottom.
                    Structure is a lightweight "root + sub-page" stack
                    (like iOS Settings or Claude's mobile settings):
                    the root lists Profile / Capabilities / Appearance
                    / Privacy / About rows, each drilling into a focused
                    sub-page. Brand purple on every accent — this is
                    Dermaspace's assistant, not a generic chatbot. */}
                {showSettingsSheet && (
                  <>
                    <div
                      className="absolute inset-0 z-40 bg-black/40 animate-[derma-backdrop-in_0.18s_ease-out]"
                      onClick={() => setShowSettingsSheet(false)}
                      aria-hidden="true"
                    />
                    <div
                      role="dialog"
                      aria-label="Derma AI settings"
                      className="absolute inset-x-0 bottom-0 top-8 z-50 bg-white rounded-t-2xl shadow-[0_-8px_32px_-8px_rgba(17,24,39,0.22)] flex flex-col animate-[derma-msg-in_0.22s_ease-out] overflow-hidden"
                    >
                      {/* Drag handle — visual affordance only. */}
                      <div className="flex justify-center pt-2 pb-1 flex-shrink-0">
                        <span className="w-9 h-1 rounded-full bg-gray-300" aria-hidden="true" />
                      </div>

                      {/* Sheet header — back arrow on sub-pages, title,
                          close on the right. */}
                      <div className="flex items-center gap-2 px-3 pb-2 flex-shrink-0 border-b border-gray-100">
                        {settingsPage !== 'root' ? (
                          <button
                            type="button"
                            onClick={() => setSettingsPage('root')}
                            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:text-[#7B2D8E] hover:bg-[#7B2D8E]/10 transition-colors"
                            aria-label="Back"
                          >
                            <ArrowRight className="w-4 h-4 rotate-180" />
                          </button>
                        ) : (
                          <span className="w-8 h-8" aria-hidden="true" />
                        )}
                        <h3 className="flex-1 text-center text-[15px] font-semibold text-gray-900 tracking-tight">
                          {settingsPage === 'root' && 'Derma AI Settings'}
                          {settingsPage === 'capabilities' && 'Capabilities'}
                          {settingsPage === 'appearance' && 'Appearance'}
                          {settingsPage === 'privacy' && 'Privacy'}
                          {settingsPage === 'about' && 'About'}
                        </h3>
                        <button
                          type="button"
                          onClick={() => setShowSettingsSheet(false)}
                          className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:text-[#7B2D8E] hover:bg-[#7B2D8E]/10 transition-colors"
                          aria-label="Close settings"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Sheet body */}
                      <div className="flex-1 overflow-y-auto px-4 py-4">
                        {settingsPage === 'root' && (
                          <div className="space-y-5">
                            {/* Account card — email + link status chip +
                                primary action (Reconnect if disconnected,
                                Disconnect if connected). Anchors the whole
                                settings experience the way Claude's
                                profile card does. */}
                            <div className="rounded-2xl bg-gradient-to-br from-[#7B2D8E] to-[#5E2170] p-4 text-white shadow-[0_4px_16px_-6px_rgba(123,45,142,0.5)]">
                              <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
                                  <ButterflyLogo className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[13px] font-semibold truncate">
                                    {userInfo.name
                                      ? userInfo.email || userInfo.name
                                      : isLoggedIn
                                        ? 'Your account'
                                        : 'Guest mode'}
                                  </p>
                                  <p className="text-[11px] text-white/80 truncate">
                                    {isLoggedIn
                                      ? accountAccessConsent
                                        ? 'Linked to Derma AI'
                                        : 'Not linked to Derma AI'
                                      : 'Sign in to personalise replies'}
                                  </p>
                                </div>
                              </div>
                              <div className="mt-3 flex items-center gap-2">
                                {!isLoggedIn ? (
                                  <Link
                                    href="/signin"
                                    onClick={() => { setShowSettingsSheet(false); setIsOpen(false) }}
                                    className="flex-1 text-center px-3 py-2 rounded-xl bg-white text-[#7B2D8E] text-[12.5px] font-semibold hover:bg-white/90 transition-colors"
                                  >
                                    Sign in
                                  </Link>
                                ) : accountAccessConsent ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      try {
                                        localStorage.removeItem('derma-account-consent')
                                        localStorage.setItem('derma-ai-pending-notice', 'disconnected')
                                      } catch { /* ignore */ }
                                      setAccountAccessConsent(false)
                                      setShowSettingsSheet(false)
                                    }}
                                    className="flex-1 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-[12.5px] font-semibold transition-colors"
                                  >
                                    Disconnect
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      try {
                                        localStorage.setItem('derma-account-consent', 'granted')
                                      } catch { /* ignore */ }
                                      setAccountAccessConsent(true)
                                      setShowSettingsSheet(false)
                                    }}
                                    className="flex-1 px-3 py-2 rounded-xl bg-white text-[#7B2D8E] text-[12.5px] font-semibold hover:bg-white/90 transition-colors"
                                  >
                                    Connect account
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Grouped rows — a single rounded card per
                                logical group (iOS style), drilling into a
                                sub-page when tapped. */}
                            <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white">
                              <button
                                type="button"
                                onClick={() => setSettingsPage('capabilities')}
                                className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-[#7B2D8E]/5 transition-colors"
                              >
                                <span className="w-9 h-9 rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
                                  <SettingsIcon className="w-4 h-4" />
                                </span>
                                <span className="flex-1 min-w-0">
                                  <span className="block text-[13.5px] font-semibold text-gray-900">Capabilities</span>
                                  <span className="block text-[11.5px] text-gray-500 truncate">
                                    Memory, voice, maps, proactive replies
                                  </span>
                                </span>
                                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              </button>
                              <div className="h-px bg-gray-100 mx-3" />
                              <button
                                type="button"
                                onClick={() => setSettingsPage('appearance')}
                                className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-[#7B2D8E]/5 transition-colors"
                              >
                                <span className="w-9 h-9 rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
                                  <Type className="w-4 h-4" />
                                </span>
                                <span className="flex-1 min-w-0">
                                  <span className="block text-[13.5px] font-semibold text-gray-900">Appearance</span>
                                  <span className="block text-[11.5px] text-gray-500 truncate">
                                    Text size: {textSize === 'small' ? 'Small' : textSize === 'large' ? 'Large' : 'Default'}
                                  </span>
                                </span>
                                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              </button>
                              <div className="h-px bg-gray-100 mx-3" />
                              <button
                                type="button"
                                onClick={() => setSettingsPage('privacy')}
                                className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-[#7B2D8E]/5 transition-colors"
                              >
                                <span className="w-9 h-9 rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
                                  <ShieldCheck className="w-4 h-4" />
                                </span>
                                <span className="flex-1 min-w-0">
                                  <span className="block text-[13.5px] font-semibold text-gray-900">Privacy</span>
                                  <span className="block text-[11.5px] text-gray-500 truncate">
                                    Clear chat history and memories
                                  </span>
                                </span>
                                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              </button>
                              <div className="h-px bg-gray-100 mx-3" />
                              <button
                                type="button"
                                onClick={() => setSettingsPage('about')}
                                className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-[#7B2D8E]/5 transition-colors"
                              >
                                <span className="w-9 h-9 rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
                                  <Info className="w-4 h-4" />
                                </span>
                                <span className="flex-1 min-w-0">
                                  <span className="block text-[13.5px] font-semibold text-gray-900">About</span>
                                  <span className="block text-[11.5px] text-gray-500 truncate">
                                    Terms, Privacy Policy, Help &amp; Support
                                  </span>
                                </span>
                                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              </button>
                            </div>

                            {isLoggedIn && (
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await fetch('/api/auth/logout', { method: 'POST' })
                                  } catch { /* ignore */ }
                                  setShowSettingsSheet(false)
                                  window.location.href = '/'
                                }}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <LogOut className="w-4 h-4" />
                                Sign out
                              </button>
                            )}
                            <p className="text-center text-[10.5px] text-gray-400">
                              Derma AI · Dermaspace Concierge
                            </p>
                          </div>
                        )}

                        {settingsPage === 'capabilities' && (
                          <div className="space-y-3">
                            {/* Each toggle row is its own card so the
                                description can breathe. Switch component
                                is built inline using a button + state
                                class (no new dependency). */}
                            {[
                              {
                                icon: <Brain className="w-4 h-4" />,
                                title: 'Long-term memory',
                                desc: 'Let Derma remember preferences, skin goals and favourites across chats.',
                                value: memoryEnabled,
                                onChange: setMemoryEnabled,
                              },
                              {
                                icon: <Volume2 className="w-4 h-4" />,
                                title: 'Voice responses',
                                desc: 'Read replies aloud after each message.',
                                value: voiceEnabled,
                                onChange: setVoiceEnabled,
                              },
                              {
                                icon: <MapPin className="w-4 h-4" />,
                                title: 'Inline maps',
                                desc: 'Show interactive Dermaspace maps in chat instead of a plain list.',
                                value: inlineMapsEnabled,
                                onChange: setInlineMapsEnabled,
                              },
                              {
                                icon: <Zap className="w-4 h-4" />,
                                title: 'Proactive suggestions',
                                desc: 'Suggest related next steps after an answer (reschedule, top-up, etc.).',
                                value: proactiveSuggestions,
                                onChange: setProactiveSuggestions,
                              },
                            ].map((row) => (
                              // Each row is a card. The switch column was
                              // previously clipping on narrow Android viewports
                              // because the row used px-3 with a w-10 switch
                              // AND a w-9 icon, leaving the thumb track flush
                              // against the right edge of the card. We now
                              // reserve a stable right gutter via gap-2.5 and
                              // trim the icon size so the switch gets a full
                              // ~44px safe-tap zone without pushing past the
                              // card edge on 360px screens.
                              <div
                                key={row.title}
                                className="flex items-center gap-2.5 rounded-2xl border border-gray-200 bg-white pl-3 pr-3 py-3"
                              >
                                <span className="w-8 h-8 rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
                                  {row.icon}
                                </span>
                                <div className="flex-1 min-w-0 pr-1">
                                  <p className="text-[13.5px] font-semibold text-gray-900 leading-tight">{row.title}</p>
                                  <p className="text-[11.5px] text-gray-500 mt-1 leading-relaxed">
                                    {row.desc}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={row.value}
                                  onClick={() => row.onChange(!row.value)}
                                  className={`relative w-[38px] h-[22px] rounded-full flex-shrink-0 transition-colors ${
                                    row.value ? 'bg-[#7B2D8E]' : 'bg-gray-300'
                                  }`}
                                  aria-label={row.title}
                                >
                                  <span
                                    className={`absolute top-0.5 left-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-transform ${
                                      row.value ? 'translate-x-4' : 'translate-x-0'
                                    }`}
                                  />
                                </button>
                              </div>
                            ))}
                            <p className="text-[11px] text-gray-500 text-center leading-relaxed px-2 pt-1">
                              Finer-grained data access (wallet, bookings, profile) lives in your
                              {' '}
                              <Link
                                href="/dashboard/settings?section=assistant"
                                onClick={() => { setShowSettingsSheet(false); setIsOpen(false) }}
                                className="text-[#7B2D8E] font-semibold underline-offset-2 hover:underline"
                              >
                                account settings
                              </Link>
                              .
                            </p>
                          </div>
                        )}

                        {settingsPage === 'appearance' && (
                          <div className="space-y-3">
                            <div className="rounded-2xl border border-gray-200 bg-white p-3">
                              <p className="text-[13.5px] font-semibold text-gray-900 mb-0.5">Text size</p>
                              <p className="text-[11.5px] text-gray-500 mb-3">
                                Scales every message bubble in this chat.
                              </p>
                              <div className="grid grid-cols-3 gap-2">
                                {(['small', 'default', 'large'] as const).map((size) => (
                                  <button
                                    key={size}
                                    type="button"
                                    onClick={() => setTextSize(size)}
                                    className={`rounded-xl py-2.5 text-center font-semibold transition-colors ${
                                      textSize === size
                                        ? 'bg-[#7B2D8E] text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    } ${size === 'small' ? 'text-[12px]' : size === 'large' ? 'text-[16px]' : 'text-[14px]'}`}
                                  >
                                    {size === 'small' ? 'Small' : size === 'large' ? 'Large' : 'Default'}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="rounded-2xl bg-[#7B2D8E]/5 border border-[#7B2D8E]/15 p-3">
                              <p className="text-[11.5px] text-[#7B2D8E] font-medium leading-relaxed">
                                Derma AI uses Dermaspace brand colours by design. Theme customisation is coming soon.
                              </p>
                            </div>
                          </div>
                        )}

                        {settingsPage === 'privacy' && (
                          <div className="space-y-3">
                            <div className="rounded-2xl border border-gray-200 bg-white p-3">
                              <p className="text-[13.5px] font-semibold text-gray-900">Clear chat history</p>
                              <p className="text-[11.5px] text-gray-500 mt-0.5 mb-3 leading-relaxed">
                                Deletes every saved conversation on this device. This cannot be undone.
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!sessionsKey || !activeKey) return
                                  try {
                                    localStorage.removeItem(sessionsKey)
                                    localStorage.removeItem(activeKey)
                                  } catch { /* ignore */ }
                                  setSessions([])
                                  setMessages([])
                                  setCurrentSessionId('')
                                  setShowSettingsSheet(false)
                                  setTransientToast('Chat history cleared')
                                  setTimeout(() => setTransientToast(null), 2200)
                                }}
                                className="w-full py-2.5 rounded-xl bg-red-50 text-red-700 text-[13px] font-semibold hover:bg-red-100 transition-colors"
                              >
                                Clear history on this device
                              </button>
                            </div>
                            <div className="rounded-2xl border border-gray-200 bg-white p-3">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[13.5px] font-semibold text-gray-900">Saved memories</p>
                                <span className="px-2 py-0.5 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] text-[11px] font-semibold">
                                  {memories.length}
                                </span>
                              </div>
                              <p className="text-[11.5px] text-gray-500 mt-0.5 mb-3 leading-relaxed">
                                Facts Derma has learned about you across chats (preferences, allergies, favourites).
                              </p>
                              <button
                                type="button"
                                disabled={memories.length === 0}
                                onClick={() => {
                                  try {
                                    localStorage.removeItem('derma-ai-memories')
                                  } catch { /* ignore */ }
                                  setMemories([])
                                  setTransientToast('Memories cleared')
                                  setTimeout(() => setTransientToast(null), 2200)
                                }}
                                className="w-full py-2.5 rounded-xl bg-red-50 text-red-700 text-[13px] font-semibold hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Forget everything Derma remembers
                              </button>
                            </div>
                            <p className="text-[11px] text-gray-500 text-center leading-relaxed px-2 pt-1">
                              We never share your chats. Read our
                              {' '}
                              <Link
                                href="/privacy"
                                onClick={() => { setShowSettingsSheet(false); setIsOpen(false) }}
                                className="text-[#7B2D8E] font-semibold underline-offset-2 hover:underline"
                              >
                                Privacy Policy
                              </Link>
                              .
                            </p>
                          </div>
                        )}

                        {settingsPage === 'about' && (
                          <div className="space-y-3">
                            <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white">
                              <Link
                                href="/terms"
                                onClick={() => { setShowSettingsSheet(false); setIsOpen(false) }}
                                className="flex items-center gap-3 px-3 py-3 hover:bg-[#7B2D8E]/5 transition-colors"
                              >
                                <FileText className="w-4 h-4 text-[#7B2D8E] flex-shrink-0" />
                                <span className="flex-1 text-[13.5px] font-semibold text-gray-900">Terms of Service</span>
                                <ExternalLink className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              </Link>
                              <div className="h-px bg-gray-100 mx-3" />
                              <Link
                                href="/privacy"
                                onClick={() => { setShowSettingsSheet(false); setIsOpen(false) }}
                                className="flex items-center gap-3 px-3 py-3 hover:bg-[#7B2D8E]/5 transition-colors"
                              >
                                <ShieldCheck className="w-4 h-4 text-[#7B2D8E] flex-shrink-0" />
                                <span className="flex-1 text-[13.5px] font-semibold text-gray-900">Privacy Policy</span>
                                <ExternalLink className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              </Link>
                              <div className="h-px bg-gray-100 mx-3" />
                              <Link
                                href="/contact"
                                onClick={() => { setShowSettingsSheet(false); setIsOpen(false) }}
                                className="flex items-center gap-3 px-3 py-3 hover:bg-[#7B2D8E]/5 transition-colors"
                              >
                                <LifeBuoy className="w-4 h-4 text-[#7B2D8E] flex-shrink-0" />
                                <span className="flex-1 text-[13.5px] font-semibold text-gray-900">Help &amp; Support</span>
                                <ExternalLink className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              </Link>
                            </div>
                            <div className="rounded-2xl bg-[#7B2D8E]/5 border border-[#7B2D8E]/15 p-4 text-center">
                              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#7B2D8E] mb-2">
                                <ButterflyLogo className="w-5 h-5 text-white" />
                              </div>
                              <p className="text-[13px] font-semibold text-gray-900">Derma AI</p>
                              <p className="text-[11px] text-gray-500 mt-0.5">
                                Your Dermaspace concierge
                              </p>
                              <p className="text-[10.5px] text-gray-400 mt-2 tracking-wide">
                                Version 1.0
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

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

                  {/* "Editing message" banner — sits above the composer
                      whenever the user is rewriting an existing turn,
                      so the next Send replaces that bubble instead of
                      appending. Matches Claude's edit affordance: icon,
                      label, and an X to bail out without resending. */}
                  {editingMessageId && (
                    <div className="mb-2 flex items-center gap-2 rounded-xl bg-[#7B2D8E]/[0.07] border border-[#7B2D8E]/15 px-3 py-2 animate-[derma-msg-in_0.2s_ease-out]">
                      <span className="inline-flex w-6 h-6 items-center justify-center rounded-md bg-[#7B2D8E]/15 text-[#7B2D8E] flex-shrink-0">
                        <FilePen className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-[12.5px] font-medium text-[#7B2D8E] flex-1 truncate">
                        Editing message
                      </span>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        aria-label="Cancel edit"
                        className="w-6 h-6 flex items-center justify-center rounded-full text-[#7B2D8E]/60 hover:text-[#7B2D8E] hover:bg-[#7B2D8E]/10 transition-colors flex-shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
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
                                      {isListening ? <AudioLines className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
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

                    {/* Trailing controls — matches the Gemini layout
                        from the user's reference: when the composer is
                        empty we show the Live pill (audio-lines glyph on
                        a tinted brand chip). The moment the user starts
                        typing we morph it into the Send button so the
                        primary action is always one tap away. While a
                        generation is in flight Send becomes Stop. */}
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
                    ) : (input.trim() || pendingAttachments.length > 0) ? (
                      <button
                        type="submit"
                        disabled={isUploading}
                        className="w-10 h-10 flex items-center justify-center bg-[#7B2D8E] text-white rounded-full hover:bg-[#6B2278] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                        aria-label="Send message"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={startVoiceCall}
                        className="w-10 h-10 flex items-center justify-center bg-[#7B2D8E] text-white rounded-full hover:bg-[#6B2278] active:scale-95 transition-all flex-shrink-0 shadow-sm shadow-[#7B2D8E]/25"
                        aria-label="Start Derma AI Live"
                        title="Derma AI Live"
                      >
                        <AudioLines className="w-[18px] h-[18px]" />
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
        </DermaAIPanelBoundary>
      </div>

      {/* Derma AI Live voice picker. Rendered outside the chat shell
          so it can take the full viewport even when the chat panel
          is open as a right-side drawer on desktop. */}
      <DermaLiveVoicePicker
        open={showVoicePicker}
        initialVoiceId={liveVoiceId}
        onClose={() => setShowVoicePicker(false)}
        onStart={beginVoiceCallWithVoice}
      />
    </>
  )
}
