import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { BookingFrame } from "@/components/booking/booking-frame"
import Link from "next/link"
import { ArrowRight, Heart } from "lucide-react"
import { getCurrentUser } from "@/lib/auth"

export default async function BookingPage() {
  const user = await getCurrentUser()
  const isLoggedIn = !!user
  
  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="relative py-16 md:py-20 bg-[#7B2D8E] overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 left-1/4 w-24 h-24 bg-white/5 rounded-full -translate-y-1/2" />
          <div className="absolute bottom-0 right-1/4 w-36 h-36 bg-white/5 rounded-full translate-y-1/2" />
          <div className="absolute top-1/3 right-8 w-2 h-2 bg-white/30 rounded-full hidden md:block" />
          <div className="absolute bottom-1/3 left-8 w-3 h-3 bg-white/20 rounded-full hidden md:block" />
          
          <div className="relative max-w-4xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-4">
              <span className="text-xs font-medium text-white uppercase tracking-widest">Book Your Experience</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-bold text-white mb-3">
              Book An <span className="text-white/90">Appointment</span>
            </h1>
            <p className="text-sm md:text-base text-white/80">
              Your journey to wellness starts here
            </p>
            
            {/* Decorative line */}
            <div className="flex items-center justify-center gap-2 mt-6">
              <div className="w-8 h-0.5 bg-white/30" />
              <div className="w-2 h-2 rounded-full bg-white/50" />
              <div className="w-8 h-0.5 bg-white/30" />
            </div>
          </div>
        </section>

        {/* Booking Section */}
        <section className="py-8">
          <div className="w-full px-0 sm:px-4 lg:px-6">
            {/* Free Consultation Banner */}
            <div className="max-w-4xl mx-auto mb-6 px-4">
              <Link 
                href="/consultation"
                className="flex items-center gap-3 p-4 bg-gradient-to-r from-[#7B2D8E]/10 to-[#7B2D8E]/5 rounded-2xl border border-[#7B2D8E]/20 hover:border-[#7B2D8E]/40 transition-all group"
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
            </div>

            {/* Online Booking - Full Width */}
            <div className="w-full">
              <BookingFrame minHeight={750} className="rounded-none sm:rounded-2xl" />
            </div>
          </div>
        </section>
      </main>
      {!isLoggedIn && <Footer />}
    </>
  )
}
