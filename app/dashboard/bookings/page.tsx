import type { Metadata } from 'next'
import BookingsContent from './bookings-content'

export const metadata: Metadata = {
  title: 'My Bookings',
  description: 'Your Dermaspace booking history — upcoming, past, and cancelled appointments.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/dashboard/bookings' },
}

export default function BookingsPage() {
  return <BookingsContent />
}
