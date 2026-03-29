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
} from 'lucide-react'
import { useState } from 'react'

interface SidebarProps {
  userRole: 'admin' | 'staff'
  userName: string
}

const adminNavItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/users', icon: Users, label: 'Users' },
  { href: '/admin/staff', icon: UserCog, label: 'Staff' },
  { href: '/admin/gift-cards', icon: Gift, label: 'Gift Cards' },
  { href: '/admin/complaints', icon: MessageSquare, label: 'Complaints' },
  { href: '/admin/consultations', icon: Calendar, label: 'Consultations' },
  { href: '/admin/surveys', icon: ClipboardList, label: 'Surveys' },
  { href: '/admin/activity', icon: Activity, label: 'Activity Log' },
  { href: '/admin/settings', icon: Settings, label: 'Settings' },
]

const staffNavItems = [
  { href: '/staff', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/staff/assignments', icon: ClipboardList, label: 'My Assignments' },
  { href: '/staff/gift-cards', icon: Gift, label: 'Gift Cards' },
  { href: '/staff/complaints', icon: MessageSquare, label: 'Complaints' },
  { href: '/staff/consultations', icon: Calendar, label: 'Consultations' },
]

export default function AdminSidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const navItems = userRole === 'admin' ? adminNavItems : staffNavItems
  const basePath = userRole === 'admin' ? '/admin' : '/staff'

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md border border-gray-200 lg:hidden"
      >
        <Menu className="w-5 h-5 text-gray-700" />
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full bg-white border-r border-gray-200 transition-all duration-300 flex flex-col',
          isCollapsed ? 'w-20' : 'w-64',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Header */}
        <div className={cn(
          'flex items-center h-16 border-b border-gray-200 px-4',
          isCollapsed ? 'justify-center' : 'justify-between'
        )}>
          {!isCollapsed && (
            <Link href={basePath} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#7B2D8E] flex items-center justify-center">
                <span className="text-white font-bold text-sm">D</span>
              </div>
              <div>
                <h1 className="font-bold text-gray-900 text-sm">Dermaspace</h1>
                <p className="text-xs text-gray-500 capitalize">{userRole} Panel</p>
              </div>
            </Link>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className={cn(
              'w-4 h-4 text-gray-500 transition-transform',
              isCollapsed && 'rotate-180'
            )} />
          </button>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== basePath && pathname.startsWith(item.href))
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
                  isActive
                    ? 'bg-[#7B2D8E] text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                  isCollapsed && 'justify-center px-2'
                )}
              >
                <item.icon className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-white')} />
                {!isCollapsed && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User Section */}
        <div className={cn(
          'border-t border-gray-200 p-3',
          isCollapsed && 'flex flex-col items-center'
        )}>
          <div className={cn(
            'flex items-center gap-3 px-3 py-2',
            isCollapsed && 'px-0'
          )}>
            <div className="w-9 h-9 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-[#7B2D8E]">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
                <p className="text-xs text-gray-500 capitalize">{userRole}</p>
              </div>
            )}
          </div>
          <Link
            href="/api/auth/logout"
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors mt-1',
              isCollapsed && 'justify-center px-2'
            )}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="text-sm font-medium">Sign Out</span>}
          </Link>
        </div>
      </aside>
    </>
  )
}
