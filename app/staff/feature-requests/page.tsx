import FeatureRequestsManager from '@/components/admin/feature-requests-manager'

// Auth is enforced by app/staff/layout.tsx (staff or admin). Staff share
// the same triage board as admins — the PATCH/DELETE API allows both.
export const dynamic = 'force-dynamic'

export default function StaffFeatureRequestsPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <FeatureRequestsManager />
    </div>
  )
}
