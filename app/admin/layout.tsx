import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Wrench } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getMaintenance } from '@/lib/app-settings'
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
  // Surface the current maintenance state in a banner so admins
  // testing the toggle don't think it's broken when the public site
  // *seems* to keep working for them. Admins are intentionally exempt
  // from the redirect (see middleware.ts) so they can keep operating
  // while the rest of the world sees /maintenance — without this
  // visual indicator the exemption looks like the toggle is "doing
  // nothing".
  const maintenance = await getMaintenance()

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar userRole="admin" userName={userName} />
      <main className="lg:pl-72 min-h-screen transition-all duration-300">
        {/* Tighter outer padding: 16/20/24 instead of 16/24/32.
            Admin pages felt "oversized"; 24px max on desktop keeps content
            closer to the sidebar like Google/Linear admin consoles. */}
        <div className="p-4 sm:p-5 lg:p-6 pt-16 sm:pt-5 lg:pt-6">
          {maintenance.enabled && (
            <MaintenanceBanner message={maintenance.message} />
          )}
          {children}
        </div>
      </main>
    </div>
  )
}

// ---------------------------------------------------------------------------
// MaintenanceBanner — brand-purple callout that sits above every admin
// page while maintenance mode is on. Click-through goes straight to
// the settings panel where the toggle lives.
//
// Kept as a server component (no `use client`) because the maintenance
// state is already fetched on the server in the layout — re-fetching
// on the client would just duplicate the round-trip without changing
// behaviour. If the admin toggles maintenance from the settings
// panel, the next route navigation re-renders this layout with fresh
// state.
//
// Originally rendered in amber to lean on the conventional "warning"
// vocabulary, but the brand voice is consistently plum across the
// rest of the surface. Switching to a tinted-purple treatment keeps
// the urgency (solid icon tile, bold heading) while staying inside
// the brand palette — matches the way Stripe / Linear flag in-app
// status with their primary, not a generic system warning colour.
// ---------------------------------------------------------------------------
function MaintenanceBanner({ message }: { message: string }) {
  return (
    <div
      className="mb-4 rounded-xl border border-[#7B2D8E]/15 bg-[#7B2D8E]/[0.06] px-4 py-3 flex items-start gap-3"
      role="status"
      aria-live="polite"
    >
      <span className="w-7 h-7 rounded-lg bg-[#7B2D8E]/15 flex items-center justify-center flex-shrink-0">
        <Wrench className="w-3.5 h-3.5 text-[#7B2D8E]" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#3D1646] leading-tight">
          Maintenance mode is ON
        </p>
        <p className="text-[12px] text-[#5A1D6A] mt-0.5 leading-relaxed">
          Visitors are being redirected to{' '}
          <code className="font-mono text-[11px] bg-[#7B2D8E]/10 px-1 rounded">
            /maintenance
          </code>
          . Admins (you) keep full access. Public message:{' '}
          <span className="italic">&ldquo;{message}&rdquo;</span>
        </p>
      </div>
      <Link
        href="/admin/settings"
        className="hidden sm:inline-flex items-center text-[11.5px] font-semibold text-[#7B2D8E] hover:text-[#5A1D6A] underline whitespace-nowrap self-center"
      >
        Manage
      </Link>
    </div>
  )
}
