'use client'

/**
 * Mount the global shake-to-feedback listener.
 *
 * Keeps the hook out of `client-shell.tsx` (which is a non-async
 * component that already wires several other widgets) so the
 * feedback gesture has a single, dedicated entry point. Renders
 * nothing — it's pure side-effect.
 */

import { useShakeToFeedback } from '@/lib/use-shake-to-feedback'

export default function ShakeToFeedback() {
  useShakeToFeedback()
  return null
}
