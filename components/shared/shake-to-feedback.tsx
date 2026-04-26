'use client'

/**
 * Mount the global shake-to-feedback listener.
 *
 * Two responsibilities:
 *   1. Run the `useShakeToFeedback()` hook so devicemotion is
 *      observed across every page.
 *   2. Show a brand toast the moment a shake is detected, BEFORE
 *      the navigation kicks in. Without that the user's screen
 *      jumps to /feedback with no hint that the gesture worked,
 *      which feels like a glitch — "did I do that or did the app
 *      crash?". The hook fires `onShake()` ~150ms before navigating
 *      precisely so this toast can land on the original page.
 *
 * Renders nothing.
 */

import { useEffect } from 'react'
import { useShakeToFeedback, onShake } from '@/lib/use-shake-to-feedback'
import { useNotify } from './notify'

export default function ShakeToFeedback() {
  useShakeToFeedback()
  const notify = useNotify()

  useEffect(() => {
    const off = onShake(() => {
      notify.info('Shake detected', 'Opening the feedback form…', { duration: 2000 })
    })
    return off
  }, [notify])

  return null
}
