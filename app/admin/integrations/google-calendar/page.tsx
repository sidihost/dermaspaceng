'use client'

/**
 * Google Calendar 2-way Sync — admin configuration page.
 *
 * This page is the destination of the "Manage sync" / "Configure"
 * CTA on /admin/addons for the Google Calendar add-on. Until now
 * that link 404'd because the page never existed (the user
 * reported "the add-on configuration page doesn't exist when I
 * click configuration"). This is the page.
 *
 * What it does:
 *   • Reads the connection state from /api/calendar/google/status
 *   • Lets the staff member start the OAuth dance (connect)
 *   • Lets them disconnect — which also revokes the refresh token
 *     on Google's side so Dermaspace cleanly disappears from the
 *     user's account-permissions list
 *   • Surfaces "not configured" when the Google client id/secret
 *     env vars are missing, with a copy-paste setup checklist so
 *     a non-engineer admin understands why it isn't connecting
 *
 * Design note:
 *   • Sticks to the brand-purple + neutrals palette (no green —
 *     the user explicitly asked us to drop emerald accents). The
 *     "Connected" pip is brand purple, "Disconnected" is grey.
 *   • Mirrors the styling of the rest of the admin console — page
 *     title at 20px/semibold, hairline cards, no drop-shadows.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import {
  ArrowLeft,
  CalendarCheck2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Plug,
  PlugZap,
  RefreshCw,
} from 'lucide-react'

type StatusResponse =
  | { configured: false }
  | {
      configured: true
      connected: false
    }
  | {
      configured: true
      connected: true
      email?: string | null
      picture?: string | null
      status?: string | null
      lastSyncedAt?: string | null
      lastError?: string | null
    }

const fetcher = async (url: string) => {
  const r = await fetch(url, { cache: 'no-store' })
  if (!r.ok) throw new Error(`Failed: ${r.status}`)
  return r.json() as Promise<StatusResponse>
}

function formatRelative(iso?: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const diffMs = Date.now() - d.getTime()
  const mins = Math.round(diffMs / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  return `${days}d ago`
}

export default function GoogleCalendarAdminPage() {
  const { data, error, isLoading, mutate } = useSWR<StatusResponse>(
    '/api/calendar/google/status',
    fetcher,
    { revalidateOnFocus: true },
  )
  const [disconnecting, setDisconnecting] = useState(false)

  // Light keep-alive refresh — the OAuth callback redirects back
  // to this page, so re-pulling status on focus catches the
  // "just connected" state without a manual reload.
  useEffect(() => {
    const onFocus = () => void mutate()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [mutate])

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Google Calendar? Existing events will stay on Google but new bookings will stop syncing.')) {
      return
    }
    setDisconnecting(true)
    try {
      await fetch('/api/calendar/google/disconnect', { method: 'POST' })
      await mutate()
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb / back row.
          Matches the rest of the admin pages — small, low-key,
          purple-on-hover. */}
      <div>
        <Link
          href="/admin/addons"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#7B2D8E] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          All add-ons
        </Link>
      </div>

      {/* Title block */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#7B2D8E]/10 text-[#7B2D8E]">
            <CalendarCheck2 className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Google Calendar 2-way Sync
            </h1>
            <p className="text-sm text-gray-500 mt-1 max-w-xl text-pretty leading-relaxed">
              Connect each therapist&apos;s Google Calendar so their personal
              events block availability automatically and every booking
              auto-creates an event with reminders.
            </p>
          </div>
        </div>
      </header>

      {/* Status / action card */}
      <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-[#7B2D8E] via-[#9B3DB0] to-[#7B2D8E]" aria-hidden="true" />

        {isLoading && (
          <div className="p-6 flex items-center gap-3 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking your connection…
          </div>
        )}

        {error && !isLoading && (
          <div className="p-6 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Couldn&apos;t reach the calendar service</p>
              <p className="text-sm text-gray-500 mt-0.5">
                Check your connection and try again.
              </p>
              <button
                type="button"
                onClick={() => mutate()}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E] transition-colors"
              >
                <RefreshCw className="h-3 w-3" /> Retry
              </button>
            </div>
          </div>
        )}

        {data && data.configured === false && (
          <div className="p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Google Calendar isn&apos;t configured on this environment
                </p>
                <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">
                  Add the OAuth credentials below to your project environment
                  variables, then come back to this page to connect your
                  calendar.
                </p>
              </div>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-gray-700">
              {[
                'GOOGLE_CLIENT_ID',
                'GOOGLE_CLIENT_SECRET',
                'GOOGLE_REDIRECT_URI',
              ].map((k) => (
                <li
                  key={k}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-[12.5px]"
                >
                  <span>{k}</span>
                  <span className="text-[10.5px] uppercase tracking-[0.1em] text-gray-500">
                    required
                  </span>
                </li>
              ))}
            </ul>
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#7B2D8E] hover:underline"
            >
              Open Google Cloud Console
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}

        {data && data.configured === true && data.connected === false && (
          <div className="p-6">
            <div className="flex items-start gap-3">
              <Plug className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Not connected
                </p>
                <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">
                  Sign in with the Google account you want to sync. We only
                  request access to calendars and events — never your email or
                  contacts.
                </p>
              </div>
            </div>
            <a
              href="/api/calendar/google/connect"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#7B2D8E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6A2480] transition-colors"
            >
              <PlugZap className="h-4 w-4" />
              Connect Google Calendar
            </a>
          </div>
        )}

        {data && data.configured === true && data.connected === true && (
          <div className="p-6 space-y-5">
            <div className="flex items-start gap-4">
              {/* Account avatar tile.
                  Shows the connected Google account picture with a
                  brand-purple "Connected" pip. We deliberately avoid
                  green per the design feedback. */}
              <div className="relative flex-shrink-0">
                {data.picture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={data.picture}
                    alt={data.email ?? 'Connected account'}
                    className="h-12 w-12 rounded-2xl object-cover ring-1 ring-[#7B2D8E]/15"
                  />
                ) : (
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#7B2D8E]/10 text-[#7B2D8E]">
                    <CalendarCheck2 className="h-5 w-5" />
                  </div>
                )}
                <span
                  className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-[#7B2D8E] ring-2 ring-white"
                  aria-label="Connected"
                  title="Connected"
                >
                  <CheckCircle2 className="h-3 w-3 text-white" />
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {data.email ?? 'Connected'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Status:{' '}
                  <span className="font-medium text-gray-700 capitalize">
                    {data.status ?? 'active'}
                  </span>
                  {' · '}
                  Last sync {formatRelative(data.lastSyncedAt)}
                </p>
                {data.lastError && (
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11.5px] font-medium text-amber-800">
                    <AlertTriangle className="h-3 w-3" />
                    {data.lastError}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href="/api/calendar/google/connect"
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E] transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Re-authorise
              </a>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:border-red-300 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {disconnecting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plug className="h-3.5 w-3.5" />
                )}
                Disconnect
              </button>
            </div>
          </div>
        )}
      </section>

      {/* What this enables — short, factual list. Mirrors the way
          big-platform admin consoles document each integration so
          a non-engineer reads a clear summary of "what changes". */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-gray-900">
          What turns on when you connect
        </h2>
        <ul className="mt-3 space-y-2.5 text-sm text-gray-700">
          {[
            {
              title: 'Bookings auto-create events',
              body: 'Every confirmed appointment lands on the assigned therapist&apos;s calendar with the client name, service, branch and a 30-minute reminder.',
            },
            {
              title: 'Personal events block availability',
              body: 'Anything on the therapist\u2019s primary calendar (lunch, school run, training) is treated as busy and removed from the public booking slots.',
            },
            {
              title: 'Reschedules and cancellations stay in sync',
              body: 'Editing a booking in the admin updates the calendar event in place; cancellations remove it.',
            },
            {
              title: 'Per-staff control',
              body: 'Each therapist connects their own account from this page. Disconnecting only removes that one calendar — the others keep syncing.',
            },
          ].map((row) => (
            <li key={row.title} className="flex items-start gap-2.5">
              <span className="mt-1 grid h-4 w-4 place-items-center rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] flex-shrink-0">
                <CheckCircle2 className="h-3 w-3" />
              </span>
              <div>
                <p className="font-medium text-gray-900 text-[13.5px]">{row.title}</p>
                <p
                  className="text-[13px] text-gray-500 leading-relaxed"
                  // The body strings contain HTML entities like &apos;
                  // that we want literally rendered, so we use
                  // dangerouslySetInnerHTML on a controlled set of
                  // strings. They never come from user input.
                  dangerouslySetInnerHTML={{ __html: row.body }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
