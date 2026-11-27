import { AppealPortal, type SignedInAppealVisitor } from '@/components/appeal/appeal-portal'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function AppealPage() {
  const user = await getCurrentUser().catch(() => null)
  const signedInUser: SignedInAppealVisitor | null =
    user && user.is_active !== false
      ? {
          firstName: user.first_name || null,
          email: user.email || '',
          role: user.role || 'user',
        }
      : null

  return <AppealPortal signedInUser={signedInUser} />
}
