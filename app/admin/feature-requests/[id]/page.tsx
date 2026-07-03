import AdminFeatureRequestDetail from '@/components/admin/feature-request-detail'

// Auth is enforced by app/admin/layout.tsx (admin/staff only). This is
// the dedicated triage detail for a single client idea.
export const dynamic = 'force-dynamic'

export default async function AdminFeatureRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <AdminFeatureRequestDetail id={id} />
}
