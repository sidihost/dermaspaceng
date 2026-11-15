'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { ArrowRight } from 'lucide-react'
import { GiftCardPreview } from '@/components/gift-cards/gift-card-preview'
import {
  CHRISTMAS_GIFT_CARD_DESIGN_ENABLED,
  CHRISTMAS_OCCASION,
  getDefaultGiftCardDesign,
} from '@/lib/gift-card-templates'

const festiveFetcher = (url: string) =>
  fetch(url, { cache: 'no-store' }).then((r) => r.json())

export default function GiftCardsSection() {
  const { data: festiveData } = useSWR<{ enabled: boolean }>('/api/festive', festiveFetcher, {
    revalidateOnFocus: true,
    revalidateOnMount: true,
    dedupingInterval: 2_000,
  })
  const festiveEnabled = festiveData ? festiveData.enabled !== false : true
  const defaultDesign = getDefaultGiftCardDesign({
    festiveEnabled,
    userRemovedChristmas: false,
  })
  const defaultOccasion =
    festiveEnabled && CHRISTMAS_GIFT_CARD_DESIGN_ENABLED
      ? CHRISTMAS_OCCASION
      : undefined

  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Gift Card Visual */}
          <div className="relative flex justify-center">
            <GiftCardPreview
              design={defaultDesign}
              amountText="₦25,000"
              recipientName="Adeboyega Tolu"
              senderName="Chidinma"
              occasion={defaultOccasion}
              showStack={true}
              className="w-72"
            />
          </div>

          {/* Content */}
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7B2D8E]/10 mb-3">
              <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Gift Cards</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
              Better than <span className="text-[#7B2D8E]">flowers</span>
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-4 max-w-md">
              Birthday, thank-you, apology, anniversary — whatever the occasion, a Dermaspace gift card lands better than another bouquet. Pick any amount, valid at both branches, never expires.
            </p>
            
            <ul className="space-y-2 mb-5 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E]" />
                Available in any amount
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E]" />
                Redeemable at both locations
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E]" />
                Never expires
              </li>
            </ul>

            <Link
              href="/gift-cards"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#7B2D8E] rounded-full hover:bg-[#5A1D6A] transition-colors"
            >
              Purchase Gift Card
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
