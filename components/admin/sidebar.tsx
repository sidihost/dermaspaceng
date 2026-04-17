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

const adminNavItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard', badge: null },
  { href: '/admin/users', icon: Users, label: 'Users', badge: null },
  { href: '/admin/staff', icon: UserCog, label: 'Staff', badge: null },
  { href: '/admin/transactions', icon: CreditCard, label: 'Transactions', badge: null },
  { href: '/admin/gift-cards', icon: Gift, label: 'Gift Cards', badge: 'new' },
  { href: '/admin/complaints', icon: MessageSquare, label: 'Support', badge: null },
  { href: '/admin/consultations', icon: Calendar, label: 'Consultations', badge: null },
  { href: '/admin/surveys', icon: ClipboardList, label: 'Surveys', badge: null },
  { href: '/admin/activity', icon: Activity, label: 'Activity Log', badge: null },
  { href: '/admin/settings', icon: Settings, label: 'Settings', badge: null },
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
        {/* Sidebar header. On mobile the admin pill sits under the logo so
            long wordmarks don't wrap; on desktop they stay inline. */}
        <div
          className={cn(
            'flex items-center h-20 border-b border-gray-100 px-5',
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
                width={140}
                height={36}
                priority
                className="h-9 w-auto object-contain"
              />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7B2D8E] bg-[#7B2D8E]/10 rounded-full px-2 py-0.5 whitespace-nowrap">
                {userRole}
              </span>
            </Link>
          )}
          {isCollapsed && (
            <Link
              href="/admin"
              className="w-11 h-11 rounded-xl bg-[#7B2D8E] flex items-center justify-center"
              aria-label="Dermaspace admin"
            >
              <span className="text-white font-bold text-lg">D</span>
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

        {/* Navigation. The active pill is a flat solid fill — no more
            `shadow-lg shadow-[#7B2D8E]/25` halo, which was reading as a
            soft purple gradient around the button. Rounded-lg (not -xl) so
            pills feel like normal list rows, not chunky capsule buttons. */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className={cn('mb-3', isCollapsed && 'hidden')}>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3">
              Menu
            </p>
          </div>
          {adminNavItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group relative',
                  isActive
                    ? 'bg-[#7B2D8E] text-white'
                    : 'text-gray-700 hover:bg-gray-50',
                  isCollapsed && 'justify-center px-3'
                )}
              >
                <item.icon
                  className={cn(
                    'w-[18px] h-[18px] flex-shrink-0',
                    isActive ? 'text-white' : 'text-gray-400'
                  )}
                />
                {!isCollapsed && (
                  <>
                    <span className="text-sm font-medium flex-1">
                      {item.label}
                    </span>
                    {item.badge && (
                      <span
                        className={cn(
                          'text-[10px] font-semibold px-1.5 py-0.5 rounded',
                          isActive
                            ? 'bg-white/20 text-white'
                            : item.badge === 'new'
                            ? 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
                            : 'bg-[#7B2D8E] text-white'
                        )}
                      >
                        {item.badge === 'new' ? 'NEW' : item.badge}
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
        </nav>

        {/* User footer — just the identity card and a sign-out row. The fake
            "Weekly Stats" panel (with placeholder +24% / 98% numbers) was
            removed: it wasn't wired to real data and was visually the
            heaviest thing in the rail. */}
        <div
          className={cn(
            'border-t border-gray-100 p-3',
            isCollapsed && 'flex flex-col items-center'
          )}
        >
          {/* Desktop profile card — also clickable; jumps to settings. */}
          <Link
            href="/admin/settings"
            aria-label="Account settings"
            className={cn(
              'flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors',
              isCollapsed && 'px-0 justify-center'
            )}
          >
            <div className="w-9 h-9 rounded-lg bg-[#F8F2FB] flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-[#7B2D8E]">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {userName}
                </p>
                <p className="text-xs text-[#7B2D8E] capitalize font-medium">
                  {userRole}
                </p>
              </div>
            )}
          </Link>
          <button
            onClick={handleLogout}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-[#7B2D8E] transition-colors mt-1 w-full',
              isCollapsed && 'justify-center px-3'
            )}
          >
            <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
            {!isCollapsed && (
              <span className="text-sm font-medium">Sign Out</span>
            )}
          </button>
        </div>
      </aside>
    </>
  )
}
