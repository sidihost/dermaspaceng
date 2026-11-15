/**
 * Server-side layout for public profile routes.
 *
 * Also acts as the canonical server gate for unknown top-level paths that
 * Next.js falls through to `app/[username]`:
 *   - Known aliases redirect cleanly to their canonical destination.
 *   - Reserved slugs, invalid handle shapes, nonexistent users, and private
 *     profiles viewed by non-owners trigger Next.js `notFound()`, returning a
 *     real HTTP 404 and rendering `app/not-found.tsx` instead of a misleading
 *     "Profile Not Found" card.
 */

import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { isDatabaseConfigured, sql } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { classifyProfileSegment } from '@/lib/profile-route-guard'
import { getCanonicalAppOrigin } from '@/lib/push-origin'

type ProfileRow = {
  id: string
  first_name: string
  last_name: string
  username: string | null
  avatar_url: string | null
  bio: string | null
  is_public: boolean | null
}

type ProfileLoadResult =
  | { status: 'found'; profile: ProfileRow }
  | { status: 'not_found' }
  | { status: 'unavailable' }

async function loadProfile(username: string): Promise<ProfileLoadResult> {
  const decision = classifyProfileSegment(username)
  if (decision.kind !== 'lookup') {
    return { status: 'not_found' }
  }

  if (!isDatabaseConfigured()) {
    return { status: 'unavailable' }
  }

  try {
    let rows: ProfileRow[] = []
    if (!decision.isUuid) {
      rows = (await sql`
        SELECT id, first_name, last_name, username, avatar_url, bio, is_public
        FROM users
        WHERE LOWER(username) = ${decision.cleanHandle}
        LIMIT 1
      `) as ProfileRow[]
    } else {
      rows = (await sql`
        SELECT id, first_name, last_name, username, avatar_url, bio, is_public
        FROM users
        WHERE id::text = ${decision.cleanHandle}
        LIMIT 1
      `) as ProfileRow[]
    }

    if (rows.length === 0) {
      return { status: 'not_found' }
    }
    return { status: 'found', profile: rows[0] }
  } catch {
    return { status: 'unavailable' }
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>
}): Promise<Metadata> {
  const { username } = await params
  const decision = classifyProfileSegment(username)
  if (decision.kind !== 'lookup') {
    return {
      title: 'Page Not Found | Dermaspace',
      robots: { index: false, follow: false },
    }
  }

  const result = await loadProfile(username)
  const profile = result.status === 'found' ? result.profile : null
  const base = getCanonicalAppOrigin()
  const url = `${base}/${encodeURIComponent(username)}`

  if (!profile || profile.is_public === false) {
    return {
      title: 'Dermaspace',
      description: 'Skincare and wellness at Dermaspace.',
      robots: { index: false, follow: false },
      openGraph: {
        title: 'Dermaspace',
        description: 'Skincare and wellness at Dermaspace.',
        url,
        siteName: 'Dermaspace',
        type: 'website',
      },
      twitter: {
        card: 'summary',
        title: 'Dermaspace',
        description: 'Skincare and wellness at Dermaspace.',
      },
    }
  }

  const displayName =
    `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() ||
    profile.username ||
    'Dermaspace member'
  const title = profile.username
    ? `${displayName} (@${profile.username}) on Dermaspace`
    : `${displayName} on Dermaspace`
  const description =
    (profile.bio && profile.bio.trim()) ||
    `Follow ${displayName} on Dermaspace — skincare, wellness, and bookings.`

  const avatarUrl = profile.avatar_url
    ? profile.avatar_url.startsWith('http')
      ? profile.avatar_url
      : `${base}${profile.avatar_url.startsWith('/') ? '' : '/'}${profile.avatar_url}`
    : `${base}/icon-512.png`

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index: false, follow: true },
    openGraph: {
      title,
      description,
      url,
      siteName: 'Dermaspace',
      type: 'profile',
      images: [
        {
          url: avatarUrl,
          width: 512,
          height: 512,
          alt: `${displayName}'s avatar`,
        },
      ],
      ...(profile.username ? { username: profile.username } : {}),
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: [avatarUrl],
    },
  }
}

export default async function UsernameLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const decision = classifyProfileSegment(username)

  if (decision.kind === 'redirect') {
    redirect(decision.to)
  }
  if (decision.kind === 'not_found') {
    notFound()
  }

  const result = await loadProfile(username)
  if (result.status === 'not_found') {
    notFound()
  }

  if (result.status === 'found' && result.profile.is_public === false) {
    const viewer = await getCurrentUser().catch(() => null)
    if (!viewer || String(viewer.id) !== String(result.profile.id)) {
      notFound()
    }
  }

  return <>{children}</>
}
