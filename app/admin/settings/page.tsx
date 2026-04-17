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

import { useState } from "react"
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

type SectionId = "notifications" | "email" | "security" | "system"

const sections: {
  id: SectionId
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { id: "notifications", label: "Notifications", description: "Alerts, digests & channels", icon: Bell },
  { id: "email",         label: "Email",         description: "Sender identity & signature", icon: Mail },
  { id: "security",      label: "Security",      description: "Access, sessions & 2FA",       icon: Shield },
  { id: "system",        label: "System",        description: "Environment & service health", icon: Database },
]

export default function AdminSettingsPage() {
  const [activeSection, setActiveSection] = useState<SectionId>("notifications")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Notifications
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [newUserAlerts, setNewUserAlerts] = useState(true)
  const [complaintAlerts, setComplaintAlerts] = useState(true)
  const [giftCardAlerts, setGiftCardAlerts] = useState(true)
  const [consultationAlerts, setConsultationAlerts] = useState(true)

  // Email
  const [supportEmail, setSupportEmail] = useState("support@dermaspaceng.com")
  const [notificationEmail, setNotificationEmail] = useState("notifications@dermaspaceng.com")
  const [emailSignature, setEmailSignature] = useState("Best regards,\nThe Dermaspace Team")

  const handleSave = async () => {
    setSaving(true)
    await new Promise((r) => setTimeout(r, 900))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
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
              <Panel
                title="Access policy"
                description="Admin accounts and session behavior"
              >
                <div className="grid gap-px bg-gray-100 rounded-xl overflow-hidden">
                  <RowFlat
                    title="Two-factor authentication"
                    description="Require 2FA for all admin accounts"
                    control={<BrandedSwitch />}
                  />
                  <RowFlat
                    title="Session timeout"
                    description="Sign admins out automatically after inactivity"
                    control={<BrandedSwitch defaultChecked />}
                  />
                  <RowFlat
                    title="Login notifications"
                    description="Email alerts whenever a new sign-in happens"
                    control={<BrandedSwitch defaultChecked />}
                  />
                </div>
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
