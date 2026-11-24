'use client'

/**
 * PluginIconBadge
 *
 * Renders the appropriate official brand mark (WhatsApp, Meta, Google
 * Analytics, Google Tag Manager, TikTok, Microsoft, Tawk.to) or clean
 * Dermaspace icon for each plugin.
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
import {
  SiGoogleanalytics,
  SiGoogletagmanager,
  SiLivechat,
  SiMeta,
  SiTiktok,
  SiWhatsapp,
} from 'react-icons/si'
import { FaMicrosoft } from 'react-icons/fa6'
import type { PluginCatalogEntry } from '@/lib/plugins'

interface PluginIconBadgeProps {
  slug?: string
  iconKey?: PluginCatalogEntry['iconKey']
  size?: 'md' | 'lg'
}

interface ResolvedIconSpec {
  Component: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  containerClass: string
  iconClass: string
}

function resolveIconSpec(
  slug?: string,
  iconKey?: PluginCatalogEntry['iconKey'],
): ResolvedIconSpec {
  // Prefer canonical built-in slug first so existing persisted plugins
  // automatically display their authentic brand icon even if an older
  // iconKey was stored previously.
  switch (slug) {
    case 'whatsapp-float':
      return {
        Component: SiWhatsapp,
        containerClass: 'bg-[#F0FDF4] border border-[#BBF7D0]',
        iconClass: 'text-[#16A34A]',
      }
    case 'meta-pixel':
      return {
        Component: SiMeta,
        containerClass: 'bg-[#EFF6FF] border border-[#BFDBFE]',
        iconClass: 'text-[#0866FF]',
      }
    case 'google-analytics':
      return {
        Component: SiGoogleanalytics,
        containerClass: 'bg-[#FFF7ED] border border-[#FED7AA]',
        iconClass: 'text-[#E37400]',
      }
    case 'google-tag-manager':
      return {
        Component: SiGoogletagmanager,
        containerClass: 'bg-[#EFF6FF] border border-[#BFDBFE]',
        iconClass: 'text-[#246FDB]',
      }
    case 'tiktok-pixel':
      return {
        Component: SiTiktok,
        containerClass: 'bg-[#F3F4F6] border border-[#E5E7EB]',
        iconClass: 'text-[#111827]',
      }
    case 'microsoft-clarity':
      return {
        Component: FaMicrosoft,
        containerClass: 'bg-[#F0F9FF] border border-[#BAE6FD]',
        iconClass: 'text-[#0078D4]',
      }
    case 'tawk-chat':
      return {
        Component: SiLivechat,
        containerClass: 'bg-[#ECFDF5] border border-[#A7F3D0]',
        iconClass: 'text-[#03A84E]',
      }
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
    case 'whatsapp':
      return {
        Component: SiWhatsapp,
        containerClass: 'bg-[#F0FDF4] border border-[#BBF7D0]',
        iconClass: 'text-[#16A34A]',
      }
    case 'meta':
      return {
        Component: SiMeta,
        containerClass: 'bg-[#EFF6FF] border border-[#BFDBFE]',
        iconClass: 'text-[#0866FF]',
      }
    case 'google-analytics':
      return {
        Component: SiGoogleanalytics,
        containerClass: 'bg-[#FFF7ED] border border-[#FED7AA]',
        iconClass: 'text-[#E37400]',
      }
    case 'google-tag-manager':
      return {
        Component: SiGoogletagmanager,
        containerClass: 'bg-[#EFF6FF] border border-[#BFDBFE]',
        iconClass: 'text-[#246FDB]',
      }
    case 'tiktok':
      return {
        Component: SiTiktok,
        containerClass: 'bg-[#F3F4F6] border border-[#E5E7EB]',
        iconClass: 'text-[#111827]',
      }
    case 'microsoft':
      return {
        Component: FaMicrosoft,
        containerClass: 'bg-[#F0F9FF] border border-[#BAE6FD]',
        iconClass: 'text-[#0078D4]',
      }
    case 'tawk':
      return {
        Component: SiLivechat,
        containerClass: 'bg-[#ECFDF5] border border-[#A7F3D0]',
        iconClass: 'text-[#03A84E]',
      }
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
  const { Component, containerClass, iconClass } = resolveIconSpec(slug, iconKey)
  const boxSize = size === 'lg' ? 'w-12 h-12 rounded-xl' : 'w-11 h-11 rounded-xl'
  const glyphSize = size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'

  return (
    <span
      className={`${boxSize} ${containerClass} flex items-center justify-center flex-shrink-0`}
    >
      <Component className={`${glyphSize} ${iconClass}`} aria-hidden />
    </span>
  )
}
