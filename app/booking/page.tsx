import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { DermaspaceBooking } from "@/components/booking/dermaspace-booking"
import Link from "next/link"
import { ArrowRight, Heart, Shield, Clock, Award } from "lucide-react"

export default function BookingPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <section className="relative py-12 md:py-16 bg-[#7B2D8E] overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 left-1/4 w-24 h-24 bg-white/5 rounded-full -translate-y-1/2" />
          <div className="absolute bottom-0 right-1/4 w-36 h-36 bg-white/5 rounded-full translate-y-1/2" />
          <div className="absolute top-1/3 right-8 w-2 h-2 bg-white/30 rounded-full hidden md:block" />
          <div className="absolute bottom-1/3 left-8 w-3 h-3 bg-white/20 rounded-full hidden md:block" />
          
          <div className="relative max-w-4xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-4">
              <span className="text-xs font-medium text-white uppercase tracking-widest">Dermaspace Booking Software</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-bold text-white mb-3">
              Book Your <span className="text-white/90">Perfect Treatment</span>
            </h1>
            <p className="text-sm md:text-base text-white/80 max-w-xl mx-auto">
              Experience world-class skincare with our easy online booking system. 
              Select your treatment, choose your time, and we&apos;ll take care of the rest.
            </p>
            
            {/* Trust Badges */}
            <div className="flex items-center justify-center gap-6 mt-6">
              <div className="flex items-center gap-2 text-white/80">
                <Shield className="w-4 h-4" />
                <span className="text-xs">Secure Booking</span>
              </div>
              <div className="flex items-center gap-2 text-white/80">
                <Clock className="w-4 h-4" />
                <span className="text-xs">Instant Confirmation</span>
              </div>
              <div className="flex items-center gap-2 text-white/80">
                <Award className="w-4 h-4" />
                <span className="text-xs">Premium Service</span>
              </div>
            </div>
          </div>
        </section>

        {/* Booking Section */}
        <section className="py-6 sm:py-8">
          <div className="max-w-3xl mx-auto px-4">
            {/* Free Consultation Banner */}
            <Link 
              href="/consultation"
              className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-200 hover:border-[#7B2D8E]/40 transition-all group mb-6 shadow-sm"
            >
              <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-[#7B2D8E] flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">Not sure what treatment you need?</p>
                <p className="text-xs text-gray-500">Get a free consultation with our skin experts</p>
              </div>
              <ArrowRight className="w-5 h-5 flex-shrink-0 text-[#7B2D8E] group-hover:translate-x-1 transition-transform" />
            </Link>

            {/* Booking Component */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <DermaspaceBooking />
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="w-8 h-8 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center mb-2">
                  <Clock className="w-4 h-4 text-[#7B2D8E]" />
                </div>
                <h3 className="font-medium text-gray-900 text-sm mb-1">Free Cancellation</h3>
                <p className="text-xs text-gray-500">Cancel up to 24 hours before your appointment</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="w-8 h-8 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center mb-2">
                  <Shield className="w-4 h-4 text-[#7B2D8E]" />
                </div>
                <h3 className="font-medium text-gray-900 text-sm mb-1">Safe & Hygienic</h3>
                <p className="text-xs text-gray-500">We follow strict health and safety protocols</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="w-8 h-8 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center mb-2">
                  <Award className="w-4 h-4 text-[#7B2D8E]" />
                </div>
                <h3 className="font-medium text-gray-900 text-sm mb-1">Expert Staff</h3>
                <p className="text-xs text-gray-500">Certified professionals with years of experience</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
