// Curated set of pickable spa-themed avatars. Each entry ships as an
// SVG under /public/spa-avatars/<slug>.svg so any existing `<img src>`
// or Next `<Image>` renderer picks them up with zero special casing —
// the stored value in users.avatar_url is just the public URL.
//
// If you add a new avatar: drop the SVG in /public/spa-avatars/ with a
// matching slug, then append a row here. The picker UI reads this
// array directly so new designs show up automatically.
export interface SpaAvatar {
  slug: string
  url: string
  label: string
  // Soft background colour used behind the tile in the picker grid so
  // each avatar feels distinct at a glance. Should roughly match the
  // background circle inside the SVG itself.
  tint: string
}

export const SPA_AVATARS: SpaAvatar[] = [
  { slug: 'lotus',     url: '/spa-avatars/lotus.svg',     label: 'Lotus',       tint: '#FCE4EC' },
  { slug: 'orchid',    url: '/spa-avatars/orchid.svg',    label: 'Orchid',      tint: '#F3E5F5' },
  { slug: 'butterfly', url: '/spa-avatars/butterfly.svg', label: 'Butterfly',   tint: '#EDE7F6' },
  { slug: 'rose',      url: '/spa-avatars/rose.svg',      label: 'Rose',        tint: '#FCE4EC' },
  { slug: 'bloom',     url: '/spa-avatars/bloom.svg',     label: 'Marigold',    tint: '#FFF3E0' },
  { slug: 'leaf',      url: '/spa-avatars/leaf.svg',      label: 'Leaf',        tint: '#E0F2F1' },
  { slug: 'bamboo',    url: '/spa-avatars/bamboo.svg',    label: 'Bamboo',      tint: '#F1F8E9' },
  { slug: 'waterdrop', url: '/spa-avatars/waterdrop.svg', label: 'Serenity',    tint: '#E1F5FE' },
  { slug: 'candle',    url: '/spa-avatars/candle.svg',    label: 'Candle',      tint: '#FFF8E1' },
  { slug: 'stones',    url: '/spa-avatars/stones.svg',    label: 'Zen Stones',  tint: '#EFEBE9' },
  { slug: 'tea',       url: '/spa-avatars/tea.svg',       label: 'Herbal Tea',  tint: '#FFEBEE' },
  { slug: 'moon',      url: '/spa-avatars/moon.svg',      label: 'Moonlight',   tint: '#EDE7F6' },
]

export function isSpaAvatarUrl(url: string | null | undefined): boolean {
  if (!url) return false
  return typeof url === 'string' && url.startsWith('/spa-avatars/')
}
