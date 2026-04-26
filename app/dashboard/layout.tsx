import type { ReactNode } from 'react'

/**
 * Dashboard layout
 * ----------------
 * Intentionally a passthrough. The legal-acceptance gate, which used
 * to live here, now mounts globally inside `client-shell.tsx` so it
 * triggers immediately after sign-in regardless of where the user
 * lands first (a deep-linked treatment page, /booking, the home
 * page, etc.). Keeping it dashboard-scoped meant returning users
 * could skip the prompt entirely by never opening /dashboard.
 *
 * We deliberately do NOT add chrome (header / footer / bottom nav)
 * here either — each dashboard page already mounts its own
 * surface-specific chrome and we don't want to duplicate or
 * re-order it.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
