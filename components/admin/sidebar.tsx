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
  LifeBuoy,
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
  CalendarCheck2,
  Boxes,
  Layers,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import { TeamAvatarPicker } from '@/components/admin/team-avatar-picker'
import { NotificationBell } from '@/components/shared/notification-bell'
import type { AdminPermissions } from '@/lib/admin-permissions'
import { logoutAndRedirect } from '@/lib/logout'

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
  /** Resolved avatar URL — uploaded photo if the admin has one,
   *  otherwise the role-specific default in /public/avatars. Null
   *  means we fall back to the initial letter pill. */
  userAvatar?: string | null
  /**
   * Per-surface permission map for this admin. The sidebar uses it to
   * hide developer-only routes (QStash schedules, feature flags) from
   * Itunu and Franca, and to hide the Consultations queue from anyone
   * who isn't either Franca or the super admin. Optional so the staff
   * variant of this sidebar can keep using the default (everything
   * locked down) without passing a prop.
   */
  permissions?: AdminPermissions
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
  // Bookings management — admins land here from the sidebar to confirm,
  // complete or cancel any appointment across every branch. Sits next to
  // Transactions because the two surfaces are revenue-adjacent and admins
  // tend to flip between them while reconciling a customer's payment.
  { href: '/admin/bookings', icon: CalendarCheck2, label: 'Bookings', badge: null, group: 'main' },
  // Services & catalog management — admins curate categories and
  // treatments here; edits publish to the public site instantly via
  // the merger in lib/services-catalog-db.ts.
  { href: '/admin/services', icon: Boxes, label: 'Services', badge: null, group: 'main' },
  { href: '/admin/transactions', icon: CreditCard, label: 'Transactions', badge: null, group: 'main' },
  { href: '/admin/gift-cards', icon: Gift, label: 'Gift Cards', badge: null, group: 'main' },
  // Renamed from "Support" → "Tickets" and switched from the generic
  // chat-bubble glyph (MessageSquare) to LifeBuoy: a ring-buoy reads
  // much more clearly as "help / rescue customer" than a speech bubble
  // (which the rest of the app already uses for live chat and
  // conversations).
  { href: '/admin/complaints', icon: LifeBuoy, label: 'Tickets', badge: null, group: 'main' },
  // Live Chat oversight has been retired from the admin surface — the
  // workflow lives entirely in /admin/complaints (tickets) and the
  // staff-side queue. Keeping the row out of the rail prevents the
  // admin from landing on a half-deprecated control panel.
  { href: '/admin/feedback', icon: ClipboardList, label: 'Feedback', badge: null, group: 'main' },
  { href: '/admin/consultations', icon: Calendar, label: 'Consultations', badge: null, group: 'main' },
  { href: '/admin/surveys', icon: ClipboardList, label: 'Surveys', badge: null, group: 'main' },
  { href: '/admin/activity', icon: Activity, label: 'Activity Log', badge: null, group: 'main' },

  // Platform controls — the "big tech" admin powers: feature flags,
  // editable banner, vouchers, broadcast push notifications, and the blog
  // (with its own permissions sub-page so admins can grant editing rights
  // to specific staff without giving them full platform access).
  // Add-ons hub — single page that catalogues every capability of
  // the platform (Loyalty, Wallet, Vouchers, Reviews, Calendar sync,
  // etc.) with deep links into each module's own admin surface. Sits
  // at the top of the platform group so admins land on the catalogue
  // before they reach the developer-only feature flag console.
  { href: '/admin/addons', icon: Layers, label: 'Add-ons', badge: 'NEW', group: 'platform' },
  { href: '/admin/features', icon: Power, label: 'Feature Flags', badge: null, group: 'platform' },
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

