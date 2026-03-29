import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { CheckCircle, ArrowRight, Home, Phone } from 'lucide-react'

export default function ContactSuccessPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-white flex items-center justify-center py-20">
        <div className="max-w-md mx-auto px-4 text-center">
          {/* Success Icon */}
          <div className="relative inline-flex mb-6">
            <div className="w-20 h-20 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-[#7B2D8E]" />
            </div>
            <div className="absolute -inset-2 rounded-full border-2 border-dashed border-[#7B2D8E]/20 animate-spin" style={{ animationDuration: '10s' }} />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Message Sent!
          </h1>
          <p className="text-gray-600 mb-8">
            Thank you for reaching out. Our team will get back to you within 24 hours. We look forward to connecting with you.
          </p>

          {/* Quick Actions */}
          <div className="space-y-3 mb-8">
            <Link
              href="/"
              className="flex items-center justify-between w-full p-4 bg-white rounded-xl border border-gray-100 hover:border-[#7B2D8E]/30 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center">
                  <Home className="w-5 h-5 text-[#7B2D8E]" />
                </div>
                <span className="font-medium text-gray-900">Back to Home</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#7B2D8E] group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              href="https://wa.me/+2349017972919"
              target="_blank"
              className="flex items-center justify-between w-full p-4 bg-white rounded-xl border border-gray-100 hover:border-[#7B2D8E]/30 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-[#7B2D8E]" />
                </div>
                <span className="font-medium text-gray-900">Need urgent help? Call us</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#7B2D8E] group-hover:translate-x-1 transition-all" />
            </Link>
          </div>

          <p className="text-sm text-gray-500">
            Reference ID: #{Math.random().toString(36).substring(2, 10).toUpperCase()}
          </p>
        </div>
      </main>
      <Footer />
    </>
  )
}
