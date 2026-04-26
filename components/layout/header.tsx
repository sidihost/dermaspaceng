'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { 
  X, 
  ChevronRight, 
  ChevronDown, 
  User, 
  Droplets, 
  Leaf, 
  Images, 
  Feather, 
  HandHeart, 
  CalendarCheck, 
  Users, 
  MessageCircleQuestion, 
  FileText, 
  Bath, 
  Flower2, 
  Heart, 
  Gift, 
  Shell,
  LogOut,
  Settings,
  Wallet,
  Clock,
  Zap,
  Sparkles,
  Scissors,
  Bell as BellIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { NotificationBell } from '@/components/shared/notification-bell'

interface UserData {
  firstName: string
  lastName: string
  email: string
  avatarUrl?: string | null
}

// Cache user data in memory to prevent flash
let cachedUser: UserData | null = null
let authCheckDone = false

// Time-based greeting helper
const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

const navLinks = [
  { 
    name: 'Services', 
    href: '/services',
    icon: Flower2,
    hasDropdown: true,
    dropdownItems: [
      { name: 'All Services', href: '/services', icon: Flower2 },
      { name: 'Facial Treatments', href: '/services/facial-treatments', icon: Flower2 },
      { name: 'Body Treatments', href: '/services/body-treatments', icon: Bath },
      { name: 'Laser Tech', href: '/laser-tech', icon: Zap },
      { name: 'Nail Care', href: '/services/nail-care', icon: Heart },
      { name: 'Waxing', href: '/services/waxing', icon: Scissors },
    ]
  },
  { name: 'Laser Treatments', href: '/laser-tech', icon: Zap },
  { 
    name: 'Packages', 
    href: '/packages',
    icon: Gift,
    hasDropdown: true,
    dropdownItems: [
      { name: 'All Packages', href: '/packages', icon: Gift },
      { name: 'Bridal Packages', href: '/packages#bridal', icon: Flower2 },
      { name: 'Couples Spa', href: '/packages#couples', icon: Heart },
      { name: 'VIP Experience', href: '/packages#vip', icon: Shell },
    ]
  },
  { name: 'Membership', href: '/membership', icon: Leaf },
  { name: 'Gallery', href: '/gallery', icon: Images },
  { 
    name: 'About', 
    href: '/about',
    icon: Feather,
    hasDropdown: true,
    dropdownItems: [
      { name: 'Our Story', href: '/about', icon: Feather },
      { name: 'Our Team', href: '/about#team', icon: Users },
      { name: 'FAQ', href: '/#faq', icon: MessageCircleQuestion },
      { name: 'Survey', href: '/survey', icon: FileText },
    ]
  },
  { name: 'Contact', href: '/contact', icon: HandHeart },
  { name: 'Book Consultation', href: '/consultation', icon: CalendarCheck },
]

