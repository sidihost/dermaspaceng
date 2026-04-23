'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, MessageCircle, ArrowRight } from 'lucide-react'

const faqs = [
  {
    question: 'What happens on my first visit?',
    answer: 'We spend 15 minutes looking at your skin and asking a few questions before we start. If we think a different treatment would work better, we tell you upfront.'
  },
  {
    question: 'How do I book?',
    answer: 'Call, WhatsApp, or use the Book button on this site. Weekends fill up fast, so a day\u2019s notice helps. Same-day slots do open up.'
  },
  {
    question: 'Can I cancel or reschedule?',
    answer: 'Yes, with at least 24 hours notice. After that we charge 50% because the therapist\u2019s time is already blocked. Emergencies are different, just message us.'
  },
  {
    question: 'I have sensitive skin. Am I safe here?',
    answer: 'Yes. We use professional lines for reactive skin and every treatment starts with a patch test. If something doesn\u2019t suit you, we swap it.'
  },
  {
    question: 'Do you do packages?',
    answer: 'Yes. We have spa packages that combine massage, facial and mani-pedi at a lower price than booking separately. See the Packages page.'
  },
  {
    question: 'How do I reach you?',
    answer: 'WhatsApp is fastest. Phone and email also work. We\u2019re open Monday to Saturday, 9am to 7pm.'
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
            Common <span className="text-[#7B2D8E]">questions</span>
          </h2>
          <p className="text-gray-600 max-w-lg mx-auto text-sm">
            Quick answers to what people usually ask.
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
                <h3 className="font-semibold text-white text-sm">Still have questions?</h3>
                <p className="text-xs text-white/70">Send us a message and we&apos;ll get back to you.</p>
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
