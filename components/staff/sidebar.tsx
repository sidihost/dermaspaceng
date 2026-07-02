"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  LayoutDashboard,
  Gift,
  MessageSquare,
  Calendar,
  FileText,
  LogOut,
  Bell,
  Loader2,
  BookOpen,
  CalendarCheck,
  Users,
  BadgePercent,
  BarChart3,
  Headset,
  Lightbulb,
} from "lucide-react"
import { useState, useEffect } from "react"
import { logoutAndRedirect } from "@/lib/logout"

/**
 * Shared brand logo URL — same wordmark as the public header so the staff
 * console reads as part of the product, not a separate admin tool.
 */
const DERMASPACE_LOGO =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-EdcQ7u5ESh5sPzpgMsL9Sep8NnY0iu.webp"

/**
 * 2-bar asymmetric hamburger that morphs into an X — same icon as the admin
 * sidebar so the two consoles feel identical on mobile.
 */
function HamburgerIcon({ open }: { open: boolean }) {
  // Slim 18×12 grid with 1.5px bars — matches the admin console exactly.
  return (
    <span
      aria-hidden="true"
      className="relative block w-[18px] h-[12px] pointer-events-none"
    >
      <span
        className={cn(
          "absolute left-0 h-[1.5px] w-full rounded-full bg-current",
          "transition-[transform,width,top] duration-300 ease-[cubic-bezier(0.65,0,0.35,1)]",
          open ? "top-[5.25px] rotate-45" : "top-0 rotate-0"
        )}
      />
      <span
        className={cn(
          "absolute left-0 h-[1.5px] rounded-full bg-current",
          "transition-[transform,width,top] duration-300 ease-[cubic-bezier(0.65,0,0.35,1)]",
          open ? "top-[5.25px] w-full -rotate-45" : "top-[10.5px] w-[65%] rotate-0"
        )}
      />
    </span>
  )
}

// The "Blog" entry is intentionally always rendered for staff. The page
// itself (and the underlying API routes) enforce per-user permissions
// granted from /admin/blog/permissions, so a staff member without rights
// will see a friendly "request access" screen rather than a working
// editor. This keeps the nav simple (no client fetch on mount) while the
// permissions remain strict at the data layer.
const navItems = [
  { title: "Dashboard",          href: "/staff",              icon: LayoutDashboard },
  // Appointments lives second because the operator's day starts with
  // "what am I doing today?" — a small but meaningful nav order win.
  { title: "Appointments",       href: "/staff/appointments", icon: CalendarCheck },
  { title: "Clients",            href: "/staff/clients",      icon: Users },
  // Loyalty & Promos: rewards programme management — points, redemption
  // rate, top members. Lives just below Clients because it's about
  // engagement with the same audience.
  { title: "Loyalty & Promos",   href: "/staff/loyalty",      icon: BadgePercent },
  // Money was here. The admin asked us to hide the salon-wallet /
  // finance section from the staff console — staff should not see
  // revenue, virtual account or expense data. The page itself still
  // exists for admins, but it's intentionally not linked from the
  // staff sidebar anymore.
  { title: "Reports",            href: "/staff/reports",      icon: BarChart3 },
  { title: "Gift Card Requests", href: "/staff/gift-cards",   icon: Gift },
  { title: "Complaints",         href: "/staff/complaints",   icon: MessageSquare },
  { title: "Consultations",      href: "/staff/consultations",icon: Calendar },
  // Feature Requests: the client-submitted ideas board. Staff can triage
  // and respond to them just like admins.
  { title: "Feature Requests",   href: "/staff/feature-requests", icon: Lightbulb },
  // Live Chat: real-time conversation inbox between staff and
  // signed-in customers. The page exists at /staff/live-chat and
  // pulls from the same WebSocket-style polling endpoints the
  // customer chat widget uses.
  //
  // Headset reads as a live-support channel and reads as visually
  // distinct from "Complaints" (MessageSquare), so operators
  // recognize the two surfaces at a glance even on mobile.
  { title: "Live Chat",          href: "/staff/live-chat",    icon: Headset },
  { title: "Surveys",            href: "/staff/surveys",      icon: FileText },
  { title: "Blog",               href: "/staff/blog",         icon: BookOpen },
]