export default function Header() {
  const router = useRouter()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<UserData | null>(cachedUser)
  const [isAuthLoading, setIsAuthLoading] = useState(!authCheckDone)
  const [showBanner, setShowBanner] = useState(true)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [mobileExpandedMenu, setMobileExpandedMenu] = useState<string | null>(null)
  const [showCartTooltip, setShowCartTooltip] = useState(false)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const profileDropdownRef = useRef<HTMLDivElement>(null)
  const mobileProfileDropdownRef = useRef<HTMLDivElement>(null)

  // Check if user is logged in - with caching for instant display.
  // We always revalidate in the background (stale-while-revalidate)
  // so profile changes (new avatar, name update, etc.) reflect in the
  // header without needing a hard reload.
  useEffect(() => {
    let cancelled = false

    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (cancelled) return
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            cachedUser = data.user
            setUser(data.user)
          } else {
            cachedUser = null
            setUser(null)
          }
        } else {
          cachedUser = null
          setUser(null)
        }
      } catch {
        if (!cancelled) {
          cachedUser = null
          setUser(null)
        }
      } finally {
        if (!cancelled) {
          authCheckDone = true
          setIsAuthLoading(false)
        }
      }
    }

    // Show cached value immediately (if we have one) so the header
    // doesn't flicker, then revalidate in the background.
    if (authCheckDone) {
      setUser(cachedUser)
      setIsAuthLoading(false)
    }
    fetchUser()

    // Listen for profile updates from anywhere in the app (avatar,
    // name, etc.) so the header refreshes without a page reload.
    const onUserUpdated = () => {
      fetchUser()
    }
    window.addEventListener('user-updated', onUserUpdated)

    return () => {
      cancelled = true
      window.removeEventListener('user-updated', onUserUpdated)
    }
  }, [])

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
  }, [isMobileMenuOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null)
      }
      const clickedInsideDesktop = profileDropdownRef.current?.contains(event.target as Node)
      const clickedInsideMobile = mobileProfileDropdownRef.current?.contains(event.target as Node)
      if (!clickedInsideDesktop && !clickedInsideMobile) {
        setShowProfileDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <>
      {/* Notification Banner - Hide on mobile when logged in */}
      {showBanner && (
        <div className={cn(
          "bg-[#7B2D8E] text-white py-2.5 px-4",
          user && !isAuthLoading ? "hidden lg:block" : ""
        )}>
          <div className="max-w-6xl mx-auto flex items-center justify-center gap-3">
            <p className="text-xs sm:text-sm text-center">
              Welcome to our new website! Experience seamless booking.
            </p>
            <button 
              onClick={() => setShowBanner(false)}
              className="p-1 hover:bg-white/10 rounded-full transition-colors flex-shrink-0"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile Minimal Header - Only for logged in users on mobile */}
      {user && !isAuthLoading && (
        <header className={cn(
          'sticky top-0 z-50 transition-all duration-300 lg:hidden',
          isScrolled 
            ? 'bg-white/95 backdrop-blur-md shadow-sm' 
            : 'bg-white'
        )}>
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center justify-between h-14">
              {/* Logo */}
              <Link href="/" className="flex-shrink-0">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-EdcQ7u5ESh5sPzpgMsL9Sep8NnY0iu.webp"
                  alt="Dermaspace"
                  width={120}
                  height={36}
                  className="h-8 w-auto"
                  priority
                />
              </Link>

              {/* User actions: notification bell + greeting/avatar.
                  The previous fix hid the greeting outright on phones,
                  but the user wanted it kept. The real bug was that
                  "Good morning" was free-wrapping inside a flex column
                  that was being shrunk by sibling content — so we keep
                  the greeting visible on every viewport and prevent
                  wrapping with `whitespace-nowrap`, while keeping the
                  pill `flex-shrink-0` so it never gets squashed below
                  its natural width. The bell stays compact (w-9 h-9)
                  and the avatar pill keeps its iOS-style padding. */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <NotificationBell />
              <div className="relative" ref={mobileProfileDropdownRef}>
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="flex items-center gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-[#7B2D8E]/5 hover:bg-[#7B2D8E]/10 transition-colors flex-shrink-0"
                >
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-[#7B2D8E] whitespace-nowrap leading-tight">{getGreeting()}</span>
                    <span className="text-xs font-semibold text-gray-900 whitespace-nowrap leading-tight">{user.firstName}</span>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-[#7B2D8E] flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                    {user.avatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={user.avatarUrl}
                        alt=""
                        aria-hidden="true"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <>
                        {user.firstName?.charAt(0)}
                        {user.lastName?.charAt(0)}
                      </>
                    )}
                  </div>
                </button>

                {/* Mobile Profile Dropdown */}
                {showProfileDropdown && (
                  <div className="absolute top-full right-0 mt-2 w-56 rounded-xl border border-gray-100 bg-white shadow-lg overflow-hidden z-50">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                      <p className="text-sm font-semibold text-[#7B2D8E]">{user.firstName} {user.lastName}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                    
                    {/* Menu Items */}
                    <div className="py-1">
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-[#7B2D8E]/5 hover:text-[#7B2D8E] transition-colors"
                      >
                        <User className="w-4 h-4 text-[#7B2D8E]" />
                        Dashboard
                      </Link>
                      <Link
                        href="/dashboard?tab=appointments"
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-[#7B2D8E]/5 hover:text-[#7B2D8E] transition-colors"
                      >
                        <Clock className="w-4 h-4 text-[#7B2D8E]" />
                        My Bookings
                      </Link>
                      <Link
                        href="/dashboard/notifications"
                        onClick={() => setShowProfileDropdown(false)}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-[#7B2D8E]/5 hover:text-[#7B2D8E] transition-colors"
                      >
                        <BellIcon className="w-4 h-4 text-[#7B2D8E]" />
                        Notifications
                      </Link>
                      <Link
                        href="/dashboard/wallet"
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-[#7B2D8E]/5 hover:text-[#7B2D8E] transition-colors"
                      >
                        <Wallet className="w-4 h-4 text-[#7B2D8E]" />
                        Wallet
                      </Link>
                      <Link
                        href="/dashboard/settings"
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-[#7B2D8E]/5 hover:text-[#7B2D8E] transition-colors"
                      >
                        <Settings className="w-4 h-4 text-[#7B2D8E]" />
                        Settings
                      </Link>
                    </div>

                    {/* Logout */}
                    <div className="border-t border-gray-100 py-1">
                      <button
                        onClick={async () => {
                          setShowProfileDropdown(false)
                          await fetch('/api/auth/logout', { method: 'POST' })
                          cachedUser = null
                          authCheckDone = false
                          window.location.href = '/'
                        }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-[#7B2D8E] hover:bg-[#7B2D8E]/5 transition-colors"
                      >
                        <LogOut className="w-4 h-4 text-[#7B2D8E]" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Full Header - Desktop always, Mobile only when not logged in */}
      <header className={cn(
        'sticky top-0 z-50 transition-all duration-300',
        isScrolled 
          ? 'bg-white/95 backdrop-blur-md' 
          : 'bg-white',
        user && !isAuthLoading ? 'hidden lg:block' : ''
      )}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-EdcQ7u5ESh5sPzpgMsL9Sep8NnY0iu.webp"
                alt="Dermaspace"
                width={140}
                height={42}
                className="h-9 w-auto"
                priority
              />
            </Link>

            {/* Desktop Nav with Dropdowns */}
            <nav className="hidden lg:flex items-center gap-1" ref={dropdownRef}>
              {navLinks.slice(0, 8).map((link) => (
                <div key={link.name} className="relative">
                  {link.hasDropdown ? (
                    <>
                      <button
                        onClick={() => setActiveDropdown(activeDropdown === link.name ? null : link.name)}
                        className={cn(
                          "flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors rounded-lg",
                          activeDropdown === link.name 
                            ? "text-[#7B2D8E] bg-[#7B2D8E]/5" 
                            : "text-gray-600 hover:text-[#7B2D8E]"
                        )}
                      >
                        {link.name}
                        <ChevronDown className={cn(
                          "w-3.5 h-3.5 transition-transform",
                          activeDropdown === link.name && "rotate-180"
                        )} />
                      </button>
                      
                      {/* Dropdown Menu */}
                      {activeDropdown === link.name && (
                        <div className="absolute top-full left-0 mt-1 w-48 rounded-xl border border-gray-100 bg-white overflow-hidden">
                          {link.dropdownItems?.map((item, idx) => {
                            const ItemIcon = item.icon
                            return (
                              <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => setActiveDropdown(null)}
                                className={cn(
                                  "flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-gray-600 hover:bg-[#7B2D8E]/5 hover:text-[#7B2D8E]",
                                  idx === 0 && "font-medium"
                                )}
                              >
                                {ItemIcon && <ItemIcon className="w-4 h-4" />}
                                {item.name}
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      href={link.href}
                      className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-[#7B2D8E] transition-colors"
                    >
                      {link.name}
                    </Link>
                  )}
                </div>
              ))}
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2">
              {/* Shop Icon - Animated Shopping Bag */}
              <div className="relative">
                <button
                  onClick={() => setShowCartTooltip(!showCartTooltip)}
                  className="relative p-2 transition-all duration-300 group"
                  aria-label="Shop - Coming soon"
                >
                  <div className="relative w-6 h-6">
                    <svg 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-6 h-6 shop-bag-icon"
                    >
                      {/* Shopping bag body */}
                      <path 
                        d="M6 6h12l1.5 14H4.5L6 6z"
                        className="fill-[#7B2D8E]/15 stroke-[#7B2D8E]"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                      />
                      {/* Bag handles */}
                      <path 
                        d="M9 6V5a3 3 0 116 0v1"
                        className="stroke-[#7B2D8E] shop-handle"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        fill="none"
                      />
                      {/* Heart/love icon inside bag */}
                      <path 
                        d="M12 11c-.5-.7-1.5-1-2.2-.6-.9.5-1 1.8-.3 2.5l2.5 2.5 2.5-2.5c.7-.7.6-2-.3-2.5-.7-.4-1.7-.1-2.2.6z"
                        className="fill-[#7B2D8E] shop-heart"
                      />
                    </svg>
                    {/* Animated sparkles around the bag */}
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-[#7B2D8E] rounded-full shop-sparkle-1" />
                    <span className="absolute top-1 -left-1 w-1 h-1 bg-[#7B2D8E]/70 rounded-full shop-sparkle-2" />
                    <span className="absolute -bottom-0.5 right-1 w-1 h-1 bg-[#7B2D8E]/50 rounded-full shop-sparkle-3" />
                  </div>
                </button>
                
                {/* Tooltip */}
                {showCartTooltip && (
                  <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-[#7B2D8E] text-white text-sm font-medium rounded-lg shadow-lg whitespace-nowrap animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                    Coming soon
                    <div className="absolute -top-1 right-4 w-2 h-2 bg-[#7B2D8E] rotate-45" />
                  </div>
                )}
              </div>

              {/* Profile or Auth buttons */}
              {isAuthLoading ? (
                <div className="hidden lg:flex items-center gap-2 px-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
                  <div className="w-16 h-4 rounded bg-gray-200 animate-pulse" />
                </div>
              ) : user ? (
                <div className="hidden lg:flex items-center gap-2">
                  {/* Notification bell — sits inline with the avatar
                      pill so the header reads "alerts → identity" the
                      same way Instagram, Notion and Linear lay it out.
                      Polls /api/notifications and opens an inline tray
                      on click; doesn't navigate, so the avatar dropdown
                      can stay co-located without focus-stealing. */}
                  <NotificationBell />
                <div className="relative" ref={profileDropdownRef}>
                  <button
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#7B2D8E]/10 via-[#7B2D8E]/5 to-transparent hover:from-[#7B2D8E]/15 hover:via-[#7B2D8E]/10 border border-[#7B2D8E]/10 hover:border-[#7B2D8E]/20 transition-all duration-300 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#7B2D8E] flex items-center justify-center text-white text-sm font-bold shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300 overflow-hidden">
                      {user.avatarUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={user.avatarUrl}
                          alt=""
                          aria-hidden="true"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <>
                          {user.firstName?.charAt(0)}
                          {user.lastName?.charAt(0)}
                        </>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-[#7B2D8E] font-medium">{getGreeting()},</span>
                      <span className="text-sm font-bold text-gray-900 group-hover:text-[#7B2D8E] transition-colors">{user.firstName}</span>
                    </div>
                    <ChevronDown className={cn(
                      "w-4 h-4 text-[#7B2D8E]/50 group-hover:text-[#7B2D8E] transition-all",
                      showProfileDropdown && "rotate-180"
                    )} />
                  </button>

                  {/* Profile Dropdown Menu */}
                  {showProfileDropdown && (
                    <div className="absolute top-full right-0 mt-2 w-56 rounded-xl border border-gray-100 bg-white shadow-lg overflow-hidden z-50">
                      {/* User Info */}
                      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                        <p className="text-sm font-semibold text-[#7B2D8E]">{user.firstName} {user.lastName}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                      
                      {/* Menu Items */}
                      <div className="py-1">
                        <Link
                          href="/dashboard"
                          onClick={() => setShowProfileDropdown(false)}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-[#7B2D8E]/5 hover:text-[#7B2D8E] transition-colors"
                        >
                          <User className="w-4 h-4 text-[#7B2D8E]" />
                          Dashboard
                        </Link>
                        <Link
                          href="/dashboard?tab=appointments"
                          onClick={() => setShowProfileDropdown(false)}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-[#7B2D8E]/5 hover:text-[#7B2D8E] transition-colors"
                        >
                          <Clock className="w-4 h-4 text-[#7B2D8E]" />
                          My Bookings
                        </Link>
                        <Link
                          href="/dashboard/notifications"
                          onClick={() => setShowProfileDropdown(false)}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-[#7B2D8E]/5 hover:text-[#7B2D8E] transition-colors"
                        >
                          <BellIcon className="w-4 h-4 text-[#7B2D8E]" />
                          Notifications
                        </Link>
                        <Link
                          href="/dashboard/wallet"
                          onClick={() => setShowProfileDropdown(false)}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-[#7B2D8E]/5 hover:text-[#7B2D8E] transition-colors"
                        >
                          <Wallet className="w-4 h-4 text-[#7B2D8E]" />
                          Wallet
                        </Link>
                        <Link
                          href="/dashboard/settings"
                          onClick={() => setShowProfileDropdown(false)}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-[#7B2D8E]/5 hover:text-[#7B2D8E] transition-colors"
                        >
                          <Settings className="w-4 h-4 text-[#7B2D8E]" />
                          Settings
                        </Link>
                      </div>

                      {/* Logout */}
                      <div className="border-t border-gray-100 py-1">
                        <button
                          onClick={async () => {
                            setShowProfileDropdown(false)
                            await fetch('/api/auth/logout', { method: 'POST' })
                            cachedUser = null
                            authCheckDone = false
                            window.location.href = '/'
                          }}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-[#7B2D8E] hover:bg-[#7B2D8E]/5 transition-colors"
                        >
                          <LogOut className="w-4 h-4 text-[#7B2D8E]" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                </div>
              ) : (
                <>
                  <Link
                    href="/signin"
                    className="hidden lg:inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 hover:text-[#7B2D8E] transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    className="hidden lg:inline-flex items-center px-5 py-2 text-sm font-semibold text-white bg-[#7B2D8E] rounded-xl hover:bg-[#5A1D6A] transition-colors"
                  >
                    Sign Up
                  </Link>
                </>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-[#7B2D8E]/5"
                aria-label="Open menu"
              >
                <div className="flex flex-col gap-1">
                  <span className="w-4 h-0.5 rounded-full bg-[#7B2D8E]" />
                  <span className="w-3 h-0.5 rounded-full bg-[#7B2D8E]" />
                  <span className="w-4 h-0.5 rounded-full bg-[#7B2D8E]" />
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div className={cn(
        'fixed inset-0 z-[100] transition-all duration-300',
        isMobileMenuOpen ? 'visible' : 'invisible'
      )}>
        <div 
          className={cn(
            'absolute inset-0 bg-black/50 transition-opacity duration-300',
            isMobileMenuOpen ? 'opacity-100' : 'opacity-0'
          )}
          onClick={() => setIsMobileMenuOpen(false)}
        />

        <div className={cn(
          'absolute top-0 right-0 w-full max-w-sm h-full bg-white transition-transform duration-300 ease-out overflow-y-auto flex flex-col',
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        )}>
          <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-100">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-EdcQ7u5ESh5sPzpgMsL9Sep8NnY0iu.webp"
              alt="Dermaspace"
              width={100}
              height={30}
              className="h-7 w-auto"
            />
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5 text-gray-900" />
            </button>
          </div>

          <nav className="flex-1 p-4">
            {navLinks.map((link, idx) => {
              const LinkIcon = link.icon
              return (
              <div key={link.name}>
                {link.hasDropdown ? (
                  <>
                    <button
                      onClick={() => setMobileExpandedMenu(mobileExpandedMenu === link.name ? null : link.name)}
                      className="flex items-center justify-between w-full py-2.5 border-b border-gray-100"
                      style={{
                        animation: isMobileMenuOpen ? `slideInRight 0.3s ease-out ${idx * 50}ms forwards` : 'none',
                        opacity: isMobileMenuOpen ? 1 : 0,
                      }}
                    >
                      <span className="flex items-center gap-3 text-base font-medium text-gray-900">
                        {LinkIcon && <LinkIcon className="w-5 h-5 text-[#7B2D8E]" />}
                        {link.name}
                      </span>
                      <ChevronDown className={cn(
                        "w-4 h-4 transition-transform text-gray-500",
                        mobileExpandedMenu === link.name && "rotate-180"
                      )} />
                    </button>
                    
                    {mobileExpandedMenu === link.name && (
                      <div className="pl-4 py-2 bg-gray-50">
                        {link.dropdownItems?.map((item) => {
                          const ItemIcon = item.icon
                          return (
                            <Link
                              key={item.name}
                              href={item.href}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className="flex items-center justify-between py-2.5 text-gray-600"
                            >
                              <span className="flex items-center gap-2.5 text-sm">
                                {ItemIcon && <ItemIcon className="w-4 h-4 text-[#7B2D8E]" />}
                                {item.name}
                              </span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-between py-2.5 border-b border-gray-100 group"
                    style={{
                      animation: isMobileMenuOpen ? `slideInRight 0.3s ease-out ${idx * 50}ms forwards` : 'none',
                      opacity: isMobileMenuOpen ? 1 : 0,
                    }}
                  >
                    <span className="flex items-center gap-3 text-base font-medium text-gray-900 group-hover:text-[#7B2D8E] transition-colors">
                      {LinkIcon && <LinkIcon className="w-5 h-5 text-[#7B2D8E]" />}
                      {link.name}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#7B2D8E] group-hover:translate-x-1 transition-all" />
                  </Link>
                )}
              </div>
            )})}
          </nav>

          <div className="flex-shrink-0 p-4 border-t border-gray-100 bg-gray-50 mt-auto">
            {isAuthLoading ? (
              <div className="flex items-center justify-center w-full py-3">
                <div className="w-6 h-6 border-2 border-[#7B2D8E] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : user ? (
              <div className="grid grid-cols-2 gap-3">
                  <Link
                    href="/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 p-3 bg-[#7B2D8E] rounded-xl text-white hover:bg-[#5A1D6A] transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-xs font-bold overflow-hidden">
                      {user.avatarUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={user.avatarUrl}
                          alt=""
                          aria-hidden="true"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <>
                          {user.firstName?.charAt(0)}
                          {user.lastName?.charAt(0)}
                        </>
                      )}
                    </div>
                    <span className="text-sm font-semibold">Dashboard</span>
                  </Link>
                  <Link
                    href="/booking"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 p-3 bg-[#7B2D8E]/10 rounded-xl text-[#7B2D8E] hover:bg-[#7B2D8E]/20 border border-[#7B2D8E]/20 transition-colors"
                  >
                    <CalendarCheck className="w-5 h-5" />
                    <span className="text-sm font-semibold">Book Now</span>
                  </Link>
              </div>
            ) : (
              <div className="flex gap-3">
                <Link
                  href="/signin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex-1 flex items-center justify-center py-3 text-sm font-semibold text-[#7B2D8E] border border-[#7B2D8E] rounded-xl hover:bg-[#7B2D8E]/5 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex-1 flex items-center justify-center py-3 text-sm font-semibold text-white bg-[#7B2D8E] rounded-xl hover:bg-[#5A1D6A] transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        /* Shop icon elegant animations */
        .shop-icon-container {
          position: relative;
        }
        
        .shop-shimmer {
          background: linear-gradient(
            110deg,
            transparent 25%,
            rgba(123, 45, 142, 0.08) 50%,
            transparent 75%
          );
          background-size: 200% 100%;
          animation: shimmer 3s ease-in-out infinite;
        }
        
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        
        .shop-ring {
          border: 2px solid transparent;
          background: linear-gradient(white, white) padding-box,
                      linear-gradient(135deg, transparent 40%, rgba(123, 45, 142, 0.3) 50%, transparent 60%) border-box;
          background-size: 100% 100%, 300% 300%;
          animation: ring-sweep 4s linear infinite;
        }
        
        @keyframes ring-sweep {
          0% { background-position: 0 0, 0% 0%; }
          100% { background-position: 0 0, 300% 300%; }
        }
        
        .shop-icon-svg {
          animation: icon-float 3s ease-in-out infinite;
        }
        
        @keyframes icon-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        
        .shop-icon-btn:hover .shop-shimmer {
          animation-duration: 1.5s;
        }
        
        .shop-icon-btn:hover .shop-ring {
          animation-duration: 2s;
        }
        
        .shop-icon-btn:hover .shop-icon-svg {
          animation: none;
          transform: scale(1.1);
        }
        
        .animate-in {
          animation: animateIn 0.2s ease-out;
        }
        
        @keyframes animateIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .delay-75 { animation-delay: 75ms; }
        .delay-150 { animation-delay: 150ms; }
      `}</style>
    </>
  )
}
