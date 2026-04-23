'use client'

import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react'
import Script from 'next/script'

interface HCaptchaProps {
  onVerify: (token: string) => void
  onExpire?: () => void
  onError?: (error: string) => void
}

export interface HCaptchaRef {
  reset: () => void
}

declare global {
  interface Window {
    hcaptcha?: {
      render: (container: string | HTMLElement, options: {
        sitekey: string
        callback: (token: string) => void
        'expired-callback'?: () => void
        'error-callback'?: (error: string) => void
        theme?: 'light' | 'dark'
        size?: 'normal' | 'compact'
      }) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}

const HCaptcha = forwardRef<HCaptchaRef, HCaptchaProps>(function HCaptcha(
  { onVerify, onExpire, onError },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const isRenderedRef = useRef(false)

  // Stash callbacks in a ref so the render effect doesn't need them in
  // its dep list. If we put them in deps, every parent render would
  // re-run the effect, which would try to mount a second widget and
  // throw. With a ref, the widget mounts exactly once and always calls
  // the latest handler.
  const callbacksRef = useRef({ onVerify, onExpire, onError })
  callbacksRef.current = { onVerify, onExpire, onError }

  const siteKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY
  const isDevBypass = !siteKey

  useImperativeHandle(
    ref,
    () => ({
      reset: () => {
        if (widgetIdRef.current && typeof window !== 'undefined' && window.hcaptcha) {
          try {
            window.hcaptcha.reset(widgetIdRef.current)
          } catch (error) {
            console.error('hCaptcha reset error:', error)
          }
        }
      },
    }),
    [],
  )

  const renderCaptcha = useCallback(() => {
    if (!containerRef.current) return
    if (isRenderedRef.current) return
    if (typeof window === 'undefined' || !window.hcaptcha) return
    if (!siteKey) return

    try {
      widgetIdRef.current = window.hcaptcha.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token: string) => callbacksRef.current.onVerify(token),
        'expired-callback': () => callbacksRef.current.onExpire?.(),
        'error-callback': (err: string) => callbacksRef.current.onError?.(err),
        theme: 'light',
        size: 'normal',
      })
      isRenderedRef.current = true
    } catch (error) {
      console.error('hCaptcha render error:', error)
    }
  }, [siteKey])

  // Dev bypass — auto-fire onVerify once so the form proceeds. Using
  // a ref-called callback keeps the effect tidy and avoids re-firing.
  useEffect(() => {
    if (isDevBypass) {
      callbacksRef.current.onVerify('dev-token')
    }
  }, [isDevBypass])

  // Render the widget. The tricky case this fixes: when a user lands
  // on the sign-in page via client-side navigation (e.g. they clicked
  // /signin from the header), the hCaptcha script may already be in
  // the DOM from a previous mount on the same session. In that case
  // next/script's `onLoad` won't fire again — so the old code just
  // waited forever, which is why the captcha only appeared after a
  // hard refresh. We fix it by polling for `window.hcaptcha` on mount
  // and rendering as soon as it's available (or immediately, if the
  // script had already loaded).
  useEffect(() => {
    if (isDevBypass) return
    if (isRenderedRef.current) return

    if (typeof window !== 'undefined' && window.hcaptcha) {
      renderCaptcha()
      return
    }

    const interval = window.setInterval(() => {
      if (window.hcaptcha) {
        renderCaptcha()
        window.clearInterval(interval)
      }
    }, 100)

    // Give up politely after 15s — keeps us from leaking timers if
    // the user is offline or the CDN is blocked.
    const timeout = window.setTimeout(() => window.clearInterval(interval), 15000)

    return () => {
      window.clearInterval(interval)
      window.clearTimeout(timeout)
    }
  }, [isDevBypass, renderCaptcha])

  // Cleanup the hCaptcha widget on unmount so we don't leave orphan
  // iframes behind when the user navigates away.
  useEffect(() => {
    return () => {
      if (widgetIdRef.current && typeof window !== 'undefined' && window.hcaptcha) {
        try {
          window.hcaptcha.remove(widgetIdRef.current)
        } catch {
          // Ignore cleanup errors
        }
      }
      isRenderedRef.current = false
      widgetIdRef.current = null
    }
  }, [])

  if (isDevBypass) {
    return (
      <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-500 text-center">
        Captcha disabled in development
      </div>
    )
  }

  return (
    <>
      <Script src="https://js.hcaptcha.com/1/api.js" strategy="afterInteractive" />
      <div ref={containerRef} className="flex justify-center my-4" />
    </>
  )
})

export default HCaptcha
