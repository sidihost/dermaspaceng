// ---------------------------------------------------------------------------
// Public community feed  (GET /api/community/feed)
// ---------------------------------------------------------------------------
// Powers the dashboard widget + /community page. Aggregates three calls to
// Discourse in parallel:
//
//   - /about.json        → member, topic, post, monthly-active counts
//   - /latest.json       → most recent topics (we trim to 8)
//   - /categories.json   → all top-level categories
//
// The route is cached at the edge for 60s with a 5-minute SWR window, so
// even a viral homepage launch can't melt the forum. Internally each
// upstream call is also Next-cached on the same 60s tag, which means
// repeat visits on different routes share a single Discourse hit per minute.
// ---------------------------------------------------------------------------

import { NextResponse } from 'next/server'
import {
  discourseBaseUrl,
  discourseReadConfigured,
  fetchAboutStats,
  fetchCategories,
  fetchLatestTopics,
  topicUrl,
} from '@/lib/discourse'

export const runtime = 'nodejs'

// Server-rendered ISR-style cache. Vercel Edge will cache the JSON for
// 60s (`s-maxage`) and serve stale up to 5 minutes (`stale-while-revalidate`)
// while it refetches in the background. Pro accounts in particular benefit
// because the cached responses don't burn invocations.
const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
} as const

export async function GET() {
  if (!discourseReadConfigured()) {
    // Shape-stable empty response so the client can render the
    // "Coming soon" UI without any conditional fetching glue.
    return NextResponse.json(
      {
        configured: false,
        baseUrl: '',
        stats: { members: 0, topics: 0, posts: 0, activeMonthly: 0 },
        topics: [],
        categories: [],
      },
      { headers: CACHE_HEADERS },
    )
  }

  // Run the three calls in parallel. Each helper is fail-soft (returns
  // null/[] on error) so a flaky Discourse only degrades the feed,
  // never breaks it.
  const [stats, topics, categories] = await Promise.all([
    fetchAboutStats(),
    fetchLatestTopics(8),
    fetchCategories(),
  ])

  return NextResponse.json(
    {
      configured: true,
      baseUrl: discourseBaseUrl(),
      stats: stats
        ? {
            members: stats.user_count,
            topics: stats.topic_count,
            posts: stats.post_count,
            activeMonthly: stats.active_users_30_days,
          }
        : { members: 0, topics: 0, posts: 0, activeMonthly: 0 },
      topics: topics.map((t) => ({
        id: t.id,
        title: t.title,
        slug: t.slug,
        url: topicUrl(t),
        replies: Math.max(0, (t.posts_count ?? 1) - 1),
        views: t.views,
        likes: t.like_count,
        createdAt: t.created_at,
        lastPostedAt: t.last_posted_at,
        pinned: t.pinned,
        categoryId: t.category_id,
      })),
      categories: categories
        // Drop the default "uncategorized"-shaped buckets; they look
        // odd in a polished marketing grid.
        .filter((c) => c.slug && c.slug !== 'uncategorized')
        .map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          color: `#${c.color}`,
          textColor: `#${c.text_color}`,
          description: c.description_excerpt ?? '',
          topics: c.topic_count,
          posts: c.post_count,
          url: `${discourseBaseUrl()}/c/${c.slug}/${c.id}`,
        })),
    },
    { headers: CACHE_HEADERS },
  )
}
