'use client'

import { usePathname } from 'next/navigation'

interface AdminMainShellProps {
  maintenanceBanner?: React.ReactNode
  children: React.ReactNode
}

/**
 * Wraps the admin console main area. Regular admin routes keep the sidebar
 * offset and centered container; `/admin/live-chat` expands into a true
 * edge-to-edge full-screen live chat workspace.
 */
export function AdminMainShell({
  maintenanceBanner,
  children,
}: AdminMainShellProps) {
  const pathname = usePathname()
  const isFullScreenLiveChat =
    pathname === '/admin/live-chat' || pathname?.startsWith('/admin/live-chat/')

  if (isFullScreenLiveChat) {
    return (
      <main className="h-[100dvh] w-full overflow-hidden bg-white flex flex-col">
        {children}
      </main>
    )
  }

  return (
    <main className="lg:pl-72 min-h-screen transition-all duration-300">
      <div className="p-4 sm:p-5 lg:p-6 xl:p-8 pt-16 sm:pt-5 lg:pt-6">
        <div className="mx-auto w-full max-w-[1400px]">
          {maintenanceBanner}
          {children}
        </div>
      </div>
    </main>
  )
}
