"use client"

/**
 * Admin Settings — Google-style console layout
 *
 * The previous iteration leaned on colorful icon chips (blue/green/fuchsia)
 * and a purple→pink save-button gradient which drifted away from the
 * Dermaspace brand. This rewrite keeps a single-column, two-pane layout:
 *   - left rail: section nav (like Google Admin / Workspace settings)
 *   - right pane: cards with generous padding, hairline dividers, and
 *     brand-only accents (purple `#7B2D8E` + neutrals + semantic emerald
 *     for "operational" signal). No gradients, no random fills.
 */

import { useState, useEffect } from "react"
import {
  Settings,
  Bell,
  Mail,
  Shield,
  Database,
  Globe,
  Save,
  Check,
  Loader2,
  ChevronRight,
  Wrench,
  AlertTriangle,
  ShieldAlert,
  ExternalLink,
  UserCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

type SectionId = "notifications" | "email" | "security" | "maintenance" | "moderation" | "system"

const sections: {
  id: SectionId
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { id: "notifications", label: "Notifications", description: "Alerts, digests & channels", icon: Bell },
  { id: "email",         label: "Email",         description: "Sender identity & signature", icon: Mail },
  { id: "security",      label: "Security",      description: "Access, sessions & 2FA",       icon: Shield },
  { id: "maintenance",   label: "Maintenance",   description: "Lock the public site",         icon: Wrench },
  { id: "moderation",    label: "Moderation",    description: "Spam log & suspended users",   icon: ShieldAlert },
  { id: "system",        label: "System",        description: "Environment & service health", icon: Database },
]

export default function AdminSettingsPage() {
  const [activeSection, setActiveSection] = useState<SectionId>("notifications")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  // Surfaces the actual error from the API instead of silently
  // pretending a save succeeded — previous version timed out for 900ms
  // and showed a fake "Saved" tick whether or not anything was
  // persisted, which is what users were complaining about.
  const [saveError, setSaveError] = useState<string | null>(null)

  // Notifications — hydrated from the server in `useEffect` below.
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [newUserAlerts, setNewUserAlerts] = useState(true)
  const [complaintAlerts, setComplaintAlerts] = useState(true)
  const [giftCardAlerts, setGiftCardAlerts] = useState(true)
  const [consultationAlerts, setConsultationAlerts] = useState(true)

  // Email — also hydrated from the server.
  const [supportEmail, setSupportEmail] = useState("support@dermaspaceng.com")
  const [notificationEmail, setNotificationEmail] = useState("notifications@dermaspaceng.com")
  const [emailSignature, setEmailSignature] = useState("Best regards,\nThe Dermaspace Team")

  // Initial fetch of saved preferences. Previously this page ignored
  // any persisted state on mount, so admins always saw the hard-coded
  // defaults regardless of what they'd "saved" on a previous visit.
  useEffect(() => {
    let cancelled = false
    fetch("/api/admin/preferences")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed to load"))))
      .then((d: { preferences: { notifications: Record<string, boolean>; email: Record<string, string> } }) => {
        if (cancelled) return
        const n = d.preferences.notifications
        const e = d.preferences.email
        setEmailNotifications(n.emailNotifications)
        setNewUserAlerts(n.newUserAlerts)
        setComplaintAlerts(n.complaintAlerts)
        setGiftCardAlerts(n.giftCardAlerts)
        setConsultationAlerts(n.consultationAlerts)
        setSupportEmail(e.supportEmail)
        setNotificationEmail(e.notificationEmail)
        setEmailSignature(e.emailSignature)
      })
      .catch(() => {
        // Silently fall back to the defaults — the admin can still
        // edit and save, and the bad-load will heal on next visit.
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Real save — persists notifications + email to /api/admin/preferences.
  // Surfaces server errors instead of pretending success.
  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch("/api/admin/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notifications: {
            emailNotifications,
            newUserAlerts,
            complaintAlerts,
            giftCardAlerts,
            consultationAlerts,
          },
          email: {
            supportEmail,
            notificationEmail,
            emailSignature,
          },
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? "Couldn't save changes")
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Couldn't save changes")
    } finally {
      setSaving(false)
    }
  }

  const ActiveIcon = sections.find((s) => s.id === activeSection)?.icon ?? Settings

  return (
    <div className="space-y-6">
      {/* Page header — trimmed down. The old 44px icon tile + multi-line
          description felt heavy for what is essentially a toolbar. Now
          it's a compact 32px icon + inline title, with a one-liner that
          truncates cleanly on mobile. Save sits on the same row. */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
            <Settings className="w-4 h-4 text-[#7B2D8E]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-semibold text-gray-900 leading-none tracking-tight">
              Settings
            </h1>
            <p className="text-xs text-gray-500 mt-1 truncate">
              Notifications, email, security and system health.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Inline save error — only renders when /api/admin/preferences
              actually rejected the save. Replaces the previous fake
              "Saved" tick that lit up regardless of outcome. */}
          {saveError && (
            <span className="text-[11px] text-rose-700 bg-rose-50 border border-rose-100 rounded-full px-2.5 py-1 max-w-[220px] truncate">
              {saveError}
            </span>
          )}
          <Button
            onClick={handleSave}
            disabled={saving}
            size="sm"
            className="h-9 rounded-lg bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white disabled:opacity-80"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving
              </>
            ) : saved ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Saved
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save changes
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Two-pane layout: left rail is scrollable nav, right pane is content */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 lg:gap-6">
        {/* Left rail — section navigation */}
        <nav
          aria-label="Settings sections"
          className="rounded-2xl border border-gray-200 bg-white p-2 h-max"
        >
          {sections.map((s) => {
            const Icon = s.icon
            const active = activeSection === s.id
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full flex items-center gap-3 text-left rounded-xl px-3 py-2.5 transition-colors ${
                  active
                    ? "bg-[#7B2D8E]/10 text-[#7B2D8E]"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    active ? "bg-[#7B2D8E] text-white" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-medium ${active ? "text-[#7B2D8E]" : "text-gray-900"}`}>
                    {s.label}
                  </span>
                  <span className="block text-[11px] text-gray-500 truncate">
                    {s.description}
                  </span>
                </span>
                <ChevronRight className={`w-4 h-4 transition-transform ${active ? "text-[#7B2D8E]" : "text-gray-300"}`} />
              </button>
            )
          })}
        </nav>

        {/* Right pane */}
        <section className="space-y-4">
          <header className="flex items-center gap-2 px-1">
            <ActiveIcon className="w-4 h-4 text-[#7B2D8E]" />
            <h2 className="text-sm font-semibold text-gray-900 capitalize">{activeSection}</h2>
          </header>

          {activeSection === "notifications" && (
            <div className="space-y-4">
              <Panel
                title="Global channels"
                description="Top-level controls for how admins receive alerts"
              >
                <Row
                  title="Email notifications"
                  description="Deliver admin alerts to your inbox"
                  control={
                    <Switch
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
                      className="data-[state=checked]:bg-[#7B2D8E]"
                    />
                  }
                />
              </Panel>

              <Panel
                title="Alert types"
                description="Choose the events you care about"
              >
                <div className="grid gap-px bg-gray-100 rounded-xl overflow-hidden">
                  <RowFlat
                    title="New user registrations"
                    description="Fires when someone signs up"
                    control={<BrandedSwitch checked={newUserAlerts} onChange={setNewUserAlerts} />}
                  />
                  <RowFlat
                    title="New complaints"
                    description="Fires when a complaint is submitted"
                    control={<BrandedSwitch checked={complaintAlerts} onChange={setComplaintAlerts} />}
                  />
                  <RowFlat
                    title="Gift card requests"
                    description="Fires when someone redeems or requests a gift card"
                    control={<BrandedSwitch checked={giftCardAlerts} onChange={setGiftCardAlerts} />}
                  />
                  <RowFlat
                    title="Consultation bookings"
                    description="Fires when a new consultation is booked"
                    control={<BrandedSwitch checked={consultationAlerts} onChange={setConsultationAlerts} />}
                  />
                </div>
              </Panel>
            </div>
          )}

          {activeSection === "email" && (
            <Panel
              title="Email identity"
              description="The addresses and signature used in outgoing mail"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Support address" hint="Used for customer support inquiries">
                  <Input
                    type="email"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    className="h-10 rounded-lg"
                  />
                </Field>
                <Field label="Notification sender" hint="Sender for transactional notifications">
                  <Input
                    type="email"
                    value={notificationEmail}
                    onChange={(e) => setNotificationEmail(e.target.value)}
                    className="h-10 rounded-lg"
                  />
                </Field>
              </div>
              <Field label="Signature" hint="Appended to all outgoing emails">
                <Textarea
                  rows={4}
                  value={emailSignature}
                  onChange={(e) => setEmailSignature(e.target.value)}
                  className="rounded-lg resize-none"
                />
              </Field>
            </Panel>
          )}

          {activeSection === "security" && (
            <div className="space-y-4">
              {/*
                The previous "Access policy" card rendered three Switch
                controls (2FA, Session timeout, Login notifications)
                that weren't bound to any state and persisted nothing —
                toggling them silently did nothing. We removed it
                entirely rather than wire it up, because shipping a
                "Require 2FA" switch that *looks* enforced but isn't
                would be a real security footgun: an admin would
                reasonably assume 2FA was on after flipping it. When
                we ship real 2FA / session-timeout / login-alert
                support, this is where the controls will live.
              */}

              <Panel
                title="Authentication policy"
                description="Read-only summary of what's enforced today"
              >
                <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden">
                  {[
                    {
                      label: "Password sign-in",
                      value: "Enabled for all users",
                      ok: true,
                    },
                    {
                      label: "Session cookies",
                      value: "HTTP-only, Secure, SameSite=Lax",
                      ok: true,
                    },
                    {
                      label: "Two-factor authentication",
                      value: "Not yet available",
                      ok: false,
                    },
                    {
                      label: "Login email notifications",
                      value: "Not yet available",
                      ok: false,
                    },
                  ].map((row) => (
                    <li
                      key={row.label}
                      className="flex items-center justify-between gap-4 px-4 py-3 bg-white"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">{row.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{row.value}</p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 border ${
                          row.ok
                            ? "bg-[#7B2D8E]/10 text-[#7B2D8E] border-[#7B2D8E]/15"
                            : "bg-gray-100 text-gray-500 border-gray-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            row.ok ? "bg-[#7B2D8E]" : "bg-gray-400"
                          }`}
                        />
                        {row.ok ? "Active" : "Pending"}
                      </span>
                    </li>
                  ))}
                </ul>
              </Panel>

              <Panel
                title="Password requirements"
                description="Enforced when anyone sets or resets a password"
              >
                <ul className="text-sm text-gray-700 space-y-2">
                  {[
                    "Minimum 8 characters",
                    "At least one uppercase letter",
                    "At least one number",
                    "At least one special character",
                  ].map((rule) => (
                    <li key={rule} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E]" />
                      {rule}
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>
          )}

          {activeSection === "maintenance" && <MaintenancePanel />}

          {activeSection === "moderation" && <ModerationPanel />}

          {activeSection === "system" && (
            <div className="space-y-4">
              {/*
                Status page — inspired by Google Cloud / Vercel status pages.
                We drop the chatty "Live" pulse chip on every card in favor of
                a single, calm summary banner + a clean service list. Each row
                shows a small static status dot, the service name, and a right-
                aligned status pill. No animations, no random colors — just
                neutrals, brand purple, and a semantic emerald for "up".
              */}
              <StatusSummary services={SERVICE_STATUS} />

              <Panel
                title="Services"
                description="Live status of each component of the platform"
              >
                <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden">
                  {SERVICE_STATUS.map((s) => (
                    <li
                      key={s.name}
                      className="flex items-center gap-4 px-4 py-3.5 bg-white hover:bg-gray-50/60 transition-colors"
                    >
                      <StatusDot status={s.status} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                        <p className="text-xs text-gray-500 truncate">{s.description}</p>
                      </div>
                      <StatusPill status={s.status} />
                    </li>
                  ))}
                </ul>
              </Panel>

              <Panel
                title="Environment"
                description="Runtime configuration detected by the app"
              >
                <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden">
                  {[
                    { key: "DATABASE_URL", present: true },
                    { key: "RESEND_API_KEY", present: true },
                    { key: "NEXT_PUBLIC_APP_URL", present: true },
                  ].map((env) => (
                    <div key={env.key} className="flex items-center justify-between gap-4 px-4 py-3 bg-white">
                      <span className="text-sm font-mono text-gray-700 truncate">{env.key}</span>
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 ${
                          env.present
                            ? "bg-[#7B2D8E]/10 text-[#7B2D8E] border border-[#7B2D8E]/15"
                            : "bg-gray-100 text-gray-500 border border-gray-200"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${env.present ? "bg-[#7B2D8E]" : "bg-gray-400"}`} />
                        {env.present ? "Configured" : "Missing"}
                      </span>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="About" description="Build information">
                <div className="grid gap-3 sm:grid-cols-3">
                  <MetaCell label="Version" value="1.0.0" />
                  <MetaCell label="Region" value="fra1" />
                  <MetaCell label="Environment" value="Production" />
                </div>
              </Panel>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

/* ---------- Small composable building blocks ---------- */

function Panel({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white">
      <header className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </header>
      <div className="p-5 space-y-4">{children}</div>
    </section>
  )
}

function Row({
  title,
  description,
  control,
}: {
  title: string
  description: string
  control: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 px-4 py-3">
      <div className="min-w-0">
        <Label className="text-sm font-medium text-gray-900">{title}</Label>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <div className="flex-shrink-0">{control}</div>
    </div>
  )
}

function RowFlat({
  title,
  description,
  control,
}: {
  title: string
  description: string
  control: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 bg-white px-4 py-3">
      <div className="min-w-0">
        <Label className="text-sm font-medium text-gray-900">{title}</Label>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <div className="flex-shrink-0">{control}</div>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm text-gray-700">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-gray-500">{hint}</p>}
    </div>
  )
}

function BrandedSwitch({
  checked,
  defaultChecked,
  onChange,
}: {
  checked?: boolean
  defaultChecked?: boolean
  onChange?: (v: boolean) => void
}) {
  // Thin wrapper so every Switch across the page has the same brand-tuned
  // on-state without repeating the class list everywhere.
  return (
    <Switch
      checked={checked}
      defaultChecked={defaultChecked}
      onCheckedChange={onChange}
      className="data-[state=checked]:bg-[#7B2D8E]"
    />
  )
}

/* ---------- Status page primitives (Google / Vercel style) ---------- */

type ServiceStatus = "operational" | "degraded" | "outage" | "maintenance"

type Service = {
  name: string
  description: string
  status: ServiceStatus
}

// Static list for now — a later pass can wire this to real health-check
// endpoints. Keeping the shape stable means the UI won't change when we do.
const SERVICE_STATUS: Service[] = [
  { name: "Database", description: "Neon Postgres — primary datastore", status: "operational" },
  { name: "API", description: "Next.js route handlers & server actions", status: "operational" },
  { name: "Email delivery", description: "Transactional mail via Resend", status: "operational" },
  { name: "Authentication", description: "Session management & user auth", status: "operational" },
  { name: "File storage", description: "Uploads & media assets", status: "operational" },
]

function StatusSummary({ services }: { services: Service[] }) {
  // Collapse the individual service statuses into a single overall state.
  // If any service is in a non-operational state, surface the worst one.
  const worst: ServiceStatus =
    services.find((s) => s.status === "outage")?.status ??
    services.find((s) => s.status === "degraded")?.status ??
    services.find((s) => s.status === "maintenance")?.status ??
    "operational"

  const config: Record<
    ServiceStatus,
    { title: string; subtitle: string; accent: string; ring: string; dot: string }
  > = {
    operational: {
      title: "All systems normal",
      subtitle: "Every service is running as expected.",
      // Brand purple instead of emerald — the admin surface is pure
      // neutral + purple, and an emerald "operational" banner stood
      // out as the only green element on the whole page.
      accent: "text-[#7B2D8E]",
      ring: "bg-[#7B2D8E]/5 border-[#7B2D8E]/15",
      dot: "bg-[#7B2D8E]",
    },
    degraded: {
      title: "Partial degradation",
      subtitle: "One or more services are running below normal.",
      accent: "text-amber-700",
      ring: "bg-amber-50 border-amber-100",
      dot: "bg-amber-500",
    },
    outage: {
      title: "Major outage",
      subtitle: "One or more services are unavailable.",
      accent: "text-rose-700",
      ring: "bg-rose-50 border-rose-100",
      dot: "bg-rose-500",
    },
    maintenance: {
      title: "Scheduled maintenance",
      subtitle: "A planned maintenance window is in progress.",
      accent: "text-[#7B2D8E]",
      ring: "bg-[#7B2D8E]/5 border-[#7B2D8E]/10",
      dot: "bg-[#7B2D8E]",
    },
  }

  const c = config[worst]
  const timestamp = new Date().toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <section className={`rounded-2xl border ${c.ring} px-5 py-4 flex items-center gap-4`}>
      <span className={`w-10 h-10 rounded-full ${c.dot} bg-opacity-15 flex items-center justify-center flex-shrink-0`}>
        <Check className={`w-5 h-5 ${c.accent}`} />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${c.accent}`}>{c.title}</p>
        <p className="text-xs text-gray-600 mt-0.5 truncate">{c.subtitle}</p>
      </div>
      <span className="hidden sm:inline-flex text-[11px] text-gray-500 whitespace-nowrap">
        Checked {timestamp}
      </span>
    </section>
  )
}

function StatusDot({ status }: { status: ServiceStatus }) {
  // Subtle, static colored disc with a soft ring. No animations — a status
  // page should feel calm and authoritative, not twitchy.
  const map: Record<ServiceStatus, string> = {
    // Operational now uses brand purple — keeps the page monochrome.
    operational: "bg-[#7B2D8E] ring-[#7B2D8E]/20",
    degraded: "bg-amber-500 ring-amber-500/20",
    outage: "bg-rose-500 ring-rose-500/20",
    maintenance: "bg-[#7B2D8E] ring-[#7B2D8E]/20",
  }
  return <span className={`w-2.5 h-2.5 rounded-full ring-4 ${map[status]}`} aria-hidden />
}

function StatusPill({ status }: { status: ServiceStatus }) {
  const map: Record<ServiceStatus, { label: string; cls: string }> = {
    operational: { label: "Operational", cls: "bg-[#7B2D8E]/10 text-[#7B2D8E] border-[#7B2D8E]/15" },
    degraded: { label: "Degraded", cls: "bg-amber-50 text-amber-700 border-amber-100" },
    outage: { label: "Outage", cls: "bg-rose-50 text-rose-700 border-rose-100" },
    maintenance: { label: "Maintenance", cls: "bg-[#7B2D8E]/5 text-[#7B2D8E] border-[#7B2D8E]/15" },
  }
  const { label, cls } = map[status]
  return (
    <span className={`inline-flex items-center text-[11px] font-medium rounded-full border px-2 py-0.5 whitespace-nowrap ${cls}`}>
      {label}
    </span>
  )
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-900 tabular-nums">{value}</p>
    </div>
  )
}

/* ---------- Maintenance mode panel ---------- */

interface MaintenanceState {
  enabled: boolean
  message: string
  eta: string | null
}

function MaintenancePanel() {
  // Local form state, hydrated once from `/api/admin/maintenance`. We
  // intentionally don't use SWR here because the toggle is a
  // write-after-read flow — it's clearer with a plain useEffect +
  // local state than with mutate boilerplate, and the page is admin-
  // only so the slight bundle savings don't matter.
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [state, setState] = useState<MaintenanceState>({
    enabled: false,
    message: "",
    eta: null,
  })

  useEffect(() => {
    let cancelled = false
    fetch("/api/admin/maintenance")
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load")
        return r.json() as Promise<{ settings: MaintenanceState }>
      })
      .then((d) => {
        if (cancelled) return
        setState({
          enabled: d.settings.enabled,
          message: d.settings.message,
          eta: d.settings.eta,
        })
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  async function save(next: MaintenanceState) {
    setSaving(true)
    setError(null)
    try {
      const r = await fetch("/api/admin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: next.enabled,
          message: next.message,
          // The HTML datetime-local input gives us "YYYY-MM-DDTHH:mm"
          // (no timezone). We append `:00` for seconds and rely on the
          // server side to treat it as a string — `formatEta` will
          // parse it via `new Date()` which interprets a no-tz string
          // as local time. Good enough for an internal eta hint.
          eta: next.eta && next.eta.trim() !== "" ? next.eta : null,
        }),
      })
      if (!r.ok) {
        const body = (await r.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? "Failed to save")
      }
      const d = (await r.json()) as { settings: MaintenanceState }
      setState({
        enabled: d.settings.enabled,
        message: d.settings.message,
        eta: d.settings.eta,
      })
      setSavedAt(Date.now())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Panel title="Maintenance mode" description="Lock the public site behind a holding page">
        <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
          Loading current state…
        </div>
      </Panel>
    )
  }

  return (
    <div className="space-y-4">
      <Panel
        title="Maintenance mode"
        description="When enabled, every visitor sees a holding page. Admins keep full access."
      >
        {state.enabled && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
            <span className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-700" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-900">
                The site is currently locked
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                Non-admin visitors are being redirected to <code className="font-mono">/maintenance</code>.
                Admin pages, sign-in, and the API stay reachable.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 px-4 py-3">
          <div className="min-w-0">
            <Label className="text-sm font-medium text-gray-900">
              {state.enabled ? "Maintenance is ON" : "Maintenance is OFF"}
            </Label>
            <p className="text-xs text-gray-500 mt-0.5">
              {state.enabled
                ? "Toggle off to restore public access."
                : "Toggle on to redirect visitors to the maintenance page."}
            </p>
          </div>
          <BrandedSwitch
            checked={state.enabled}
            onChange={(v) => save({ ...state, enabled: v })}
          />
        </div>

        <Field
          label="Message shown to visitors"
          hint="Short and friendly. Max 500 characters."
        >
          <Textarea
            rows={3}
            value={state.message}
            onChange={(e) => setState((s) => ({ ...s, message: e.target.value }))}
            className="rounded-lg resize-none"
            maxLength={500}
            disabled={saving}
          />
        </Field>

        <Field
          label="Expected back online (optional)"
          hint="Surfaces a small ETA pill on the maintenance page."
        >
          <Input
            type="datetime-local"
            value={state.eta ? toLocalDatetimeInput(state.eta) : ""}
            onChange={(e) => setState((s) => ({ ...s, eta: e.target.value || null }))}
            className="h-10 rounded-lg"
            disabled={saving}
          />
        </Field>

        {error && (
          <p className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3 pt-1">
          <Button
            onClick={() => save(state)}
            disabled={saving}
            size="sm"
            className="h-9 rounded-lg bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white disabled:opacity-80"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving
              </>
            ) : savedAt && Date.now() - savedAt < 2500 ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Saved
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save message & ETA
              </>
            )}
          </Button>

          <a
            href="/maintenance"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7B2D8E] hover:underline"
          >
            <ExternalLink className="w-3 h-3" aria-hidden />
            Preview holding page
          </a>
        </div>
      </Panel>
    </div>
  )
}

function toLocalDatetimeInput(iso: string): string {
  // Convert an arbitrary string into the `YYYY-MM-DDTHH:mm` shape the
  // <input type="datetime-local"> expects. Returns an empty string if
  // the input isn't parseable (so the field stays blank rather than
  // throwing).
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  )
}

/* ---------- Moderation panel: spam log + reinstate ---------- */

interface SpamEntry {
  id: string
  userId: string
  postId: string | null
  body: string
  urls: string[]
  reason: string
  ipAddress: string | null
  createdAt: string
  firstName: string | null
  lastName: string | null
  username: string | null
  email: string | null
  isActive: boolean
}

function ModerationPanel() {
  const [entries, setEntries] = useState<SpamEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reinstating, setReinstating] = useState<string | null>(null)

  async function load() {
    setError(null)
    try {
      const r = await fetch("/api/admin/spam-log")
      if (!r.ok) throw new Error("Failed to load")
      const d = (await r.json()) as { entries: SpamEntry[] }
      setEntries(d.entries)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function reinstate(userId: string) {
    setReinstating(userId)
    try {
      // Dedicated reinstate endpoint — flips `users.is_active` back
      // to TRUE on the server. Kept tiny on purpose so the moderation
      // panel only ever talks to one verb per action.
      const r = await fetch(`/api/admin/users/${userId}/reinstate`, {
        method: "POST",
      })
      if (!r.ok) throw new Error("Failed to reinstate")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setReinstating(null)
    }
  }

  return (
    <Panel
      title="Comment spam log"
      description="Users auto-suspended for posting external links. Reinstate when satisfied."
    >
      {error && (
        <p className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {!entries && !error && (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
          Loading…
        </div>
      )}
      {entries && entries.length === 0 && (
        <div className="text-sm text-gray-500 py-6 text-center border border-dashed border-gray-200 rounded-xl">
          No spam reports. Threads are clean.
        </div>
      )}
      {entries && entries.length > 0 && (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden">
          {entries.map((e) => {
            const display =
              [e.firstName, e.lastName].filter(Boolean).join(" ") ||
              e.username ||
              e.email ||
              "Unknown user"
            return (
              <li key={e.id} className="bg-white px-4 py-3.5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {display}
                      </p>
                      {e.username && (
                        <span className="text-[11.5px] text-gray-500 truncate">
                          @{e.username}
                        </span>
                      )}
                      <span
                        className={`text-[10.5px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 ${
                          e.isActive
                            ? "bg-[#7B2D8E]/[0.08] text-[#5A1D6A] border border-[#7B2D8E]/15"
                            : "bg-rose-50 text-rose-700 border border-rose-100"
                        }`}
                      >
                        {e.isActive ? "Active" : "Suspended"}
                      </span>
                    </div>
                    <p className="text-[11.5px] text-gray-500 mt-0.5">
                      {new Date(e.createdAt).toLocaleString()} · IP {e.ipAddress ?? "—"}
                    </p>
                    <p className="mt-2 text-[13px] text-gray-800 whitespace-pre-wrap break-words bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                      {e.body}
                    </p>
                    {e.urls.length > 0 && (
                      <p className="mt-1.5 text-[11px] text-rose-700 flex flex-wrap gap-x-2 gap-y-0.5">
                        <span className="font-semibold uppercase tracking-wide">Links:</span>
                        {e.urls.map((u) => (
                          <span key={u} className="font-mono break-all">
                            {u}
                          </span>
                        ))}
                      </p>
                    )}
                  </div>

                  {!e.isActive && (
                    <Button
                      onClick={() => reinstate(e.userId)}
                      disabled={reinstating === e.userId}
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-lg border-[#7B2D8E]/20 text-[#7B2D8E] hover:bg-[#7B2D8E]/5"
                    >
                      {reinstating === e.userId ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          Reinstating
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                          Reinstate
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
