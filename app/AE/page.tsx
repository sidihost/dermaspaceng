import type { Metadata } from 'next'
import {
  INTERNATIONAL_REGIONS,
  buildRegionalMenu,
} from '@/lib/international-regions'
import { InternationalRegionPage } from '@/components/regional/international-region-page'

const region = INTERNATIONAL_REGIONS.AE

export const metadata: Metadata = {
  title: {
    absolute: 'Dermaspace United Arab Emirates | Skincare, Spa & Wellness (AED)',
  },
  description:
    'Review Dermaspace facials, chemical peels, laser hair removal, and restorative spa treatments priced clearly in UAE Dirhams (AED). Join the UAE waitlist.',
  alternates: {
    canonical: 'https://dermaspaceng.com/AE',
  },
  openGraph: {
    title: 'Dermaspace United Arab Emirates | Skincare, Spa & Wellness (AED)',
    description:
      'Transparent AED treatment pricing across Dermaspace facials, laser care, peels, and spa treatments, plus early UAE waitlist registration.',
    url: 'https://dermaspaceng.com/AE',
  },
}

export default function UnitedArabEmiratesStorefrontPage() {
  const menu = buildRegionalMenu(region)
  return <InternationalRegionPage region={region} menu={menu} />
}
