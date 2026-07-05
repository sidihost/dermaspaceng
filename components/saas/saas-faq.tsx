'use client'

import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'

/** Flat editorial FAQ accordion — hairline borders only, no shadows. */

const FAQS = [
  {
    q: 'Do I need my own AI API key?',
    a: 'No. Every conversation runs on our pooled AI credits across multiple providers. You never sign up with an AI company, never add a key, and never pay per message.',
  },
  {
    q: 'How does the assistant learn my business?',
    a: 'You add simple question-and-answer entries in your dashboard \u2014 your prices, policies, opening hours, anything. The assistant uses them as its source of truth and answers in your brand voice immediately.',
  },
  {
    q: 'Will my customers know it is Derma AI?',
    a: 'No. The widget carries your brand name, your assistant name, your colour and your logo. The assistant is instructed to represent your business only.',
  },
  {
    q: 'Is my data kept separate from other companies?',
    a: 'Yes. Your account, knowledge base and conversation logs live in a dedicated database, and your training data sits in its own isolated namespace. Nothing is ever shared between companies.',
  },
  {
    q: 'How do I install it on my website?',
    a: 'Copy one script tag from your dashboard and paste it before the closing body tag of your site \u2014 any platform, from WordPress to custom builds. The chat launcher appears instantly.',
  },
  {
    q: 'What happens when I sign up?',
    a: 'You can set up branding and training straight away for free. Your assistant starts answering live visitors once your \u20a635,000/year subscription is activated.',
  },
]

export function SaasFaq() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <div className="divide-y divide-border border-y border-border">
      {FAQS.map((f, i) => {
        const isOpen = open === i
        return (
          <div key={f.q}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-6 py-5 text-left"
            >
              <span className="text-base font-semibold leading-relaxed text-foreground md:text-lg">
                {f.q}
              </span>
              {isOpen ? (
                <Minus className="h-4 w-4 flex-shrink-0 text-primary" aria-hidden="true" />
              ) : (
                <Plus className="h-4 w-4 flex-shrink-0 text-primary" aria-hidden="true" />
              )}
            </button>
            {isOpen && (
              <p className="pb-6 pr-10 leading-relaxed text-muted-foreground">{f.a}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
