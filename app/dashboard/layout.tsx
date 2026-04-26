import type { ReactNode } from 'react'
import { LegalAcceptanceGate } from '@/components/legal/legal-acceptance-gate'

/**
 * Dashboard layout
 * ----------------
 * The only thing this layout adds on top of the route's own page is
 * the `<LegalAcceptanceGate />` overlay. Every dashboard sub-route
 * (overview, wallet, settings, notifications, support, …) inherits
 * the gate automatically.
 *
 * We deliberately do NOT add chrome (header / footer / bottom nav)
 * here — each dashboard page already mounts its own surface-specific
 * chrome and we don't want to duplicate or re-order it.
 *
 * The gate component renders its own dim backdrop and is server-safe
 * to import (it lazy-renders only when the client decides it should
 * show). When the user has already accepted the current legal pack
 * the gate returns `null`, so it costs essentially nothing.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <LegalAcceptanceGate />
    </>
  )
}