// SWR fetcher for the admin stats endpoint. Returns the parsed JSON
// payload so the sidebar can read `stats.complaints.open`,
// `stats.consultations.pending`, `stats.liveChat.waiting`, and
// `stats.users.todayNew` to drive the live notification badges next
// to Support / Consultations / Live Chat / Users.
//
// We treat every count as a small integer; the response shape is
// otherwise larger but the fetcher only types the bits we read so
// adding more counts later is a one-line change.
const adminStatsFetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((res) => {
    if (!res.ok) throw new Error('stats failed')
    return res.json() as Promise<{
      stats: {
        users: { todayNew: number }
        complaints: { open: number }
        consultations: { pending: number }
        liveChat: { waiting: number; active: number }
        // New: bookings counter so the Bookings sidebar row can light
        // up the same way Support / Live Chat do when there's
        // unattended work. We use `pending` (still awaiting admin
        // confirmation) as the urgent signal, not "today" — admins
        // already glance at the dashboard for today's load.
        bookings?: { pending: number; upcoming: number }
        // Dedicated Tickets badge — counts ONLY support_tickets rows
        // so the chip on /admin/complaints stays meaningful when the
        // contact-message queue (folded into `complaints.open`) is
        // empty but real tickets are still waiting.
        tickets?: { open: number }
        // Feedback inbox badge — `new` is the untriaged pile. Drives
        // the Feedback row chip the same way pendingBookings drives
        // Bookings.
        feedback?: { new: number; unactioned: number }
      }
    }>
  })

// ---------------------------------------------------------------------------
// "Seen" baselines — Google / Vercel-style badge clearing.
//
// Each admin surface (complaints, consultations, live-chat, users,
// bookings) writes a baseline value into localStorage when the admin
// lands on the page. The sidebar then displays only the *delta* —
// `max(0, currentCount - baseline)` — so the badge clears as soon as
// the admin opens the page and re-appears when a NEW item arrives.
//
// Using localStorage keeps this lightweight and per-device (matching
// how Gmail's "unseen" works in a single browser session). When admins
// log in from a different device the baseline starts fresh, which
// is the safe default — they'd rather be reminded of pending work
// than miss it.
// ---------------------------------------------------------------------------

const BASELINE_PREFIX = 'admin:badgeBaseline:'

function readBaseline(surface: string): number {
  if (typeof window === 'undefined') return 0
  try {
    const raw = window.localStorage.getItem(BASELINE_PREFIX + surface)
    if (!raw) return 0
    const n = parseInt(raw, 10)
    return Number.isFinite(n) && n >= 0 ? n : 0
  } catch {
    return 0
  }
}

/**
 * Wipe the baseline so the badge displays the full server count again.
 * Currently unused by the sidebar but exported for symmetry with
 * `markSurfaceSeen`. Useful if we ever want a "show me everything
 * again" reset gesture in settings.
 */
export function resetSurfaceBaseline(surface: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(BASELINE_PREFIX + surface)
  } catch {
    /* noop */
  }
}

/**
 * Mark a surface "seen" — sets the baseline to the current count so
 * the sidebar pill drops to zero. Called from each admin list page's
 * client component on mount.
 */
export function markSurfaceSeen(surface: string, currentCount: number): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      BASELINE_PREFIX + surface,
      String(Math.max(0, currentCount)),
    )
    // Notify any other tabs / the sidebar in the same tab so its
    // displayed count refreshes immediately rather than waiting for
    // the next 30s SWR poll.
    window.dispatchEvent(
      new CustomEvent('admin:badge-seen', {
        detail: { surface, count: currentCount },
      }),
    )
  } catch {
    /* localStorage can be disabled (private mode) — fall through */
  }
}

/**
 * Compact notification chip used on the Support and Consultations
 * sidebar items. Renders nothing when `count` is 0 so quiet days
 * stay quiet. Caps display at 99+ so a viral incident can't blow
 * out the layout. The chip lives next to the row label and uses
 * brand-purple on its rest state so it ties to the rest of the
 * admin surface; on the active row (where the row itself is
 * brand-purple) it inverts to a white pill so the count stays
 * legible against the dark fill.
 */
function NavCountBadge({
  count,
  isActive,
}: {
  count: number
  isActive: boolean
}) {
  if (!count) return null
  const display = count > 99 ? '99+' : String(count)
  return (
    <span
      className={cn(
        // Flat brand-purple pill — the user explicitly asked us to
        // drop the gradient AND the soft shadow ("our color no
        // shadow"). No ring either; the pill needs to read as a
        // clean solid chip in our brand purple, not a dimensional
        // floating element. On the active row the chip inverts to
        // a flat white pill with brand text so the count stays
        // legible against the dark active-row fill.
        'relative min-w-[20px] h-[20px] inline-flex items-center justify-center rounded-full text-[10.5px] font-bold tabular-nums px-1.5 leading-none',
        isActive
          ? 'bg-white text-[#7B2D8E]'
          : 'bg-[#7B2D8E] text-white'
      )}
      aria-label={`${count} unread`}
    >
      {display}
    </span>
  )
}

