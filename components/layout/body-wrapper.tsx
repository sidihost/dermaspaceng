'use client'

import { usePathname } from 'next/navigation'

export default function BodyWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // Pages that should NOT have bottom padding (no mobile nav). Admin/staff
  // consoles don't render the floating bottom bar, so they don't need the
  // reserved space either — otherwise their sidebars get an awkward gap.
  const noPaddingPages = ['/signin', '/signup', '/forgot-password', '/reset-password', '/offline', '/admin', '/staff']
  const shouldHavePadding = !noPaddingPages.some(page => pathname.startsWith(page))

  return (
    <div className={shouldHavePadding ? 'pb-20 md:pb-0' : ''}>
      {children}
    </div>
  )
}
