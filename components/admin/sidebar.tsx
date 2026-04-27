'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  UserCog,
  Gift,
  MessageSquare,
  Calendar,
  ClipboardList,
  Activity,
  Settings,
  ChevronLeft,
  LogOut,
  CreditCard,
  Loader2,
  Power,
  Megaphone,
  Tag,
  Send,
  BookOpen,
  Clock,
} from 'lucide-react'
import { useEffect, useState } from 'react'

// Brand logo — same asset used in the public header and footer so the admin
// surface feels continuous with the rest of the product.
const DERMASPACE_LOGO =
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-EdcQ7u5ESh5sPzpgMsL9Sep8NnY0iu.webp'

/**
 * Minimal 2-bar hamburger. Same as before — thin lines that morph into a
 * centered X on open. No box, no fill, just the animated bars.
 */
function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="relative block w-[18px] h-[12px] pointer-events-none"
    >
      <span
        className={cn(
          'absolute left-0 h-[1.5px] w-full rounded-full bg-current',
          'transition-[transform,width,top] duration-300 ease-[cubic-bezier(0.65,0,0.35,1)]',
          open ? 'top-[5.25px] rotate-45' : 'top-0 rotate-0'
        )}
      />
      <span
        className={cn(
          'absolute left-0 h-[1.5px] rounded-full bg-current',
          'transition-[transform,width,top] duration-300 ease-[cubic-bezier(0.65,0,0.35,1)]',
          open ? 'top-[5.25px] w-full -rotate-45' : 'top-[10.5px] w-[65%] rotate-0'
        )}
      />
    </span>
  )
}

interface SidebarProps {
  userRole: 'admin' | 'staff'
  userName: string
}

type NavItem = {
  href: string
  icon: typeof LayoutDashboard
  label: string
  badge: string | null
  group?: 'main' | 'platform'
}

const adminNavItems: NavItem[] = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard', badge: null, group: 'main' },
  { href: '/admin/users', icon: Users, label: 'Users', badge: null, group: 'main' },
  { href: '/admin/staff', icon: UserCog, label: 'Staff', badge: null, group: 'main' },
  { href: '/admin/transactions', icon: CreditCard, label: 'Transactions', badge: null, group: 'main' },
  { href: '/admin/gift-cards', icon: Gift, label: 'Gift Cards', badge: null, group: 'main' },
  { href: '/admin/complaints', icon: MessageSquare, label: 'Support', badge: null, group: 'main' },
  { href: '/admin/feedback', icon: ClipboardList, label: 'Feedback', badge: null, group: 'main' },
  { href: '/admin/consultations', icon: Calendar, label: 'Consultations', badge: null, group: 'main' },
  { href: '/admin/surveys', icon: ClipboardList, label: 'Surveys', badge: null, group: 'main' },
  { href: '/admin/activity', icon: Activity, label: 'Activity Log', badge: null, group: 'main' },

  // Platform controls — the "big tech" admin powers: feature flags,
  // editable banner, vouchers, broadcast push notifications, and the blog
  // (with its own permissions sub-page so admins can grant editing rights
  // to specific staff without giving them full platform access).
  { href: '/admin/features', icon: Power, label: 'Feature Flags', badge: 'NEW', group: 'platform' },
  { href: '/admin/banners', icon: Megaphone, label: 'Banners', badge: null, group: 'platform' },
  { href: '/admin/vouchers', icon: Tag, label: 'Vouchers', badge: null, group: 'platform' },
  { href: '/admin/broadcast', icon: Send, label: 'Broadcast', badge: null, group: 'platform' },
  { href: '/admin/blog', icon: BookOpen, label: 'Blog', badge: null, group: 'platform' },
  // Recurring background jobs (QStash). Lets admins inspect schedule
  // health, force a re-sync from the manifest, and run any job on
  // demand without waiting for the next tick.
  { href: '/admin/schedules', icon: Clock, label: 'Schedules', badge: null, group: 'platform' },

  { href: '/admin/settings', icon: Settings, label: 'Settings', badge: null, group: 'main' },
]

