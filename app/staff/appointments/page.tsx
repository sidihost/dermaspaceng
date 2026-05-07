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
import { Calendar, ArrowRight, Loader2, MapPin, Clock, User as UserIcon } from "lucide-react"

interface AppointmentRow {
  id: string
  booking_reference: string
  appointment_date: string
  appointment_time: string
  customer_name: string
  customer_phone: string | null
  location_name: string
  status: string
  payment_status: string
  total_price_kobo: number
  access_role: "assigned" | "granted"
}

const fetcher = (u: string) => fetch(u).then((r) => r.json())

const TABS = [
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "all", label: "All" },
] as const

type TabId = (typeof TABS)[number]["id"]

export default function StaffAppointmentsPage() {
  const [tab, setTab] = React.useState<TabId>("upcoming")
  const { data, isLoading } = useSWR<{ appointments: AppointmentRow[] }>(
    `/api/staff/appointments?filter=${tab}`,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 30_000 },
  )

  const rows = data?.appointments ?? []

  return (
    <div className="space-y-5">
      {/* Page hero — keeps the same card vocabulary the dashboard
          uses so the navigation feels consistent. */}
      <section className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-5 sm:p-6">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-[#7B2D8E]" aria-hidden />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#7B2D8E]">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#7B2D8E]" aria-hidden />
              Operations
            </span>
            <h1 className="mt-1.5 text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight text-balance">
              My appointments
            </h1>
            <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">
              Bookings assigned to you or shared with you by the admin team.
            </p>
          </div>
        </div>
      </section>

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
          {isLoading ? (
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
                  ? "When an admin assigns or shares a booking with you, it will appear here."
                  : "No matching appointments to show."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {rows.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/staff/appointments/${b.id}`}
                    className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[#7B2D8E]/[0.03] group"
                  >
                    <div className="flex flex-col items-center justify-center h-12 w-12 rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E] flex-shrink-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        {new Date(`${b.appointment_date}T00:00:00`).toLocaleDateString(
                          "en-NG",
                          { month: "short" },
                        )}
                      </span>
                      <span className="text-base font-semibold leading-none mt-0.5">
                        {new Date(`${b.appointment_date}T00:00:00`).getDate()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate flex items-center gap-1.5">
                        <UserIcon className="h-3.5 w-3.5 text-gray-400" />
                        {b.customer_name}
                      </p>
                      <p className="text-[11.5px] text-gray-500 truncate flex items-center gap-2 mt-0.5">
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
                              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                              : b.status === "completed"
                                ? "bg-[#7B2D8E]/10 text-[#7B2D8E] ring-[#7B2D8E]/20"
                                : b.status === "cancelled" || b.status === "no_show"
                                  ? "bg-rose-50 text-rose-700 ring-rose-200"
                                  : "bg-amber-50 text-amber-700 ring-amber-200"
                          }`}
                        >
                          {b.status}
                        </span>
                        {b.access_role === "granted" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-600 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider">
                            shared
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
