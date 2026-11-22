"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Loader2, Mail, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useNotify } from "@/components/shared/notify"
import { isPlaceholderEmail } from "@/lib/auth-onboarding"

interface StaffClientSummary {
  id: string
  firstName: string | null
  lastName: string | null
  email: string
  avatarUrl: string | null
}

function getInitials(first: string | null, last: string | null, email: string): string {
  const f = (first || "").trim()
  const l = (last || "").trim()
  if (f || l) return `${f[0] ?? ""}${l[0] ?? ""}`.toUpperCase()
  return (email || "C").slice(0, 2).toUpperCase()
}

export default function StaffEmailClientPage() {
  const params = useParams()
  const router = useRouter()
  const notify = useNotify()
  const clientId = params.id as string

  const [client, setClient] = useState<StaffClientSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")

  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [submitError, setSubmitError] = useState("")
  const [sending, setSending] = useState(false)

  const fetchClient = useCallback(async () => {
    setLoading(true)
    setLoadError("")
    try {
      const res = await fetch(`/api/staff/clients/${encodeURIComponent(clientId)}`, {
        cache: "no-store",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.client) {
        throw new Error(data?.error || "Could not load client")
      }
      setClient(data.client as StaffClientSummary)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load client")
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    fetchClient()
  }, [fetchClient])

  const backHref = `/staff/clients?client=${encodeURIComponent(clientId)}`

  const fullName = client
    ? [client.firstName, client.lastName].filter(Boolean).join(" ").trim() || client.email
    : "client"
  const hasDeliverableEmail = Boolean(client?.email && !isPlaceholderEmail(client.email))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) {
      setSubmitError("Please enter both a subject and a message.")
      return
    }
    setSending(true)
    setSubmitError("")
    try {
      const res = await fetch(`/api/staff/clients/${encodeURIComponent(clientId)}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        setSubmitError(data?.error || `Could not send email (HTTP ${res.status}).`)
        return
      }
      notify.success("Email sent", `Message delivered to ${data.sentTo || client?.email || "client"}.`)
      router.push(backHref)
    } catch {
      setSubmitError("Network error. Could not send email.")
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-6 w-6 animate-spin text-[#7B2D8E]" />
      </div>
    )
  }

  if (loadError || !client) {
    return (
      <div className="max-w-md mx-auto mt-16 rounded-2xl border border-gray-100 bg-white p-8 text-center">
        <div className="w-11 h-11 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="h-5 w-5 text-[#7B2D8E]" />
        </div>
        <h1 className="text-base font-semibold text-gray-900">
          {loadError || "Client not found"}
        </h1>
        <Link
          href="/staff/clients"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#7B2D8E] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to clients
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-[#7B2D8E] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to clients
        </Link>
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4 sm:px-6 sm:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            {client.avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={client.avatarUrl}
                alt={fullName}
                className="h-12 w-12 rounded-full object-cover ring-1 ring-[#7B2D8E]/10 flex-shrink-0"
              />
            ) : (
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#7B2D8E]/10 text-sm font-bold uppercase text-[#7B2D8E]">
                {getInitials(client.firstName, client.lastName, client.email)}
              </span>
            )}
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-gray-900 truncate">
                Email {fullName}
              </h1>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500 truncate">
                <Mail className="h-3.5 w-3.5 text-[#7B2D8E] flex-shrink-0" />
                <span className="truncate">
                  {hasDeliverableEmail
                    ? `To: ${client.email}`
                    : "No deliverable email address on file"}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {!hasDeliverableEmail ? (
            <div className="rounded-xl border border-gray-100 bg-[#FBF9FC] p-5 space-y-3">
              <p className="text-sm font-semibold text-gray-900">
                Cannot send email to this client
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                This client does not have a deliverable email address on file.
              </p>
              <Button variant="outline" asChild className="border-[#7B2D8E]/30 text-[#7B2D8E] hover:bg-[#7B2D8E]/5">
                <Link href={backHref}>Back to clients</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="staff-client-email-subject" className="text-xs font-medium text-gray-700">
                    Subject
                  </Label>
                  <span className="text-[11px] text-gray-400 tabular-nums">
                    {subject.length}/200
                  </span>
                </div>
                <Input
                  id="staff-client-email-subject"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Follow-up on your facial appointment"
                  maxLength={200}
                  className="h-10 border-gray-200 focus-visible:border-[#7B2D8E] focus-visible:ring-[#7B2D8E]/20"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="staff-client-email-message" className="text-xs font-medium text-gray-700">
                    Message
                  </Label>
                  <span className="text-[11px] text-gray-400 tabular-nums">
                    {message.length}/10,000
                  </span>
                </div>
                <Textarea
                  id="staff-client-email-message"
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={9}
                  maxLength={10000}
                  placeholder="Write a warm, clear note for the client..."
                  className="border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus-visible:border-[#7B2D8E] focus-visible:ring-[#7B2D8E]/20 resize-y leading-relaxed"
                />
                <p className="text-[11px] text-gray-500">
                  Delivered in Dermaspace&apos;s standard transactional email layout.
                </p>
              </div>

              {submitError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-3 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  asChild
                  className="border-gray-200 text-gray-700"
                >
                  <Link href={backHref}>Cancel</Link>
                </Button>
                <Button
                  type="submit"
                  disabled={sending || !subject.trim() || !message.trim()}
                  className="bg-[#7B2D8E] hover:bg-[#7B2D8E]/90 text-white gap-1.5"
                >
                  {sending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send email
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  )
}
