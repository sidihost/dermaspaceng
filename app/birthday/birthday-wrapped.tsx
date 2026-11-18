'use client'

import CelebrationWrapped from '@/components/celebrations/celebration-wrapped'
import type { RecapPayload } from '@/lib/birthday'

export type { RecapPayload }

export default function BirthdayWrapped({ recap }: { recap: RecapPayload }) {
  return <CelebrationWrapped recap={recap} occasion="birthday" />
}
