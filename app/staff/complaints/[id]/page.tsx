"use client"

/**
 * Staff › Support inbox › Ticket / Complaint detail
 *
 * The staff-side equivalent of /admin/complaints/[id]. Same data
 * sources, same conversation thread, same status / priority controls
 * — but it lives under the staff console layout (purple sidebar +
 * StaffTopBar) so the breadcrumbs, navigation and sign-out flow stay
 * inside the operator's surface instead of bouncing into the admin
 * console (which redirects staff back to /dashboard on every visit).
 *
 * Why duplicate the admin page instead of routing staff to /admin/...?
 *   • app/admin/layout.tsx hard-redirects `role === 'staff'` users to
 *     /dashboard — so reusing the admin detail route would be a dead
 *     link for receptionists.
 *   • The two surfaces are intentionally close (same APIs, same
 *     ReplyComposer) so an admin and a staff member auditing the
 *     same ticket see the same content and audit log.
 *
 * The only operational difference: the customer-facing "send as"
 * sender alias picker (Admin / Franca / Itunu) is HIDDEN here. Staff
 * members reply as themselves; only admins can sign as the salon
 * contact aliases.
 */

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  Mail,
  Phone,
  Clock,
  AlertTriangle,
  Ticket,
  Loader2,
  AlertCircle,
  Check,
  CircleDot,
  CircleDashed,
  CheckCircle2,
  XCircle,
  Flag,
  Flame,
  MessageSquare,
  UserCheck,
} from "lucide-react"
import ReplyComposer from "@/components/admin/reply-composer"
import { useAuth } from "@/hooks/use-auth"
import { useNotify } from "@/components/shared/notify"
import { cn } from "@/lib/utils"

interface Complaint {
  id: number
  name: string
  email: string
  phone: string | null
  subject: string | null
  message: string
  status: string
  priority: string
  category: string | null
  assigned_to: string | null
  assigned_first_name: string | null
  assigned_last_name: string | null
  created_at: string
  resolved_at: string | null
  source: "complaint" | "ticket"
  ticket_id: string | null
  customer_avatar_url?: string | null
}

interface Reply {
  id: string
  message: string
  is_internal: boolean
  /**
   * TRUE for replies authored by an admin / staff member, FALSE for the
   * customer's own messages on a ticket. This is what the conversation
   * timeline keys off to decide whether a bubble renders on the right
   * (staff) or left (customer). Without this flag every customer reply
   * was getting drawn as a staff reply because the API also returned a
   * customer name in `staff_first_name` — so the thread looked like a
   * one-sided staff monologue.
   */
  is_staff?: boolean
  created_at: string
  staff_first_name: string | null
  staff_last_name: string | null
  /** Customer's name for replies the customer authored. NULL on staff replies. */
  customer_first_name?: string | null
  customer_last_name?: string | null
  /**
   * Customer-facing sender alias on the reply (e.g. "Franca"). Always
   * null on staff-authored replies — staff reply as themselves.
   */
  sender_display_name?: string | null
  /** Responder's resolved portrait URL (uploaded or role default). NULL on customer replies. */
  author_avatar_url?: string | null
}

