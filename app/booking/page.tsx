import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { getCurrentUser } from "@/lib/auth"
import { BookingCard } from "@/components/booking/booking-card"

export default async function BookingPage() {
  const user = await getCurrentUser()
  const isLoggedIn = !!user
  
  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        {/* Header */}
        <div className="bg-[#7B2D8E] py-10 px-4">
          <div className="max-w-lg mx-auto text-center">
            <h1 className="text-2xl font-bold text-white">
              Book An <span className="text-white/90">Appointment</span>
            </h1>
            <p className="text-sm text-white/70 mt-2">Your journey to wellness starts here</p>
            {/* Decorative line */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className="w-8 h-0.5 bg-white/30" />
              <div className="w-2 h-2 rounded-full bg-white/50" />
              <div className="w-8 h-0.5 bg-white/30" />
            </div>
          </div>
        </div>

        {/* Booking Content */}
        <div className="px-4 py-8 -mt-4">
          <div className="max-w-md mx-auto">
            <BookingCard />
          </div>
        </div>
      </main>
      {!isLoggedIn && <Footer />}
    </>
  )
}
