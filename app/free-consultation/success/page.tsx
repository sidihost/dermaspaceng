import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { CheckCircle, ArrowRight, Calendar, Phone } from 'lucide-react'

export default function ConsultationSuccessPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#FDFBF9] flex items-center justify-center py-20">
        <div className="max-w-md mx-auto px-4 text-center">
          {/* Success Animation */}
          <div className="relative inline-flex mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#7B2D8E] to-[#9B4DAE] flex items-center justify-center shadow-lg shadow-[#7B2D8E]/25">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -inset-3 rounded-full border-2 border-dashed border-[#D4A853]/40 animate-spin" style={{ animationDuration: '8s' }} />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Consultation Booked!
          </h1>
          <p className="text-gray-600 mb-8">
            Thank you for booking a free consultation. Our skincare expert will contact you within 24 hours to schedule your personalized session.
          </p>

          {/* What to Expect */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 mb-6 text-left">
            <h3 className="font-bold text-gray-900 mb-4">What Happens Next?</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#7B2D8E] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</div>
                <p className="text-sm text-gray-600">Our team will call you to confirm your appointment time</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#7B2D8E] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</div>
                <p className="text-sm text-gray-600">Receive a personalized skin analysis at your chosen branch</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#7B2D8E] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</div>
                <p className="text-sm text-gray-600">Get expert treatment recommendations tailored to your needs</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-3">
            <Link
              href="/booking"
              className="flex items-center justify-between w-full p-4 bg-[#7B2D8E] text-white rounded-xl hover:bg-[#5A1D6A] transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5" />
                <span className="font-medium">Book a Treatment Now</span>
              </div>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="https://wa.me/+2349017972919"
              target="_blank"
              className="flex items-center justify-between w-full p-4 bg-white rounded-xl border border-gray-200 hover:border-[#7B2D8E]/30 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-[#7B2D8E]" />
                <span className="font-medium text-gray-900">Questions? Call Us</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#7B2D8E] group-hover:translate-x-1 transition-all" />
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
