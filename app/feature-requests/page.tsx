import type { Metadata } from 'next'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import FeatureRequestsClient from './feature-requests-client'

export const metadata: Metadata = {
  title: 'Feature Requests · Dermaspace',
  description:
    'Share ideas, upvote what matters to you, and follow them through our product roadmap.',
}

// The board reads the signed-in viewer (for vote state) so it must be
// rendered dynamically rather than statically prerendered.
export const dynamic = 'force-dynamic'

export default function FeatureRequestsPage() {
  return (
    <>
      <Header />
      <main>
        <FeatureRequestsClient />
      </main>
      <Footer />
    </>
  )
}
