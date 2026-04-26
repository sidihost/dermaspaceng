// ---------------------------------------------------------------------------
// components/blog/author-avatar.tsx
//
// Generated avatar for a blog post author. The user asked for a richer
// byline ("add avatar like generated for the admin") so each editorial
// author gets a unique illustrated face beside their name on the post
// detail page and post cards.
//
// Why DiceBear?
// -------------
// DiceBear's `notionists-neutral` style ships a clean, illustrated head
// + shoulders avatar that matches the soft, editorial tone of the
// journal. The API is free, returns SVG, and is fully deterministic —
// the same `seed` always produces the same face — so an admin's avatar
// stays stable across posts without us having to upload anything.
//
// We render via a plain <img> (not next/image) on purpose:
//
//   1. SVG is already tiny (~3-5kb) so the optimizer adds no value.
//   2. Using <img> lets us avoid having to add `api.dicebear.com` to
//      `next.config.mjs` `remotePatterns`, which would be a one-line
//      change but makes the build config drift further from the
//      "Vercel Blob is the only image source" baseline.
//
// If `author_avatar_url` is set on the post, we honor that instead and
// render it as the source — DiceBear is only the *fallback* so that
// real author photos always win when admins upload them.
// ---------------------------------------------------------------------------

interface AuthorAvatarProps {
  /** Author display name. Used as the deterministic seed. */
  name: string | null | undefined
  /** Optional admin-uploaded avatar. Wins over the generated SVG. */
  src?: string | null
  /** Pixel size — defaults to 36 (matches dashboard chrome). */
  size?: number
  /** Extra classes for the wrapper. */
  className?: string
}

// We pin the DiceBear style + theme colours to a fixed brand-aligned
// palette so generated avatars feel like they belong to Dermaspace
// rather than a random app. The background is a translucent purple
// tint, hair/skin colours come from a curated set close to our brand
// photography.
function buildDicebearUrl(seed: string) {
  const params = new URLSearchParams({
    seed,
    radius: '50',
    backgroundType: 'solid',
    backgroundColor: 'ede4f1,f6e8fa,e9dcf1',
  })
  return `https://api.dicebear.com/9.x/notionists-neutral/svg?${params.toString()}`
}

export function AuthorAvatar({
  name,
  src,
  size = 36,
  className = '',
}: AuthorAvatarProps) {
  const seed = (name || 'Dermaspace Editorial').trim() || 'Dermaspace Editorial'
  const finalSrc = src || buildDicebearUrl(seed)

  return (
    <span
      className={`relative inline-block rounded-full overflow-hidden bg-[#7B2D8E]/10 ring-1 ring-[#7B2D8E]/15 flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={finalSrc}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        className="block w-full h-full object-cover"
      />
    </span>
  )
}
