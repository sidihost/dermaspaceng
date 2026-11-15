'use client'

import Link from 'next/link'
import { AlertCircle, Home, Mail, Phone, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { ButterflyLogo } from '@/components/shared/butterfly-logo'
import {
  DERMASPACE_BRANCHES,
  DERMASPACE_EMAIL,
  OFFLINE_QUICK_LINKS,
  getSystemStatusCopy,
  type SystemStatusVariant,
} from '@/lib/system-status'

interface SystemStatusCardProps {
  variant: SystemStatusVariant
  onRetry: () => void
  statusNote?: string | null
  connectionRestored?: boolean
  errorMessage?: string | null
  errorDigest?: string | null
  homeAsAnchor?: boolean
}

export function SystemStatusCard({
  variant,
  onRetry,
  statusNote,
  connectionRestored = false,
  errorMessage,
  errorDigest,
  homeAsAnchor = false,
}: SystemStatusCardProps) {
  const copy = getSystemStatusCopy(variant)
  const isOffline = variant === 'offline'

  return (
    <div className="min-h-[100svh] w-full bg-[#FAF6FB] text-[#1A0D1F] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-[460px] bg-white rounded-2xl border border-[#E5E0EA] overflow-hidden">
        <div aria-hidden="true" className="h-[3px] bg-[#7B2D8E]" />

        <div className="p-5 sm:p-6">
          {/* Top identity row */}
          <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-gray-100">
            <div className="inline-flex items-center gap-2 min-w-0">
              <span className="w-7 h-7 rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E] inline-flex items-center justify-center flex-shrink-0">
                <ButterflyLogo className="w-4 h-4" />
              </span>
              <span className="text-sm font-semibold tracking-tight text-gray-900 truncate">
                Dermaspace
              </span>
            </div>

            <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
              {isOffline ? 'Connection lost' : 'Service notice'}
            </span>
          </div>

          {/* Primary status header */}
          <div className="pt-4 text-center">
            <div className="w-10 h-10 mx-auto rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center">
              {isOffline ? (
                <WifiOff className="w-5 h-5" aria-hidden="true" />
              ) : (
                <AlertCircle className="w-5 h-5" aria-hidden="true" />
              )}
            </div>

            <h1 className="mt-3 text-lg sm:text-xl font-semibold tracking-tight text-gray-900 text-balance">
              {copy.heading}
            </h1>

            <p className="mt-1.5 text-[13px] sm:text-sm leading-snug text-gray-600 text-pretty max-w-sm mx-auto">
              {copy.description}
            </p>

            {isOffline && statusNote && (
              <p
                role="status"
                aria-live="polite"
                className={`mt-2 inline-flex items-center justify-center gap-1.5 text-xs font-medium ${
                  connectionRestored ? 'text-emerald-700' : 'text-gray-500'
                }`}
              >
                {connectionRestored ? (
                  <Wifi className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                ) : (
                  <WifiOff className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                )}
                <span>{statusNote}</span>
              </p>
            )}
          </div>

          {/* Responsive primary + secondary CTA grid */}
          <div className="mt-4 grid grid-cols-1 min-[360px]:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onRetry}
              className="w-full min-h-[42px] inline-flex items-center justify-center gap-2 rounded-full bg-[#7B2D8E] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#5A1D6A] active:bg-[#5A1D6A] transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
              <span>{copy.retryLabel}</span>
            </button>

            {homeAsAnchor ? (
              <a
                href="/"
                className="w-full min-h-[42px] inline-flex items-center justify-center gap-2 rounded-full bg-white border border-[#E5E0EA] px-4 py-2 text-[13px] font-semibold text-gray-800 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E] transition-colors"
              >
                <Home className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                <span>{copy.homeLabel}</span>
              </a>
            ) : (
              <Link
                href="/"
                className="w-full min-h-[42px] inline-flex items-center justify-center gap-2 rounded-full bg-white border border-[#E5E0EA] px-4 py-2 text-[13px] font-semibold text-gray-800 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E] transition-colors"
              >
                <Home className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                <span>{copy.homeLabel}</span>
              </Link>
            )}
          </div>

          {/* Quiet offline cached-route shortcuts */}
          {isOffline && (
            <div className="mt-3.5 text-center text-xs text-gray-500">
              <span>Available offline: </span>
              {OFFLINE_QUICK_LINKS.map((item, idx) => (
                <span key={item.href}>
                  {idx > 0 && <span aria-hidden="true" className="mx-1.5 text-gray-400">·</span>}
                  <Link
                    href={item.href}
                    className="font-medium text-[#7B2D8E] hover:underline"
                  >
                    {item.label}
                  </Link>
                </span>
              ))}
            </div>
          )}

          {/* Optional collapsible error diagnostics */}
          {(errorMessage || errorDigest) && (
            <details className="mt-4 pt-3 border-t border-gray-100 text-left">
              <summary className="text-xs font-medium text-gray-500 hover:text-gray-700 cursor-pointer select-none">
                Technical details
              </summary>
              <div className="mt-2 space-y-1 text-[11px] text-gray-500 font-mono [overflow-wrap:anywhere]">
                {errorMessage && <p>{errorMessage}</p>}
                {errorDigest && <p className="text-gray-400">Ref: {errorDigest}</p>}
              </div>
            </details>
          )}

          {/* Compact contact directory */}
          <div className="mt-4 pt-3.5 border-t border-gray-100">
            <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2.5 text-center min-[360px]:text-left">
              {DERMASPACE_BRANCHES.map((branch) => (
                <div
                  key={branch.name}
                  title={branch.shortAddress}
                  className="min-w-0 rounded-xl bg-[#FAF6FB] border border-[#E5E0EA]/70 px-3 py-2"
                >
                  <p className="text-[11px] font-semibold text-gray-900 truncate">
                    {branch.name}
                  </p>
                  <a
                    href={branch.phoneHref}
                    className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#7B2D8E] hover:underline whitespace-nowrap"
                  >
                    <Phone className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                    <span>{branch.phoneDisplay}</span>
                  </a>
                </div>
              ))}
            </div>

            <div className="mt-2.5 flex items-center justify-center">
              <a
                href={`mailto:${DERMASPACE_EMAIL}`}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-500 hover:text-[#7B2D8E] hover:underline break-all"
              >
                <Mail className="w-3 h-3 text-[#7B2D8E] flex-shrink-0" aria-hidden="true" />
                <span>{DERMASPACE_EMAIL}</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
