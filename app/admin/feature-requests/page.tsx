import FeatureRequestsManager from '@/components/admin/feature-requests-manager'

// Auth is enforced by app/admin/layout.tsx (admin-only). This surface
// lets admins triage the ideas clients submit on /feature-requests.
export const dynamic = 'force-dynamic'

export default function AdminFeatureRequestsPage() {
  return <FeatureRequestsManager />
}
