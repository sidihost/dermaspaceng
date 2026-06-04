"use client"

/**
 * /dashboard/consultations/[id]
 *
 * Customer-facing detail view for a single consultation request.
 * Read-only: status is managed by staff/admin. Reads from
 * /api/user/consultations/[id], which scopes ownership to the
 * signed-in user.
 */

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import useSWR from "swr"
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  MapPin,
  Phone,
  Mail,
  ArrowLeft,
  AlertTriangle,
  Loader2,
  FileText,
  Tag,
} from "lucide-react"

interface ConsultationDetail {
  id: string
  firstName: string | null
  lastName: string | null
  email: string
  phone: string | null
  location: string | null
  appointmentDate: string | null
  appointmentTime: string | null
  concerns: string[]
  concernType: string | null
  notes: string | null
  status: string
  createdAt: string
  updatedAt: string | null
}

const fetcher = (u: string) =>
  fetch(u).then((r) => {
    if (!r.ok) throw new Error("Failed to load")
    return r.json()
  })

// Brand-only status pills. Hierarchy via purple intensity (never hue):
//   pending   → soft brand tint (awaiting action)
//   confirmed → strong brand fill (the "go" state)
//   completed → mid brand tint (terminal good)
//   cancelled → dark-purple ghost outline (terminal, distinct without
//               introducing an off-brand red)
const STATUS: Record<
  string,
  { cls: string; label: string; Icon: typeof Clock }
> = {
  pending: {
    cls: "bg-[#7B2D8E]/10 text-[#7B2D8E] ring-[#7B2D8E]/25",
    label: "Pending review",
    Icon: Clock,
  },
  confirmed: {
    cls: "bg-[#7B2D8E] text-white ring-[#7B2D8E]",
    label: "Confirmed",
    Icon: CheckCircle2,
  },
  completed: {
    cls: "bg-[#7B2D8E]/[0.15] text-[#7B2D8E] ring-[#7B2D8E]/30",
    label: "Completed",
    Icon: CheckCircle2,
  },
  cancelled: {
    cls: "bg-white text-[#5A1D6A] ring-[#5A1D6A]/35 line-through decoration-[#5A1D6A]/50",
    label: "Cancelled",
    Icon: XCircle,
  },
}

function formatLong(date: string | null, time: string | null): string {
  if (!date) return "Awaiting confirmation"
  const long = new Date(`${date}T00:00:00`).toLocaleDateString("en-NG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  return time ? `${long} at ${time}` : long
}

function fullName(c: ConsultationDetail): string {
  const composed = [c.firstName, c.lastName].filter(Boolean).join(" ").trim()
  return composed || c.email
}

export default function ConsultationDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id

  const { data, error, isLoading, mutate } = useSWR<{
    consultation: ConsultationDetail
  }>(id ? `/api/user/consultations/${id}` : null, fetcher, {
    revalidateOnFocus: false,
  })

  const c = data?.consultation

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-4 sm:p-6">
      <Link
        href="/dashboard/consultations"
        className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#7B2D8E]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to consultations
      </Link>

      {error && !data ? (
        <div className="flex items-start gap-2.5 rounded-2xl border border-[#5A1D6A]/20 bg-[#5A1D6A]/[0.04] px-4 py-3.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#5A1D6A]" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#5A1D6A]">
              We couldn&apos;t load this consultation
            </p>
            <p className="text-xs text-[#5A1D6A]/80">
              It may have been removed, or you might not have access.
            </p>
          </div>
          <button
            onClick={() => mutate()}
            className="flex-shrink-0 rounded-lg bg-[#7B2D8E] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#5A1D6A] transition-colors"
          >
            Retry
          </button>
        </div>
      ) : isLoading || !c ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[#7B2D8E]" />
        </div>
      ) : (
        <>
          {/* Header card — premium treatment: a 4px brand accent strip
              up top (same motif as the booking + voucher cards) and a
              soft radial wash so the card reads as elevated and clearly
              "ours" the moment it loads. */}
          <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="h-1 bg-gradient-to-r from-[#7B2D8E] via-[#9B4DB0] to-[#7B2D8E]" aria-hidden="true" />
            <div className="pointer-events-none absolute inset-x-0 top-1 h-28 bg-gradient-to-b from-[#7B2D8E]/[0.04] to-transparent" aria-hidden="true" />
            <div className="relative p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#7B2D8E] to-[#5A1D6A] text-sm font-bold text-white">
                    {(fullName(c) || "U").charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <h1 className="truncate text-xl font-semibold tracking-tight text-gray-900">
                      {fullName(c)}
                    </h1>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Consultation request
                    </p>
                  </div>
                </div>
                {(() => {
                  const cfg = STATUS[c.status] || STATUS.pending
                  return (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ring-1 ${cfg.cls}`}
                    >
                      <cfg.Icon className="h-3 w-3" />
                      {cfg.label}
                    </span>
                  )
                })()}
              </div>

              {/* Appointment block — the single most important fact for
                  the customer, given hero weight with the date and time
                  split into a clear two-part read. */}
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#7B2D8E]/15 bg-[#7B2D8E]/[0.05] px-4 py-3.5">
                <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-[#7B2D8E] text-white">
                  <Calendar className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7B2D8E]/70">
                    {c.appointmentDate ? "Appointment" : "Status"}
                  </p>
                  <p className="text-sm font-semibold text-[#7B2D8E] text-pretty">
                    {formatLong(c.appointmentDate, c.appointmentTime)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Concerns */}
          {(c.concerns.length > 0 || c.concernType) && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Tag className="h-4 w-4 text-[#7B2D8E]" />
                Skin concerns
              </h2>
              {c.concernType && (
                <p className="mt-2 text-xs capitalize text-gray-600">
                  {c.concernType}
                </p>
              )}
              {c.concerns.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.concerns.map((concern, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-[#7B2D8E]/10 px-2.5 py-1 text-[11px] font-medium capitalize text-[#7B2D8E]"
                    >
                      {concern}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {c.notes && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <FileText className="h-4 w-4 text-[#7B2D8E]" />
                Your note
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                {c.notes}
              </p>
            </div>
          )}

          {/* Contact */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-900">
              Contact details
            </h2>
            <div className="mt-3 space-y-2.5 text-sm text-gray-700">
              {c.location && (
                <p className="inline-flex items-center gap-2 capitalize">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  {c.location}
                </p>
              )}
              {c.email && (
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  {c.email}
                </p>
              )}
              {c.phone && (
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  {c.phone}
                </p>
              )}
            </div>
          </div>

          <p className="px-1 text-[11px] text-gray-400">
            Submitted{" "}
            {new Date(c.createdAt).toLocaleString("en-NG", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </>
      )}
    </div>
  )
}
