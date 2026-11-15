'use client'

import { useAuth } from '@/hooks/use-auth'
import { getRecommendationsEyebrow } from '@/lib/recommendations-label'

export function RecommendationsEyebrow({
  forceLoggedIn = false,
}: {
  forceLoggedIn?: boolean
}) {
  const { isAuthenticated } = useAuth()
  return <>{getRecommendationsEyebrow(forceLoggedIn || isAuthenticated)}</>
}
