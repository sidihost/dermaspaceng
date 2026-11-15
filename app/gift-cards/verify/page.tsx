import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { GiftCardVerifyClient } from '@/components/gift-cards/gift-card-verify-client'

export const metadata = {
  title: 'Verify Gift Card | Dermaspace',
  description:
    'Verify authenticity and live redemption status of a Dermaspace gift card.',
}

export default async function VerifyGiftCardPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  const resolved = await searchParams
  const initialCode = typeof resolved.code === 'string' ? resolved.code : ''

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF6FB]">
      <Header />
      <main className="flex-1 pt-20">
        <GiftCardVerifyClient initialCode={initialCode} />
      </main>
      <Footer />
    </div>
  )
}
