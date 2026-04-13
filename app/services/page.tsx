import { Metadata } from 'next'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import ServicesPageContent from '@/components/services/services-page-content'

export const metadata: Metadata = {
  title: 'Our Services',
  description: 'Explore our comprehensive range of spa services including body treatments, facial therapies, nail care, waxing, and advanced skincare treatments at Dermaspace Lagos.',
}

export default function ServicesPage() {
  return (
    <main>
      <Header />
      <ServicesPageContent />
      <Footer />
    </main>
  )
}
