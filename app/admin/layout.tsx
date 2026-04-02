import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import AdminSidebar from '@/components/admin/sidebar'

export const metadata = {
  title: 'Admin Dashboard | Dermaspace',
  description: 'Admin dashboard for managing Dermaspace operations',
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/signin?redirect=/admin')
  }

  if (user.role !== 'admin') {
    redirect('/dashboard')
  }

  const userName = `${user.first_name} ${user.last_name}`

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar userRole="admin" userName={userName} />
      <main className="lg:pl-72 min-h-screen transition-all duration-300">
        <div className="p-4 sm:p-6 lg:p-8 pt-16 sm:pt-6 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  )
}
