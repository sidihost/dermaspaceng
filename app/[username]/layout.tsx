/**
 * Server-side layout for public profile routes.
 *
 * The profile page itself is a client component (interactive follow
 * button, picker modals, etc.), so we cannot put `generateMetadata`
 * on it directly. Layouts are always server components in Next.js,
 * which makes this file the right home for the Open Graph + Twitter
 * card tags that chat apps (WhatsApp, iMessage, Telegram, Slack)
 * and social platforms (X, Facebook, LinkedIn) read when a link is
 * pasted into a conversation.
 *
 * Without these tags WhatsApp falls back to a generic link preview
 * with no image — which is exactly what the user wanted to fix.
 */

import type { Metadata } from 'next'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

type ProfileRow = {
  first_name: string
  last_name: string
  username: string | null
  avatar_url: string | null
  bio: string | null
  is_public: boolean | null
}

async function loadProfile(username: string): Promise<ProfileRow | null> {
  const clean = username.trim().toLowerCase()
  if (!clean) return null
  try {
    let rows = (await sql`
      SELECT first_name, last_name, username, avatar_url, bio, is_public
      FROM users
      WHERE LOWER(username) = ${clean}
      LIMIT 1
    `) as ProfileRow[]

    // Support /{uuid} link sharing for users without a handle yet.
    if (rows.length === 0) {
      rows = (await sql`
        SELECT first_name, last_name, username, avatar_url, bio, is_public
        FROM users
        WHERE id::text = ${username}
        LIMIT 1
      `) as ProfileRow[]
    }
    return rows[0] ?? null
  } catch {
    return null
  }
}

// Resolve an absolute URL we can feed to OG tags. Vercel sets
// VERCEL_URL, local dev falls back to the request origin via the
// browser — for server-rendered metadata we only have env vars,
// so we prefer an explicit NEXT_PUBLIC_SITE_URL when the team sets
// one (for production domains), then VERCEL_URL, then a dev default.
function resolveBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return explicit.replace(/\/$/, '')
  const vercel = process.env.VERCEL_URL
  if (vercel) return `https://${vercel}`
  return 'http://localhost:3000'
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>
}): Promise<Metadata> {
  const { username } = await params
  const profile = await loadProfile(username)
  const base = resolveBaseUrl()
  const url = `${base}/${encodeURIComponent(username)}`

  // Profile not found OR marked private → return a generic metadata
  // block so the link still renders *something* sensible in chats,
  // without leaking private user details.
  if (!profile || profile.is_public === false) {
    return {
      title: 'Dermaspace',
      description: 'Skincare and wellness at Dermaspace.',
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

  // Absolute avatar URL for OG. Our curated avatars live on blob
  // storage and are already absolute; we just guard against relative
  // paths sneaking in from older records.
  const avatarUrl = profile.avatar_url
    ? profile.avatar_url.startsWith('http')
      ? profile.avatar_url
      : `${base}${profile.avatar_url.startsWith('/') ? '' : '/'}${profile.avatar_url}`
    : `${base}/icon-512.png`

  return {
    title,
    description,
    alternates: { canonical: url },
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
      // Hint social networks that this is a person, not an article.
      // `firstName` / `lastName` aren't standard OG but FB/LinkedIn
      // are known to surface them.
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

export default function UsernameLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
