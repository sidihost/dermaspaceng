'use client'

/**
 * /admin/schedules
 *
 * Single-page console for the QStash recurring jobs Dermaspace owns
 * (birthday wishes, security reminders, broadcasts, abandoned-payment
 * recovery). Admins can:
 *
 *   * see "expected" (from lib/qstash-schedules.ts) vs. "live" (what
 *     QStash actually has registered) for each job
 *   * Sync — re-upserts every schedule from the manifest, idempotent
 *   * Run now — fires the GET admin trigger for the matching cron route
 *     so admins can backfill without waiting for the next tick
 *   * Drop orphan schedules — schedules in QStash that no longer match
 *     any path in the current manifest (left over from a renamed route)
 *
 * Style follows the rest of /admin/* — flat white cards, hairline grey
 * borders, brand purple #7B2D8E for primary action and active states.
 */

import useSWR from 'swr'
import { useState } from 'react'
import {
  Loader2,
  RefreshCw,
  Play,
  Trash2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  CircleSlash,
} from 'lucide-react'

type ManifestEntry = {
  id: string
  path: string
  cron: string
  label: string
  description: string
  registered: boolean
  scheduleId: string | null
  liveCron: string | null
  cronInSync: boolean
  paused: boolean
  createdAt: number | null
}

type Orphan = {
  scheduleId: string
  destination: string
  cron: string
  paused: boolean
  createdAt: number
}

type ApiResp = { manifest: ManifestEntry[]; orphans: Orphan[]; error?: string }

const fetcher = (u: string) => fetch(u).then((r) => r.json())

// Friendly relative-time formatter. We don't need full i18n here —
// admins read English and want a quick "registered 3 days ago" feel.
function relTime(ts: number | null): string {
  if (!ts) return '—'
  const diff = Date.now() - ts
  const sec = Math.round(diff / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 48) return `${hr}h ago`
  const d = Math.round(hr / 24)
  return `${d}d ago`
}

