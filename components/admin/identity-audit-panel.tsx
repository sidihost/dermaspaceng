'use client'

/**
 * Identity & lifecycle audit panel for the admin user-detail page.
 *
 * Renders four compact cards stacked vertically so the admin can
 * see, at a glance, every identity / consent / lifecycle event on
 * the user's account:
 *
 *   1. Profile changes — when did they last rename, swap email,
 *      change avatar, etc. Sourced from `profile_change_log`.
 *   2. Legal acceptance — which Terms / Privacy version they're
 *      on right now, and the full acceptance timeline.
 *   3. Account deletion — pending soft-delete request (with
 *      countdown to scheduled date) plus past requests.
 *   4. Data export — pending or recently-ready export bundles.
 *
 * The cards intentionally re-use the same surface tokens as the
 * rest of the admin user-detail page (white card, gray-200 ring,
 * rounded-2xl, brand purple #7B2D8E for emphasis) so the section
 * feels native rather than bolted on. Empty states surface as a
 * single muted line so the admin can quickly tell "this user has
 * no audit history" from "we haven't loaded it yet".
 */

import { useMemo } from 'react'
import {
  History,
  ScrollText,
  ShieldCheck,
  AlertTriangle,
  Database,
  CheckCircle2,
} from 'lucide-react'

interface ProfileChangeRow {
  id: number
  field: string
  old_value: string | null
  new_value: string | null
  surface: string
  changed_by: string | null
  ip_address: string | null
  created_at: string
}

interface LegalAcceptanceRow {
  version: string
  surface: string
  accepted_at: string
  ip_address: string | null
}

interface DeletionRow {
  id: number
  status: string
  reason: string | null
  requested_at: string
  deletion_scheduled_for: string | null
  cancelled_at: string | null
  completed_at: string | null
}

interface ExportRow {
  id: number
  status: string
  requested_at: string
  ready_at: string | null
  expires_at: string | null
  download_url: string | null
}

interface Props {
  profileChanges: ProfileChangeRow[]
  legal: {
    acceptedVersion: string | null
    acceptedAt: string | null
    history: LegalAcceptanceRow[]
  }
  accountDeletion: {
    pending: DeletionRow | null
    history: DeletionRow[]
  }
  dataExport: {
    pending: ExportRow | null
    history: ExportRow[]
  }
}

// Convert snake_case field names to friendly labels. Limited to
// fields we actually log; unknowns render verbatim with the
// underscores stripped so a future field still reads sensibly.
const FIELD_LABELS: Record<string, string> = {
  first_name: 'First name',
  last_name: 'Last name',
  username: 'Username',
  email: 'Email',
  phone: 'Phone',
  avatar_url: 'Avatar',
  date_of_birth: 'Date of birth',
  bio: 'Bio',
  gender: 'Gender',
  cover_style: 'Cover style',
  is_public: 'Profile visibility',
  website: 'Website',
  instagram: 'Instagram',
  twitter: 'X / Twitter',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
}

