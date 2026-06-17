"use client"

/**
 * Staff › Appointments
 *
 * The full list of bookings the signed-in staff member is either
 * primary-assigned to or has been granted explicit view/edit
 * access for. Mirrors the design language of the staff dashboard:
 * single brand colour, hairline borders, no gradients.
 *
 * Tabs:
 *   • Upcoming — pending/confirmed and date >= today
 *   • Past — completed/cancelled or date < today
 *   • All — everything we have access to
 *
 * The page is intentionally lightweight: it uses SWR with a 30s
 * polling interval so a freshly-assigned booking shows up without
 * a manual refresh. Tapping a row routes to the detail page where
 * we show the customer's profile, services, and status controls.
 */

import * as React from "react"
import Link from "next/link"
import useSWR from "swr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, ArrowRight, Loader2, MapPin, Clock } from "lucide-react"
import { safeFetcher } from "@/lib/safe-fetcher"
import { DataLoadError } from "@/components/shared/data-load-error"

interface AppointmentRow {
  id: string
  booking_reference: string
  appointment_date: string
  appointment_time: string
  customer_name: string
  customer_phone: string | null
  customer_email?: string | null
  customer_avatar_url?: string | null
  location_name: string
  status: string
  payment_status: string
  total_price_kobo: number
  access_role: "assigned" | "granted" | "shared"
}

// Two-letter initials for the fallback avatar disc. Mirrors the
// helper in the staff dashboard so the same client renders with the
// same initials everywhere they appear.
function customerInitials(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Replaced the legacy `(u) => fetch(u).then(r => r.json())` fetcher.
// That version never checked `res.ok`, so a 401/500 was decoded as
// `{ error: "..." }` and the page silently rendered its empty state.
// `safeFetcher` throws on non-OK, which lights up SWR's `error`
// slot and lets us render <DataLoadError /> instead of pretending
// the operator has no appointments.
const fetcher = safeFetcher

const TABS = [
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "all", label: "All" },
] as const

type TabId = (typeof TABS)[number]["id"]

export default function StaffAppointmentsPage() {
  const [tab, setTab] = React.useState<TabId>("upcoming")
  const { data, error, isLoading, mutate } = useSWR<{ appointments: AppointmentRow[] }>(
    `/api/staff/appointments?filter=${tab}`,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 30_000 },
  )

  const rows = data?.appointments ?? []

  return (
    <div className="space-y-5">
      {/* Compact heading — replaces the previous purple "Operations / My
          appointments" hero. The page itself sits inside the staff
          console which already brands the surface, so a slim title is
          enough and gets the operator to their list faster. */}
      <header>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900">
          Appointments
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Every booking in the salon. Tap a row to view details, update status, or check the
          customer in.
        </p>
      </header>

      {/* Tab pills */}
      <div className="flex items-center gap-2 overflow-x-auto" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12.5px] font-semibold transition-colors ${
              tab === t.id
                ? "bg-[#7B2D8E] text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-[#7B2D8E]/30 hover:text-[#7B2D8E]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card className="border-gray-100 rounded-2xl">
        <CardHeader className="border-b border-gray-100 pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Calendar className="h-4 w-4 text-[#7B2D8E]" />
            {tab === "upcoming" && "Upcoming"}
            {tab === "past" && "Past appointments"}
            {tab === "all" && "All appointments"}
          </CardTitle>
          <CardDescription className="text-xs">
            {rows.length} {rows.length === 1 ? "result" : "results"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* Surface fetch failures explicitly. Previously a 500 from
              the API was decoded into `data` and dropped silently into
              the empty state below — operators thought they had no
              appointments when the server was actually unreachable.
              Now SWR fires `error` (via safeFetcher) and we render a
              dedicated tile with a Retry CTA. */}
          {error && !data ? (
            <div className="p-4">
              <DataLoadError
                title="Could not load appointments"
                error={error}
                onRetry={() => mutate()}
              />
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-[#7B2D8E]" />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-12 h-12 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center text-[#7B2D8E]">
                <Calendar className="h-6 w-6" />
              </div>
              <p className="mt-3 text-base font-semibold text-gray-900">
                Nothing here yet
              </p>
              <p className="mt-1 text-sm text-gray-500 max-w-sm">
                {tab === "upcoming"
                  ? "No upcoming bookings in the salon yet. New bookings appear here automatically."
                  : "No matching appointments to show."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {rows.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/staff/appointments/${b.id}`}
                    className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-3 sm:py-3.5 transition-colors hover:bg-[#7B2D8E]/[0.03] group"
                  >
                    {/* Real client avatar — uses the photo on the
                        customer's account when present, otherwise a
                        brand-tinted initials disc. Falls back via the
                        onError handler so a broken upload still shows
                        legible initials instead of a torn-image icon. */}
                    <span className="relative flex-shrink-0 h-11 w-11 sm:h-12 sm:w-12">
                      {b.customer_avatar_url ? (
                        <>
                          <img
                            src={b.customer_avatar_url}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="h-full w-full rounded-full object-cover ring-1 ring-[#7B2D8E]/15"
                            onError={(e) => {
                              const img = e.currentTarget
                              img.style.display = "none"
                              const sib = img.nextElementSibling as HTMLElement | null
                              if (sib) sib.style.display = "flex"
                            }}
                          />
                          <span
                            className="absolute inset-0 hidden items-center justify-center rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] text-[11px] font-bold uppercase ring-1 ring-[#7B2D8E]/15"
                          >
                            {customerInitials(b.customer_name)}
                          </span>
                        </>
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] text-[11px] font-bold uppercase ring-1 ring-[#7B2D8E]/15">
                          {customerInitials(b.customer_name)}
                        </span>
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {b.customer_name}
                      </p>
                      <p className="text-[11.5px] text-gray-500 truncate flex items-center gap-2 mt-0.5">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(`${b.appointment_date}T00:00:00`).toLocaleDateString(
                            "en-NG",
                            { month: "short", day: "numeric" },
                          )}
                        </span>
                        <span aria-hidden>·</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {b.appointment_time}
                        </span>
                        <span aria-hidden>·</span>
                        <span className="inline-flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3" /> {b.location_name}
                        </span>
                      </p>
                      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider ring-1 ${
                            b.status === "confirmed"
                              ? "bg-[#7B2D8E]/10 text-[#7B2D8E] ring-[#7B2D8E]/25"
                              : b.status === "completed"
                                ? "bg-[#7B2D8E] text-white ring-[#7B2D8E]"
                                : b.status === "cancelled" || b.status === "no_show"
                                  ? "bg-rose-50 text-rose-700 ring-rose-200"
                                  : "bg-amber-50 text-amber-700 ring-amber-200"
                          }`}
                        >
                          {b.status}
                        </span>
                        {b.access_role === "assigned" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] ring-1 ring-[#7B2D8E]/20 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider">
                            yours
                          </span>
                        )}
                        <span className="text-[10.5px] text-gray-400 font-mono">
                          {b.booking_reference}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-[#7B2D8E] transition-colors flex-shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
