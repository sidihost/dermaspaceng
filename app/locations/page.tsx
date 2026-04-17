import type { Metadata } from 'next'
import Header from '@/components/layout/header'
import LocationsMap from '@/components/locations/locations-map'

export const metadata: Metadata = {
  title: 'Find us | Dermaspace',
  description:
    'Explore Dermaspace locations in Victoria Island and Ikoyi, Lagos. Get live directions from wherever you are.',
}

/**
 * The public /locations page. This is a thin server component — the real
 * work happens in the client <LocationsMap/> below, which reads the logged-in
 * user's personalization on the fly so the same page works for guests and
 * signed-in customers without needing two separate routes.
 */
export default function LocationsPage() {
  return (
    <>
      <Header />
      <LocationsMap />
    </>
  )
}
