'use client'

/**
 * /dashboard/saved
 *
 * The home for everything a user has tapped the heart on — treatments,
 * packages, categories and articles. It reads the exact same SWR cache
 * (`/api/user/favorites`) that every FavoriteButton mutates, so saving
 * or un-saving anywhere in the app reflects here instantly, and the
 * "Remove" action here flows back through the shared `useFavorites`
 * hook so the heart un-fills everywhere else too.
 *
 * Design language matches /dashboard/notifications:
 *   - Brand purple (#7B2D8E) primary
 *   - Soft gray-50 page, flat white rounded-2xl cards, no gradients
 *   - Mobile-first; pb-24 keeps content clear of the floating bottom nav
 */

import * as React from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Heart,
  Loader2,
  Newspaper,
  Package,
  Sparkles,
  Tag,
  Trash2,
} from 'lucide-react'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { useFavorites, type FavoriteItemType, type Favorite } from '@/hooks/use-favorites'

type Group = {
  type: FavoriteItemType
  label: string
  Icon: React.ComponentType<{ className?: string }>
  /** Fallback destination if a saved row never stored an href. */
  browseHref: string
}

// Display order + metadata for each favouritable namespace. Kept in one
// place so the section headers, empty-state copy and icons stay in sync.
const GROUPS: Group[] = [
  { type: 'treatment', label: 'Treatments', Icon: Sparkles, browseHref: '/treatments' },
  { type: 'package', label: 'Packages', Icon: Package, browseHref: '/packages' },
  { type: 'category', label: 'Categories', Icon: Tag, browseHref: '/treatments' },
  { type: 'post', label: 'Articles', Icon: Newspaper, browseHref: '/blog' },
]

export default function SavedPage() {
  const { favorites, isLoading, removeFavorite } = useFavorites()
  const [busyKey, setBusyKey] = React.useState<string | null>(null)

  const total = favorites.length

  async function handleRemove(fav: Favorite) {
    const key = `${fav.itemType}:${fav.itemId}`
    setBusyKey(key)
    try {
      await removeFavorite(fav.itemType, fav.itemId)
    } catch {
      /* the hook already rolls the optimistic update back */
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <>
      <Header />
      <main className="bg-gray-50 min-h-[100dvh] pb-24 md:pb-0">
        <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 md:py-10">
          {/* Heading */}
          <div className="mb-5 sm:mb-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-gray-600 hover:text-[#7B2D8E] transition-colors mb-3"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to dashboard
            </Link>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E]">
                <Heart className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
                  Saved items
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  {total > 0
                    ? `${total} item${total === 1 ? '' : 's'} you've saved for later`
                    : 'Tap the heart on anything to keep it here'}
                </p>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="bg-white rounded-2xl border border-gray-200">
              <div className="flex items-center justify-center gap-2 px-6 py-10 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading your saved items…
              </div>
            </div>
          ) : total === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-6">
              {GROUPS.map((group) => {
                const items = favorites.filter((f) => f.itemType === group.type)
                if (items.length === 0) return null
                return (
                  <section key={group.type}>
                    <div className="mb-2.5 flex items-center gap-2 px-1">
                      <group.Icon className="h-4 w-4 text-[#7B2D8E]" />
                      <h2 className="text-sm font-semibold text-gray-900">{group.label}</h2>
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-500 border border-gray-200">
                        {items.length}
                      </span>
                    </div>
                    <ul className="bg-white rounded-2xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
                      {items.map((fav) => {
                        const key = `${fav.itemType}:${fav.itemId}`
                        const href = fav.href || group.browseHref
                        return (
                          <li key={key} className="group flex items-center gap-3 px-4 sm:px-5 py-3.5">
                            <Link
                              href={href}
                              className="flex min-w-0 flex-1 items-center gap-3"
                            >
                              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#7B2D8E]/5 text-[#7B2D8E]">
                                <group.Icon className="h-4 w-4" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-gray-900">
                                  {fav.label || 'Saved item'}
                                </span>
                                <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-[#7B2D8E]">
                                  View
                                  <ArrowRight className="h-3 w-3" />
                                </span>
                              </span>
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleRemove(fav)}
                              disabled={busyKey === key}
                              aria-label={`Remove ${fav.label || 'item'} from saved`}
                              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
                            >
                              {busyKey === key ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                )
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}

function EmptyState() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200">
      <div className="flex flex-col items-center text-center px-6 py-10">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#7B2D8E]/5 text-[#7B2D8E]">
          <Heart className="h-5 w-5" />
        </div>
        <p className="mt-3 text-sm font-semibold text-gray-900">Nothing saved yet</p>
        <p className="mt-1 max-w-sm text-xs text-gray-500 leading-relaxed">
          Browse our treatments, packages and articles and tap the heart to keep them here.
          Each save also lands in your{' '}
          <span className="inline-flex items-center gap-0.5 align-middle text-[#7B2D8E]">
            <Bell className="h-3 w-3" /> notifications
          </span>
          .
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/treatments"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#7B2D8E] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#5A1D6A]"
          >
            Browse treatments
          </Link>
          <Link
            href="/packages"
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-[#7B2D8E] transition-colors hover:bg-gray-50"
          >
            View packages
          </Link>
        </div>
      </div>
    </div>
  )
}
