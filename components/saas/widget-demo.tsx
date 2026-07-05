'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'

/**
 * Interactive marketing demo of the embeddable widget. Fully scripted —
 * no API calls — so it always works instantly on the landing page.
 * Flat design: hairline borders only, no shadows or gradients.
 */

const SCRIPT: Record<string, string> = {
  'What are your opening hours?':
    'We are open Monday to Saturday, 9am to 7pm, and Sundays by appointment. Would you like me to help you book a visit?',
  'Do you offer home services?':
    'Yes — our team offers select services at home within Lagos. Home visits carry a small convenience fee and can be booked directly through this chat.',
  'How much is a facial?':
    'Our signature facial starts from \u20a625,000, with advanced treatments from \u20a640,000. I can share the full price list or book you a consultation — which would you prefer?',
}

const QUESTIONS = Object.keys(SCRIPT)

interface Msg {
  role: 'user' | 'assistant'
  text: string
}

export function WidgetDemo() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', text: 'Hi! Welcome to Amara Beauty Studio. How can I help you today?' },
  ])
  const [typing, setTyping] = useState(false)
  const [used, setUsed] = useState<string[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    return () => timers.current.forEach(clearTimeout)
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  function ask(q: string) {
    if (typing || used.includes(q)) return
    setUsed((u) => [...u, q])
    setMessages((m) => [...m, { role: 'user', text: q }])
    setTyping(true)
    timers.current.push(
      setTimeout(() => {
        setTyping(false)
        setMessages((m) => [...m, { role: 'assistant', text: SCRIPT[q] }])
      }, 900),
    )
  }

  const remaining = QUESTIONS.filter((q) => !used.includes(q))

  return (
    <div className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-xl border border-border bg-card">
      {/* Widget header */}
      <div className="flex items-center gap-3 border-b border-border bg-primary px-4 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-primary-foreground/30 text-sm font-semibold text-primary-foreground">
          A
        </span>
        <div className="min-w-0 leading-tight">
          <p className="text-sm font-semibold text-primary-foreground">Amara Beauty Studio</p>
          <p className="text-xs text-primary-foreground/70">Ada &middot; AI assistant</p>
        </div>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-primary-foreground/30 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" aria-hidden="true" />
          Live demo
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <p
              className={
                m.role === 'user'
                  ? 'max-w-[80%] rounded-xl rounded-br-sm bg-primary px-3.5 py-2.5 text-sm leading-relaxed text-primary-foreground'
                  : 'max-w-[80%] rounded-xl rounded-bl-sm border border-border bg-secondary px-3.5 py-2.5 text-sm leading-relaxed text-secondary-foreground'
              }
            >
              {m.text}
            </p>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start">
            <span className="rounded-xl rounded-bl-sm border border-border bg-secondary px-3.5 py-2.5 text-sm text-muted-foreground">
              Ada is typing&hellip;
            </span>
          </div>
        )}
      </div>

      {/* Suggested questions */}
      <div className="border-t border-border p-3">
        {remaining.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {remaining.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => ask(q)}
                disabled={typing}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        ) : (
          <p className="px-1 text-xs text-muted-foreground">
            That&apos;s the demo &mdash; your assistant answers from your own knowledge base.
          </p>
        )}
        <div className="mt-2 flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2.5">
          <span className="flex-1 text-sm text-muted-foreground">Tap a question above to try it</span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground" aria-hidden="true">
            <ArrowUp className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </div>
  )
}
