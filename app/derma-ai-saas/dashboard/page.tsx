import { redirect } from 'next/navigation'
import { getCurrentTenant } from '@/lib/saas-auth'
import { DashboardClient } from '@/components/saas/dashboard-client'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Dashboard | Derma AI for Business',
  robots: { index: false, follow: false },
}

export default async function SaasDashboardPage() {
  const tenant = await getCurrentTenant()
  if (!tenant) {
    redirect('/derma-ai-saas/login')
  }
  return <DashboardClient />
}