export default function AdminSidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Close the mobile menu whenever the route changes. The previous
  // implementation relied on an onClick on every Link — fine, but fragile.
  // This guarantees we never leave a stale drawer open on navigation.
  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  // Prevent background page scroll while the mobile sidebar is open so the
  // menu itself scrolls cleanly. Without this, the body would scroll behind
  // the open panel on iOS / Android.
  useEffect(() => {
    if (typeof document === 'undefined') return
    const prev = document.body.style.overflow
    document.body.style.overflow = isMobileOpen ? 'hidden' : prev
    return () => {
      document.body.style.overflow = prev
    }
  }, [isMobileOpen])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/'
  }

  if (isLoggingOut) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#7B2D8E] animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Logging out…</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Mobile top bar — same pattern, sticky header with a minimal
          hamburger on the left and the brand logo next to it. */}
      <header className="fixed top-0 inset-x-0 z-40 h-14 bg-white border-b border-gray-100 lg:hidden">
        <div className="flex items-center justify-between h-full px-3">
          <button
            onClick={() => setIsMobileOpen((v) => !v)}
            aria-label={isMobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileOpen}
            className={cn(
              '-ml-1.5 relative grid place-items-center h-9 w-9 rounded-md transition-colors active:scale-95',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2D8E]/30',
              isMobileOpen ? 'text-[#7B2D8E]' : 'text-gray-800 hover:text-[#7B2D8E]'
            )}
          >
            <HamburgerIcon open={isMobileOpen} />
          </button>

          <Link href="/admin" className="flex items-center gap-2 group min-w-0">
            <Image
              src={DERMASPACE_LOGO}
              alt="Dermaspace"
              width={112}
              height={28}
              priority
              className="h-7 w-auto object-contain"
            />
            <span className="hidden xs:inline-block text-[10px] font-semibold uppercase tracking-wider text-[#7B2D8E] bg-[#7B2D8E]/10 rounded-full px-2 py-0.5">
              {userRole}
            </span>
          </Link>

          {/* Profile avatar — now a real link into settings so tapping it
              behaves like every other admin shell (Google, Linear, etc.).
              Was a plain div before and felt dead on mobile. */}
          <Link
            href="/admin/settings"
            aria-label="Account settings"
            className="h-9 w-9 rounded-full bg-[#F8F2FB] flex items-center justify-center hover:bg-[#7B2D8E]/15 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2D8E]/30"
          >
            <span className="text-xs font-bold text-[#7B2D8E]">
              {userName.charAt(0).toUpperCase()}
            </span>
          </Link>
        </div>
      </header>

      {/* Mobile scrim — NOT a blurred dark modal anymore. Just a barely-there
          grey film (8% black) that dismisses the panel on tap. No backdrop
          blur, no darkening: the sidebar should feel like a push drawer,
          not a modal dialog. */}
      {isMobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/[0.08] lg:hidden"
        />
      )}

      {/* Sidebar panel — flat white, hairline border, no shadow glow. */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full bg-white border-r border-gray-100 transition-transform duration-300 flex flex-col',
          isCollapsed ? 'lg:w-20' : 'lg:w-72',
          'w-[80%] max-w-xs',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Sidebar header — slightly compressed on the third pass.
            Was h-20 (80px) which felt heavy on top of the new
            lighter nav rhythm. h-16 (64px) keeps the logo + admin
            pill perfectly readable while giving 16px back to the
            scrollable nav region. Border kept at gray-100 to match
            the rest of the rail. */}
        <div
          className={cn(
            'flex items-center h-16 border-b border-gray-100 px-4',
            isCollapsed ? 'justify-center' : 'justify-between gap-2'
          )}
        >
          {!isCollapsed && (
            <Link
              href="/admin"
              className="flex items-center gap-2 group min-w-0"
            >
              <Image
                src={DERMASPACE_LOGO}
                alt="Dermaspace"
                width={120}
                height={30}
                priority
                className="h-7 w-auto object-contain"
              />
              <span className="text-[9.5px] font-semibold uppercase tracking-wider text-[#7B2D8E] bg-[#7B2D8E]/10 rounded-full px-1.5 py-0.5 whitespace-nowrap">
                {userRole}
              </span>
            </Link>
          )}
          {isCollapsed && (
            <Link
              href="/admin"
              className="w-10 h-10 rounded-xl bg-[#7B2D8E] flex items-center justify-center"
              aria-label="Dermaspace admin"
            >
              <span className="text-white font-bold text-base">D</span>
            </Link>
          )}
          {/* Desktop-only collapse toggle. */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft
              className={cn(
                'w-4 h-4 text-gray-400 transition-transform duration-300',
                isCollapsed && 'rotate-180'
              )}
            />
          </button>
        </div>

        {/* Navigation — refined "premium SaaS" rail.
            ----------------------------------------
            Previous version used a heavy solid-purple pill on the
            active row, which dominated the rail and competed with
            the brand colour everywhere else (avatar, badges, etc.).
            New approach (see Linear / Vercel / Notion sidebars):

              • Active row → soft brand wash (#7B2D8E @ 8%) + brand
                text colour, with a 3px brand accent bar on the
                left edge. Reads as "selected" without screaming.
              • Hover    → very light grey wash (gray-50/80) so
                the rail breathes between resting and active.
              • Icon     → brand colour on active, gray-500 on
                rest. Was gray-400, which lost legibility at
                14px on white.
              • Group separator is a 1px hairline + 16px breath
                instead of the previous 12px which felt cramped.
              • Section eyebrows now use a gentler 10.5px tracking
                with a tiny dot prefix so the two groups (Menu /
                Platform Controls) feel deliberate.
            Result: the active item is unambiguous without the
            old heavy fill, and the rest of the rail recedes so
            page content can lead. */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1.5">
          {(['main', 'platform'] as const).map((group, gi) => {
            const items = adminNavItems.filter((i) => i.group === group)
            return (
              <div
                key={group}
                className={cn(gi > 0 && 'pt-4 mt-4 border-t border-gray-100')}
              >
                <div className={cn('mb-1.5 px-3', isCollapsed && 'hidden')}>
                  <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-gray-400 uppercase tracking-[0.08em]">
                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                    {group === 'main' ? 'Menu' : 'Platform'}
                  </p>
                </div>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== '/admin' && pathname.startsWith(item.href))
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                          'group relative flex items-center gap-3 rounded-lg transition-colors',
                          // Padding left is reduced on active rows
                          // because the 3px brand bar stands in for
                          // some of the gutter, keeping icon
                          // alignment perfectly stable across rest /
                          // active.
                          'px-3 py-2',
                          isActive
                            ? 'bg-[#7B2D8E]/[0.08] text-[#7B2D8E]'
                            : 'text-gray-700 hover:bg-gray-50/80 hover:text-gray-900',
                          isCollapsed && 'justify-center px-3'
                        )}
                      >
                        {/* Left accent bar — 3px brand rule that
                            calmly marks the selected row. Pinned
                            to the rounded edge with a small inset
                            so it doesn't feel like a separator. */}
                        {isActive && !isCollapsed && (
                          <span
                            aria-hidden
                            className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-[#7B2D8E]"
                          />
                        )}
                        <item.icon
                          className={cn(
                            'w-[18px] h-[18px] flex-shrink-0 transition-colors',
                            isActive
                              ? 'text-[#7B2D8E]'
                              : 'text-gray-500 group-hover:text-gray-700'
                          )}
                          strokeWidth={isActive ? 2.2 : 1.85}
                        />
                        {!isCollapsed && (
                          <>
                            <span
                              className={cn(
                                'text-[13.5px] flex-1 leading-none tracking-tight',
                                isActive ? 'font-semibold' : 'font-medium'
                              )}
                            >
                              {item.label}
                            </span>
                            {item.badge && (
                              <span
                                className={cn(
                                  'text-[9.5px] font-bold tracking-wider px-1.5 py-0.5 rounded uppercase',
                                  isActive
                                    ? 'bg-[#7B2D8E] text-white'
                                    : 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
                                )}
                              >
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}
                        {isCollapsed && (
                          <div className="absolute left-full ml-3 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                            {item.label}
                            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
                          </div>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        {/* Sidebar footer — refined identity card + sign out.
            ----------------------------------------------------
            Was a generic two-row block (avatar+name, then Sign Out
            below). The new card reads as a single quietly-elevated
            unit: avatar with a small green presence dot, name +
            role on two lines, and an inline icon-only sign-out
            button on the right that exposes a tooltip on hover —
            mirrors how Linear, Notion and Vercel treat their
            identity cells. The fake "Weekly Stats" panel removed
            earlier stays gone (placeholder data). */}
        <div
          className={cn(
            'border-t border-gray-100 p-2.5',
            isCollapsed && 'flex flex-col items-center'
          )}
        >
          {!isCollapsed ? (
            <div className="flex items-center gap-2.5 px-1.5 py-1.5 rounded-xl bg-gray-50/70 hover:bg-gray-100/70 transition-colors">
              <Link
                href="/admin/settings"
                aria-label="Account settings"
                className="relative flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2D8E]/30 rounded-lg"
              >
                <div className="w-9 h-9 rounded-lg bg-[#F8F2FB] flex items-center justify-center">
                  <span className="text-sm font-bold text-[#7B2D8E]">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                </div>
                {/* Presence dot — pure decorative cue that the
                    admin is signed in. Two-ring construction
                    (white outer, brand-green inner) keeps it
                    legible against any avatar bg. */}
                <span
                  aria-hidden
                  className="absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white"
                />
              </Link>
              <Link
                href="/admin/settings"
                aria-label="Account settings"
                className="flex-1 min-w-0 leading-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2D8E]/30 rounded"
              >
                <p className="text-[13px] font-semibold text-gray-900 truncate">
                  {userName}
                </p>
                <p className="text-[11px] text-gray-500 capitalize truncate">
                  {userRole === 'admin' ? 'Administrator' : 'Staff member'}
                </p>
              </Link>
              <button
                onClick={handleLogout}
                aria-label="Sign out"
                title="Sign out"
                className="group/logout relative flex-shrink-0 grid place-items-center w-8 h-8 rounded-lg text-gray-500 hover:text-[#7B2D8E] hover:bg-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2D8E]/30"
              >
                <LogOut className="w-[15px] h-[15px]" />
                <span className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-[10.5px] font-medium rounded opacity-0 invisible group-hover/logout:opacity-100 group-hover/logout:visible transition-all whitespace-nowrap pointer-events-none">
                  Sign out
                </span>
              </button>
            </div>
          ) : (
            <>
              <Link
                href="/admin/settings"
                aria-label="Account settings"
                className="relative w-9 h-9 rounded-lg bg-[#F8F2FB] flex items-center justify-center hover:bg-[#7B2D8E]/15 transition-colors"
              >
                <span className="text-sm font-bold text-[#7B2D8E]">
                  {userName.charAt(0).toUpperCase()}
                </span>
                <span
                  aria-hidden
                  className="absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white"
                />
              </Link>
              <button
                onClick={handleLogout}
                aria-label="Sign out"
                title="Sign out"
                className="mt-2 grid place-items-center w-9 h-9 rounded-lg text-gray-500 hover:text-[#7B2D8E] hover:bg-gray-50 transition-colors"
              >
                <LogOut className="w-[18px] h-[18px]" />
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  )
}
