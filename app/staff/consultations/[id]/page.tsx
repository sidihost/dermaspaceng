"use client"

/**
 * Staff › Consultation detail page.
 *
 * Replaces the in-list modal with a real route so staff can deep-link
 * to a single consultation, share it with a colleague, or open it in a
 * new tab. Reuses the same admin GET endpoint
 * (`/api/admin/consultations/[id]`) which `requireAdminOrStaff`
 * already authorises, plus the existing PUT on
 * `/api/admin/consultations` for status / notes updates.
 *
 * Visual rules: brand purple (#7B2D8E), hairline borders, no shadows.
 */

import * as React from "react"
import { use as usePromise } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import useSWR, { mutate } from "swr"
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  User,
  Mail,
  Phone,
  MapPin,
  StickyNote,
  Loader2,
  MessageSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useNotify } from "@/components/shared/notify"
import { cn } from "@/lib/utils"

interface Consultation {
  id: number
  name: string | null
  first_name: string | null
  last_name: string | null
  email: string
  phone: string | null
  location: string | null
  concerns: string[] | string | null
  message: string | null
  notes: string | null
  admin_notes: string | null
  status: string
  scheduled_at: string | null
  appointment_date: string | null
  appointment_time: string | null
  created_at: string
  customer_avatar_url?: string | null
}

const fetcher = (u: string) =>
  fetch(u).then((r) => {
    if (!r.ok) throw new Error("Failed to load")
    return r.json()
  })

const STATUS: Record<string, { cls: string; label: string }> = {
  pending: { cls: "bg-amber-50 text-amber-700 ring-amber-200", label: "Pending" },
  confirmed: {
    cls: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    label: "Confirmed",
  },
  completed: {
    cls: "bg-[#7B2D8E]/10 text-[#7B2D8E] ring-[#7B2D8E]/20",
    label: "Completed",
  },
  cancelled: { cls: "bg-rose-50 text-rose-700 ring-rose-200", label: "Cancelled" },
}

function displayName(c: Consultation): string {
  const composed = [c.first_name, c.last_name].filter(Boolean).join(" ").trim()
  return composed || c.name || "Anonymous"
}

function displayConcerns(c: Consultation): string[] {
  if (!c.concerns) return []
  if (Array.isArray(c.concerns)) return c.concerns
  try {
    const parsed = JSON.parse(String(c.concerns))
    return Array.isArray(parsed) ? parsed : [String(c.concerns)]
  } catch {
    return [String(c.concerns)]
  }
}

