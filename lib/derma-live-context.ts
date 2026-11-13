/**
 * Server-side Live Knowledge Context Loader for Derma AI
 * ------------------------------------------------------
 * Fetches live runtime state (feature flags resolved for the current
 * viewer, maintenance mode, active booking branches, and recent published
 * journal articles) and renders it alongside the canonical website facts.
 *
 * Every fetch is fail-soft so a transient Redis/DB hiccup never prevents
 * Derma AI from answering.
 */

import { getAllFlags, getEffectiveFlagMap } from './feature-flags'
import { getMaintenance } from './app-settings'
import { listLocations } from './booking'
import { getPublishedPosts } from './blog'
import {
  buildCanonicalWebsiteFactsPrompt,
  formatLiveWebsiteStatus,
} from './derma-knowledge'

export async function buildLiveWebsiteKnowledgePrompt(): Promise<string> {
  const [flagsRes, effectiveRes, maintenanceRes, locationsRes, postsRes] =
    await Promise.allSettled([
      getAllFlags(),
      getEffectiveFlagMap(),
      getMaintenance(),
      listLocations(),
      getPublishedPosts({ limit: 6 }),
    ])

  const flags = flagsRes.status === 'fulfilled' ? flagsRes.value : []
  const effectiveMap = effectiveRes.status === 'fulfilled' ? effectiveRes.value : {}
  const maintenance =
    maintenanceRes.status === 'fulfilled'
      ? maintenanceRes.value
      : { enabled: false, message: '', eta: null }
  const activeLocations =
    locationsRes.status === 'fulfilled' ? locationsRes.value : undefined
  const recentPosts =
    postsRes.status === 'fulfilled'
      ? postsRes.value.map((p) => ({
          title: p.title,
          slug: p.slug,
          categoryName: p.category_name,
        }))
      : undefined

  const canonical = buildCanonicalWebsiteFactsPrompt()
  const liveStatus = formatLiveWebsiteStatus({
    flags,
    effectiveMap,
    maintenance,
    activeLocations,
    recentPosts,
  })

  return `${canonical}\n\n${liveStatus}`
}
