// Curated set of pickable character avatars.
//
// Each entry ships as a 3D Pixar-style character portrait rendered to
// a pastel backdrop and stored under /public/avatars/<slug>.jpg. The
// picker UI reads this array directly, so adding a new avatar is a
// matter of dropping the JPG in /public/avatars/ and appending a row
// here.
//
// We tag each avatar with a `gender` so the picker can show Men /
// Women tabs without us needing to store gender on the user record —
// the viewer self-selects which tab to browse.
export type AvatarGender = 'men' | 'women'

export interface SpaAvatar {
  slug: string
  url: string
  label: string
  gender: AvatarGender
  // Soft background colour used behind the tile in the picker grid so
  // the avatar feels cohesive with its pastel backdrop even before
  // the JPG finishes loading. Matches the render's background.
  tint: string
}

export const SPA_AVATARS: SpaAvatar[] = [
  // Men — every entry is a Nigerian adult rendered in the same 3D
  // Pixar-style as the cultural set further down. The first batch
  // used to ship as a generic global pool (Kai / Jordan / Mateo / Ren
  // etc) which felt out of place next to the gele- and fila-wearing
  // cultural avatars below — the product wanted ALL portraits to
  // read as Naija, just with different style choices (eyeglasses,
  // caps, hairstyles) so users can self-identify on look rather
  // than ethnicity.
  { slug: 'm1',  url: '/avatars/m1.jpg',  label: 'Kayode',  gender: 'men',   tint: '#E6E3F5' }, // round glasses + low fade
  { slug: 'm2',  url: '/avatars/m2.jpg',  label: 'Bayo',    gender: 'men',   tint: '#DCE8F5' }, // snapback cap + clean shave
  { slug: 'm3',  url: '/avatars/m3.jpg',  label: 'Seun',    gender: 'men',   tint: '#F5F0DC' }, // square glasses + full beard
  { slug: 'm4',  url: '/avatars/m4.jpg',  label: 'Obi',     gender: 'men',   tint: '#DCF0E3' }, // afro + bright smile
  { slug: 'm5',  url: '/avatars/m5.jpg',  label: 'Tomi',    gender: 'men',   tint: '#F5DCE3' }, // bucket hat + goatee
  { slug: 'm6',  url: '/avatars/m6.jpg',  label: 'Emeka',   gender: 'men',   tint: '#F5E6DC' }, // dreadlocks + clear glasses
  // Cultural / styled additions — Hausa, Yoruba and Igbo
  // representation, plus a hoodie and a cap, all rooted in Naija
  // culture.
  { slug: 'm7',  url: '/avatars/m7.jpg',  label: 'Tunde',   gender: 'men',   tint: '#E0EAD9' }, // Yoruba — fila cap
  { slug: 'm8',  url: '/avatars/m8.jpg',  label: 'Aliyu',   gender: 'men',   tint: '#F5EFE0' }, // Hausa — kufi cap
  { slug: 'm9',  url: '/avatars/m9.jpg',  label: 'Chinedu', gender: 'men',   tint: '#F5DCE3' }, // Igbo — isiagu
  { slug: 'm10', url: '/avatars/m10.jpg', label: 'Dami',    gender: 'men',   tint: '#DCE8F5' }, // hoodie
  { slug: 'm11', url: '/avatars/m11.jpg', label: 'Femi',    gender: 'men',   tint: '#F5E6DC' }, // snapback cap
  // Women — same logic as the men's pool: every face is a Nigerian
  // adult, the variety comes from hair / eyewear / accessories.
  { slug: 'f1',  url: '/avatars/f1.jpg',  label: 'Folake',  gender: 'women', tint: '#F5DCE3' }, // natural afro + cat-eye glasses
  { slug: 'f2',  url: '/avatars/f2.jpg',  label: 'Amara',   gender: 'women', tint: '#E6E3F5' }, // long box braids
  { slug: 'f3',  url: '/avatars/f3.jpg',  label: 'Bisola',  gender: 'women', tint: '#F5F0DC' }, // sleek bob + round glasses
  { slug: 'f4',  url: '/avatars/f4.jpg',  label: 'Ngozi',   gender: 'women', tint: '#DCF0E3' }, // bantu knots + smile
  { slug: 'f5',  url: '/avatars/f5.jpg',  label: 'Tola',    gender: 'women', tint: '#DCE8F5' }, // curly puff + clear glasses
  { slug: 'f6',  url: '/avatars/f6.jpg',  label: 'Ifeoma',  gender: 'women', tint: '#F5E6DC' }, // sleek updo + headband
  // Cultural / styled additions — gele, hijab and hoodie variants.
  { slug: 'f7',  url: '/avatars/f7.jpg',  label: 'Adeola',  gender: 'women', tint: '#F5DEDC' }, // Yoruba — gele
  { slug: 'f8',  url: '/avatars/f8.jpg',  label: 'Hauwa',   gender: 'women', tint: '#F5EFE0' }, // Hausa — hijab
  { slug: 'f9',  url: '/avatars/f9.jpg',  label: 'Chioma',  gender: 'women', tint: '#DCF0E3' }, // Igbo — gele
  { slug: 'f10', url: '/avatars/f10.jpg', label: 'Naomi',   gender: 'women', tint: '#E6E3F5' }, // hoodie
  { slug: 'f11', url: '/avatars/f11.jpg', label: 'Aisha',   gender: 'women', tint: '#F5EFE0' }, // modern hijab
]

// True when the given URL points at one of our curated avatars. Used
// by the public profile to show a subtle "crafted" badge, and used
// internally by the picker to detect which tab to open first.
export function isSpaAvatarUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false
  return url.startsWith('/avatars/') || url.startsWith('/spa-avatars/')
}
