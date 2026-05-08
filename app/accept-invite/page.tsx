"use client"

/**
 * Accept Invite page — `/accept-invite?token=...`
 *
 * Renders the signed invite link a staff/admin user receives by email.
 * The page covers four states inside a single, compact, responsive
 * shell so the layout never looks oversized on phones:
 *
 *   loading  — validating the token against /api/auth/validate-invite
 *   invalid  — token missing, malformed, or already expired (the
 *              "expiration page" the team specifically called out as
 *              feeling too big and not responsive)
 *   valid    — show the create-account form prefilled with the
 *              invitee's email + role
 *   success  — account created, redirecting to /admin or /staff
 *
 * Visual rules carried over from the rest of the operator console:
 *
 *   • Brand purple (#7B2D8E) for accents, neutrals (white + gray-*)
 *     for the rest. No emerald, amber or rose flourishes.
 *   • One card, max-w-sm, hairline border, generous-but-tight padding
 *     so the whole flow fits inside a phone's viewport without scroll.
 *   • Icons used: ShieldCheck (brand mark), MailX (expired), Check
 *     (success), Eye / EyeOff (password reveal), Loader2 (spinner).
 *     No Sparkles or Zap — the team explicitly asked us not to use
 *     those on this surface.
 */

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  Check,
  Eye,
  EyeOff,
  Loader2,
  MailX,
  ShieldCheck,
} from "lucide-react"

const BRAND = "#7B2D8E"

function AcceptInviteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [status, setStatus] = useState<"loading" | "valid" | "invalid" | "success" | "error">("loading")
  const [invitation, setInvitation] = useState<{
    email: string
    role: string
    inviter_name: string
  } | null>(null)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (token) {
      validateToken()
    } else {
      setStatus("invalid")
    }
    // We deliberately only re-validate when the token itself changes —
    // validateToken is stable enough that an exhaustive-deps fix here
    // would just re-fetch on every render with no upside.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const validateToken = async () => {
    try {
      const res = await fetch(`/api/auth/validate-invite?token=${token}`)
      const data = await res.json()

      if (data.valid) {
        setInvitation(data.invitation)
        setStatus("valid")
      } else {
        setStatus("invalid")
      }
    } catch {
      setStatus("invalid")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch("/api/auth/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          firstName: formData.firstName,
          lastName: formData.lastName,
          password: formData.password,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setStatus("success")
        setTimeout(() => {
          router.push(data.role === "admin" ? "/admin" : "/staff")
        }, 1600)
      } else {
        setError(data.error || "Failed to accept invitation")
      }
    } catch {
      setError("An error occurred. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  // ----- Shared shell ------------------------------------------------
  // All four states render inside the same outer wrapper so the page
  // never reflows between states, never runs taller than the viewport
  // on small phones, and consistently centers the card.
  // Padding scales tighter on phones (px-4 py-6) and slightly more
  // generously on desktop (sm:py-10) — the previous design used p-8
  // everywhere which made the card feel oversized on a 360px screen.
  const Shell = ({ children }: { children: React.ReactNode }) => (
    <main className="min-h-[100dvh] flex items-center justify-center bg-gray-50 px-4 py-6 sm:py-10">
      <div className="w-full max-w-sm">{children}</div>
    </main>
  )

  if (status === "loading") {
    return (
      <Shell>
        <div className="rounded-2xl border border-gray-100 bg-white px-5 py-8 text-center shadow-sm">
          <div
            className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: `${BRAND}1A` }}
          >
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: BRAND }} />
          </div>
          <p className="text-sm text-gray-600">Checking your invitation…</p>
        </div>
      </Shell>
    )
  }

  if (status === "invalid") {
    // Expired / invalid token. Compact "this link no longer works"
    // card — same visual weight as the loading state so the change
    // doesn't feel jarring. No giant 16×16 hero icon, no shouty
    // headline; just enough copy to tell them what happened and what
    // to do next.
    return (
      <Shell>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 text-center shadow-sm">
          <div
            className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full"
            style={{ backgroundColor: `${BRAND}14` }}
          >
            <MailX className="h-5 w-5" style={{ color: BRAND }} aria-hidden />
          </div>
          <h1 className="text-base sm:text-lg font-semibold text-gray-900">
            Invite link expired
          </h1>
          <p className="mt-1.5 text-[13px] text-gray-500 leading-relaxed">
            This invitation link is no longer valid — invites expire after
            7&nbsp;days, or once they&apos;ve been used. Ask your admin to send
            a fresh link.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <Link
              href="/signin"
              className="inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold text-white transition-colors hover:opacity-95"
              style={{ backgroundColor: BRAND }}
            >
              Sign in instead
            </Link>
            <Link
              href="/"
              className="inline-flex h-10 items-center justify-center rounded-full border border-gray-200 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Back to homepage
            </Link>
          </div>
        </div>
      </Shell>
    )
  }

  if (status === "success") {
    return (
      <Shell>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 text-center shadow-sm">
          <div
            className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full"
            style={{ backgroundColor: `${BRAND}14` }}
          >
            <Check className="h-5 w-5" style={{ color: BRAND }} strokeWidth={2.6} />
          </div>
          <h1 className="text-base sm:text-lg font-semibold text-gray-900">
            Welcome to the team
          </h1>
          <p className="mt-1.5 text-[13px] text-gray-500">
            Account created. Taking you to your dashboard…
          </p>
          <Loader2 className="mx-auto mt-4 h-4 w-4 animate-spin" style={{ color: BRAND }} />
        </div>
      </Shell>
    )
  }

  // status === "valid" — render the create-account form.
  return (
    <Shell>
      <div className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 shadow-sm">
        {/* Compact brand header — small mark + tight title + role chip.
            Replaces the previous 14×14 purple tile and 2xl headline,
            both of which made the card feel oversized on phones. */}
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: BRAND }}
          >
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-gray-900">Join Dermaspace</h1>
            <p className="mt-0.5 text-[12px] text-gray-500 truncate">
              Invited as{" "}
              <span className="font-medium capitalize" style={{ color: BRAND }}>
                {invitation?.role}
              </span>
            </p>
          </div>
        </div>

        {/* Inviter context — pure brand purple tint, no separate panel
            chrome (no shadow, no double border). Reads as a quiet
            confirmation, not a callout. */}
        <p
          className="mt-4 rounded-xl px-3 py-2.5 text-[12.5px] leading-relaxed text-gray-600"
          style={{ backgroundColor: `${BRAND}0D` }}
        >
          <span className="font-medium text-gray-900">
            {invitation?.inviter_name}
          </span>{" "}
          invited{" "}
          <span className="font-medium text-gray-900">{invitation?.email}</span>
          {" "}to join the team.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-gray-700 mb-1">
                First name
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm outline-none transition-all focus:border-[#7B2D8E] focus:ring-2 focus:ring-[#7B2D8E]/15"
                placeholder="Itunu"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-700 mb-1">
                Last name
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm outline-none transition-all focus:border-[#7B2D8E] focus:ring-2 focus:ring-[#7B2D8E]/15"
                placeholder="Adeleke"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              disabled
              value={invitation?.email || ""}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full h-10 pl-3 pr-10 rounded-lg border border-gray-200 text-sm outline-none transition-all focus:border-[#7B2D8E] focus:ring-2 focus:ring-[#7B2D8E]/15"
                placeholder="At least 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-50"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-1">
              Confirm password
            </label>
            <input
              type="password"
              required
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm outline-none transition-all focus:border-[#7B2D8E] focus:ring-2 focus:ring-[#7B2D8E]/15"
              placeholder="Re-enter your password"
            />
          </div>

          {error && (
            <div
              className="rounded-lg px-3 py-2 text-[12.5px]"
              style={{
                backgroundColor: `${BRAND}0D`,
                border: `1px solid ${BRAND}33`,
                color: BRAND,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 w-full h-11 rounded-full text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            style={{ backgroundColor: BRAND }}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating account…
              </>
            ) : (
              "Accept invitation"
            )}
          </button>
        </form>

        <p className="mt-4 text-center text-[12px] text-gray-500">
          Already have an account?{" "}
          <Link href="/signin" className="font-medium hover:underline" style={{ color: BRAND }}>
            Sign in
          </Link>
        </p>
      </div>
    </Shell>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-[100dvh] flex items-center justify-center bg-gray-50 px-4 py-6">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: BRAND }} />
        </main>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  )
}
