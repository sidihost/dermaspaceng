'use client'

/**
 * /admin/features
 *
 * Single-page feature flag console. Super admins set each feature's
 * visibility to one of three states:
 *   - Off          -> nobody sees it
 *   - Admin only   -> only admins + staff see it (internal preview/testing)
 *   - Everyone     -> live for all visitors
 *
 * "Admin only" is the testing mode: a feature can be exercised end-to-end
 * by the team while the public still sees the "unavailable" screen.
 * Changes propagate within ~60s thanks to the cached flag reads.
 *
 * Visual treatment matches the rest of the admin surface — flat white
 * cards, hairline borders, brand purple #7B2D8E for active state. No
 * shadows, no gradients, no sparkle/star iconography.
 */

import useSWR from 'swr'
import Link from 'next/link'
import {
  Power,
  Loader2,
  Globe,
  LayoutDashboard,
  Shield,
  Search,
  Wrench,
  ArrowRight,
  EyeOff,
  Users,
  Eye,
} from 'lucide-react'
import { useState } from 'react'

type Visibility = 'on' | 'preview' | 'off'

type Flag = {
  key: string
  label: string
  description: string | null
  scope: 'site' | 'dashboard' | 'admin'
  enabled: boolean
  visibility: Visibility
}

// Flags that exist in the `feature_flags` table but don't yet have a
// real UI/route consumer in the codebase. We surface them here as
// disabled rows with a "Coming soon" pill so admins can see what's
// on the roadmap without being misled into thinking a toggle has any
// effect today. Wire them up in their respective surfaces and remove
// the key from this set to flip them into live controls.
const NOT_YET_WIRED_FLAGS = new Set<string>(['referrals'])

// Flags that are managed elsewhere in the admin console and should
// not appear in this list (because two writers to the same logical
// switch is a footgun). Currently only `maintenance` — it lives in
// /admin/settings -> Maintenance, which writes to the `app_settings`
// table that middleware actually reads. The `feature_flags` row of
// the same name was a leftover that confusingly never affected the
// public site.
const MANAGED_ELSEWHERE_FLAGS = new Set<string>(['maintenance'])

const VISIBILITY_OPTIONS: {
  value: Visibility
  label: string
  icon: typeof Eye
}[] = [
  { value: 'off', label: 'Off', icon: EyeOff },
  { value: 'preview', label: 'Admin only', icon: Users },
  { value: 'on', label: 'Everyone', icon: Globe },
]

const fetcher = (u: string) => fetch(u).then((r) => r.json())

/** Normalise a flag row to a visibility value (handles legacy rows). */
function toVisibility(f: Flag): Visibility {
  if (f.visibility === 'on' || f.visibility === 'preview' || f.visibility === 'off') {
    return f.visibility
  }
  return f.enabled ? 'on' : 'off'
}