export default function AdminSidebar({ userRole, userName, userAvatar, permissions }: SidebarProps) {
  const pathname = usePathname()
  // Filter the canonical nav list by the per-admin permission map.
  // Done at the top of the component so every render path (including
  // the collapsed rail and the mobile drawer) sees the same trimmed
  // set — there's only one place a hidden route can leak into the UI.
  const visibleNavItems = useMemo(() => {
    return adminNavItems.filter((item) => {
      // Default — when no permissions object is provided we show
      // every link (preserves the legacy behaviour for any caller
      // that hasn't been updated yet).
      if (!permissions) return true
      if (item.href === '/admin/schedules' && !permissions.canSeeQstash) return false
      if (item.href === '/admin/features' && !permissions.canSeeFeatureFlags) return false
      if (item.href === '/admin/consultations' && !permissions.canSeeConsultations) return false
      return true
    })
  }, [permissions])
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  // Optimistic mirror of the avatar — flipped the second the picker
  // saves, so the rail updates without waiting for the next /me poll.
  const [localAvatar, setLocalAvatar] = useState<string | null>(userAvatar ?? null)
  useEffect(() => {
    setLocalAvatar(userAvatar ?? null)
  }, [userAvatar])

  const handleAvatarSelect = async (url: string) => {
    // Persist via the same profile endpoint customers use. Admins /
    // staff store their portrait on the same `users.avatar_url`
    // column, so a single endpoint handles both flows.
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // The PUT endpoint requires firstName + lastName to be sent
        // along; we pull them from the displayed userName so we
        // don't accidentally clobber other fields.
        firstName: userName.split(' ')[0] ?? userName,
        lastName: userName.split(' ').slice(1).join(' ') || '-',
        avatarUrl: url,
      }),
    })
    if (!res.ok) {
      throw new Error('Failed to save portrait')
    }
    setLocalAvatar(url)
    // Notify any other component that reads the current user (header
    // chips, dashboard greeting, etc.) so they refresh too.
    try {
      await globalMutate('/api/auth/me')
    } catch {
      /* noop */
    }
  }

  // Live count of items needing attention. Refetches every 30s so the
  // badge stays current while the admin is on a long-running page.
  // `keepPreviousData` avoids the badge flickering to 0 between polls.
  const { data: statsData } = useSWR(
    '/api/admin/stats',
    adminStatsFetcher,
    {
      refreshInterval: 30_000,
      revalidateOnFocus: true,
      keepPreviousData: true,
      shouldRetryOnError: false,
    },
  )
  const openComplaints = statsData?.stats.complaints.open ?? 0
  const pendingConsultations = statsData?.stats.consultations.pending ?? 0
  const waitingLiveChats = statsData?.stats.liveChat?.waiting ?? 0
  const newUsersToday = statsData?.stats.users?.todayNew ?? 0
  const pendingBookings = statsData?.stats.bookings?.pending ?? 0
  // New live counts for the Tickets / Feedback sidebar rows. Both
  // fields are optional in the response so legacy environments
  // (older stats endpoint) cleanly read as 0 with no badge.
  const openTickets = statsData?.stats.tickets?.open ?? 0
  const newFeedback = statsData?.stats.feedback?.new ?? 0

  // Tick — bumped whenever the admin visits a surface so the Google /
  // Vercel-style "seen" baselines re-read from localStorage. Without
  // this hook the badge would only refresh on the next 30s SWR poll
  // and clearing the badge would feel laggy.
  const [seenTick, setSeenTick] = useState(0)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = () => setSeenTick((t) => t + 1)
    window.addEventListener('admin:badge-seen', handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener('admin:badge-seen', handler)
      window.removeEventListener('storage', handler)
    }
  }, [])
  // Re-evaluate baselines on every render that depends on the tick.
  // We touch the variable so eslint doesn't flag it as unused.
  void seenTick

  // Map an admin nav href → live count, with the per-surface "seen"
  // baseline subtracted so badges clear after the admin opens the
  // page. We keep `max(0, ...)` to avoid negative counts when items
  // are resolved off-page (e.g. another admin closes a complaint
  // while you're on a different tab).
  //
  // Note: /admin/complaints in this build serves the "Tickets" row
  // in the sidebar (the label was renamed but the URL stayed for
  // backwards-compatibility). We drive its count off the dedicated
  // tickets.open counter rather than the unified complaints.open
  // tally so the chip stays meaningful even when the underlying
  // contact_messages queue is empty.
  const getCount = (href: string): number => {
    if (href === '/admin/complaints')
      return Math.max(0, openTickets - readBaseline('tickets'))
    if (href === '/admin/consultations')
      return Math.max(0, pendingConsultations - readBaseline('consultations'))
    if (href === '/admin/live-chat')
      return Math.max(0, waitingLiveChats - readBaseline('live-chat'))
    if (href === '/admin/users')
      return Math.max(0, newUsersToday - readBaseline('users'))
    if (href === '/admin/bookings')
      return Math.max(0, pendingBookings - readBaseline('bookings'))
    if (href === '/admin/feedback')
      return Math.max(0, newFeedback - readBaseline('feedback'))
    return 0
  }

  // Total unread across all surfaces — used for the mobile top-bar
  // hamburger so admins on phones (where the rail is hidden) still
  // see an at-a-glance "you have 3 things to look at" cue.
  const totalAttentionCount =
    openComplaints + pendingConsultations + waitingLiveChats + newUsersToday

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
    // Use the shared helper so the localStorage user cache is wiped
    // before the redirect — without this, the home page's first paint
    // briefly shows the just-logged-out admin's name/avatar before
    // /api/auth/me's 401 lands and clears it.
    await logoutAndRedirect('/')
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
            aria-label={
              isMobileOpen
                ? 'Close menu'
                : totalAttentionCount > 0
                  ? `Open menu, ${totalAttentionCount} item${totalAttentionCount === 1 ? '' : 's'} need attention`
                  : 'Open menu'
            }
            aria-expanded={isMobileOpen}
            className={cn(
              '-ml-1.5 relative grid place-items-center h-9 w-9 rounded-md transition-colors active:scale-95',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2D8E]/30',
              isMobileOpen ? 'text-[#7B2D8E]' : 'text-gray-800 hover:text-[#7B2D8E]'
            )}
          >
            <HamburgerIcon open={isMobileOpen} />
            {/* Tiny brand-purple dot when there are unread items in
                Support / Consultations. Only shows while the menu is
                closed, so once the admin opens the drawer (and sees
                the row-level badges) the redundant signal goes away. */}
            {!isMobileOpen && totalAttentionCount > 0 && (
              <span
                aria-hidden
                className="absolute top-1.5 right-1.5 block w-2 h-2 rounded-full bg-[#7B2D8E] ring-2 ring-white"
              />
            )}
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

          {/* Right cluster — notification bell + portrait. The bell
              shares the same component used on the customer-facing
              header so admins on phones (where the rail is hidden
              and only the mobile top bar is visible) still get a
              one-tap inbox of replies, broadcasts and system
              notifications without having to switch surfaces. */}
          <div className="flex items-center gap-1.5">
            <NotificationBell audience="admin" />
            {/* Profile avatar — opens the team avatar picker on tap.
                Previously linked to /admin/settings which felt
                redundant since Settings is already in the rail. */}
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              aria-label="Change portrait"
              className="h-9 w-9 rounded-full bg-[#F8F2FB] flex items-center justify-center overflow-hidden hover:bg-[#7B2D8E]/15 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2D8E]/30"
            >
              {localAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={localAvatar}
                  alt={`${userName} avatar`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs font-bold text-[#7B2D8E]">
                  {userName.charAt(0).toUpperCase()}
                </span>
              )}
            </button>
          </div>
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
          {(['main', 'platform'] as const).map((group, gi) => {
            const items = visibleNavItems.filter((i) => i.group === group)
            // Skip the whole group section when nothing in it is
            // visible — avoids rendering a stranded "Platform Controls"
            // header above an empty list for non-super admins whose
            // platform group still has Banners / Vouchers / Broadcast /
            // Blog visible (and so won't actually be empty), but stays
            // safe if a future filter removes everything.
            if (items.length === 0) return null
            return (
              <div key={group} className={cn(gi > 0 && 'pt-3 mt-3 border-t border-gray-100')}>
                <div className={cn('mb-2', isCollapsed && 'hidden')}>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3">
                    {group === 'main' ? 'Menu' : 'Platform Controls'}
                  </p>
                </div>
                <div className="space-y-1">
                  {items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== '/admin' && pathname.startsWith(item.href))
                    // Live unread/pending count for this item — drives the
                    // notification chip on Support and Consultations.
                    const liveCount = getCount(item.href)
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
                        <div className="relative flex-shrink-0">
                          <item.icon
                            className={cn(
                              'w-[18px] h-[18px]',
                              isActive ? 'text-white' : 'text-gray-400'
                            )}
                          />
                          {/* Collapsed-rail dot — when the sidebar is
                              collapsed we can't show the full count
                              chip in the row, so a tiny brand-purple
                              dot is overlaid on the icon to surface
                              "you have unread items" without crowding
                              the rail. */}
                          {isCollapsed && liveCount > 0 && (
                            <span
                              aria-hidden
                              className="absolute -top-0.5 -right-0.5 block w-2 h-2 rounded-full bg-[#7B2D8E] ring-2 ring-white"
                            />
                          )}
                        </div>
                        {!isCollapsed && (
                          <>
                            <span className="text-sm font-medium flex-1 truncate">
                              {item.label}
                            </span>
                            {/* Live count chip takes priority over
                                the static "NEW" badge so a backlog of
                                unanswered tickets actually surfaces. */}
                            {liveCount > 0 ? (
                              <NavCountBadge count={liveCount} isActive={isActive} />
                            ) : item.badge ? (
                              <span
                                className={cn(
                                  'text-[10px] font-semibold px-1.5 py-0.5 rounded',
                                  isActive
                                    ? 'bg-white/20 text-white'
                                    : 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
                                )}
                              >
                                {item.badge}
                              </span>
                            ) : null}
                          </>
                        )}
                        {isCollapsed && (
                          <div className="absolute left-full ml-3 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                            {item.label}
                            {liveCount > 0 && (
                              <span className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-4 rounded-full bg-[#7B2D8E] text-white text-[9.5px] font-bold px-1">
                                {liveCount > 99 ? '99+' : liveCount}
                              </span>
                            )}
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
          {/* Desktop profile row.
              ----------------------------------------------------------
              The profile button (avatar + name → opens the team
              portrait picker) and the notification bell now sit as
              flex siblings instead of nesting the bell inside the
              profile button (which would be invalid HTML — buttons
              can't contain other buttons). The bell uses the same
              shared `NotificationBell` component the customer header
              and the staff top bar use, so the dropdown, unread
              counter and "Mark all read" action all behave the same
              way across the product. */}
          <div
            className={cn(
              'flex items-center gap-1 w-full',
              isCollapsed && 'flex-col gap-2'
            )}
          >
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              aria-label="Change portrait"
              className={cn(
                'flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors flex-1 min-w-0 text-left',
                isCollapsed && 'flex-none px-0 justify-center'
              )}
            >
              <div className="w-9 h-9 rounded-lg bg-[#F8F2FB] flex items-center justify-center flex-shrink-0 overflow-hidden">
                {localAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={localAvatar}
                    alt={`${userName} avatar`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-bold text-[#7B2D8E]">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {userName}
                  </p>
                  <p className="text-[11px] text-[#7B2D8E] capitalize font-medium">
                    {userRole}{' '}
                    <span className="text-gray-400 font-normal">
                      · tap to change
                    </span>
                  </p>
                </div>
              )}
            </button>
            {/* Inline notification bell — sibling of the profile
                button so admins on desktop get a one-tap inbox in
                the rail itself, without a separate top bar. */}
            <div className="flex-shrink-0">
              <NotificationBell audience="admin" />
            </div>
          </div>
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

      {/* Curated portrait picker — role-aware so admins see the admin
          pool (women + IT engineer) and staff see the staff pool
          (women only). Mounted at the sidebar root so the modal sits
          above the rail and any open mobile drawer. */}
      <TeamAvatarPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        currentUrl={localAvatar}
        initials={userName.charAt(0).toUpperCase()}
        role={userRole}
        // Gender narrows the admin pool: the super admin (Sidihost)
        // sees the male-only portraits; everyone else (Itunu, Franca,
        // future female admins) sees the female-only pool. Staff is
        // always women-only regardless of this prop.
        gender={
          userRole === 'admin' && permissions?.isSuperAdmin
            ? 'male'
            : 'female'
        }
        onSelect={handleAvatarSelect}
      />
    </>
  )
}
