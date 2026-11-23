'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowUpRight, MessageCircle, X } from 'lucide-react'
import {
  isSafeHref,
  isSafePublicHttpsUrl,
  type PublicActivePlugin,
} from '@/lib/plugins'

const EXCLUDED_PREFIXES = ['/admin', '/staff', '/blocked', '/maintenance', '/api']

function isExcludedRoute(pathname: string | null): boolean {
  if (!pathname) return false
  return EXCLUDED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

function injectExternalScript(id: string, src: string): void {
  if (typeof document === 'undefined') return
  if (document.querySelector(`script[data-derma-plugin="${CSS.escape(id)}"]`)) return
  const script = document.createElement('script')
  script.src = src
  script.async = true
  script.defer = true
  script.setAttribute('data-derma-plugin', id)
  document.head.appendChild(script)
}

function activateScriptPlugin(plugin: PublicActivePlugin): void {
  if (typeof window === 'undefined') return
  const win = window as unknown as Record<string, unknown>

  if (plugin.kind === 'script') {
    if (isSafePublicHttpsUrl(plugin.scriptUrl)) {
      injectExternalScript(`custom:${plugin.slug}`, plugin.scriptUrl!)
    }
    return
  }

  switch (plugin.slug) {
    case 'google-analytics': {
      const measurementId = plugin.config.measurementId?.trim() ?? ''
      if (!/^G-[A-Z0-9]{6,16}$/i.test(measurementId)) return
      const dataLayer = (win.dataLayer as unknown[]) || []
      win.dataLayer = dataLayer
      const gtag = (...args: unknown[]) => {
        dataLayer.push(args)
      }
      win.gtag = gtag
      gtag('js', new Date())
      gtag('config', measurementId)
      injectExternalScript(
        'builtin:google-analytics',
        `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`,
      )
      break
    }

    case 'google-tag-manager': {
      const containerId = plugin.config.containerId?.trim() ?? ''
      if (!/^GTM-[A-Z0-9]{4,14}$/i.test(containerId)) return
      const dataLayer = (win.dataLayer as unknown[]) || []
      win.dataLayer = dataLayer
      dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' })
      injectExternalScript(
        'builtin:google-tag-manager',
        `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(containerId)}`,
      )
      break
    }

    case 'microsoft-clarity': {
      const projectId = plugin.config.projectId?.trim() ?? ''
      if (!/^[a-zA-Z0-9]{6,20}$/.test(projectId)) return
      if (typeof win.clarity !== 'function') {
        const queue: unknown[] = []
        const clarityFn = (...args: unknown[]) => {
          queue.push(args)
        }
        ;(clarityFn as unknown as { q: unknown[] }).q = queue
        win.clarity = clarityFn
      }
      injectExternalScript(
        'builtin:microsoft-clarity',
        `https://www.clarity.ms/tag/${encodeURIComponent(projectId)}`,
      )
      break
    }

    case 'tawk-chat': {
      const propertyId = plugin.config.propertyId?.trim() ?? ''
      const widgetId = plugin.config.widgetId?.trim() ?? ''
      if (!/^[a-zA-Z0-9]{12,40}$/.test(propertyId)) return
      if (!/^[a-zA-Z0-9_-]{4,32}$/.test(widgetId)) return
      win.Tawk_API = (win.Tawk_API as Record<string, unknown>) || {}
      win.Tawk_LoadStart = new Date()
      injectExternalScript(
        'builtin:tawk-chat',
        `https://embed.tawk.to/${encodeURIComponent(propertyId)}/${encodeURIComponent(widgetId)}`,
      )
      break
    }

    case 'meta-pixel': {
      const pixelId = plugin.config.pixelId?.trim() ?? ''
      if (!/^[0-9]{8,20}$/.test(pixelId)) return
      if (typeof win.fbq !== 'function') {
        type FbqFn = ((...args: unknown[]) => void) & {
          callMethod?: (...args: unknown[]) => void
          queue: unknown[]
          push: (...args: unknown[]) => void
          loaded: boolean
          version: string
        }
        const fbq: FbqFn = Object.assign(
          (...args: unknown[]) => {
            if (fbq.callMethod) {
              fbq.callMethod(...args)
            } else {
              fbq.queue.push(args)
            }
          },
          {
            queue: [] as unknown[],
            push: (...args: unknown[]) => {
              fbq.queue.push(args)
            },
            loaded: true,
            version: '2.0',
          },
        )
        win.fbq = fbq
        win._fbq = fbq
      }
      const fbq = win.fbq as (...args: unknown[]) => void
      fbq('init', pixelId)
      fbq('track', 'PageView')
      injectExternalScript(
        'builtin:meta-pixel',
        'https://connect.facebook.net/en_US/fbevents.js',
      )
      break
    }

    case 'tiktok-pixel': {
      const pixelId = plugin.config.pixelId?.trim() ?? ''
      if (!/^[A-Z0-9]{8,32}$/i.test(pixelId)) return
      if (!win.ttq) {
        const methods = ['page', 'track', 'identify', 'instances', 'load']
        const queue: unknown[] = []
        const ttq: Record<string, unknown> = {
          _i: {},
          _t: {},
          _o: {},
          _q: queue,
        }
        for (const m of methods) {
          ttq[m] = (...args: unknown[]) => {
            queue.push([m, ...args])
          }
        }
        win.ttq = ttq
      }
      const ttq = win.ttq as Record<string, (...args: unknown[]) => void>
      ttq.load?.(pixelId)
      ttq.page?.()
      injectExternalScript(
        'builtin:tiktok-pixel',
        `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${encodeURIComponent(pixelId)}&lib=ttq`,
      )
      break
    }

    default:
      break
  }
}

export default function PluginRuntime() {
  const pathname = usePathname()
  const excluded = isExcludedRoute(pathname)
  const [plugins, setPlugins] = useState<PublicActivePlugin[]>([])
  const [dismissedPromo, setDismissedPromo] = useState(false)
  const injectedSlugsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (excluded) return
    let cancelled = false

    fetch('/api/plugins/active', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { plugins?: PublicActivePlugin[] } | null) => {
        if (cancelled || !data || !Array.isArray(data.plugins)) return
        setPlugins(data.plugins)
      })
      .catch(() => {
        /* ignore network errors so plugins never disrupt page UX */
      })

    return () => {
      cancelled = true
    }
  }, [excluded])

  useEffect(() => {
    if (excluded || plugins.length === 0) return
    for (const plugin of plugins) {
      if (injectedSlugsRef.current.has(plugin.slug)) continue
      injectedSlugsRef.current.add(plugin.slug)
      activateScriptPlugin(plugin)
    }
  }, [excluded, plugins])

  if (excluded || plugins.length === 0) return null

  const promoBar = !dismissedPromo
    ? plugins.find((p) => p.slug === 'promo-bar' && p.config.message?.trim())
    : undefined

  const whatsapp = plugins.find(
    (p) => p.slug === 'whatsapp-float' && /^[0-9]{8,15}$/.test(p.config.phone?.trim() ?? ''),
  )

  const customWidgets = plugins.filter(
    (p) => p.kind === 'widget' && p.widgetLabel?.trim() && isSafeHref(p.widgetUrl),
  )

  const hasFloatingItems = Boolean(whatsapp) || customWidgets.length > 0

  return (
    <>
      {promoBar && (
        <div
          role="region"
          aria-label="Promotional announcement"
          className="fixed top-0 inset-x-0 z-[65] bg-[#7B2D8E] text-white border-b border-[#5A1D6A]"
        >
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
              <span className="font-medium leading-snug">{promoBar.config.message}</span>
              {promoBar.config.ctaLabel && isSafeHref(promoBar.config.ctaUrl) && (
                promoBar.config.ctaUrl!.startsWith('/') ? (
                  <Link
                    href={promoBar.config.ctaUrl!}
                    className="inline-flex items-center gap-1 underline underline-offset-2 font-semibold text-white hover:text-white/85 whitespace-nowrap"
                  >
                    {promoBar.config.ctaLabel}
                    <ArrowUpRight className="w-3.5 h-3.5" aria-hidden />
                  </Link>
                ) : (
                  <a
                    href={promoBar.config.ctaUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 underline underline-offset-2 font-semibold text-white hover:text-white/85 whitespace-nowrap"
                  >
                    {promoBar.config.ctaLabel}
                    <ArrowUpRight className="w-3.5 h-3.5" aria-hidden />
                  </a>
                )
              )}
            </div>
            <button
              type="button"
              onClick={() => setDismissedPromo(true)}
              aria-label="Dismiss promotional announcement"
              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {hasFloatingItems && (
        <div className="fixed bottom-20 md:bottom-6 left-4 z-40 flex flex-col items-start gap-2 pointer-events-none">
          {customWidgets.map((widget) => {
            const href = widget.widgetUrl!.trim()
            const isInternal = href.startsWith('/')
            const cls =
              'pointer-events-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white text-[#7B2D8E] border border-[#7B2D8E]/30 hover:bg-[#F8F2FB] text-xs font-semibold transition-colors'
            return isInternal ? (
              <Link key={widget.slug} href={href} className={cls}>
                <span>{widget.widgetLabel}</span>
                <ArrowUpRight className="w-3.5 h-3.5" aria-hidden />
              </Link>
            ) : (
              <a
                key={widget.slug}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={cls}
              >
                <span>{widget.widgetLabel}</span>
                <ArrowUpRight className="w-3.5 h-3.5" aria-hidden />
              </a>
            )
          })}

          {whatsapp && (
            <a
              href={`https://wa.me/${encodeURIComponent(whatsapp.config.phone.trim())}${
                whatsapp.config.message?.trim()
                  ? `?text=${encodeURIComponent(whatsapp.config.message.trim())}`
                  : ''
              }`}
              target="_blank"
              rel="noopener noreferrer"
              className="pointer-events-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#7B2D8E] text-white border border-[#5A1D6A] hover:bg-[#5A1D6A] text-xs font-semibold transition-colors"
            >
              <MessageCircle className="w-4 h-4" aria-hidden />
              <span>{whatsapp.config.label?.trim() || 'WhatsApp Us'}</span>
            </a>
          )}
        </div>
      )}
    </>
  )
}
