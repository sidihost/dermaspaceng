'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, MessageCircle, ArrowRight } from 'lucide-react'

const faqs = [
  {
    question: 'What should I expect during my first visit?',
    answer: 'During your first visit, our skincare specialists will conduct a thorough skin analysis to understand your unique needs. We\'ll discuss your concerns, goals, and create a personalized treatment plan. The consultation typically takes 15-20 minutes.'
  },
  {
    question: 'How do I book an appointment?',
    answer: 'You can book an appointment through our website by clicking "Book Now", calling us directly, or sending a WhatsApp message. We recommend booking at least 24 hours in advance to secure your preferred time slot.'
  },
  {
    question: 'What is your cancellation policy?',
    answer: 'We require at least 24 hours notice for cancellations or rescheduling. Late cancellations or no-shows may incur a fee of 50% of the service cost. We understand emergencies happen, so please contact us as soon as possible.'
  },
  {
    question: 'Are your products safe for sensitive skin?',
    answer: 'Yes! We use premium, dermatologist-tested products suitable for all skin types including sensitive skin. Our specialists will assess your skin and recommend the most appropriate products and treatments for your specific needs.'
  },
  {
    question: 'Do you offer packages or memberships?',
    answer: 'Yes, we offer various packages and membership programs that provide excellent value. Our memberships include monthly treatments, exclusive discounts, and priority booking. Visit our Membership page for more details.'
  },
  {
    question: 'How can I contact customer support?',
    answer: 'You can reach us via WhatsApp, phone call, email at info@dermaspaceng.com, or visit any of our locations. Our support team is available Monday to Saturday, 9am to 7pm.'
  },
]

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="py-12 sm:py-16 lg:py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#7B2D8E]/10 mb-3 sm:mb-4">
            <span className="text-xs sm:text-sm font-semibold text-[#7B2D8E] uppercase tracking-widest">FAQ</span>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-900 mb-2 sm:mb-3 font-serif">
            Frequently Asked <span className="text-[#7B2D8E]">Questions</span>
          </h2>
          <p className="text-gray-600 max-w-lg mx-auto text-xs sm:text-sm">
            Find answers to common questions about our services, bookings, and policies.
          </p>
          {/* Decorative curve */}
          <div className="flex items-center justify-center gap-1 mt-3 sm:mt-4">
            <svg width="60" height="8" viewBox="0 0 60 8" fill="none" className="w-10 sm:w-auto">
              <path d="M1 6C15 2 45 2 59 6" stroke="#7B2D8E" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.3"/>
            </svg>
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#7B2D8E]" />
            <svg width="60" height="8" viewBox="0 0 60 8" fill="none" className="w-10 sm:w-auto">
              <path d="M1 6C15 2 45 2 59 6" stroke="#7B2D8E" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.3"/>
            </svg>
          </div>
        </div>

        {/* FAQ List */}
        <div className="space-y-2 sm:space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`border rounded-xl overflow-hidden transition-all ${
                openIndex === index ? 'border-[#7B2D8E]/30 bg-[#7B2D8E]/5' : 'border-gray-200'
              }`}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-3 sm:p-4 text-left gap-3"
              >
                <span className={`font-medium text-xs sm:text-sm ${openIndex === index ? 'text-[#7B2D8E]' : 'text-gray-900'}`}>
                  {faq.question}
                </span>
                <ChevronDown 
                  className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-400 transition-transform flex-shrink-0 ${
                    openIndex === index ? 'rotate-180 text-[#7B2D8E]' : ''
                  }`} 
                />
              </button>
              {openIndex === index && (
                <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact Support Card */}
        <div className="mt-8 sm:mt-10 bg-[#7B2D8E] rounded-xl sm:rounded-2xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  <circle cx="9" cy="10" r="1" fill="currentColor" />
                  <circle cx="12" cy="10" r="1" fill="currentColor" />
                  <circle cx="15" cy="10" r="1" fill="currentColor" />
                </svg>
              </div>
              <div className="text-center sm:text-left">
                <h3 className="font-semibold text-white text-xs sm:text-sm">Still have questions?</h3>
                <p className="text-xs text-white/70">We're happy to help you anytime</p>
              </div>
            </div>
            <Link 
              href="/contact" 
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-2 bg-white text-[#7B2D8E] text-xs sm:text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
            >
              Contact Us
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