export default function FeatureFlagsPage() {
  const { data, isLoading, mutate } = useSWR<{ flags: Flag[] }>(
    '/api/admin/feature-flags',
    fetcher,
  )
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'site' | 'dashboard' | 'admin'>('all')
  const [query, setQuery] = useState('')

  const setVisibility = async (key: string, visibility: Visibility) => {
    setSavingKey(key)
    // Optimistic update so the control reacts instantly.
    mutate(
      (prev) =>
        prev && {
          flags: prev.flags.map((f) =>
            f.key === key ? { ...f, visibility, enabled: visibility !== 'off' } : f,
          ),
        },
      { revalidate: false },
    )
    try {
      await fetch('/api/admin/feature-flags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, visibility }),
      })
    } catch {
      mutate()
    } finally {
      setSavingKey(null)
      mutate()
    }
  }

  // Strip out flags that are owned by another admin surface so we
  // never present two controls that fight each other (see
  // MANAGED_ELSEWHERE_FLAGS docstring).
  const flags = (data?.flags ?? []).filter((f) => !MANAGED_ELSEWHERE_FLAGS.has(f.key))
  const liveCount = flags.filter((f) => toVisibility(f) === 'on').length
  const previewCount = flags.filter((f) => toVisibility(f) === 'preview').length
  const visible = flags.filter((f) => {
    if (filter !== 'all' && f.scope !== filter) return false
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      return (
        f.key.toLowerCase().includes(q) ||
        f.label.toLowerCase().includes(q) ||
        (f.description?.toLowerCase().includes(q) ?? false)
      )
    }
    return true
  })

  const scopeMeta: Record<Flag['scope'], { label: string; icon: typeof Globe }> = {
    site: { label: 'Public site', icon: Globe },
    dashboard: { label: 'Dashboard', icon: LayoutDashboard },
    admin: { label: 'Admin', icon: Shield },
  }

  const statusMeta: Record<Visibility, { label: string; className: string }> = {
    on: { label: 'Everyone', className: 'text-[#7B2D8E]' },
    preview: { label: 'Admins only', className: 'text-amber-600' },
    off: { label: 'Off', className: 'text-gray-400' },
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
            <Power className="w-4 h-4 text-[#7B2D8E]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-semibold text-gray-900 leading-none tracking-tight">
              Feature flags
            </h1>
            <p className="text-xs text-gray-500 mt-1 truncate">
              Set each feature to Off, Admin only, or Everyone.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-500">
            <span className="text-[#7B2D8E] font-semibold">{liveCount}</span> live
            {previewCount > 0 && (
              <>
                {' · '}
                <span className="text-amber-600 font-semibold">{previewCount}</span> in preview
              </>
            )}
          </span>
        </div>
      </header>

      {/* Explainer for the "Admin only" state so the team knows what it does. */}
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 px-4 py-3">
        <span className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Users className="w-4 h-4 text-amber-600" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-900 leading-tight">
            &ldquo;Admin only&rdquo; is your testing mode
          </p>
          <p className="text-[12px] text-amber-800/90 mt-0.5 leading-relaxed">
            Set a feature to <span className="font-medium">Admin only</span> to test it end-to-end
            while regular users still see the &ldquo;unavailable&rdquo; screen. Flip it to{' '}
            <span className="font-medium">Everyone</span> when you&apos;re ready to launch.
          </p>
        </div>
      </div>

      {/* Maintenance callout — replaces the old (broken) "maintenance"
          toggle that lived in this list. Anchored to the dedicated
          settings panel so there's exactly one place to flip it. */}
      <Link
        href="/admin/settings"
        className="flex items-center gap-3 rounded-2xl border border-[#7B2D8E]/15 bg-[#7B2D8E]/[0.06] px-4 py-3 hover:bg-[#7B2D8E]/10 transition-colors"
      >
        <span className="w-9 h-9 rounded-lg bg-[#7B2D8E]/15 flex items-center justify-center flex-shrink-0">
          <Wrench className="w-4 h-4 text-[#7B2D8E]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#3D1646] leading-tight">
            Looking for maintenance mode?
          </p>
          <p className="text-[12px] text-[#5A1D6A] mt-0.5 leading-relaxed">
            It lives in <span className="font-medium">Settings → Maintenance</span> so it can manage the public message and ETA in one place.
          </p>
        </div>
        <ArrowRight className="w-4 h-4 text-[#7B2D8E] flex-shrink-0" aria-hidden />
      </Link>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search flags…"
            className="w-full h-10 pl-9 pr-3 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none"
          />
        </div>
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
          {(['all', 'site', 'dashboard', 'admin'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`text-xs font-medium px-3 h-8 rounded-md transition-colors capitalize ${
                filter === s
                  ? 'bg-white text-[#7B2D8E]'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-[#7B2D8E] animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
          <p className="text-sm text-gray-500">No flags match your filter.</p>
        </div>
      ) : (
        <div className="grid gap-px bg-gray-100 rounded-2xl overflow-hidden border border-gray-200">
          {visible.map((flag) => {
            const Icon = scopeMeta[flag.scope].icon
            const vis = toVisibility(flag)
            // Flags whose UI surface hasn't been built yet show a
            // "Coming soon" pill and a disabled control — changing
            // them would persist a value that nothing reads.
            const notWired = NOT_YET_WIRED_FLAGS.has(flag.key)
            const isLive = vis !== 'off' && !notWired
            const status = statusMeta[vis]
            return (
              <div
                key={flag.key}
                className="bg-white px-5 py-4 flex items-start gap-4 flex-col lg:flex-row lg:items-center"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span
                    className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isLive
                        ? 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900">{flag.label}</h3>
                      <span className="text-[10px] font-mono text-gray-400 bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5">
                        {flag.key}
                      </span>
                      <span className="text-[10px] font-medium text-gray-500 capitalize">
                        {scopeMeta[flag.scope].label}
                      </span>
                      {notWired && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">
                          Coming soon
                        </span>
                      )}
                    </div>
                    {flag.description && (
                      <p className="text-xs text-gray-500 mt-1">{flag.description}</p>
                    )}
                    {notWired && (
                      <p className="text-[11px] text-slate-500 mt-1">
                        This feature isn&apos;t live yet — changing this won&apos;t affect anything visitors see.
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 self-stretch lg:self-center">
                  <span
                    className={`text-[11px] font-semibold uppercase tracking-wide w-20 text-right ${status.className}`}
                  >
                    {status.label}
                  </span>
                  {savingKey === flag.key && (
                    <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin flex-shrink-0" />
                  )}
                  {/* 3-way segmented control */}
                  <div
                    role="radiogroup"
                    aria-label={`${flag.label} visibility`}
                    className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg"
                  >
                    {VISIBILITY_OPTIONS.map((opt) => {
                      const OptIcon = opt.icon
                      const selected = vis === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          disabled={notWired || savingKey === flag.key}
                          onClick={() => setVisibility(flag.key, opt.value)}
                          className={`flex items-center gap-1.5 text-xs font-medium px-2.5 h-8 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            selected
                              ? opt.value === 'off'
                                ? 'bg-white text-gray-700'
                                : opt.value === 'preview'
                                  ? 'bg-white text-amber-600'
                                  : 'bg-white text-[#7B2D8E]'
                              : 'text-gray-500 hover:text-gray-900'
                          }`}
                        >
                          <OptIcon className="w-3.5 h-3.5" aria-hidden />
                          <span className="hidden sm:inline">{opt.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
