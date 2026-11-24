import type { Metadata } from 'next'
import {
  INTERNATIONAL_REGIONS,
  buildRegionalMenu,
} from '@/lib/international-regions'
import { InternationalRegionPage } from '@/components/regional/international-region-page'

const region = INTERNATIONAL_REGIONS.UK

export const metadata: Metadata = {
  title: {
    absolute: 'Dermaspace United Kingdom | Skincare, Spa & Wellness (GBP)',
  },
  description:
    'Explore Dermaspace facials, peels, laser hair removal, and restorative spa treatments priced clearly in British Pounds (GBP). Join the UK waitlist.',
  alternates: {
    canonical: 'https://dermaspaceng.com/UK',
  },
  openGraph: {
    title: 'Dermaspace United Kingdom | Skincare, Spa & Wellness (GBP)',
    description:
      'Explore Dermaspace facials, laser treatments, peels, and spa care in GBP, and join the United Kingdom waitlist.',
    url: 'https://dermaspaceng.com/UK',
  },
}

export default function UnitedKingdomStorefrontPage() {
  const menu = buildRegionalMenu(region)
  return <InternationalRegionPage region={region} menu={menu} />
}
