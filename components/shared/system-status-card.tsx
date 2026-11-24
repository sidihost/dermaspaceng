'use client'

import Link from 'next/link'
import {
  AlertCircle,
  ArrowUpRight,
  Home,
  Mail,
  Phone,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { DermaspaceWordmark } from '@/components/shared/dermaspace-emblem'
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

  const statusTag = isOffline
    ? connectionRestored
      ? 'Back online'
      : 'Offline'
    : 'Service notice'

  return (
    <div className="min-h-[100svh] w-full bg-[#FAF6FB] text-[#1A0D1F] flex flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
      <div className="w-full max-w-[540px] bg-white rounded-2xl border border-[#E5E0EA] overflow-hidden">
        {/* Signature brand hairline */}
        <div aria-hidden="true" className="h-[2px] bg-[#7B2D8E]" />

        {/* Brand & status top bar */}
        <div className="px-6 sm:px-9 py-4 border-b border-[#F1ECF5] flex items-center justify-between gap-3">
          <div className="inline-flex items-center min-w-0">
            <DermaspaceWordmark
              showSubtitle
              className="text-[#7B2D8E]"
              emblemClassName="h-7 w-7"
            />
          </div>

          <span className="inline-flex items-center gap-2 text-xs font-medium text-gray-600 whitespace-nowrap">
            <span
              aria-hidden="true"
              className={`w-1.5 h-1.5 rounded-full ${
                isOffline
                  ? connectionRestored
                    ? 'bg-[#7B2D8E]'
                    : 'bg-gray-400'
                  : 'bg-[#7B2D8E]'
              }`}
            />
            {statusTag}
          </span>
        </div>

        {/* Main editorial message & primary actions */}
        <div className="px-6 sm:px-9 pt-8 pb-7">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF6FB] border border-[#E5E0EA] text-[#7B2D8E] flex items-center justify-center">
            {isOffline ? (
              connectionRestored ? (
                <Wifi className="w-5 h-5" aria-hidden="true" />
              ) : (
                <WifiOff className="w-5 h-5" aria-hidden="true" />
              )
            ) : (
              <AlertCircle className="w-5 h-5" aria-hidden="true" />
            )}
          </div>

          <h1 className="mt-5 font-serif text-2xl sm:text-[28px] font-semibold tracking-tight text-[#1A0D1F] leading-tight text-balance">
            {isOffline && connectionRestored ? 'Back online' : copy.heading}
          </h1>

          <p className="mt-2.5 text-sm sm:text-[15px] leading-relaxed text-gray-600 text-pretty max-w-md">
            {isOffline && connectionRestored
              ? 'Your internet connection is back. Return to Dermaspace whenever you are ready.'
              : copy.description}
          </p>

          {isOffline && statusNote && (
            <p
              role="status"
              aria-live="polite"
              className={`mt-3 text-xs font-medium ${
                connectionRestored ? 'text-[#7B2D8E]' : 'text-gray-500'
              }`}
            >
              {statusNote}
            </p>
          )}

          {/* Action row */}
          <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <button
              type="button"
              onClick={onRetry}
              className="h-11 inline-flex items-center justify-center gap-2 rounded-full bg-[#7B2D8E] px-6 text-sm font-semibold text-white hover:bg-[#7B2D8E]/90 active:bg-[#7B2D8E]/85 transition-colors cursor-pointer sm:flex-1"
            >
              <RefreshCw className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{copy.retryLabel}</span>
            </button>

            {homeAsAnchor ? (
              <a
                href="/"
                className="h-11 inline-flex items-center justify-center gap-2 rounded-full bg-white border border-[#E5E0EA] px-6 text-sm font-semibold text-[#1A0D1F] hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E] transition-colors sm:flex-1"
              >
                <Home className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{copy.homeLabel}</span>
              </a>
            ) : (
              <Link
                href="/"
                className="h-11 inline-flex items-center justify-center gap-2 rounded-full bg-white border border-[#E5E0EA] px-6 text-sm font-semibold text-[#1A0D1F] hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E] transition-colors sm:flex-1"
              >
                <Home className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{copy.homeLabel}</span>
              </Link>
            )}
          </div>

          {/* Optional collapsible diagnostics (error boundary only) */}
          {(errorMessage || errorDigest) && (
            <details className="mt-6 pt-4 border-t border-[#F1ECF5] text-left">
              <summary className="text-xs font-medium text-gray-500 hover:text-gray-800 cursor-pointer select-none">
                Technical details
              </summary>
              <div className="mt-2 space-y-1 text-[11px] text-gray-500 font-mono [overflow-wrap:anywhere]">
                {errorMessage && <p>{errorMessage}</p>}
                {errorDigest && <p className="text-gray-400">Ref: {errorDigest}</p>}
              </div>
            </details>
          )}
        </div>

        {/* Offline cached pages strip */}
        {isOffline && (
          <div className="px-6 sm:px-9 py-4 border-t border-[#F1ECF5] bg-[#FAF6FB]/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
              Available offline
            </span>
            <nav aria-label="Cached pages" className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
              {OFFLINE_QUICK_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#7B2D8E] hover:opacity-80 hover:underline"
                >
                  <span>{item.label}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              ))}
            </nav>
          </div>
        )}

        {/* Sanctuary contact directory — pure typographic grid, zero nested cards */}
        <div className="px-6 sm:px-9 py-6 border-t border-[#F1ECF5]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
            Reach our sanctuaries
          </p>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-0 sm:divide-x sm:divide-[#F1ECF5]">
            {DERMASPACE_BRANCHES.map((branch, idx) => (
              <div
                key={branch.name}
                className={`flex flex-col justify-between ${idx === 0 ? 'sm:pr-6' : 'sm:pl-6'}`}
              >
                <div>
                  <p className="text-sm font-semibold text-[#1A0D1F]">{branch.name}</p>
                  <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">
                    {branch.shortAddress}
                  </p>
                </div>
                <a
                  href={branch.phoneHref}
                  className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#7B2D8E] hover:opacity-80 hover:underline w-fit"
                >
                  <Phone className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{branch.phoneDisplay}</span>
                </a>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-[#F1ECF5] flex items-center justify-between gap-2 text-xs text-gray-500">
            <span>Prefer email?</span>
            <a
              href={`mailto:${DERMASPACE_EMAIL}`}
              className="inline-flex items-center gap-1.5 font-medium text-[#1A0D1F] hover:text-[#7B2D8E] hover:underline break-all"
            >
              <Mail className="w-3.5 h-3.5 text-[#7B2D8E] shrink-0" aria-hidden="true" />
              <span>{DERMASPACE_EMAIL}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
