import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { getCurrentUser } from '@/lib/auth'
import { canRoleVerifyGiftCard } from '@/lib/gift-card-code-helpers'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Verify Gift Card | Dermaspace',
  description:
    'Authorized staff and admin gift card verification and QR scanner for Dermaspace.',
}

export default async function VerifyGiftCardPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  const resolved = await searchParams
  const initialCode = typeof resolved.code === 'string' ? resolved.code.trim() : ''

  const user = await getCurrentUser()
  if (!user) {
    const targetPath = initialCode
      ? `/gift-cards/verify?code=${encodeURIComponent(initialCode)}`
      : '/gift-cards/verify'
    redirect(`/signin?redirect=${encodeURIComponent(targetPath)}`)
  }

  const authorized = canRoleVerifyGiftCard(user.role, user.is_active)
  if (authorized) {
    const querySuffix = initialCode ? `?code=${encodeURIComponent(initialCode)}` : ''
    if (user.role === 'admin') {
      redirect(`/admin/gift-cards/verify${querySuffix}`)
    }
    redirect(`/staff/gift-cards/verify${querySuffix}`)
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF6FB]">
      <Header />
      <main className="flex-1 pt-20">
        <div className="max-w-lg mx-auto px-4 py-16">
          <div
            data-testid="gift-card-verify-restricted"
            className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 text-center space-y-4"
          >
            <div className="w-12 h-12 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" aria-hidden="true" />
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7B2D8E]">
                Authorized Personnel Only
              </p>
              <h1 className="text-xl font-bold text-[#1a0d1f]">
                Admin &amp; Staff Verification Only
              </h1>
              <p className="text-sm text-gray-600 leading-relaxed">
                Gift card verification and QR scanning are restricted to Dermaspace administrators and reception staff. Please present your gift card at our Victoria Island or Ikoyi reception desk for redemption.
              </p>
            </div>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/gift-cards"
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white text-sm font-semibold transition-colors"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                <span>Back to Gift Cards</span>
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center h-10 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
              >
                My Dashboard
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
