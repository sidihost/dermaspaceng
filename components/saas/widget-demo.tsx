'use client'

import type React from 'react'

import { useEffect, useRef, useState } from 'react'

/**
 * Marketing demo of the embeddable widget. The chat panel is a FAITHFUL
 * React replica of the real customer-facing widget (public/derma-widget.js):
 * same header, bubble styles, typing dots, footer and "Powered by Derma AI"
 * credit — rendered in the Dermaspace brand font (Lexend Deca), exactly like
 * the live widget. Shown inside a desktop browser mockup on large screens
 * and a phone mockup on small screens. Scripted answers, no API calls.
 */

const BRAND = '#7B2D8E'

const SCRIPT: Record<string, string> = {
  'What are your opening hours?':
    'We are open Monday to Saturday, 9am to 7pm, and Sundays by appointment. Would you like me to help you book a visit?',
  'Do you offer home services?':
    'Yes — our team offers select services at home within Lagos. Home visits carry a small convenience fee and can be booked directly through this chat.',
  'How much is a facial?':
    'Our signature facial starts from \u20a625,000, with advanced treatments from \u20a640,000. I can share the full price list or book you a consultation — which would you prefer?',
}

const QUESTIONS = Object.keys(SCRIPT)

const FALLBACK_REPLY =
  'Great question! In the live product I answer from your own knowledge base — every Q&A you train me on. Try one of the suggested questions to see a real answer.'

interface Msg {
  role: 'user' | 'assistant'
  text: string
}

/** The exact chat-bubble icon the real launcher uses. */
function ChatIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  )
}

/** The exact send icon the real widget uses. */
function SendIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

/**
 * The exact widget chat panel — shared by both mockups. Pixel-for-pixel
 * replica of .panel / .header / .body / .msg / .foot in derma-widget.js.
 */
