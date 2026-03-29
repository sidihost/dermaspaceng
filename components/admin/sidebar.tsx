'use client'

import Link from 'next/link'
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
  Menu,
  LogOut,
  TrendingUp,
  X,
  CreditCard,
  Shield,
  Sparkles,
} from 'lucide-react'
import { useState } from 'react'

interface SidebarProps {
  userRole: 'admin' | 'staff'
  userName: string
}

const adminNavItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard', badge: null },
  { href: '/admin/bookings', icon: Calendar, label: 'Bookings', badge: 'new' },
  { href: '/admin/clients', icon: Users, label: 'Clients', badge: null },
  { href: '/admin/payments', icon: CreditCard, label: 'Payments', badge: null },
  { href: '/admin/staff', icon: UserCog, label: 'Staff', badge: null },
  { href: '/admin/permissions', icon: Shield, label: 'Permissions', badge: null },
  { href: '/admin/services', icon: Sparkles, label: 'Services', badge: null },
  { href: '/admin/gift-cards', icon: Gift, label: 'Gift Cards', badge: null },
  { href: '/admin/complaints', icon: MessageSquare, label: 'Complaints', badge: null },
  { href: '/admin/consultations', icon: ClipboardList, label: 'Consultations', badge: null },
  { href: '/admin/activity', icon: Activity, label: 'Activity Log', badge: null },
  { href: '/admin/settings', icon: Settings, label: 'Settings', badge: null },
]

export default function AdminSidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/'
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-white shadow-lg border border-gray-100 lg:hidden hover:shadow-xl transition-all active:scale-95"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5 text-gray-700" />
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full bg-white border-r border-gray-100 transition-all duration-300 flex flex-col shadow-xl lg:shadow-none',
          isCollapsed ? 'w-20' : 'w-72',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Header */}
        <div className={cn(
          'flex items-center h-20 border-b border-gray-100 px-5',
          isCollapsed ? 'justify-center' : 'justify-between'
        )}>
          {!isCollapsed && (
            <Link href="/admin" className="flex items-center gap-3 group">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#7B2D8E] to-[#9B4DB0] flex items-center justify-center shadow-lg shadow-[#7B2D8E]/20 group-hover:scale-105 transition-transform">
                <span className="text-white font-bold text-lg">D</span>
              </div>
              <div>
                <h1 className="font-bold text-gray-900 text-base">Dermaspace</h1>
                <p className="text-xs text-[#7B2D8E] font-medium capitalize">{userRole} Panel</p>
              </div>
            </Link>
          )}
          {isCollapsed && (
            <Link href="/admin" className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#7B2D8E] to-[#9B4DB0] flex items-center justify-center shadow-lg shadow-[#7B2D8E]/20 hover:scale-105 transition-transform">
              <span className="text-white font-bold text-lg">D</span>
            </Link>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className={cn(
              'w-4 h-4 text-gray-400 transition-transform duration-300',
              isCollapsed && 'rotate-180'
            )} />
          </button>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
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
                    ? 'bg-gradient-to-r from-[#7B2D8E] to-[#9B4DB0] text-white shadow-lg shadow-[#7B2D8E]/25'
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
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
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
            <div className="rounded-xl bg-gradient-to-br from-[#7B2D8E]/5 to-[#9B4DB0]/10 p-4 border border-[#7B2D8E]/10">
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
                  <p className="text-lg font-bold text-emerald-600">98%</p>
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7B2D8E]/20 to-[#9B4DB0]/20 flex items-center justify-center flex-shrink-0 border border-[#7B2D8E]/10">
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
          <button
            onClick={handleLogout}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors mt-2 w-full group',
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