export default function QStashSchedulesPage() {
  const { data, isLoading, mutate } = useSWR<ApiResp>(
    '/api/admin/qstash/schedules',
    fetcher,
    { refreshInterval: 30_000 },
  )
  const [syncing, setSyncing] = useState(false)
  const [runningPath, setRunningPath] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{
    kind: 'ok' | 'err'
    msg: string
  } | null>(null)

  const flash = (kind: 'ok' | 'err', msg: string) => {
    setToast({ kind, msg })
    setTimeout(() => setToast(null), 4000)
  }

  const sync = async () => {
    setSyncing(true)
    try {
      const r = await fetch('/api/admin/qstash/schedules', { method: 'POST' })
      const j = await r.json()
      const failed = (j.results ?? []).filter((x: any) => x.error)
      if (failed.length === 0) {
        flash('ok', `Synced ${j.results.length} schedules`)
      } else {
        flash('err', `${failed.length} of ${j.results.length} failed — check logs`)
      }
      mutate()
    } catch (err) {
      flash('err', 'Sync failed — see console')
    } finally {
      setSyncing(false)
    }
  }

  const runNow = async (path: string) => {
    setRunningPath(path)
    try {
      // The admin trigger uses GET + bearer; in the browser we don't
      // have CRON_SECRET, so this falls through to the dev-mode allow
      // path. In production, we don't actually want admins firing jobs
      // straight from the browser — but on staging it's invaluable.
      const r = await fetch(path)
      const j = await r.json()
      if (r.ok) {
        flash(
          'ok',
          j.sent !== undefined
            ? `Ran ${path} — sent ${j.sent}, failed ${j.failed ?? 0}`
            : `Ran ${path} — ${JSON.stringify(j).slice(0, 80)}`,
        )
      } else {
        flash('err', `Run failed (${r.status}): ${j.error ?? 'unknown'}`)
      }
    } catch (err) {
      flash('err', 'Run failed — see console')
    } finally {
      setRunningPath(null)
    }
  }

  const dropOrphan = async (scheduleId: string) => {
    if (!confirm('Drop this orphan schedule?')) return
    setDeletingId(scheduleId)
    try {
      await fetch(
        `/api/admin/qstash/schedules?scheduleId=${encodeURIComponent(scheduleId)}`,
        { method: 'DELETE' },
      )
      flash('ok', 'Schedule removed')
      mutate()
    } catch {
      flash('err', 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-[#7B2D8E]" />
            QStash schedules
          </h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl text-pretty">
            Recurring background jobs. Edit the manifest in
            <code className="mx-1 px-1.5 py-0.5 rounded bg-gray-100 text-[12px] text-gray-700">
              lib/qstash-schedules.ts
            </code>
            then hit Sync to push to QStash.
          </p>
        </div>

        <button
          onClick={sync}
          disabled={syncing}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-[#7B2D8E] text-white text-sm font-medium hover:bg-[#651F75] active:scale-[0.98] transition disabled:opacity-60"
        >
          {syncing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Sync schedules
        </button>
      </header>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className={`mb-4 px-4 py-3 rounded-lg text-sm border ${
            toast.kind === 'ok'
              ? 'bg-[#7B2D8E]/[0.06] border-[#7B2D8E]/20 text-[#5A1D6A]'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Loading / error states */}
      {isLoading && (
        <div className="rounded-xl border border-gray-100 bg-white p-10 text-center text-sm text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#7B2D8E]" />
          Loading schedules…
        </div>
      )}

      {data?.error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800 flex gap-3 items-start">
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Couldn&apos;t reach QStash.</p>
            <p className="text-rose-700/80 mt-1">{data.error}</p>
          </div>
        </div>
      )}

      {/* Manifest table */}
      {data?.manifest && (
        <section className="rounded-xl border border-gray-100 bg-white overflow-hidden">
          <header className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Jobs</h2>
            <span className="text-xs text-gray-400">
              Auto-refreshes every 30s
            </span>
          </header>

          <ul className="divide-y divide-gray-100">
            {data.manifest.map((m) => {
              const status: 'ok' | 'drift' | 'missing' | 'paused' = m.paused
                ? 'paused'
                : !m.registered
                ? 'missing'
                : !m.cronInSync
                ? 'drift'
                : 'ok'

              return (
                <li key={m.id} className="p-5 flex flex-wrap gap-4 items-start">
                  <div className="flex-1 min-w-[260px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-gray-900">
                        {m.label}
                      </h3>
                      <StatusPill status={status} />
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed text-pretty">
                      {m.description}
                    </p>
                    <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 mt-3 text-[12px]">
                      <Field label="Path" value={m.path} mono />
                      <Field label="Cron (expected)" value={m.cron} mono />
                      <Field
                        label="Cron (live)"
                        value={m.liveCron ?? '—'}
                        mono
                        muted={!m.registered}
                      />
                      <Field
                        label="Schedule ID"
                        value={m.scheduleId ?? '—'}
                        mono
                        muted={!m.registered}
                      />
                      <Field
                        label="Created"
                        value={relTime(m.createdAt)}
                        muted={!m.registered}
                      />
                    </dl>
                  </div>

                  <button
                    onClick={() => runNow(m.path)}
                    disabled={runningPath === m.path}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-700 hover:border-[#7B2D8E] hover:text-[#7B2D8E] transition disabled:opacity-60"
                  >
                    {runningPath === m.path ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    Run now
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* Orphan schedules */}
      {data?.orphans && data.orphans.length > 0 && (
        <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50/40 overflow-hidden">
          <header className="px-5 py-3 border-b border-amber-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-amber-900">
              Orphan schedules ({data.orphans.length})
            </h2>
            <span className="text-xs text-amber-700/80 ml-2">
              Live in QStash but no longer in the manifest
            </span>
          </header>
          <ul className="divide-y divide-amber-200">
            {data.orphans.map((o) => (
              <li key={o.scheduleId} className="p-5 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-900 truncate">
                    {o.destination}
                  </p>
                  <p className="text-xs text-amber-700/80 mt-1 font-mono">
                    cron <span className="font-semibold">{o.cron}</span>
                    {' • '}
                    id <span className="font-semibold">{o.scheduleId}</span>
                  </p>
                </div>
                <button
                  onClick={() => dropOrphan(o.scheduleId)}
                  disabled={deletingId === o.scheduleId}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-amber-300 text-sm text-amber-800 hover:bg-amber-100 transition disabled:opacity-60"
                >
                  {deletingId === o.scheduleId ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Drop
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Local presentation helpers
// ---------------------------------------------------------------------------

function Field({
  label,
  value,
  mono,
  muted,
}: {
  label: string
  value: string
  mono?: boolean
  muted?: boolean
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">
        {label}
      </dt>
      <dd
        className={`truncate ${mono ? 'font-mono text-[11.5px]' : ''} ${
          muted ? 'text-gray-400' : 'text-gray-700'
        }`}
        title={value}
      >
        {value}
      </dd>
    </div>
  )
}

function StatusPill({
  status,
}: {
  status: 'ok' | 'drift' | 'missing' | 'paused'
}) {
  const map = {
    ok: {
      label: 'In sync',
      // "In sync" was rendered in emerald (semantic success green) which
      // looked off-brand against the rest of the admin surface — every
      // other status pill across the app uses brand-purple for "good"
      // states. Switched to a tinted brand-purple pill for visual
      // consistency with the rest of the admin.
      icon: CheckCircle2,
      cls: 'bg-[#7B2D8E]/[0.08] text-[#5A1D6A] border-[#7B2D8E]/20',
    },
    drift: {
      label: 'Cron drift',
      icon: AlertTriangle,
      cls: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    missing: {
      label: 'Not registered',
      icon: AlertTriangle,
      cls: 'bg-rose-50 text-rose-700 border-rose-200',
    },
    paused: {
      label: 'Paused',
      icon: CircleSlash,
      cls: 'bg-gray-50 text-gray-600 border-gray-200',
    },
  } as const
  const { label, icon: Icon, cls } = map[status]
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cls}`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  )
}
