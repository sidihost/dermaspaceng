"use client"

import Link from "next/link"
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
  Menu,
  X,
  Bell
} from "lucide-react"
import { useState } from "react"

const navItems = [
  {
    title: "Dashboard",
    href: "/staff",
    icon: LayoutDashboard,
  },
  {
    title: "Gift Card Requests",
    href: "/staff/gift-cards",
    icon: Gift,
  },
  {
    title: "Complaints",
    href: "/staff/complaints",
    icon: MessageSquare,
  },
  {
    title: "Consultations",
    href: "/staff/consultations",
    icon: Calendar,
  },
  {
    title: "Surveys",
    href: "/staff/surveys",
    icon: FileText,
  },
]

export function StaffSidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/'
  }

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 lg:hidden bg-white shadow-lg border border-gray-100 hover:shadow-xl transition-shadow rounded-xl"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-gray-100 bg-white shadow-xl lg:shadow-none transition-transform duration-300 lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="flex h-20 items-center gap-3 border-b border-gray-100 px-6">
          <Link href="/staff" className="flex items-center gap-3 group">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#7B2D8E] to-[#9B4DB0] shadow-lg shadow-[#7B2D8E]/20 group-hover:scale-105 transition-transform">
              <span className="text-white font-bold text-lg">D</span>
            </div>
            <div>
              <h1 className="font-bold text-gray-900">Dermaspace</h1>
              <p className="text-xs text-[#7B2D8E] font-medium">Staff Portal</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-4 py-6">
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3">Menu</p>
          </div>
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== "/staff" && pathname.startsWith(item.href))
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all group",
                    isActive 
                      ? "bg-gradient-to-r from-[#7B2D8E] to-[#9B4DB0] text-white shadow-lg shadow-[#7B2D8E]/25" 
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <item.icon className={cn(
                    "h-5 w-5 shrink-0 transition-transform group-hover:scale-110",
                    isActive ? "text-white" : "text-gray-400 group-hover:text-[#7B2D8E]"
                  )} />
                  {item.title}
                </Link>
              )
            })}
          </nav>
        </ScrollArea>

        {/* Quick Stats */}
        <div className="px-4 py-3">
          <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 p-4 border border-amber-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <Bell className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-900">Pending Tasks</p>
                <p className="text-xs text-amber-600">Requires attention</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="bg-white/60 rounded-lg px-3 py-2 text-center">
                <p className="text-lg font-bold text-gray-900">12</p>
                <p className="text-[10px] text-gray-500 uppercase">Requests</p>
              </div>
              <div className="bg-white/60 rounded-lg px-3 py-2 text-center">
                <p className="text-lg font-bold text-gray-900">5</p>
                <p className="text-[10px] text-gray-500 uppercase">Urgent</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 p-4">
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl py-3 transition-colors"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </Button>
        </div>
      </aside>
    </>
  )
}
