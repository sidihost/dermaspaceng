import type { Metadata } from 'next'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import DermaAIPageShell from '@/components/derma-ai/derma-ai-page-shell'

export const metadata: Metadata = {
  title: 'Derma AI · Your Spa Concierge',
  description:
    'Chat with Derma AI — book treatments, check your wallet, reschedule visits, and get personalised skincare advice, all in one place.',
}

export default function DermaAIRoutePage() {
  return (
    <main>
      <Header />
      <DermaAIPageShell />
      <Footer />
    </main>
  )
}
