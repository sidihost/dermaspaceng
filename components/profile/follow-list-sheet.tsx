'use client'

/**
 * FollowListSheet
 *
 * Bottom-sheet / centered-dialog that lists a profile's followers and the
 * people they follow, with inline Follow / Following buttons for signed-in
 * viewers — the same surface Instagram and X use when you tap a follower
 * count. Two tabs share one sheet so switching between the lists never
 * closes it.
 *
 * The lists are fetched lazily per tab (only when the sheet is open and
 * that tab is active) via SWR, keyed by `username` + tab so counts stay
 * fresh and the two tabs cache independently.
 */

import * as React from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { X, UserPlus, UserCheck, Loader2, Users } from 'lucide-react'

const BRAND = '#7B2D8E'

type Tab = 'followers' | 'following'

interface Person {
  id: string
  username: string | null
  name: string
  avatarUrl: string | null
  bio: string | null
  href: string
  isFollowedByMe: boolean
  isMe: boolean
}

type Props = {
  open: boolean
  onClose: () => void
  /** Handle (or id) whose connections we're listing. */
  username: string
  /** Which tab opens first. */
  initialTab: Tab
  /** Counts drive the tab labels so they read correctly before fetch. */
  followerCount: number
  followingCount: number
  /** Is a viewer signed in? Controls whether inline Follow buttons show. */
  canFollow: boolean
}

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to load list')
  return res.json() as Promise<{ people: Person[] }>
}

function PersonRow({
  person,
  canFollow,
  onNavigate,
}: {
  person: Person
  canFollow: boolean
  onNavigate: () => void
}) {
  const [following, setFollowing] = React.useState(person.isFollowedByMe)
  const [pending, setPending] = React.useState(false)

  const initials = person.name
    .split(' ')
    .map((w) => w.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const toggle = async () => {
    if (pending) return
    setPending(true)
    const next = !following
    setFollowing(next) // optimistic
    try {
      const handle = person.username || person.id
      const res = await fetch(`/api/user/follow/${encodeURIComponent(handle)}`, {
        method: next ? 'POST' : 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error('toggle failed')
    } catch {
      setFollowing(!next) // revert
    } finally {
      setPending(false)
    }
  }

  return (
    <li className="flex items-center gap-3 py-2.5">
      <Link
        href={person.href}
        onClick={onNavigate}
        className="flex items-center gap-3 min-w-0 flex-1 group"
      >
        <span
          className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: BRAND }}
        >
          {person.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={person.avatarUrl || '/placeholder.svg'}
              alt=""
              aria-hidden="true"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-white text-sm font-bold">{initials}</span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-gray-900 truncate group-hover:text-[#7B2D8E] transition-colors">
            {person.name}
          </span>
          {person.username && (
            <span className="block text-xs font-medium text-[#7B2D8E] truncate">
              @{person.username}
            </span>
          )}
          {person.bio && (
            <span className="block text-[11px] text-gray-500 truncate">
              {person.bio}
            </span>
          )}
        </span>
      </Link>

      {canFollow && !person.isMe && (
        <button
          type="button"
          onClick={toggle}
          disabled={pending}
          aria-pressed={following}
          className={`flex-shrink-0 inline-flex items-center justify-center gap-1.5 min-w-[104px] px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed ${
            following
              ? 'bg-[#7B2D8E]/10 text-[#7B2D8E] border border-[#7B2D8E]/20 hover:bg-[#7B2D8E]/15'
              : 'bg-[#7B2D8E] text-white hover:bg-[#6B2278]'
          }`}
        >
          {pending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : following ? (
            <>
              <UserCheck className="w-3.5 h-3.5" />
              Following
            </>
          ) : (
            <>
              <UserPlus className="w-3.5 h-3.5" />
              Follow
            </>
          )}
        </button>
      )}
    </li>
  )
}

export function FollowListSheet({
  open,
  onClose,
  username,
  initialTab,
  followerCount,
  followingCount,
  canFollow,
}: Props) {
  const [tab, setTab] = React.useState<Tab>(initialTab)

  // Keep the active tab in sync with whichever count the user tapped.
  React.useEffect(() => {
    if (open) setTab(initialTab)
  }, [open, initialTab])

  // Lock body scroll + Esc-to-close while open.
  React.useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  const key = open
    ? `/api/user/follow/${encodeURIComponent(username)}/list?type=${tab}`
    : null
  const { data, error, isLoading } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
  })

  if (!open) return null

  const people = data?.people ?? []

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Connections"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl flex flex-col"
        style={{ maxHeight: '85dvh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grabber (mobile) */}
        <div className="sm:hidden flex justify-center pt-2 pb-1" aria-hidden="true">
          <span className="w-10 h-1.5 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <header className="flex items-center justify-between px-5 sm:px-6 h-14 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Connections</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 -mr-1.5 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Tabs */}
        <div className="flex flex-shrink-0 border-b border-gray-100" role="tablist">
          {(
            [
              { id: 'followers' as Tab, label: 'Followers', count: followerCount },
              { id: 'following' as Tab, label: 'Following', count: followingCount },
            ]
          ).map((t) => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={`flex-1 h-12 text-sm font-semibold relative transition-colors ${
                  active ? 'text-[#7B2D8E]' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
                <span className={active ? 'text-[#7B2D8E]' : 'text-gray-400'}>
                  {' '}
                  {t.count}
                </span>
                {active && (
                  <span className="absolute bottom-0 inset-x-0 h-0.5 bg-[#7B2D8E]" />
                )}
              </button>
            )
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : error ? (
            <div className="py-16 text-center text-sm text-gray-500">
              Couldn&apos;t load this list. Please try again.
            </div>
          ) : people.length === 0 ? (
            <div className="py-16 text-center">
              <span className="inline-flex w-12 h-12 rounded-full bg-[#7B2D8E]/10 items-center justify-center mb-3">
                <Users className="w-5 h-5 text-[#7B2D8E]" />
              </span>
              <p className="text-sm text-gray-500">
                {tab === 'followers'
                  ? 'No followers yet.'
                  : 'Not following anyone yet.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 py-1">
              {people.map((p) => (
                <PersonRow
                  key={p.id}
                  person={p}
                  canFollow={canFollow}
                  onNavigate={onClose}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Safe-area padding on iOS */}
        <div
          className="flex-shrink-0"
          style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
        />
      </div>
    </div>
  )
}
