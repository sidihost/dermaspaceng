'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, MessageCircle, ArrowRight } from 'lucide-react'

const faqs = [
  {
    question: 'What happens on my first visit?',
    answer: 'We block out 15 – 20 minutes before the treatment to look at your skin properly, ask a few questions, and make sure what you booked is actually the right fit. If we think something else would work better, we\u2019ll tell you before we start — not halfway through.'
  },
  {
    question: 'How do I book?',
    answer: 'Call, WhatsApp, or tap Book on this site. Weekends and late afternoons fill up first, so give us a day\u2019s notice if you can. Same-day slots often open up — it\u2019s worth a message.'
  },
  {
    question: 'Can I cancel or reschedule?',
    answer: 'Yes, as long as you let us know at least 24 hours ahead. Past that, we charge 50% of the service because the therapist is already blocked off for you. Life happens — if it\u2019s an emergency, just message us and we\u2019ll sort it out.'
  },
  {
    question: 'I have sensitive skin. Am I safe here?',
    answer: 'Yes. We carry professional lines built for reactive skin, and every treatment starts with a patch test and a proper consultation. If something doesn\u2019t suit you, we swap it.'
  },
  {
    question: 'Do you do packages or memberships?',
    answer: 'We have spa packages that bundle a massage, facial and mani-pedi — works out cheaper than booking each separately. Memberships are coming; for now, check the Packages page.'
  },
  {
    question: 'How do I reach you outside of bookings?',
    answer: 'WhatsApp is fastest. Phone and email (info@dermaspaceng.com) also work. We\u2019re on Monday to Saturday, 9am – 7pm.'
  },
]

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#7B2D8E]/10 mb-4">
            <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">FAQ</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            Things people <span className="text-[#7B2D8E]">usually ask</span>
          </h2>
          <p className="text-gray-600 max-w-lg mx-auto text-sm">
            The honest answers — not the marketing ones.
          </p>
          {/* Decorative curve */}
          <div className="flex items-center justify-center gap-1 mt-4">
            <svg width="60" height="8" viewBox="0 0 60 8" fill="none">
              <path d="M1 6C15 2 45 2 59 6" stroke="#7B2D8E" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.3"/>
            </svg>
            <div className="w-2 h-2 rounded-full bg-[#7B2D8E]" />
            <svg width="60" height="8" viewBox="0 0 60 8" fill="none">
              <path d="M1 6C15 2 45 2 59 6" stroke="#7B2D8E" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.3"/>
            </svg>
          </div>
        </div>

        {/* FAQ List */}
        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`border rounded-xl overflow-hidden transition-all ${
                openIndex === index ? 'border-[#7B2D8E]/30 bg-[#7B2D8E]/5' : 'border-gray-200'
              }`}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <span className={`font-medium text-sm ${openIndex === index ? 'text-[#7B2D8E]' : 'text-gray-900'}`}>
                  {faq.question}
                </span>
                <ChevronDown 
                  className={`w-5 h-5 text-gray-400 transition-transform ${
                    openIndex === index ? 'rotate-180 text-[#7B2D8E]' : ''
                  }`} 
                />
              </button>
              {openIndex === index && (
                <div className="px-4 pb-4">
                  <p className="text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact Support Card */}
        <div className="mt-10 bg-[#7B2D8E] rounded-2xl p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  <circle cx="9" cy="10" r="1" fill="currentColor" />
                  <circle cx="12" cy="10" r="1" fill="currentColor" />
                  <circle cx="15" cy="10" r="1" fill="currentColor" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">Didn&apos;t see yours?</h3>
                <p className="text-xs text-white/70">Send us a quick message — real humans reply.</p>
              </div>
            </div>
            <Link 
              href="/contact" 
              className="inline-flex items-center gap-2 px-5 py-2 bg-white text-[#7B2D8E] text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
            >
              Contact Us
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
