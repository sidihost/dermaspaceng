import type { Metadata } from 'next'
import {
  INTERNATIONAL_REGIONS,
  buildRegionalMenu,
} from '@/lib/international-regions'
import { InternationalRegionPage } from '@/components/regional/international-region-page'

const region = INTERNATIONAL_REGIONS.GH

export const metadata: Metadata = {
  title: {
    absolute: 'Dermaspace Ghana | Skincare, Spa & Wellness (GHS)',
  },
  description:
    'Discover Dermaspace facials, peels, laser hair removal, and spa treatments priced clearly in Ghana Cedis (GHS). Register for the Accra waitlist.',
  alternates: {
    canonical: 'https://dermaspaceng.com/GH',
  },
  openGraph: {
    title: 'Dermaspace Ghana | Skincare, Spa & Wellness (GHS)',
    description:
      'Transparent GHS treatment pricing across Dermaspace facials, laser care, peels, and spa treatments, plus early Ghana waitlist registration.',
    url: 'https://dermaspaceng.com/GH',
  },
}

export default function GhanaStorefrontPage() {
  const menu = buildRegionalMenu(region)
  return <InternationalRegionPage region={region} menu={menu} />
}