const initialsFor = (name: string) => {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-NG", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

export default function StaffComplaintDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = params.id as string
  const source = (searchParams.get("source") || "complaint") as
    | "ticket"
    | "complaint"

  const { user: currentUser } = useAuth()
  const notify = useNotify()
  const defaultSenderName = currentUser
    ? `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() ||
      "Staff"
    : "Staff"

  const [complaint, setComplaint] = useState<Complaint | null>(null)
  const [replies, setReplies] = useState<Reply[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [updating, setUpdating] = useState(false)
  const [replyMessage, setReplyMessage] = useState("")
  const [isInternal, setIsInternal] = useState(false)
  const [sending, setSending] = useState(false)
  const [assigning, setAssigning] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      // cache: 'no-store' is critical — Next data cache will otherwise
      // serve a snapshot taken before the staff member's last reply
      // and the thread will look empty after a refresh.
      const res = await fetch(`/api/admin/complaints/${id}?source=${source}`, {
        cache: "no-store",
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || "Failed to load")
      }
      const body = await res.json()
      setComplaint(body.complaint)

      const repliesRes = await fetch(
        `/api/admin/reply?requestType=${source}&requestId=${id}`,
        { cache: "no-store" },
      )
      if (repliesRes.ok) {
        const repliesBody = await repliesRes.json()
        setReplies(repliesBody.replies || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [id, source])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const handleUpdate = async (
    action: "update_status" | "update_priority",
    value: string,
  ) => {
    if (!complaint) return
    const field = action === "update_status" ? "status" : "priority"
    const previous = complaint[field]
    setUpdating(true)
    // Optimistic update — pop the new pill immediately so the
    // operator's click registers without a round-trip flash.
    setComplaint({ ...complaint, [field]: value })
    try {
      const res = await fetch("/api/admin/complaints", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaintId: complaint.id,
          action,
          value,
          source: complaint.source,
        }),
      })
      if (!res.ok) throw new Error("failed")
      const human = value.replace(/_/g, " ")
      if (field === "status") {
        notify.success(
          `Status set to ${human}`,
          value === "resolved" || value === "closed"
            ? "The customer will be notified by email."
            : "The ticket has been updated.",
        )
      } else {
        notify.success(`Priority set to ${human}`, "Saved.")
      }
    } catch {
      // Roll back the optimistic change and surface the failure.
      setComplaint({ ...complaint, [field]: previous })
      notify.error(
        `Could not update ${field}`,
        "Please try again in a moment.",
      )
    } finally {
      setUpdating(false)
    }
  }

  // Quick "Assign to me" action — only meaningful for complaint rows
  // (the admin API ignores assignment on tickets because support_tickets
  // has no assigned_to column yet). We hide the button on ticket rows
  // rather than render a dead one.
  const handleAssignToMe = async () => {
    if (!complaint || !currentUser || complaint.source !== "complaint") return
    setAssigning(true)
    const previousAssigned = complaint.assigned_to
    setComplaint({
      ...complaint,
      assigned_to: currentUser.id,
      assigned_first_name: currentUser.firstName || "",
      assigned_last_name: currentUser.lastName || "",
    })
    try {
      const res = await fetch("/api/admin/complaints", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaintId: complaint.id,
          action: "assign",
          value: currentUser.id,
          source: complaint.source,
        }),
      })
      if (!res.ok) throw new Error("failed")
      notify.success("Assigned to you", "You are now the owner of this ticket.")
    } catch {
      setComplaint((prev) =>
        prev ? { ...prev, assigned_to: previousAssigned } : prev,
      )
      notify.error("Could not assign", "Please try again.")
    } finally {
      setAssigning(false)
    }
  }

  const handleSendReply = async () => {
    if (!complaint || !replyMessage.trim()) return

    // Optimistic insertion — drop the reply into the thread the instant
    // the staff member hits Send. We assign a temporary string id,
    // append, then reconcile against the server once the POST returns.
    // On failure we roll the row back and restore the draft.
    const draft = replyMessage.trim()
    const wasInternal = isInternal
    const tempId = `temp-${Date.now()}`
    const optimistic: Reply = {
      id: tempId,
      message: draft,
      is_internal: wasInternal,
      is_staff: true,
      created_at: new Date().toISOString(),
      staff_first_name: currentUser?.firstName || "You",
      staff_last_name: currentUser?.lastName || "",
      customer_first_name: null,
      customer_last_name: null,
      sender_display_name: null,
    }

    setSending(true)
    setReplyMessage("")
    setReplies((prev) => [...prev, optimistic])

    try {
      const res = await fetch("/api/admin/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: complaint.source,
          requestId: complaint.id,
          ticketCode: complaint.ticket_id || undefined,
          userEmail: complaint.email,
          message: draft,
          isInternal: wasInternal,
          // Staff always sign as themselves — the alias picker is
          // hidden on the staff console (allowSenderPicker={false}).
        }),
      })
      if (!res.ok) throw new Error("Failed to send reply")

      // Refetch the authoritative thread. Merge with the optimistic
      // row so the staff member's reply never visually vanishes after
      // Send, even on a stale read (replication lag, etc).
      const repliesRes = await fetch(
        `/api/admin/reply?requestType=${complaint.source}&requestId=${complaint.id}`,
        { cache: "no-store" },
      )
      if (repliesRes.ok) {
        const body = await repliesRes.json()
        const serverReplies: Reply[] = body.replies || []
        const optimisticAt = new Date(optimistic.created_at).getTime()
        const matched = serverReplies.some(
          (r) =>
            r.message === optimistic.message &&
            r.is_internal === optimistic.is_internal &&
            Math.abs(new Date(r.created_at).getTime() - optimisticAt) <
              5 * 60_000,
        )
        if (matched) {
          setReplies(serverReplies)
        } else {
          setReplies((prev) => {
            const tempRow = prev.find((r) => r.id === tempId) ?? optimistic
            const serverIds = new Set(serverReplies.map((r) => String(r.id)))
            const merged = [
              ...serverReplies,
              ...(serverIds.has(tempId) ? [] : [tempRow]),
            ]
            return merged.sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime(),
            )
          })
        }
      }
    } catch {
      setReplies((prev) => prev.filter((r) => r.id !== tempId))
      setReplyMessage(draft)
      setIsInternal(wasInternal)
      notify.error("Reply not sent", "Please try again in a moment.")
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 text-[#7B2D8E] animate-spin" />
      </div>
    )
  }

  if (error || !complaint) {
    return (
      <div className="max-w-md mx-auto mt-16 rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-5 h-5 text-[#7B2D8E]" />
        </div>
        <h2 className="text-base font-semibold text-gray-900 mb-1">
          Unable to load
        </h2>
        <p className="text-sm text-gray-500 mb-4">{error || "Unknown error"}</p>
        <button
          onClick={() => router.push("/staff/complaints")}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#7B2D8E] text-white text-sm font-medium hover:bg-[#5A1D6A] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to inbox
        </button>
      </div>
    )
  }

  const assignedToMe =
    currentUser?.id && complaint.assigned_to === currentUser.id
  const canAssign = complaint.source === "complaint"

  return (
    <div className="space-y-5">
      {/* Breadcrumb — kept inside /staff so the operator stays in their
          own console (admin layout would redirect them out). */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/staff/complaints"
          className="inline-flex items-center gap-1 text-gray-500 hover:text-[#7B2D8E] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Support inbox
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium truncate">
          {complaint.source === "ticket"
            ? complaint.ticket_id || `Ticket #${complaint.id}`
            : `Complaint #${complaint.id}`}
        </span>
      </div>

      {/* Customer header card. Initials avatar (no Sparkles, no
          decorative imagery) on the brand-tinted disc, name + source
          badge + assignment chip, and contact line beneath. */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div
            aria-hidden="true"
            className="w-12 h-12 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0 overflow-hidden"
          >
            {complaint.customer_avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={complaint.customer_avatar_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-lg font-semibold text-[#7B2D8E]">
                {initialsFor(complaint.name)}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-900 truncate">
                {complaint.name || "Anonymous"}
              </h1>
              {complaint.source === "ticket" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#7B2D8E]/10 px-2 py-0.5 text-[11px] font-semibold text-[#7B2D8E] ring-1 ring-[#7B2D8E]/20">
                  <Ticket className="w-3 h-3" />
                  {complaint.ticket_id || "Ticket"}
                </span>
              )}
              {complaint.assigned_to && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700 ring-1 ring-gray-200">
                  <UserCheck className="w-3 h-3" />
                  {assignedToMe
                    ? "Assigned to you"
                    : `Assigned to ${
                        [
                          complaint.assigned_first_name,
                          complaint.assigned_last_name,
                        ]
                          .filter(Boolean)
                          .join(" ") || "a teammate"
                      }`}
                </span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
              {complaint.email && (
                <a
                  href={`mailto:${complaint.email}`}
                  className="inline-flex items-center gap-1.5 hover:text-[#7B2D8E] transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  {complaint.email}
                </a>
              )}
              {complaint.phone && (
                <a
                  href={`tel:${complaint.phone}`}
                  className="inline-flex items-center gap-1.5 hover:text-[#7B2D8E] transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {complaint.phone}
                </a>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {formatDateTime(complaint.created_at)}
              </span>
            </div>
          </div>
          {canAssign && !assignedToMe && (
            <button
              onClick={handleAssignToMe}
              disabled={assigning}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[#7B2D8E] text-white text-xs font-semibold px-3 py-1.5 hover:bg-[#5A1D6A] disabled:opacity-60 transition-colors"
            >
              {assigning ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <UserCheck className="w-3 h-3" />
              )}
              Assign to me
            </button>
          )}
        </div>

        {/* Status + Priority pickers — same flat segmented control used
            on the admin detail page. Brand purple radio dot, no
            gradients, hairline borders. */}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <SegmentedPicker
            label="Status"
            value={complaint.status}
            disabled={updating}
            onChange={(v) => handleUpdate("update_status", v)}
            options={STATUS_TILES}
          />
          <SegmentedPicker
            label="Priority"
            value={complaint.priority}
            disabled={updating}
            onChange={(v) => handleUpdate("update_priority", v)}
            options={PRIORITY_TILES}
          />
        </div>

        {canAssign && !assignedToMe && (
          <button
            onClick={handleAssignToMe}
            disabled={assigning}
            className="sm:hidden mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#7B2D8E] text-white text-sm font-semibold px-4 py-2.5 hover:bg-[#5A1D6A] disabled:opacity-60 transition-colors"
          >
            {assigning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserCheck className="w-4 h-4" />
            )}
            Assign to me
          </button>
        )}
      </section>

      {/* Original message — rendered as the first bubble in the
          conversation timeline so the operator reads top-down without
          context-switching. */}
      <section className="rounded-2xl border border-gray-200 bg-white">
        <header className="border-b border-gray-100 px-5 sm:px-6 py-3 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#7B2D8E]" />
          <h2 className="text-sm font-semibold text-gray-900">
            {complaint.subject || "Conversation"}
          </h2>
          <span className="ml-auto text-[11px] text-gray-500">
            {replies.length}{" "}
            {replies.length === 1 ? "reply" : "replies"}
          </span>
        </header>
        <div className="p-5 sm:p-6 space-y-3">
          {/* Customer's original message — gray bubble, left-aligned */}
          <ConversationBubble
            side="left"
            initials={initialsFor(complaint.name)}
            name={complaint.name || "Customer"}
            timestamp={complaint.created_at}
            message={complaint.message}
            variant="customer"
          />

          {/* Replies — staff replies right-aligned (brand-tinted),
              internal notes amber-tinted, customer responses left
              -aligned in neutral gray. */}
          {replies.map((reply) => {
            // Use the explicit `is_staff` flag from the API. The
            // previous heuristic ("does it have a staff_first_name?")
            // misclassified every customer reply as a staff reply
            // because the SELECT used to project the customer's own
            // name into staff_first_name — that's why customer
            // responses never showed up in the thread.
            const isStaffReply = reply.is_staff !== false &&
              (reply.is_staff === true ||
                !!(reply.staff_first_name || reply.staff_last_name))
            const staffName =
              [reply.staff_first_name, reply.staff_last_name]
                .filter(Boolean)
                .join(" ") || "Support"
            const customerName =
              [reply.customer_first_name, reply.customer_last_name]
                .filter(Boolean)
                .join(" ") || complaint.name || "Customer"
            const name = isStaffReply ? staffName : customerName
            return (
              <ConversationBubble
                key={reply.id}
                side={isStaffReply ? "right" : "left"}
                initials={initialsFor(name)}
                avatarUrl={isStaffReply ? reply.author_avatar_url ?? null : null}
                name={name}
                timestamp={reply.created_at}
                message={reply.message}
                variant={
                  reply.is_internal
                    ? "internal"
                    : isStaffReply
                      ? "staff"
                      : "customer"
                }
                badge={reply.is_internal ? "Internal note" : undefined}
              />
            )
          })}
        </div>
      </section>

      {/* Reply composer — shared component. Sender alias picker hidden
          on the staff console (staff sign as themselves); internal
          note toggle still available so a staff member can drop a
          private note for the next operator on shift. */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <ReplyComposer
          value={replyMessage}
          onChange={setReplyMessage}
          isInternal={isInternal}
          onIsInternalChange={setIsInternal}
          senderName={defaultSenderName}
          onSenderNameChange={() => {
            /* alias picker disabled on staff console */
          }}
          defaultSenderName={defaultSenderName}
          sending={sending}
          onSend={handleSendReply}
          aiContext={`Replying to ${complaint.subject || "a customer enquiry"}.`}
          allowSenderPicker={false}
        />
      </section>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   Conversation bubble — Intercom-style left/right alignment
   ────────────────────────────────────────────────────────────── */
function ConversationBubble({
  side,
  initials,
  avatarUrl,
  name,
  timestamp,
  message,
  variant,
  badge,
}: {
  side: "left" | "right"
  initials: string
  avatarUrl?: string | null
  name: string
  timestamp: string
  message: string
  variant: "customer" | "staff" | "internal"
  badge?: string
}) {
  const isStaff = variant === "staff"
  const isInternal = variant === "internal"
  return (
    <div
      className={cn(
        "flex gap-3",
        side === "right" ? "flex-row-reverse" : "flex-row",
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-semibold overflow-hidden",
          isStaff
            ? "bg-[#7B2D8E] text-white ring-2 ring-[#7B2D8E]/15"
            : isInternal
              ? "bg-amber-100 text-amber-800 ring-1 ring-amber-200"
              : "bg-gray-100 text-gray-700 ring-1 ring-gray-200",
        )}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initials
        )}
      </div>
      <div
        className={cn(
          "max-w-[80%] min-w-0",
          side === "right" ? "items-end text-right" : "items-start",
          "flex flex-col",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2 text-[11px] text-gray-500 mb-1",
            side === "right" ? "flex-row-reverse" : "flex-row",
          )}
        >
          <span className="font-semibold text-gray-700 truncate max-w-[160px]">
            {name}
          </span>
          {badge && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 ring-1 ring-amber-200 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider">
              <AlertTriangle className="w-2.5 h-2.5" />
              {badge}
            </span>
          )}
          <time dateTime={timestamp}>{formatDateTime(timestamp)}</time>
        </div>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words",
            isStaff
              ? "bg-[#7B2D8E] text-white rounded-tr-sm"
              : isInternal
                ? "bg-amber-50 text-amber-950 ring-1 ring-amber-200 rounded-tl-sm"
                : "bg-gray-50 text-gray-900 ring-1 ring-gray-200 rounded-tl-sm",
          )}
        >
          {message}
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   Status & Priority pickers — same flat segmented control used by
   /admin/complaints/[id] so the two surfaces feel identical for any
   teammate auditing the same ticket from either console.
   ────────────────────────────────────────────────────────────── */
type PickerOption = {
  value: string
  label: string
  Icon: React.ComponentType<{ className?: string }>
}

const STATUS_TILES: PickerOption[] = [
  { value: "open", label: "Open", Icon: CircleDashed },
  { value: "in_progress", label: "In progress", Icon: CircleDot },
  { value: "resolved", label: "Resolved", Icon: CheckCircle2 },
  { value: "closed", label: "Closed", Icon: XCircle },
]

const PRIORITY_TILES: PickerOption[] = [
  { value: "low", label: "Low", Icon: Flag },
  { value: "normal", label: "Normal", Icon: Flag },
  { value: "high", label: "High", Icon: AlertTriangle },
  { value: "urgent", label: "Urgent", Icon: Flame },
]

function SegmentedPicker({
  label,
  value,
  disabled,
  onChange,
  options,
}: {
  label: string
  value: string
  disabled: boolean
  onChange: (value: string) => void
  options: PickerOption[]
}) {
  return (
    <fieldset className="rounded-2xl border border-gray-200 bg-white p-1.5">
      <legend className="px-2 pt-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
        {label}
      </legend>
      <ul className="mt-1 flex flex-col">
        {options.map(({ value: v, label: optionLabel, Icon }) => {
          const active = value === v
          return (
            <li key={v}>
              <button
                type="button"
                onClick={() => onChange(v)}
                disabled={disabled || active}
                aria-pressed={active}
                className={cn(
                  "w-full flex items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors",
                  active
                    ? "bg-[#7B2D8E]/[0.06] text-gray-900"
                    : "text-gray-700 hover:bg-gray-50 disabled:hover:bg-transparent",
                  "disabled:cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2D8E]/30",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
                    active
                      ? "bg-[#7B2D8E]/15 text-[#7B2D8E]"
                      : "bg-gray-100 text-gray-500",
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <span
                  className={cn(
                    "flex-1 text-sm leading-tight",
                    active ? "font-semibold" : "font-medium",
                  )}
                >
                  {optionLabel}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-colors",
                    active
                      ? "bg-[#7B2D8E] text-white"
                      : "border border-gray-300 bg-white",
                  )}
                >
                  {active && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </fieldset>
  )
}
