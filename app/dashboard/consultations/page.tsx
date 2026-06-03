"use client"

/**
 * /dashboard/consultations
 *
 * Customer-facing list of consultation requests submitted via the
 * public consultation form. Mirrors the layout of the My Bookings
 * page but reads from `/api/user/consultations`. Status is read-only
 * here — staff/admin update it from /staff/consultations.
 */

import * as React from "react"
import Link from "next/link"
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
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface UserConsultation {
  id: string
  firstName: string | null
  lastName: string | null
  email: string
  phone: string | null
  location: string | null
  appointmentDate: string | null
  appointmentTime: string | null
  concerns: string[]
  notes: string | null
  status: string
  createdAt: string
}

const fetcher = (u: string) =>
  fetch(u).then((r) => {
    if (!r.ok) throw new Error("Failed to load")
    return r.json()
  })

const STATUS: Record<string, { cls: string; label: string; Icon: typeof Clock }> = {
  pending: {
    cls: "bg-amber-50 text-amber-700 ring-amber-200",
    label: "Pending review",
    Icon: Clock,
  },
  confirmed: {
    cls: "bg-[#7B2D8E] text-white ring-[#7B2D8E]",
    label: "Confirmed",
    Icon: CheckCircle2,
  },
  completed: {
    cls: "bg-[#7B2D8E]/10 text-[#7B2D8E] ring-[#7B2D8E]/20",
    label: "Completed",
    Icon: CheckCircle2,
  },
  cancelled: {
    cls: "bg-rose-50 text-rose-700 ring-rose-200",
    label: "Cancelled",
    Icon: XCircle,
  },
}

function formatLong(date: string | null, time: string | null): string {
  if (!date) return "Awaiting confirmation"
  const long = new Date(`${date}T00:00:00`).toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  return time ? `${long} at ${time}` : long
}

function fullName(c: UserConsultation): string {
  const composed = [c.firstName, c.lastName].filter(Boolean).join(" ").trim()
  return composed || c.email
}

export default function DashboardConsultationsPage() {
  const { data, error, isLoading, mutate } = useSWR<{
    consultations: UserConsultation[]
  }>("/api/user/consultations", fetcher, { revalidateOnFocus: false })

  const consultations = data?.consultations ?? []
  const counts = consultations.reduce(
    (acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#7B2D8E]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">
            My consultations
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Skincare consultations you&apos;ve requested through DermaSpace.
          </p>
        </div>
        <Button asChild className="bg-[#7B2D8E] hover:bg-[#5A1D6A]">
          <Link href="/consultation">Book another</Link>
        </Button>
      </header>

      {/* Counts */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(["pending", "confirmed", "completed", "cancelled"] as const).map((s) => {
          const cfg = STATUS[s]
          return (
            <div
              key={s}
              className="rounded-2xl border border-gray-100 bg-white px-3 py-3"
            >
              <p className="text-2xl font-bold tabular-nums text-gray-900">
                {counts[s] ?? 0}
              </p>
              <p className="mt-0.5 text-[11px] uppercase tracking-wider text-gray-500">
                {cfg.label}
              </p>
            </div>
          )
        })}
      </div>

      {error && !data ? (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-700" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-rose-900">
              Could not load your consultations
            </p>
            <p className="text-xs text-rose-700">
              Please check your connection and try again.
            </p>
          </div>
          <button
            onClick={() => mutate()}
            className="flex-shrink-0 text-xs font-semibold text-rose-900 hover:underline"
          >
            Retry
          </button>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[#7B2D8E]" />
        </div>
      ) : consultations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 px-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E]">
            <Calendar className="h-5 w-5" />
          </div>
          <p className="mt-3 text-sm font-semibold text-gray-900">
            No consultations yet
          </p>
          <p className="mt-1 max-w-sm text-xs text-gray-500">
            Book a skincare consultation and our team will reach out to confirm
            your slot.
          </p>
          <Button asChild className="mt-4 bg-[#7B2D8E] hover:bg-[#5A1D6A]">
            <Link href="/consultation">Book a consultation</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {consultations.map((c) => {
            const cfg = STATUS[c.status] || STATUS.pending
            return (
              <li key={c.id}>
              <Link
                href={`/dashboard/consultations/${c.id}`}
                className="block rounded-2xl border border-gray-100 bg-white p-4 transition-colors hover:border-[#7B2D8E]/40 hover:bg-[#7B2D8E]/[0.02] sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-gray-900">
                        {fullName(c)}
                      </p>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider ring-1 ${cfg.cls}`}
                      >
                        <cfg.Icon className="h-2.5 w-2.5" />
                        {cfg.label}
                      </span>
                    </div>
                    <p className="inline-flex items-center gap-1 text-sm font-semibold text-[#7B2D8E]">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatLong(c.appointmentDate, c.appointmentTime)}
                    </p>
                    {c.concerns.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {c.concerns.slice(0, 4).map((concern, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-[#7B2D8E]/10 px-2 py-0.5 text-[10.5px] font-medium capitalize text-[#7B2D8E]"
                          >
                            {concern}
                          </span>
                        ))}
                        {c.concerns.length > 4 && (
                          <span className="text-[10.5px] text-gray-500">
                            +{c.concerns.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11.5px] text-gray-500">
                      {c.location && (
                        <span className="inline-flex items-center gap-1 capitalize">
                          <MapPin className="h-3 w-3" />
                          {c.location}
                        </span>
                      )}
                      {c.email && (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {c.email}
                        </span>
                      )}
                      {c.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {c.phone}
                        </span>
                      )}
                    </div>
                    {c.notes && (
                      <p className="mt-1 text-[12.5px] text-gray-700">
                        <span className="font-semibold text-gray-900">Note:</span>{" "}
                        {c.notes}
                      </p>
                    )}
                  </div>
                </div>
                <p className="mt-3 border-t border-gray-100 pt-2 text-[10.5px] text-gray-400">
                  Submitted{" "}
                  {new Date(c.createdAt).toLocaleString("en-NG", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
