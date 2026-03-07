'use client'

import { useEffect, useRef, useCallback } from 'react'
import Script from 'next/script'

interface HCaptchaProps {
  onVerify: (token: string) => void
  onExpire?: () => void
  onError?: (error: string) => void
}

declare global {
  interface Window {
    hcaptcha: {
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

export default function HCaptcha({ onVerify, onExpire, onError }: HCaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const isRenderedRef = useRef(false)

  const siteKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || '10000000-ffff-ffff-ffff-000000000001' // Test key

  const renderCaptcha = useCallback(() => {
    if (!containerRef.current || isRenderedRef.current || !window.hcaptcha) return

    try {
      widgetIdRef.current = window.hcaptcha.render(containerRef.current, {
        sitekey: siteKey,
        callback: onVerify,
        'expired-callback': onExpire,
        'error-callback': onError,
        theme: 'light',
        size: 'normal'
      })
      isRenderedRef.current = true
    } catch (error) {
      console.error('hCaptcha render error:', error)
    }
  }, [siteKey, onVerify, onExpire, onError])

  useEffect(() => {
    return () => {
      if (widgetIdRef.current && window.hcaptcha) {
        try {
          window.hcaptcha.remove(widgetIdRef.current)
        } catch {
          // Ignore cleanup errors
        }
      }
      isRenderedRef.current = false
    }
  }, [])

  // If no site key is configured, don't render captcha
  if (!process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY) {
    // Auto-verify for development without captcha
    useEffect(() => {
      onVerify('dev-token')
    }, [onVerify])
    
    return (
      <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-500 text-center">
        Captcha disabled in development
      </div>
    )
  }

  return (
    <>
      <Script
        src="https://js.hcaptcha.com/1/api.js"
        strategy="afterInteractive"
        onLoad={renderCaptcha}
      />
      <div 
        ref={containerRef}
        className="flex justify-center my-4"
      />
    </>
  )
}
