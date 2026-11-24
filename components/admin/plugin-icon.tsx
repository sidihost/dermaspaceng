'use client'

/**
 * PluginIconBadge
 *
 * Renders the authentic original brand logo (WhatsApp, Meta, Google
 * Analytics 4, Google Tag Manager, TikTok, Microsoft Clarity, Tawk.to,
 * Google Calendar) or clean Dermaspace icon for each plugin.
 *
 * Strictly flat styling: NO shadows, NO gradients, NO Sparkles or Zap icons.
 */

import {
  Activity,
  BarChart3,
  Bell,
  CalendarClock,
  Code2,
  Globe,
  Layers,
  Megaphone,
  MessageCircle,
  Plug,
  Webhook,
} from 'lucide-react'
import type { PluginCatalogEntry } from '@/lib/plugins'

interface PluginIconBadgeProps {
  slug?: string
  iconKey?: PluginCatalogEntry['iconKey']
  size?: 'md' | 'lg'
}

interface BrandLogoAsset {
  src: string
  alt: string
  paddingClass?: string
}

const BRAND_LOGO_BY_SLUG: Record<string, BrandLogoAsset> = {
  'whatsapp-float': {
    src: '/images/plugins/whatsapp.svg',
    alt: 'WhatsApp logo',
    paddingClass: 'p-1.5',
  },
  'meta-pixel': {
    src: '/images/plugins/meta.svg',
    alt: 'Meta logo',
    paddingClass: 'p-2',
  },
  'google-analytics': {
    src: '/images/plugins/google-analytics.svg',
    alt: 'Google Analytics 4 logo',
    paddingClass: 'p-2',
  },
  'google-tag-manager': {
    src: '/images/plugins/google-tag-manager.svg',
    alt: 'Google Tag Manager logo',
    paddingClass: 'p-2',
  },
  'tiktok-pixel': {
    src: '/images/plugins/tiktok.svg',
    alt: 'TikTok logo',
    paddingClass: 'p-2',
  },
  'microsoft-clarity': {
    src: '/images/plugins/microsoft-clarity.svg',
    alt: 'Microsoft Clarity logo',
    paddingClass: 'p-2',
  },
  'tawk-chat': {
    src: '/images/plugins/tawk.png',
    alt: 'Tawk.to logo',
    paddingClass: 'p-1.5',
  },
  'gcal-2way': {
    src: '/images/plugins/google-calendar.svg',
    alt: 'Google Calendar logo',
    paddingClass: 'p-2',
  },
}

const BRAND_LOGO_BY_KEY: Partial<
  Record<PluginCatalogEntry['iconKey'], BrandLogoAsset>
> = {
  whatsapp: BRAND_LOGO_BY_SLUG['whatsapp-float'],
  meta: BRAND_LOGO_BY_SLUG['meta-pixel'],
  'google-analytics': BRAND_LOGO_BY_SLUG['google-analytics'],
  'google-tag-manager': BRAND_LOGO_BY_SLUG['google-tag-manager'],
  tiktok: BRAND_LOGO_BY_SLUG['tiktok-pixel'],
  microsoft: BRAND_LOGO_BY_SLUG['microsoft-clarity'],
  tawk: BRAND_LOGO_BY_SLUG['tawk-chat'],
}

interface ResolvedLucideSpec {
  Component: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  containerClass: string
  iconClass: string
}

function resolveLucideSpec(
  slug?: string,
  iconKey?: PluginCatalogEntry['iconKey'],
): ResolvedLucideSpec {
  switch (slug) {
    case 'promo-bar':
      return {
        Component: Megaphone,
        containerClass: 'bg-[#F8F2FB] border border-[#7B2D8E]/20',
        iconClass: 'text-[#7B2D8E]',
      }
    case 'booking-waitlist':
      return {
        Component: CalendarClock,
        containerClass: 'bg-[#F8F2FB] border border-[#7B2D8E]/20',
        iconClass: 'text-[#7B2D8E]',
      }
    case 'webhook-automations':
      return {
        Component: Webhook,
        containerClass: 'bg-[#F8F2FB] border border-[#7B2D8E]/20',
        iconClass: 'text-[#7B2D8E]',
      }
    default:
      break
  }

  switch (iconKey) {
    case 'calendar-clock':
      return {
        Component: CalendarClock,
        containerClass: 'bg-[#F8F2FB] border border-[#7B2D8E]/20',
        iconClass: 'text-[#7B2D8E]',
      }
    case 'megaphone':
      return {
        Component: Megaphone,
        containerClass: 'bg-[#F8F2FB] border border-[#7B2D8E]/20',
        iconClass: 'text-[#7B2D8E]',
      }
    case 'webhook':
      return {
        Component: Webhook,
        containerClass: 'bg-[#F8F2FB] border border-[#7B2D8E]/20',
        iconClass: 'text-[#7B2D8E]',
      }
    case 'code':
      return {
        Component: Code2,
        containerClass: 'bg-[#F8F2FB] border border-[#7B2D8E]/20',
        iconClass: 'text-[#7B2D8E]',
      }
    case 'bar-chart':
      return {
        Component: BarChart3,
        containerClass: 'bg-gray-100 border border-gray-200',
        iconClass: 'text-gray-700',
      }
    case 'message-circle':
      return {
        Component: MessageCircle,
        containerClass: 'bg-gray-100 border border-gray-200',
        iconClass: 'text-gray-700',
      }
    case 'activity':
      return {
        Component: Activity,
        containerClass: 'bg-gray-100 border border-gray-200',
        iconClass: 'text-gray-700',
      }
    case 'bell':
      return {
        Component: Bell,
        containerClass: 'bg-gray-100 border border-gray-200',
        iconClass: 'text-gray-700',
      }
    case 'layers':
      return {
        Component: Layers,
        containerClass: 'bg-gray-100 border border-gray-200',
        iconClass: 'text-gray-700',
      }
    case 'globe':
      return {
        Component: Globe,
        containerClass: 'bg-gray-100 border border-gray-200',
        iconClass: 'text-gray-700',
      }
    case 'plug':
    default:
      return {
        Component: Plug,
        containerClass: 'bg-[#F8F2FB] border border-[#7B2D8E]/20',
        iconClass: 'text-[#7B2D8E]',
      }
  }
}

export function PluginIconBadge({
  slug,
  iconKey,
  size = 'md',
}: PluginIconBadgeProps) {
  const boxSize = size === 'lg' ? 'w-12 h-12 rounded-xl' : 'w-11 h-11 rounded-xl'

  const brandLogo =
    (slug ? BRAND_LOGO_BY_SLUG[slug] : undefined) ??
    (iconKey ? BRAND_LOGO_BY_KEY[iconKey] : undefined)

  if (brandLogo) {
    return (
      <span
        className={`${boxSize} bg-white border border-gray-200 ${brandLogo.paddingClass ?? 'p-2'} flex items-center justify-center flex-shrink-0 overflow-hidden`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={brandLogo.src}
          alt={brandLogo.alt}
          className="w-full h-full object-contain"
          referrerPolicy="no-referrer"
        />
      </span>
    )
  }

  const { Component, containerClass, iconClass } = resolveLucideSpec(slug, iconKey)
  const glyphSize = size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'

  return (
    <span
      className={`${boxSize} ${containerClass} flex items-center justify-center flex-shrink-0`}
    >
      <Component className={`${glyphSize} ${iconClass}`} aria-hidden />
    </span>
  )
}
