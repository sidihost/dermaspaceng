import type { Metadata } from 'next'
import {
  INTERNATIONAL_REGIONS,
  buildRegionalMenu,
} from '@/lib/international-regions'
import { InternationalRegionPage } from '@/components/regional/international-region-page'

const region = INTERNATIONAL_REGIONS.ZA

export const metadata: Metadata = {
  title: {
    absolute: 'Dermaspace South Africa | Skincare, Spa & Wellness (ZAR)',
  },
  description:
    'Explore Dermaspace facials, peels, laser hair removal, and restorative spa treatments priced clearly in South African Rand (ZAR). Join the South Africa waitlist.',
  alternates: {
    canonical: 'https://dermaspaceng.com/ZA',
  },
  openGraph: {
    title: 'Dermaspace South Africa | Skincare, Spa & Wellness (ZAR)',
    description:
      'Transparent ZAR treatment pricing across Dermaspace facials, laser care, peels, and spa treatments, plus early South Africa waitlist registration.',
    url: 'https://dermaspaceng.com/ZA',
  },
}

export default function SouthAfricaStorefrontPage() {
  const menu = buildRegionalMenu(region)
  return <InternationalRegionPage region={region} menu={menu} />
}