export function StaffSidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Live "pending tasks" widget at the bottom of the sidebar — used to
  // be hard-coded "12 / 5". Now we hit the same dashboard endpoint the
  // main panel uses so the count never lies. Poll every 60 s and lean
  // on browser cache when it's idle.
  const [pending, setPending] = useState<{ requests: number; urgent: number }>({
    requests: 0,
    urgent: 0,
  })
  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const r = await fetch("/api/staff/dashboard", { cache: "no-store" })
        if (!r.ok) return
        const data = await r.json()
        if (!alive || !data?.success) return
        const s = data.stats || {}
        setPending({
          requests:
            Number(s.pendingGiftCards ?? 0) +
            Number(s.pendingConsultations ?? 0),
          urgent: Number(s.pendingComplaints ?? 0),
        })
      } catch {
        /* swallow — sidebar widget is best-effort */
      }
    }
    load()
    const id = window.setInterval(load, 60_000)
    return () => {
      alive = false
      window.clearInterval(id)
    }
  }, [])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    // Shared helper — wipes the localStorage user cache before
    // redirecting so the next page paint reads as signed-out
    // immediately instead of flashing the previous user.
    await logoutAndRedirect("/")
  }

  if (isLoggingOut) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#7B2D8E] animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Logging out...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Mobile Top Bar — full-width header that pairs the logo with the
          animated hamburger. Matches the admin surface exactly. */}
      <header className="fixed top-0 inset-x-0 z-40 h-14 bg-white/95 backdrop-blur-md border-b border-gray-100 lg:hidden">
        <div className="flex items-center justify-between h-full px-3">
          {/* Unboxed hamburger — mirrors the admin console. No box/border,
              just the animated lines on the toolbar. */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            className={cn(
              "-ml-1.5 relative grid place-items-center h-9 w-9 rounded-md transition-colors active:scale-95",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2D8E]/30",
              mobileOpen ? "text-[#7B2D8E]" : "text-gray-800 hover:text-[#7B2D8E]"
            )}
          >
            <HamburgerIcon open={mobileOpen} />
          </button>

          <Link href="/staff" className="flex items-center gap-2 min-w-0">
            <Image
              src={DERMASPACE_LOGO}
              alt="Dermaspace"
              width={112}
              height={28}
              priority
              className="h-7 w-auto object-contain"
            />
            <span className="hidden xs:inline-block text-[10px] font-semibold uppercase tracking-wider text-[#7B2D8E] bg-[#7B2D8E]/10 rounded-full px-2 py-0.5">
              Staff
            </span>
          </Link>

          {/* Spacer to keep logo centered */}
          <span className="w-10 h-10" aria-hidden />
        </div>
      </header>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          // No drop shadow — the panel sits cleanly against the content
          // with just a hairline border, matching the admin console.
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-gray-100 bg-white transition-transform duration-300 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo — actual brand wordmark, not a gradient "D" tile. */}
        <div className="flex h-20 items-center gap-3 border-b border-gray-100 px-5">
          <Link href="/staff" className="flex items-center gap-2 group min-w-0" onClick={() => setMobileOpen(false)}>
            <Image
              src={DERMASPACE_LOGO}
              alt="Dermaspace"
              width={140}
              height={36}
              priority
              className="h-9 w-auto object-contain"
            />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7B2D8E] bg-[#7B2D8E]/10 rounded-full px-2 py-0.5 whitespace-nowrap">
              Staff
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-4 py-6">
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3">Menu</p>
          </div>
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/staff" && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors group",
                    isActive
                      ? "bg-[#7B2D8E] text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5 shrink-0 transition-transform group-hover:scale-110",
                      isActive ? "text-white" : "text-gray-400 group-hover:text-[#7B2D8E]"
                    )}
                  />
                  {item.title}
                </Link>
              )
            })}
          </nav>
        </ScrollArea>

        {/* Pending tasks card — on-brand tint, no amber/orange gradient. */}
        <div className="px-4 py-3">
          <div className="rounded-xl bg-[#7B2D8E]/5 border border-[#7B2D8E]/10 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center">
                <Bell className="w-4 h-4 text-[#7B2D8E]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Pending tasks</p>
                <p className="text-xs text-gray-500">Requires attention</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/staff/gift-cards"
                onClick={() => setMobileOpen(false)}
                className="bg-white rounded-lg px-3 py-2 text-center border border-[#7B2D8E]/10 hover:border-[#7B2D8E]/30 transition-colors"
              >
                <p className="text-lg font-bold text-[#7B2D8E] tabular-nums">
                  {pending.requests}
                </p>
                <p className="text-[10px] text-gray-500 uppercase">Requests</p>
              </Link>
              <Link
                href="/staff/complaints"
                onClick={() => setMobileOpen(false)}
                className="bg-white rounded-lg px-3 py-2 text-center border border-[#7B2D8E]/10 hover:border-[#7B2D8E]/30 transition-colors"
              >
                <p className="text-lg font-bold text-[#7B2D8E] tabular-nums">
                  {pending.urgent}
                </p>
                <p className="text-[10px] text-gray-500 uppercase">Urgent</p>
              </Link>
            </div>
          </div>
        </div>

        {/* Sign out */}
        <div className="border-t border-gray-100 p-4">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-gray-500 hover:text-[#7B2D8E] hover:bg-[#7B2D8E]/5 rounded-xl py-3 transition-colors"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </Button>
        </div>
      </aside>
    </>
  )
}
