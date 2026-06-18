import type { Metadata } from 'next'
import AnniversaryReel from '@/components/anniversary/anniversary-reel'

export const metadata: Metadata = {
  title: '7 Years of Dermaspace',
  description:
    'Celebrating seven years of glowing skin. A short story of how far we have come — and the faces that brought us here.',
}

export default function AnniversaryPage() {
  return <AnniversaryReel />
}
