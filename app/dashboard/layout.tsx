import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getCurrentUserCached } from '@/lib/auth'
import { shouldRequireProfileCompletion } from '@/lib/auth-onboarding'

/**
 * Dashboard layout
 * ----------------
 * Enforces server-side profile completion for social-auth customers so even
 * client-side Next.js `<Link href="/dashboard">` transitions redirect straight
 * to `/complete-profile` before any dashboard UI mounts.
 *
 * We deliberately do NOT add chrome (header / footer / bottom nav) here —
 * each dashboard page already mounts its own surface-specific chrome.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUserCached()
  if (
    user &&
    shouldRequireProfileCompletion({
      role: user.role,
      profileComplete: user.profile_complete,
      hasSocialAuth: user.has_social_auth,
      email: user.email,
    })
  ) {
    redirect('/complete-profile')
  }

  return <>{children}</>
}
