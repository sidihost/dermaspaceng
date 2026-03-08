'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ArrowRight } from 'lucide-react'

const faqs = [
  {
    question: 'What should I expect during my first visit?',
    answer: 'During your first visit, our skincare specialists will conduct a thorough skin analysis to understand your unique needs. We\'ll discuss your concerns, goals, and create a personalized treatment plan.'
  },
  {
    question: 'How do I book an appointment?',
    answer: 'You can book an appointment through our website by clicking "Book Now", calling us directly, or sending a WhatsApp message. We recommend booking at least 24 hours in advance.'
  },
  {
    question: 'What is your cancellation policy?',
    answer: 'We require at least 24 hours notice for cancellations or rescheduling. Late cancellations or no-shows may incur a fee of 50% of the service cost.'
  },
  {
    question: 'Are your products safe for sensitive skin?',
    answer: 'Yes! We use premium, dermatologist-tested products suitable for all skin types including sensitive skin. Our specialists will recommend the most appropriate products for your specific needs.'
  },
  {
    question: 'Do you offer packages or memberships?',
    answer: 'Yes, we offer various packages and membership programs that provide excellent value. Our memberships include monthly treatments, exclusive discounts, and priority booking.'
  },
]

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="py-16 bg-white">
      <div className="max-w-3xl mx-auto px-5">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#7B2D8E]/10 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E]" />
            <span className="text-xs font-medium text-[#7B2D8E] uppercase tracking-wide">FAQ</span>
          </div>
          <h2 className="text-headline font-semibold text-gray-900 mb-2">
            Frequently Asked <span className="text-[#7B2D8E]">Questions</span>
          </h2>
          <p className="text-body text-gray-500">
            Find answers to common questions about our services.
          </p>
        </div>

        {/* FAQ List */}
        <div className="space-y-2">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`border rounded-lg overflow-hidden transition-all ${
                openIndex === index ? 'border-[#7B2D8E]/30 bg-[#7B2D8E]/5' : 'border-gray-200'
              }`}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <span className={`text-sm font-medium ${openIndex === index ? 'text-[#7B2D8E]' : 'text-gray-900'}`}>
                  {faq.question}
                </span>
                <ChevronDown 
                  className={`w-4 h-4 text-gray-400 transition-transform ${
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

        {/* Contact Card */}
        <div className="mt-8 bg-[#7B2D8E] rounded-xl p-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <h3 className="text-sm font-medium text-white">Still have questions?</h3>
              <p className="text-xs text-white/60">We're happy to help you anytime</p>
            </div>
            <Link 
              href="/contact" 
              className="btn-hover inline-flex items-center gap-2 px-4 py-2 bg-white text-[#7B2D8E] text-xs font-medium rounded-lg hover:bg-gray-100"
            >
              Contact Us
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