function displayWhen(c: Consultation): string | null {
  if (c.appointment_date) {
    const d = new Date(`${c.appointment_date}T00:00:00`)
    const long = d.toLocaleDateString("en-NG", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
    return c.appointment_time ? `${long} at ${c.appointment_time}` : long
  }
  if (c.scheduled_at) {
    return new Date(c.scheduled_at).toLocaleString("en-NG", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }
  return null
}

function initialsFor(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase() || "?"
  )
}

export default function StaffConsultationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = usePromise(params)
  const router = useRouter()
  const notify = useNotify()
  const { data, error, isLoading } = useSWR<{ consultation: Consultation }>(
    `/api/admin/consultations/${id}`,
    fetcher,
    { revalidateOnFocus: false },
  )
  const [note, setNote] = React.useState("")
  const [savingNote, setSavingNote] = React.useState(false)
  const [updating, setUpdating] = React.useState<string | null>(null)

  const consultation = data?.consultation

  async function setStatus(next: string) {
    if (!consultation) return
    setUpdating(next)
    try {
      const res = await fetch("/api/admin/consultations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultationId: consultation.id,
          action: "update_status",
          value: next,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        notify.error("Could not update", body.error || "Try again.")
        return
      }
      await mutate(`/api/admin/consultations/${id}`)
      notify.success("Updated", `Marked as ${next}.`)
    } finally {
      setUpdating(null)
    }
  }

  async function saveNote() {
    if (!consultation || !note.trim()) return
    setSavingNote(true)
    try {
      const res = await fetch("/api/admin/consultations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultationId: consultation.id,
          action: "add_notes",
          notes: note.trim(),
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        notify.error("Could not save note", body.error || "Try again.")
        return
      }
      setNote("")
      await mutate(`/api/admin/consultations/${id}`)
      notify.success("Saved", "Internal note attached.")
    } finally {
      setSavingNote(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#7B2D8E]" />
      </div>
    )
  }

  if (error || !consultation) {
    return (
      <div className="space-y-4">
        <Link
          href="/staff/consultations"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#7B2D8E]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to consultations
        </Link>
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5 text-sm text-rose-900">
          We couldn&apos;t load this consultation. It may have been removed
          or you may not have access.
        </div>
      </div>
    )
  }

  const name = displayName(consultation)
  const status = STATUS[consultation.status] || STATUS.pending
  const concerns = displayConcerns(consultation)
  const when = displayWhen(consultation)
  const nextActions: Array<{ value: string; label: string }> = []
  if (consultation.status === "pending") {
    nextActions.push({ value: "confirmed", label: "Confirm" })
    nextActions.push({ value: "cancelled", label: "Cancel" })
  } else if (consultation.status === "confirmed") {
    nextActions.push({ value: "completed", label: "Mark completed" })
    nextActions.push({ value: "cancelled", label: "Cancel" })
  }

  return (
    <div className="space-y-5">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#7B2D8E] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-5 sm:p-6">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-[#7B2D8E]" aria-hidden />
        <div className="flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#7B2D8E]/10 text-base font-bold uppercase text-[#7B2D8E] ring-1 ring-[#7B2D8E]/15">
            {consultation.customer_avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={consultation.customer_avatar_url}
                alt=""
                aria-hidden="true"
                className="h-full w-full object-cover"
              />
            ) : (
              initialsFor(name)
            )}
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <span className="inline-flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#7B2D8E]">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#7B2D8E]" aria-hidden />
              Consultation
              <span className="font-mono text-gray-400 normal-case tracking-normal">
                · #{consultation.id}
              </span>
            </span>
            <h1 className="truncate text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">
              {name}
            </h1>
            {when && (
              <p className="text-sm text-gray-500">
                <Calendar className="mr-1 inline h-3.5 w-3.5 text-[#7B2D8E]" />
                {when}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider ring-1",
                  status.cls,
                )}
              >
                {status.label}
              </span>
              {consultation.location && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-gray-600 ring-1 ring-gray-200">
                  <MapPin className="h-2.5 w-2.5" />
                  {consultation.location}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Left: details */}
        <div className="space-y-5">
          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <User className="h-4 w-4 text-[#7B2D8E]" />
              Customer
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field icon={<User className="h-4 w-4" />} label="Name" value={name} />
              <Field
                icon={<Mail className="h-4 w-4" />}
                label="Email"
                value={consultation.email}
              />
              <Field
                icon={<Phone className="h-4 w-4" />}
                label="Phone"
                value={consultation.phone ?? "—"}
              />
              <Field
                icon={<MapPin className="h-4 w-4" />}
                label="Preferred location"
                value={consultation.location ?? "—"}
              />
            </div>
          </section>

          {concerns.length > 0 && (
            <section className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">Concerns</h2>
              <div className="flex flex-wrap gap-1.5">
                {concerns.map((c, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-[#7B2D8E]/10 px-2.5 py-1 text-xs font-medium capitalize text-[#7B2D8E]"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </section>
          )}

          {consultation.message && (
            <section className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <MessageSquare className="h-4 w-4 text-[#7B2D8E]" />
                Customer message
              </h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                {consultation.message}
              </p>
            </section>
          )}

          {(consultation.admin_notes || consultation.notes) && (
            <section className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <StickyNote className="h-4 w-4 text-[#7B2D8E]" />
                Internal notes
              </h2>
              <p className="whitespace-pre-wrap rounded-xl bg-[#7B2D8E]/5 p-3 text-sm text-gray-800">
                {consultation.admin_notes || consultation.notes}
              </p>
            </section>
          )}
        </div>

        {/* Right: actions */}
        <aside className="space-y-5">
          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Status</h2>
            {nextActions.length === 0 ? (
              <p className="text-xs text-gray-500">
                This consultation is {consultation.status}. No further actions
                are available.
              </p>
            ) : (
              <div className="space-y-2">
                {nextActions.map((a) => (
                  <Button
                    key={a.value}
                    variant={a.value === "cancelled" ? "outline" : "default"}
                    className={
                      a.value === "cancelled"
                        ? "w-full justify-center border-rose-200 text-rose-700 hover:bg-rose-50"
                        : "w-full justify-center bg-[#7B2D8E] hover:bg-[#5A1D6A]"
                    }
                    disabled={updating !== null}
                    onClick={() => setStatus(a.value)}
                  >
                    {updating === a.value ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : a.value === "cancelled" ? (
                      <>
                        <XCircle className="h-4 w-4" />
                        {a.label}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        {a.label}
                      </>
                    )}
                  </Button>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">
              Add internal note
            </h2>
            <Label className="text-xs text-gray-500">
              Visible to staff and admin only
            </Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Allergies, prep notes, follow-up reminders..."
              rows={4}
              className="mt-1 border-gray-200 focus-visible:ring-[#7B2D8E]/30"
            />
            <Button
              onClick={saveNote}
              disabled={!note.trim() || savingNote}
              className="mt-2 w-full bg-[#7B2D8E] hover:bg-[#5A1D6A]"
            >
              {savingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save note"}
            </Button>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 text-xs text-gray-500">
            <Clock className="mr-1 inline h-3 w-3" />
            Submitted{" "}
            {new Date(consultation.created_at).toLocaleString("en-NG", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </section>
        </aside>
      </div>
    </div>
  )
}

function Field({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div>
      <Label className="text-xs text-gray-500">{label}</Label>
      <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-gray-900">
        <span className="text-[#7B2D8E]">{icon}</span>
        <span className="truncate">{value}</span>
      </p>
    </div>
  )
}
