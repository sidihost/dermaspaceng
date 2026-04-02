import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { BookingFrame } from "@/components/booking/booking-frame"
import { getCurrentUser } from "@/lib/auth"

export default async function BookingPage() {
  const user = await getCurrentUser()
  const isLoggedIn = !!user
  
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-[#7B2D8E]/5 to-white">
        {/* Compact Header */}
        <div className="bg-[#7B2D8E] py-6 px-4">
          <div className="max-w-lg mx-auto text-center">
            <h1 className="text-xl font-bold text-white">Book Appointment</h1>
            <p className="text-sm text-white/70 mt-1">Schedule your visit with us</p>
          </div>
        </div>

        {/* Booking Content */}
        <div className="px-4 py-6">
          <div className="max-w-md mx-auto">
            <BookingFrame />
          </div>
        </div>
      </main>
      {!isLoggedIn && <Footer />}
    </>
  )
}
