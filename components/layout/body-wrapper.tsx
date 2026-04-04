'use client'

import { usePathname } from 'next/navigation'

export default function BodyWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // Pages that should NOT have bottom padding (no mobile nav)
  const noPaddingPages = ['/signin', '/signup', '/forgot-password', '/reset-password', '/offline']
  const shouldHavePadding = !noPaddingPages.some(page => pathname.startsWith(page))

  return (
    <div className={shouldHavePadding ? 'pb-20 md:pb-0' : ''}>
      {children}
    </div>
  )
}
