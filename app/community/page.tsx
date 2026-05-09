// ---------------------------------------------------------------------------
// /community — Discourse-backed community landing page
// ---------------------------------------------------------------------------
// Server component. We render with whatever data Discourse gives us at
// request time, and Next-cache the upstream calls for 60s (see
// lib/discourse.ts). When DISCOURSE_URL isn't configured yet, we
// gracefully degrade to a "Coming soon" hero rather than 500.
//
// Surfaces:
//   - Hero with brand purple, headline, "Join the conversation" CTA
//   - Live stats strip (members / topics / posts / monthly actives)
//   - Latest topics card list (links straight to Discourse)
//   - Categories grid (color-tagged from Discourse, 1:1)
//   - Footer CTA (Sign in via SSO + community guidelines)
// ---------------------------------------------------------------------------

import { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import {
  ArrowRight,
  MessageSquare,
  Users,
  Sparkles,
  Flame,
  Pin,
  Eye,
  Heart,
  Calendar,
  ShieldCheck,
  Megaphone,
} from 'lucide-react'
import {
  discourseBaseUrl,
  discourseReadConfigured,
  discourseSsoConfigured,
  fetchAboutStats,
  fetchCategories,
  fetchLatestTopics,
  topicUrl,
} from '@/lib/discourse'

export const metadata: Metadata = {
  title: 'Community | Dermaspace',
  description:
    "Join the Dermaspace community — share before/afters, swap routines, ask our therapists, and get early access to events. Powered by your Dermaspace account.",
}

// Re-render at most once a minute. The Discourse fetches inside this
// page are also tagged for revalidate=60 in lib/discourse.ts; this
// `revalidate` keeps the rendered HTML edge-cached on the same cadence.
export const revalidate = 60

// Lightweight relative-time formatter so we don't pull in a library.
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const m = 60_000, h = 60 * m, d = 24 * h
  if (diff < m) return 'just now'
  if (diff < h) return `${Math.round(diff / m)}m ago`
  if (diff < d) return `${Math.round(diff / h)}h ago`
  if (diff < 7 * d) return `${Math.round(diff / d)}d ago`
  return new Date(iso).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

export default async function CommunityPage() {
  const configured = discourseReadConfigured()
  const ssoOn = discourseSsoConfigured()
  const baseUrl = discourseBaseUrl()

  // Fetch in parallel — each helper returns null/[] on missing config or
  // upstream failure, so the rest of the page still renders.
  const [stats, topics, categories] = configured
    ? await Promise.all([fetchAboutStats(), fetchLatestTopics(8), fetchCategories()])
    : [null, [], []]

  const visibleCategories = (categories ?? [])
    .filter((c) => c.slug && c.slug !== 'uncategorized')
    .slice(0, 8)

  // The "Open community" / "Sign in" CTA is the only thing that depends on
  // SSO config — we always show *some* CTA so the hero never looks broken.
  const primaryCta = ssoOn
    ? { label: 'Sign in to community', href: '/api/community/sso?init=1' }
    : configured
      ? { label: 'Open community', href: baseUrl }
      : { label: 'Notify me when live', href: '/contact?subject=community' }

  return (
    <>
      <Header />

      <main className="bg-white">
        {/* HERO ------------------------------------------------------------ */}
        <section className="relative overflow-hidden bg-[#7B2D8E] text-white">
          {/* Soft brand-tone backdrop. Two analogue purple radials only —
              keeps the hero on-brand without slipping into the
              decorative-blob territory we explicitly avoid. */}
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            aria-hidden="true"
            style={{
              background:
                'radial-gradient(60% 60% at 15% 20%, #5A1D6A 0%, transparent 60%), radial-gradient(50% 50% at 90% 80%, #9333EA 0%, transparent 60%)',
            }}
          />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] backdrop-blur ring-1 ring-white/20">
                <Sparkles className="w-3 h-3" />
                Now live
              </span>
              <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-balance">
                The Dermaspace Community
              </h1>
              <p className="mt-4 text-base sm:text-lg text-white/85 leading-relaxed text-pretty max-w-2xl">
                Share before-and-afters, ask our estheticians anything, swap routine tips with other members, and get early access to events. One Dermaspace account signs you in — no extra password.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link
                  href={primaryCta.href}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#7B2D8E] hover:bg-white/95 transition-colors"
                  prefetch={false}
                >
                  {primaryCta.label}
                  <ArrowRight className="w-4 h-4" />
                </Link>
                {configured && (
                  <a
                    href={baseUrl}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15 transition-colors ring-1 ring-white/25"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Browse without signing in
                  </a>
                )}
              </div>

              {!configured && (
                <p className="mt-5 text-xs text-white/70 max-w-md">
                  We&apos;re still putting the finishing touches on the forum. Drop us a note and we&apos;ll email you the moment it goes live.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* STATS STRIP ------------------------------------------------------ */}
        {configured && stats && (
          <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 sm:-mt-12 relative z-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 rounded-2xl bg-white border border-gray-100 p-4 sm:p-5">
              {[
                { label: 'Members', value: stats.user_count, icon: Users },
                { label: 'Discussions', value: stats.topic_count, icon: MessageSquare },
                { label: 'Posts', value: stats.post_count, icon: Flame },
                { label: 'Active monthly', value: stats.active_users_30_days, icon: Calendar },
              ].map((s) => {
                const Icon = s.icon
                return (
                  <div key={s.label} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-[#7B2D8E]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg sm:text-xl font-bold text-gray-900 tabular-nums leading-tight">
                        {formatCount(s.value)}
                      </p>
                      <p className="text-[11px] sm:text-xs text-gray-500 leading-tight">
                        {s.label}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* LATEST TOPICS + CATEGORIES -------------------------------------- */}
        {configured && (topics.length > 0 || visibleCategories.length > 0) && (
          <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Latest topics — 2 cols */}
              <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white overflow-hidden">
                <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">
                      Latest discussions
                    </h2>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Updated {timeAgo(new Date().toISOString())}
                    </p>
                  </div>
                  {baseUrl && (
                    <Link
                      href={`${baseUrl}/latest`}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#7B2D8E] hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View all
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>

                {topics.length === 0 ? (
                  <div className="p-10 text-center">
                    <MessageSquare className="w-8 h-8 mx-auto text-gray-300" />
                    <p className="mt-3 text-sm text-gray-600">
                      No discussions yet — be the first to start one.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {topics.map((t) => (
                      <li key={t.id}>
                        <Link
                          href={topicUrl(t)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-3 p-4 sm:p-5 hover:bg-gray-50 transition-colors group"
                        >
                          {t.pinned ? (
                            <Pin className="w-4 h-4 text-[#7B2D8E] mt-1 flex-shrink-0" />
                          ) : (
                            <MessageSquare className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-gray-900 group-hover:text-[#7B2D8E] transition-colors line-clamp-2 text-pretty">
                              {t.title}
                            </h3>
                            <div className="mt-1 flex items-center flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500">
                              <span className="flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" />
                                {Math.max(0, (t.posts_count ?? 1) - 1)} replies
                              </span>
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {formatCount(t.views ?? 0)}
                              </span>
                              {t.like_count > 0 && (
                                <span className="flex items-center gap-1">
                                  <Heart className="w-3 h-3" />
                                  {t.like_count}
                                </span>
                              )}
                              <span className="text-gray-400">·</span>
                              <span>{timeAgo(t.last_posted_at || t.created_at)}</span>
                            </div>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Categories — 1 col */}
              <aside className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                  <h2 className="text-base font-semibold text-gray-900">
                    Browse categories
                  </h2>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Drop into the topic you care about
                  </p>
                </div>
                {visibleCategories.length === 0 ? (
                  <div className="p-6 text-sm text-gray-500">
                    Categories will appear here once moderators set them up.
                  </div>
                ) : (
                  <ul className="p-2">
                    {visibleCategories.map((c) => (
                      <li key={c.id}>
                        <a
                          href={`${baseUrl}/c/${c.slug}/${c.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-3 rounded-xl p-3 hover:bg-gray-50 transition-colors"
                        >
                          <span
                            className="mt-1 w-2 h-8 rounded-sm flex-shrink-0"
                            style={{ backgroundColor: `#${c.color}` }}
                            aria-hidden="true"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {c.name}
                            </p>
                            {c.description_excerpt && (
                              <p className="mt-0.5 text-[11px] text-gray-500 line-clamp-2 text-pretty">
                                {c.description_excerpt}
                              </p>
                            )}
                            <p className="mt-1 text-[10px] text-gray-400">
                              {formatCount(c.topic_count)} topics ·{' '}
                              {formatCount(c.post_count)} posts
                            </p>
                          </div>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </aside>
            </div>
          </section>
        )}

        {/* WHY JOIN -------------------------------------------------------- */}
        <section className="border-t border-gray-100 bg-gray-50 py-14 sm:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-balance">
                Why join the community?
              </h2>
              <p className="mt-3 text-sm sm:text-base text-gray-600 leading-relaxed text-pretty">
                The forum is where our members and our therapists meet between
                visits. Real questions, real answers, no algorithm in the way.
              </p>
            </div>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  icon: ShieldCheck,
                  title: 'Therapist-led answers',
                  body: 'Our certified estheticians weigh in on real questions. Get a professional opinion in hours, not days.',
                },
                {
                  icon: Megaphone,
                  title: 'Members-only events',
                  body: 'Spot the announcement before it hits Instagram — early invites to launches, masterclasses, and pop-ups.',
                },
                {
                  icon: Sparkles,
                  title: 'Real before / afters',
                  body: 'See unfiltered progress threads from people on similar treatments to yours. Inspiration without the gloss.',
                },
              ].map((b) => {
                const Icon = b.icon
                return (
                  <div
                    key={b.title}
                    className="rounded-2xl bg-white border border-gray-100 p-5"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-[#7B2D8E]" />
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-gray-900">
                      {b.title}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-gray-600 text-pretty">
                      {b.body}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* CLOSING CTA ----------------------------------------------------- */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-balance">
            Your Dermaspace account is your community login
          </h2>
          <p className="mt-3 text-sm sm:text-base text-gray-600 max-w-xl mx-auto text-pretty">
            One identity across booking, wallet, memberships, and the forum.
            No second password to remember.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={primaryCta.href}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7B2D8E] px-5 py-3 text-sm font-semibold text-white hover:bg-[#6B2580] transition-colors"
              prefetch={false}
            >
              {primaryCta.label}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/membership"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#7B2D8E] hover:bg-[#7B2D8E]/5 transition-colors ring-1 ring-[#7B2D8E]/20"
            >
              See membership plans
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
