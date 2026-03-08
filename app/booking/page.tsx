import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { BookingFrame } from "@/components/booking/booking-frame"
import Link from "next/link"
import { ArrowRight, Heart } from "lucide-react"

export default function BookingPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#FDFBF9]">
        {/* Hero Section */}
        <section className="relative py-12 md:py-16 bg-[#7B2D8E] overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white rounded-full translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-1/3 translate-y-1/3" />
          </div>
          
          <div className="relative max-w-4xl mx-auto px-5 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 mb-4">
              <span className="text-xs font-medium text-white uppercase tracking-wide">Book Your Experience</span>
            </div>
            <h1 className="text-xl md:text-3xl font-semibold text-white mb-2">
              Book An Appointment
            </h1>
            <p className="text-sm text-white/70">
              Your journey to wellness starts here
            </p>
          </div>
        </section>

        {/* Booking Section */}
        <section className="py-6">
          <div className="max-w-5xl mx-auto px-5">
            {/* Free Consultation Banner */}
            <Link 
              href="/free-consultation"
              className="flex items-center gap-3 p-3 mb-6 bg-white rounded-xl border border-gray-100 hover:border-[#7B2D8E]/30 transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-[#7B2D8E] flex items-center justify-center">
                <Heart className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Not sure what treatment you need?</p>
                <p className="text-xs text-gray-500">Get a free consultation with our skin experts</p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#7B2D8E] group-hover:translate-x-0.5 transition-transform" />
            </Link>

            {/* Booking Frame */}
            <BookingFrame minHeight={700} className="rounded-xl" />
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
