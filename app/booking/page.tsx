import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { DermaspaceBooking } from "@/components/booking/dermaspace-booking"
import Link from "next/link"
import { ArrowRight, Heart, Shield, Clock, Award, Sparkles, Star, CheckCircle } from "lucide-react"

export const metadata = {
  title: 'Book Appointment | Dermaspace',
  description: 'Book your perfect skincare treatment with Dermaspace Booking Software. Easy online booking, instant confirmation, premium service.',
}

export default function BookingPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Hero Section */}
        <section className="relative py-16 md:py-20 bg-[#7B2D8E] overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-full" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
          <div className="absolute top-1/2 left-1/4 w-2 h-2 bg-white/40 rounded-full" />
          <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-white/30 rounded-full" />
          
          <div className="relative max-w-5xl mx-auto px-4 text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-sm font-medium text-white">Dermaspace Booking Software</span>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
              Book Your <span className="text-white/90">Perfect Treatment</span>
            </h1>
            <p className="text-base md:text-lg text-white/80 max-w-2xl mx-auto mb-10">
              Experience world-class skincare with our easy online booking system. 
              Select your treatment, choose your time, and we&apos;ll take care of the rest.
            </p>
            
            {/* Trust Badges - Beautiful Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 text-center hover:bg-white/15 transition-colors">
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-semibold text-white mb-1">Secure Booking</h3>
                <p className="text-sm text-white/70">Your data is encrypted and protected</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 text-center hover:bg-white/15 transition-colors">
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-semibold text-white mb-1">Instant Confirmation</h3>
                <p className="text-sm text-white/70">Get immediate booking confirmation</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 text-center hover:bg-white/15 transition-colors">
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
                  <Award className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-semibold text-white mb-1">Premium Service</h3>
                <p className="text-sm text-white/70">Expert care from certified professionals</p>
              </div>
            </div>
          </div>
        </section>

        {/* Booking Section */}
        <section className="py-8 sm:py-12">
          <div className="max-w-4xl mx-auto px-4">
            {/* Free Consultation Banner */}
            <Link 
              href="/consultation"
              className="flex items-center gap-4 p-5 bg-gradient-to-r from-[#7B2D8E]/5 to-[#9B4DB0]/5 rounded-2xl border border-[#7B2D8E]/20 hover:border-[#7B2D8E]/40 transition-all group mb-8"
            >
              <div className="w-14 h-14 flex-shrink-0 rounded-2xl bg-gradient-to-br from-[#7B2D8E] to-[#9B4DB0] flex items-center justify-center shadow-lg shadow-[#7B2D8E]/20">
                <Heart className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">Not sure what treatment you need?</p>
                <p className="text-sm text-gray-500">Get a free consultation with our skin experts</p>
              </div>
              <ArrowRight className="w-6 h-6 flex-shrink-0 text-[#7B2D8E] group-hover:translate-x-1 transition-transform" />
            </Link>

            {/* Booking Component */}
            <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-xl shadow-gray-200/50">
              <DermaspaceBooking />
            </div>

            {/* Features Section */}
            <div className="mt-12">
              <h3 className="text-center text-lg font-semibold text-gray-900 mb-6">Why Book with Dermaspace</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-gray-100 text-center hover:shadow-lg hover:border-gray-200 transition-all">
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <h4 className="font-medium text-gray-900 text-sm mb-1">Free Cancellation</h4>
                  <p className="text-xs text-gray-500">Up to 24 hours before</p>
                </div>
                
                <div className="bg-white rounded-2xl p-5 border border-gray-100 text-center hover:shadow-lg hover:border-gray-200 transition-all">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-3">
                    <Shield className="w-6 h-6 text-blue-600" />
                  </div>
                  <h4 className="font-medium text-gray-900 text-sm mb-1">Safe & Hygienic</h4>
                  <p className="text-xs text-gray-500">Strict protocols followed</p>
                </div>
                
                <div className="bg-white rounded-2xl p-5 border border-gray-100 text-center hover:shadow-lg hover:border-gray-200 transition-all">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mx-auto mb-3">
                    <Award className="w-6 h-6 text-purple-600" />
                  </div>
                  <h4 className="font-medium text-gray-900 text-sm mb-1">Expert Staff</h4>
                  <p className="text-xs text-gray-500">Certified professionals</p>
                </div>
                
                <div className="bg-white rounded-2xl p-5 border border-gray-100 text-center hover:shadow-lg hover:border-gray-200 transition-all">
                  <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center mx-auto mb-3">
                    <Star className="w-6 h-6 text-yellow-600" />
                  </div>
                  <h4 className="font-medium text-gray-900 text-sm mb-1">Earn Points</h4>
                  <p className="text-xs text-gray-500">Loyalty rewards program</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
