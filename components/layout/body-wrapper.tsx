'use client'

import { usePathname } from 'next/navigation'

export default function BodyWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // Pages that should NOT have bottom padding (no mobile nav). Admin/staff
  // consoles don't render the floating bottom bar, so they don't need the
  // reserved space either — otherwise their sidebars get an awkward gap.
  const noPaddingPages = ['/signin', '/signup', '/forgot-password', '/reset-password', '/offline', '/admin', '/staff']
  const shouldHavePadding = !noPaddingPages.some(page => pathname.startsWith(page))

  // Reserve room for the floating mobile nav AND the system safe-area
  // inset so content never hides behind the bar or the OS gesture
  // indicator. Matches the nav's own padding formula in
  // components/layout/mobile-nav.tsx. Desktop zeroes this out.
  const className = shouldHavePadding
    ? 'pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0'
    : ''

  return <div className={className}>{children}</div>
}
