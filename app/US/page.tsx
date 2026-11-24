import type { Metadata } from 'next'
import {
  INTERNATIONAL_REGIONS,
  buildRegionalMenu,
} from '@/lib/international-regions'
import { InternationalRegionPage } from '@/components/regional/international-region-page'

const region = INTERNATIONAL_REGIONS.US

export const metadata: Metadata = {
  title: {
    absolute: 'Dermaspace United States | Skincare, Spa & Wellness (USD)',
  },
  description:
    'Browse Dermaspace facials, chemical peels, laser treatments, and body care priced clearly in US Dollars (USD). Join the US waitlist.',
  alternates: {
    canonical: 'https://dermaspaceng.com/US',
  },
  openGraph: {
    title: 'Dermaspace United States | Skincare, Spa & Wellness (USD)',
    description:
      'Transparent USD treatment pricing across Dermaspace facials, laser care, peels, and spa treatments, plus early US waitlist registration.',
    url: 'https://dermaspaceng.com/US',
  },
}

export default function UnitedStatesStorefrontPage() {
  const menu = buildRegionalMenu(region)
  return <InternationalRegionPage region={region} menu={menu} />
}