function fieldLabel(field: string): string {
  return FIELD_LABELS[field] || field.replace(/_/g, ' ')
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function formatRelative(iso: string): string {
  const now = Date.now()
  const t = new Date(iso).getTime()
  const diff = t - now
  const abs = Math.abs(diff)
  const days = Math.round(abs / (1000 * 60 * 60 * 24))
  const hours = Math.round(abs / (1000 * 60 * 60))
  const future = diff > 0
  if (days > 1) return future ? `in ${days} days` : `${days} days ago`
  if (hours > 1) return future ? `in ${hours} hours` : `${hours} hours ago`
  return future ? 'shortly' : 'just now'
}

function trimDisplay(value: string | null): string {
  if (value === null) return '—'
  if (value.length > 80) return value.slice(0, 77) + '…'
  return value
}

export function IdentityAuditPanel(props: Props) {
  const { profileChanges, legal, accountDeletion, dataExport } = props

  const deletionPending = accountDeletion.pending
  const exportPending = dataExport.pending
  const exportReady = useMemo(
    () => dataExport.history.find((r) => r.status === 'ready') ?? null,
    [dataExport.history],
  )

  return (
    <section className="space-y-4">
      {/* ── Profile changes ─────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white">
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="grid h-9 w-9 place-items-center rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E]"
            >
              <History className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 leading-tight">
                Profile changes
              </h2>
              <p className="text-[11.5px] text-gray-500 leading-snug mt-0.5">
                Last 50 edits to the user&apos;s identity fields.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-600 px-2 py-0.5 text-[11px] font-medium ring-1 ring-gray-200">
            {profileChanges.length}
          </span>
        </header>
        {profileChanges.length === 0 ? (
          <p className="px-5 py-5 text-[13px] text-gray-500">
            No tracked changes yet.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {profileChanges.slice(0, 12).map((row) => (
              <li
                key={row.id}
                className="px-5 py-3 flex items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="text-[13px] text-gray-900">
                    <span className="font-semibold">{fieldLabel(row.field)}</span>
                    <span className="text-gray-400"> — </span>
                    <span className="font-mono text-[12px] text-gray-500">
                      {trimDisplay(row.old_value)}
                    </span>
                    <span className="mx-1.5 text-[#7B2D8E]">→</span>
                    <span className="font-mono text-[12px] text-gray-900">
                      {trimDisplay(row.new_value)}
                    </span>
                  </p>
                  <p className="mt-1 text-[11px] text-gray-500 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span>{formatTime(row.created_at)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize">{row.surface || 'self'}</span>
                    {row.ip_address && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{row.ip_address}</span>
                      </>
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Legal acceptance ─────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white">
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="grid h-9 w-9 place-items-center rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E]"
            >
              <ScrollText className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 leading-tight">
                Terms &amp; Privacy
              </h2>
              <p className="text-[11.5px] text-gray-500 leading-snug mt-0.5">
                What the user has agreed to and when.
              </p>
            </div>
          </div>
          {legal.acceptedVersion ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] px-2 py-0.5 text-[11px] font-semibold ring-1 ring-[#7B2D8E]/20">
              <ShieldCheck className="h-3 w-3" />
              {legal.acceptedVersion}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 text-[11px] font-semibold ring-1 ring-amber-200">
              <AlertTriangle className="h-3 w-3" />
              Not accepted
            </span>
          )}
        </header>
        {legal.history.length === 0 ? (
          <p className="px-5 py-5 text-[13px] text-gray-500">
            {legal.acceptedAt
              ? `Accepted ${formatTime(legal.acceptedAt)}.`
              : 'No legal acceptance recorded for this account.'}
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {legal.history.map((row, idx) => (
              <li
                key={`${row.version}-${idx}`}
                className="px-5 py-3 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-gray-900">
                    Version {row.version}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span>{formatTime(row.accepted_at)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize">{row.surface || 'unknown'}</span>
                    {row.ip_address && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{row.ip_address}</span>
                      </>
                    )}
                  </p>
                </div>
                <CheckCircle2 className="h-4 w-4 text-[#7B2D8E] flex-shrink-0" />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Account deletion ────────────────────────────────── */}
      <div
        className={`rounded-2xl border bg-white ${
          deletionPending ? 'border-rose-200 ring-1 ring-rose-100' : 'border-gray-200'
        }`}
      >
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className={`grid h-9 w-9 place-items-center rounded-xl ${
                deletionPending
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 leading-tight">
                Account deletion
              </h2>
              <p className="text-[11.5px] text-gray-500 leading-snug mt-0.5">
                Soft-delete with 14-day grace period.
              </p>
            </div>
          </div>
          {deletionPending ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 text-rose-700 px-2 py-0.5 text-[11px] font-semibold ring-1 ring-rose-200">
              Pending
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-600 px-2 py-0.5 text-[11px] font-medium ring-1 ring-gray-200">
              Healthy
            </span>
          )}
        </header>
        {deletionPending ? (
          <div className="px-5 py-4">
            <p className="text-[13px] text-gray-900">
              <span className="font-semibold">User requested deletion</span>
              {' '}— scheduled for{' '}
              <span className="font-semibold text-rose-700">
                {deletionPending.deletion_scheduled_for
                  ? `${formatTime(deletionPending.deletion_scheduled_for)} (${formatRelative(deletionPending.deletion_scheduled_for)})`
                  : 'unknown'}
              </span>
              .
            </p>
            {deletionPending.reason && (
              <p className="mt-2 text-[12.5px] text-gray-600 italic">
                &ldquo;{deletionPending.reason}&rdquo;
              </p>
            )}
            <p className="mt-2 text-[11px] text-gray-500">
              Filed {formatTime(deletionPending.requested_at)}.
            </p>
          </div>
        ) : accountDeletion.history.length === 0 ? (
          <p className="px-5 py-5 text-[13px] text-gray-500">
            No deletion requests on file.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {accountDeletion.history.map((row) => (
              <li
                key={row.id}
                className="px-5 py-3 flex items-center justify-between gap-4 text-[12.5px]"
              >
                <span className="text-gray-900 capitalize">{row.status}</span>
                <span className="text-gray-500">
                  {formatTime(row.requested_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Data export ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white">
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="grid h-9 w-9 place-items-center rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E]"
            >
              <Database className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 leading-tight">
                Data export
              </h2>
              <p className="text-[11.5px] text-gray-500 leading-snug mt-0.5">
                User-initiated requests for a copy of their data.
              </p>
            </div>
          </div>
          {exportPending ? (
            <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 text-[11px] font-semibold ring-1 ring-amber-200">
              Preparing
            </span>
          ) : exportReady ? (
            <span className="inline-flex items-center rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] px-2 py-0.5 text-[11px] font-semibold ring-1 ring-[#7B2D8E]/20">
              Ready
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-600 px-2 py-0.5 text-[11px] font-medium ring-1 ring-gray-200">
              No requests
            </span>
          )}
        </header>
        {dataExport.history.length === 0 ? (
          <p className="px-5 py-5 text-[13px] text-gray-500">
            User has not requested a data export.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {dataExport.history.map((row) => (
              <li
                key={row.id}
                className="px-5 py-3 flex items-center justify-between gap-4 text-[12.5px]"
              >
                <span className="text-gray-900 capitalize">{row.status}</span>
                <span className="text-gray-500">
                  {formatTime(row.requested_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
