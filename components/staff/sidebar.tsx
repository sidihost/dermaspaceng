"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ChristmasLogoHat } from "@/components/shared/christmas-logo-hat"
import {
  LayoutDashboard,
  Gift,
  LifeBuoy,
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
  Inbox,
  Lightbulb,
  QrCode,
  Wallet,
  X,
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

const navItems = [
  { title: "Dashboard", href: "/staff", icon: LayoutDashboard },
  { title: "Appointments", href: "/staff/appointments", icon: CalendarCheck },
  { title: "Clients", href: "/staff/clients", icon: Users },
  { title: "Loyalty & Promos", href: "/staff/loyalty", icon: BadgePercent },
  { title: "Reports", href: "/staff/reports", icon: BarChart3 },
  { title: "Money", href: "/staff/money", icon: Wallet },
  { title: "Gift Card Requests", href: "/staff/gift-cards", icon: Gift },
  { title: "Verify Gift Card", href: "/gift-cards/verify", icon: QrCode },
  { title: "Complaints", href: "/staff/complaints", icon: LifeBuoy },
  { title: "Consultations", href: "/staff/consultations", icon: Calendar },
  { title: "Feature Requests", href: "/staff/feature-requests", icon: Lightbulb },
  { title: "Live Chat", href: "/staff/live-chat", icon: Inbox },
  { title: "Surveys", href: "/staff/surveys", icon: FileText },
  { title: "Blog", href: "/staff/blog", icon: BookOpen },
]

export function StaffSidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const [pending, setPending] = useState<{ requests: number; urgent: number }>({
    requests: 0,
    urgent: 0,
  })

  // Close mobile drawer on navigation
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Prevent background page scroll while mobile drawer is open
  useEffect(() => {
    if (!mobileOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [mobileOpen])

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

  // Full-screen dedicated workspace for Live Chat — hide sidebar & mobile top bar
  if (pathname === "/staff/live-chat" || pathname?.startsWith("/staff/live-chat/")) {
    return null
  }

  return (
    <>
      {/* Mobile Top Bar */}
      <header className="fixed top-0 inset-x-0 z-40 h-14 bg-white border-b border-gray-100 lg:hidden">
        <div className="flex items-center justify-between h-full px-3">
          <button
            type="button"
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
            <div className="relative inline-block">
              <ChristmasLogoHat className="w-5 h-5 -top-2 left-0" />
              <Image
                src={DERMASPACE_LOGO}
                alt="Dermaspace"
                width={112}
                height={28}
                priority
                className="h-7 w-auto object-contain"
              />
            </div>
            <span className="hidden sm:inline-block text-[10px] font-semibold uppercase tracking-wider text-[#7B2D8E] bg-[#7B2D8E]/10 rounded-full px-2 py-0.5">
              Staff
            </span>
          </Link>

          <span className="w-9 h-9" aria-hidden="true" />
        </div>
      </header>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        data-testid="staff-sidebar"
        aria-label="Staff navigation"
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex h-[100dvh] max-h-[100dvh] w-[85vw] max-w-[18rem] lg:w-72 flex-col border-r border-gray-100 bg-white overflow-hidden transition-transform duration-300 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="shrink-0 flex h-16 sm:h-20 items-center justify-between gap-2 border-b border-gray-100 px-4 sm:px-5">
          <Link
            href="/staff"
            className="flex items-center gap-2 min-w-0"
            onClick={() => setMobileOpen(false)}
          >
            <div className="relative inline-block">
              <ChristmasLogoHat className="w-5 h-5 -top-2 left-0" />
              <Image
                src={DERMASPACE_LOGO}
                alt="Dermaspace"
                width={140}
                height={36}
                priority
                className="h-8 sm:h-9 w-auto object-contain"
              />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7B2D8E] bg-[#7B2D8E]/10 rounded-full px-2 py-0.5 whitespace-nowrap">
              Staff
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar"
            className="lg:hidden h-8 w-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-600 shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Navigation (min-h-0 guarantees footer always stays anchored & visible on short screens) */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 sm:px-4 py-3 sm:py-5">
          <div className="mb-2.5 sm:mb-3">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3">
              Menu
            </p>
          </div>
          <nav className="space-y-1">
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
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors group",
                    isActive
                      ? "bg-[#7B2D8E] text-white"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-[18px] w-[18px] shrink-0",
                      isActive
                        ? "text-white"
                        : "text-gray-400 group-hover:text-[#7B2D8E]"
                    )}
                    aria-hidden="true"
                  />
                  <span className="truncate">{item.title}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Responsive Bottom Anchor: Pending Tasks + Sign Out */}
        <div
          data-testid="staff-sidebar-footer"
          className="mt-auto shrink-0 border-t border-gray-100 bg-white px-3 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:px-4 sm:pt-3 sm:pb-3.5 space-y-2.5"
        >
          {/* Pending tasks card */}
          <div className="rounded-xl bg-[#7B2D8E]/5 border border-[#7B2D8E]/10 p-2.5 sm:p-3">
            <div className="flex items-center gap-2.5 mb-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4 text-[#7B2D8E]" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate leading-tight">
                  Pending tasks
                </p>
                <p className="text-[11px] text-gray-500 truncate leading-tight mt-0.5">
                  Requires attention
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
              <Link
                href="/staff/gift-cards"
                onClick={() => setMobileOpen(false)}
                className="min-w-0 bg-white rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 text-center border border-[#7B2D8E]/10 hover:border-[#7B2D8E]/30 transition-colors"
              >
                <p className="text-base sm:text-lg font-bold text-[#7B2D8E] tabular-nums leading-tight">
                  {pending.requests}
                </p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide truncate mt-0.5">
                  Requests
                </p>
              </Link>
              <Link
                href="/staff/complaints"
                onClick={() => setMobileOpen(false)}
                className="min-w-0 bg-white rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 text-center border border-[#7B2D8E]/10 hover:border-[#7B2D8E]/30 transition-colors"
              >
                <p className="text-base sm:text-lg font-bold text-[#7B2D8E] tabular-nums leading-tight">
                  {pending.urgent}
                </p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide truncate mt-0.5">
                  Urgent
                </p>
              </Link>
            </div>
          </div>

          {/* Sign out */}
          <Button
            variant="ghost"
            className="w-full justify-start gap-2.5 text-gray-600 hover:text-[#7B2D8E] hover:bg-[#7B2D8E]/5 rounded-lg h-9 sm:h-10 px-3 text-sm font-medium transition-colors"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">Sign out</span>
          </Button>
        </div>
      </aside>
    </>
  )
}
