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
  TrendingUp,
  CreditCard,
} from 'lucide-react'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'

// Brand logo — same asset used in the public header and footer so the admin
// surface feels continuous with the rest of the product.
const DERMASPACE_LOGO =
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-EdcQ7u5ESh5sPzpgMsL9Sep8NnY0iu.webp'

/**
 * A really polished 2-bar hamburger. Two stacked lines of slightly different
 * lengths (top is full width, bottom is 66% — the classic "modern" asymmetry
 * you see on sites like Linear/Vercel) that morph into a perfectly centered X
 * when the menu opens. Everything lives inside a fixed 22×14 grid so the
 * animation is crisp regardless of the button size.
 */
function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="relative block w-[22px] h-[14px] pointer-events-none"
    >
      {/* Top bar — rotates +45° and slides down to the center on open */}
      <span
        className={cn(
          'absolute left-0 h-[2px] w-full rounded-full bg-current',
          'transition-[transform,width,top] duration-300 ease-[cubic-bezier(0.65,0,0.35,1)]',
          open ? 'top-[6px] rotate-45' : 'top-0 rotate-0'
        )}
      />
      {/* Bottom bar — shorter by default (asymmetric), grows to full width
          and rotates -45° to form the other half of the X on open */}
      <span
        className={cn(
          'absolute left-0 h-[2px] rounded-full bg-current',
          'transition-[transform,width,top] duration-300 ease-[cubic-bezier(0.65,0,0.35,1)]',
          open ? 'top-[6px] w-full -rotate-45' : 'top-[12px] w-[66%] rotate-0'
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
  // Renamed from "Support Inbox" — the admin wanted a cleaner label since
  // the page now shows every support ticket + contact-form message in one
  // unified view. Badge is omitted (the old hard-coded "3" was misleading
  // since real counts live on the page itself).
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

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/'
  }
  
  // Show logging out overlay
  if (isLoggingOut) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="w-10 h-10 border-2 text-[#7B2D8E] animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Logging out...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Mobile Top Bar — sticky header that pairs the brand logo with a
          beautifully animated hamburger. Replaces the old floating button so
          the admin surface matches the public site's navbar rhythm. */}
      <header className="fixed top-0 inset-x-0 z-40 h-14 bg-white/95 backdrop-blur-md border-b border-gray-100 lg:hidden">
        <div className="flex items-center justify-between h-full px-3">
          {/* Hamburger — brand-tinted, with animated lines that morph to an X */}
          <button
            onClick={() => setIsMobileOpen((v) => !v)}
            aria-label={isMobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileOpen}
            className={cn(
              'relative grid place-items-center h-10 w-10 rounded-xl border transition-all active:scale-95',
              'ring-0 focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/30',
              isMobileOpen
                ? 'bg-[#7B2D8E] text-white border-[#7B2D8E] shadow-md shadow-[#7B2D8E]/30'
                : 'bg-white text-gray-700 border-gray-200 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E]'
            )}
          >
            <HamburgerIcon open={isMobileOpen} />
          </button>

          {/* Logo + role — centered next to the hamburger so it always has
              visual breathing room from the right-side controls. */}
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

          {/* Initial avatar — mirrors the one inside the sidebar so the user
              always has a visual anchor to their session. */}
          <div className="h-9 w-9 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center border border-[#7B2D8E]/10">
            <span className="text-xs font-bold text-[#7B2D8E]">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      </header>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar — relies on a single hairline border for separation from
          the main content. No drop shadow: the admin wanted a flatter, calmer
          panel that doesn't lift off the surface. */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full bg-white border-r border-gray-100 transition-transform duration-300 flex flex-col',
          isCollapsed ? 'lg:w-20' : 'lg:w-72',
          'w-72',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Sidebar header — uses the actual Dermaspace wordmark so the panel
            feels branded end-to-end. When collapsed on desktop we fall back to
            a compact mark to keep the rail tidy. */}
        <div className={cn(
          'flex items-center h-20 border-b border-gray-100 px-5',
          isCollapsed ? 'justify-center' : 'justify-between gap-2'
        )}>
          {!isCollapsed && (
            <Link
              href="/admin"
              className="flex items-center gap-2 group min-w-0"
              onClick={() => setIsMobileOpen(false)}
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
              className="w-11 h-11 rounded-xl bg-[#7B2D8E] flex items-center justify-center shadow-lg shadow-[#7B2D8E]/20 hover:scale-105 transition-transform"
              aria-label="Dermaspace admin"
            >
              <span className="text-white font-bold text-lg">D</span>
            </Link>
          )}
          {/* Desktop-only collapse toggle — on mobile the top-bar hamburger
              handles opening/closing, so no extra close button is needed. */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft className={cn(
              'w-4 h-4 text-gray-400 transition-transform duration-300',
              isCollapsed && 'rotate-180'
            )} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1.5">
          <div className={cn('mb-4', isCollapsed && 'hidden')}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3">Menu</p>
          </div>
          {adminNavItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/admin' && pathname.startsWith(item.href))
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-xl transition-all group relative',
                  isActive
                    ? 'bg-[#7B2D8E] text-white shadow-lg shadow-[#7B2D8E]/25'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  isCollapsed && 'justify-center px-3'
                )}
              >
                <item.icon className={cn(
                  'w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110',
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-[#7B2D8E]'
                )} />
                {!isCollapsed && (
                  <>
                    <span className="text-sm font-medium flex-1">{item.label}</span>
                    {item.badge && (
                      <span className={cn(
                        'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                        isActive
                          ? 'bg-white/20 text-white'
                          : item.badge === 'new'
                            ? 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
                            : 'bg-[#7B2D8E] text-white'
                      )}>
                        {item.badge === 'new' ? 'NEW' : item.badge}
                      </span>
                    )}
                  </>
                )}
                {isCollapsed && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg">
                    {item.label}
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
                  </div>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Quick Stats */}
        {!isCollapsed && (
          <div className="px-4 py-3">
            <div className="rounded-xl bg-[#7B2D8E]/5 p-4 border border-[#7B2D8E]/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-[#7B2D8E]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Weekly Stats</p>
                  <p className="text-xs text-gray-500">Performance overview</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white rounded-lg px-3 py-2 text-center shadow-sm">
                  <p className="text-lg font-bold text-[#7B2D8E]">+24%</p>
                  <p className="text-[10px] text-gray-500 uppercase">Users</p>
                </div>
                <div className="bg-white rounded-lg px-3 py-2 text-center shadow-sm">
                  <p className="text-lg font-bold text-[#7B2D8E]">98%</p>
                  <p className="text-[10px] text-gray-500 uppercase">Resolved</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Section */}
        <div className={cn(
          'border-t border-gray-100 p-4',
          isCollapsed && 'flex flex-col items-center'
        )}>
          <div className={cn(
            'flex items-center gap-3 px-3 py-3 rounded-xl bg-gray-50',
            isCollapsed && 'px-0 bg-transparent justify-center'
          )}>
            <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/15 flex items-center justify-center flex-shrink-0 border border-[#7B2D8E]/10">
              <span className="text-sm font-bold text-[#7B2D8E]">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{userName}</p>
                <p className="text-xs text-[#7B2D8E] capitalize font-medium">{userRole}</p>
              </div>
            )}
          </div>
          {/* Sign out uses brand purple on hover instead of a red alert hue —
              the admin wanted the whole console to stay on-palette. */}
          <button
            onClick={handleLogout}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-500 hover:bg-[#7B2D8E]/5 hover:text-[#7B2D8E] transition-colors mt-2 w-full group',
              isCollapsed && 'justify-center px-3'
            )}
          >
            <LogOut className="w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform" />
            {!isCollapsed && <span className="text-sm font-medium">Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
