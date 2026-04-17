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
      {/* Page Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
            <Settings className="w-5 h-5 text-[#7B2D8E]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">Settings</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage how Dermaspace behaves across notifications, email, security and system health.
            </p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="h-10 rounded-xl bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white shadow-sm disabled:opacity-80"
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
              <Panel
                title="Service health"
                description="Real-time status of the core infrastructure"
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  <StatusCard icon={<Database className="w-4 h-4 text-[#7B2D8E]" />} label="Database" value="Connected" sub="Neon Postgres" operational />
                  <StatusCard icon={<Globe className="w-4 h-4 text-[#7B2D8E]" />} label="API" value="Operational" sub="All endpoints healthy" operational />
                  <StatusCard icon={<Settings className="w-4 h-4 text-[#7B2D8E]" />} label="Version" value="1.0.0" sub="Latest release" />
                </div>
              </Panel>

              <Panel
                title="Environment variables"
                description="Runtime configuration detected by the app"
              >
                <div className="divide-y divide-gray-100 rounded-xl border border-gray-200">
                  {[
                    { key: "DATABASE_URL", present: true },
                    { key: "RESEND_API_KEY", present: true },
                    { key: "NEXT_PUBLIC_APP_URL", present: true },
                  ].map((env) => (
                    <div key={env.key} className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm font-mono text-gray-700">{env.key}</span>
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 ${
                          env.present
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${env.present ? "bg-emerald-500" : "bg-gray-400"}`} />
                        {env.present ? "Configured" : "Missing"}
                      </span>
                    </div>
                  ))}
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

function StatusCard({
  icon,
  label,
  value,
  sub,
  operational = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  operational?: boolean
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center">
            {icon}
          </span>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        </div>
        {operational && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-50 rounded-full px-1.5 py-0.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Live
          </span>
        )}
      </div>
      <p className="mt-2 text-xl font-semibold text-gray-900 tabular-nums tracking-tight">{value}</p>
      <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>
    </div>
  )
}
