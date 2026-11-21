"use client"

import { usePathname } from "next/navigation"
import { StaffTopBar } from "@/components/staff/staff-top-bar"

interface StaffMainShellProps {
  firstName: string
  lastName: string
  role: "staff" | "admin" | "user"
  avatarUrl?: string | null
  children: React.ReactNode
}

/**
 * Wraps the staff console main area. Regular staff routes keep the shared
 * greeting top bar and centered container; `/staff/live-chat` expands into a
 * full-bleed, full-viewport-height workspace just like dedicated live chat
 * software.
 */
export function StaffMainShell({
  firstName,
  lastName,
  role,
  avatarUrl,
  children,
}: StaffMainShellProps) {
  const pathname = usePathname()
  const isFullBleedLiveChat = pathname === "/staff/live-chat" || pathname?.startsWith("/staff/live-chat/")

  if (isFullBleedLiveChat) {
    return (
      <main className="h-[100dvh] pl-0 lg:pl-72 pt-14 lg:pt-0 overflow-hidden bg-white flex flex-col">
        {children}
      </main>
    )
  }

  return (
    <main className="min-h-screen pl-0 lg:pl-72">
      <StaffTopBar
        firstName={firstName}
        lastName={lastName}
        role={role}
        avatarUrl={avatarUrl}
      />
      <div className="container mx-auto px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 xl:px-10 max-w-[1400px]">
        {children}
      </div>
    </main>
  )
}