function ChatPanel({ className = '' }: { className?: string }) {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', text: 'Hi! Welcome to Amara Beauty Studio. How can I help you today?' },
  ])
  const [typing, setTyping] = useState(false)
  const [input, setInput] = useState('')
  const [used, setUsed] = useState<string[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    return () => timers.current.forEach(clearTimeout)
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  function reply(text: string) {
    setTyping(true)
    timers.current.push(
      setTimeout(() => {
        setTyping(false)
        setMessages((m) => [...m, { role: 'assistant', text }])
      }, 900),
    )
  }

  function ask(q: string) {
    if (typing || used.includes(q)) return
    setUsed((u) => [...u, q])
    setMessages((m) => [...m, { role: 'user', text: q }])
    reply(SCRIPT[q])
  }

  function send() {
    const text = input.trim()
    if (!text || typing) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', text }])
    reply(SCRIPT[text] ?? FALLBACK_REPLY)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
      e.preventDefault()
      send()
    }
  }

  const remaining = QUESTIONS.filter((q) => !used.includes(q))

  return (
    <div className={`flex flex-col overflow-hidden bg-white font-sans ${className}`}>
      {/* Header — brand color, round logo, name + Online status, close btn */}
      <div className="flex items-center gap-2.5 p-4" style={{ backgroundColor: BRAND }}>
        <span
          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-white/20 font-bold text-white"
          aria-hidden="true"
        >
          A
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[15px] font-bold text-white">Amara Beauty Studio</p>
          <p className="text-xs text-white/85">Online</p>
        </div>
        <span className="flex rounded-lg p-1 text-white" aria-hidden="true">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </span>
      </div>

      {/* Body — replica of .body / .msg styles */}
      <div
        ref={scrollRef}
        className="flex flex-1 flex-col gap-2.5 overflow-y-auto bg-[#f7f7f8] p-4"
        aria-live="polite"
      >
        {messages.map((m, i) =>
          m.role === 'user' ? (
            <p
              key={i}
              className="max-w-[82%] self-end whitespace-pre-wrap rounded-[14px] rounded-br-[4px] px-[13px] py-2.5 text-sm leading-normal text-white"
              style={{ backgroundColor: BRAND }}
            >
              {m.text}
            </p>
          ) : (
            <p
              key={i}
              className="max-w-[82%] self-start whitespace-pre-wrap rounded-[14px] rounded-bl-[4px] border border-[#ececec] bg-white px-[13px] py-2.5 text-sm leading-normal text-[#1a1a1a]"
            >
              {m.text}
            </p>
          ),
        )}
        {typing && (
          <span className="flex gap-1 self-start rounded-[14px] border border-[#ececec] bg-white px-3.5 py-3">
            <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-[#b8b8b8]" />
            <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-[#b8b8b8] [animation-delay:200ms]" />
            <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-[#b8b8b8] [animation-delay:400ms]" />
          </span>
        )}

        {/* Suggested questions (demo-only helper, styled like widget chips) */}
        {remaining.length > 0 && !typing && (
          <div className="mt-1 flex flex-wrap gap-2">
            {remaining.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => ask(q)}
                className="rounded-full border border-[#dcdce0] bg-white px-3 py-1.5 text-xs text-[#1a1a1a] transition-colors hover:border-[#7B2D8E] hover:text-[#7B2D8E]"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Foot — replica of .foot: textarea + square send button */}
      <div className="flex items-end gap-2 border-t border-[#ececec] bg-white p-3">
        <textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type your message..."
          aria-label="Type your message"
          className="max-h-[100px] flex-1 resize-none rounded-xl border border-[#dcdce0] bg-white px-3 py-2.5 text-sm text-[#1a1a1a] outline-none placeholder:text-[#9a9a9a] focus:border-[#7B2D8E]"
        />
        <button
          type="button"
          onClick={send}
          disabled={typing}
          aria-label="Send message"
          className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl text-white disabled:opacity-50"
          style={{ backgroundColor: BRAND }}
        >
          <SendIcon />
        </button>
      </div>
      <p className="bg-white pb-2.5 pt-1.5 text-center text-[11px] text-[#9a9a9a]">
        Powered by Derma AI
      </p>
    </div>
  )
}

/** Flat placeholder blocks that suggest a customer's website behind the widget. */
function FakeSite() {
  return (
    <div aria-hidden="true" className="pointer-events-none flex h-full flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div className="h-3 w-28 rounded-full bg-border" />
        <div className="flex gap-2">
          <div className="h-3 w-12 rounded-full bg-border" />
          <div className="h-3 w-12 rounded-full bg-border" />
          <div className="h-3 w-12 rounded-full bg-border" />
        </div>
      </div>
      <div className="mt-4 h-6 w-3/5 rounded-full bg-border" />
      <div className="h-3 w-4/5 rounded-full bg-muted" />
      <div className="h-3 w-2/3 rounded-full bg-muted" />
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="h-24 rounded-xl bg-muted" />
        <div className="h-24 rounded-xl bg-muted" />
        <div className="h-24 rounded-xl bg-muted" />
      </div>
    </div>
  )
}

export function WidgetDemo() {
  return (
    <div>
      {/* ---------- Desktop: browser-window mockup ---------- */}
      <div className="hidden lg:block">
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {/* Browser chrome */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <div className="flex gap-1.5" aria-hidden="true">
              <span className="h-3 w-3 rounded-full border border-border bg-muted" />
              <span className="h-3 w-3 rounded-full border border-border bg-muted" />
              <span className="h-3 w-3 rounded-full border border-border bg-muted" />
            </div>
            <div className="flex-1 rounded-full border border-border bg-background px-4 py-1.5 text-center text-xs text-muted-foreground">
              amarabeautystudio.com
            </div>
          </div>
          {/* Page + widget bottom-right, exactly like the embed */}
          <div className="relative h-[600px] bg-background">
            <FakeSite />
            <div className="absolute bottom-5 right-5 flex flex-col items-end gap-3">
              <ChatPanel className="h-[480px] w-[370px] rounded-2xl border border-[#e6e6e6]" />
              <span
                className="inline-flex items-center gap-2 rounded-full px-[18px] py-3.5 text-[15px] font-semibold leading-none text-white"
                style={{ backgroundColor: BRAND }}
                aria-hidden="true"
              >
                <ChatIcon />
                Chat with us
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Mobile: phone mockup ---------- */}
      <div className="mx-auto max-w-[360px] lg:hidden">
        <div className="rounded-[2.5rem] border-[6px] border-foreground bg-foreground">
          <div className="relative overflow-hidden rounded-[2.1rem] bg-background">
            {/* Speaker notch */}
            <div className="absolute left-1/2 top-2 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-foreground/20" aria-hidden="true" />
            <ChatPanel className="h-[580px] w-full pt-3" />
          </div>
        </div>
      </div>
    </div>
  )
}
