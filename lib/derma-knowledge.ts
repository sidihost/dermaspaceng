/**
 * Canonical Website Knowledge & Pure Formatting Helpers for Derma AI
 * ------------------------------------------------------------------
 * Single, strictly-grounded reference built exclusively from existing
 * Dermaspace pages and modules (app/about/page.tsx, app/packages/page.tsx,
 * lib/membership-plans.ts, app/gift-cards/gift-cards-client.tsx,
 * components/laser/laser-page-content.tsx, components/layout/footer.tsx,
 * lib/services-catalog.ts).
 *
 * Pure module (zero DB / HTTP imports) so it can be unit-tested cleanly.
 */

import type { CatalogCategory } from './services-catalog'
import type { FeatureFlag } from './feature-flags'
import type { MaintenanceSettings } from './app-settings'
import type { BookingLocation } from './booking'
import { MEMBERSHIP_PLANS, formatNgn, formatGlowPoints } from './membership-plans'

export interface FounderProfile {
  name: string
  role: string
  company: string
  bio: string
}

export interface PackageSpec {
  name: string
  type: 'Single' | 'Couple'
  priceNaira: number
  duration: string
  features: string[]
  popular?: boolean
}

export const WEBSITE_FACTS = {
  brandName: 'Dermaspace Esthetic & Wellness Centre',
  legalName: 'Dermaspace Esthetic and Wellness Centre Ltd',
  founded: 'April 2019',
  city: 'Lagos, Nigeria',
  mission:
    'A boutique spa promoting skin confidence and body wellness since April 2019, recognized as one of the best day and esthetic spas in Lagos, Nigeria.',
  stats: {
    founded: '2019',
    happyClients: '10K+',
    locationsCount: 2,
    treatmentsCount: '50+',
  },
  coreAreas: [
    'Body treatments',
    'Facial treatments',
    'Waxing',
    'Nail care',
    'Advanced esthetic treatments (including Laser Tech)',
  ],
  values: [
    {
      title: 'Client-Centered Care',
      description: 'Good skincare is good self-care. Every treatment is tailored to your unique needs.',
    },
    {
      title: 'Professional Excellence',
      description: 'International certifications from renowned brands and institutes worldwide.',
    },
    {
      title: 'Premium Quality',
      description: 'Finest products and techniques for exceptional results.',
    },
    {
      title: 'Welcoming Environment',
      description: 'Serene space where you can unwind and embrace complete relaxation.',
    },
  ],
  founders: [
    {
      name: 'Itunuoluwa Umar-Lawal',
      role: 'CEO',
      company: 'Dermaspace Esthetic and Wellness Centre Ltd',
      bio: 'Passionate skincare enthusiast focused on product formulation; certified in spa products formulation from England; founded a natural skincare product range in the past; trained lawyer with a natural flair for entrepreneurship. Believes our skin is as unique as our personalities and good skincare is good self-care.',
    },
    {
      name: 'Franca Ebuzome',
      role: 'Co-Founder & COO',
      company: 'Dermaspace Esthetic and Wellness Centre Ltd',
      bio: 'Licensed Medical Esthetician (CIDESCO) and Laser Technician with over a decade of hands-on experience in skincare therapy and wellness; committed to noninvasive or mild-invasive methods; certified by renowned international brands and institutes; also a licensed Real Estate Broker (ANIVS) and Facility Manager.',
    },
  ] satisfies FounderProfile[],
  contact: {
    publicEmail: 'info@dermaspaceng.com',
    supportEmail: 'hello@dermaspaceng.com',
    hoursSummary:
      'Sun & Mon: 1pm - 7pm · Tue - Thu: 10am - 7pm · Fri - Sat: 10am - 10pm (Ikoyi closed Sun & Mon)',
    branches: [
      {
        id: 'vi',
        name: 'Victoria Island',
        address: '237B Muri Okunola Street, Victoria Island, Lagos',
        phone: '+234 906 183 6625',
        hours: 'Sun & Mon: 1pm - 7pm, Tue - Thu: 10am - 7pm, Fri - Sat: 10am - 10pm',
      },
      {
        id: 'ikoyi',
        name: 'Ikoyi',
        address: '9 Agbeke Rotinwa Cl, Dolphin Extension Estate, Ikoyi, Lagos 106104',
        phone: '+234 901 313 4945',
        hours: 'Tue - Thu: 10am - 7pm, Fri - Sat: 10am - 10pm (Closed Sun & Mon)',
      },
    ],
  },
  packages: [
    {
      name: 'Gold Experience',
      type: 'Single',
      priceNaira: 150000,
      duration: '3 Hours 30 Mins',
      popular: true,
      features: [
        '1 Hour Deep Tissue Massage/Swedish Massage',
        'Detox Body Scrub (Salt/Sugar) + Steam',
        'Deep Cleansing Facial',
        'ManiPedi or Wax treatment worth 25,000',
      ],
    },
    {
      name: 'Silver Experience',
      type: 'Single',
      priceNaira: 110000,
      duration: '2 Hours 50 Mins',
      features: [
        '1 Hour Deep Tissue Massage/Swedish Massage OR Detox Body Scrub + Steam',
        'Deep Cleansing Facial',
        'ManiPedi or Wax treatment worth 25,000',
      ],
    },
    {
      name: 'Bronze Experience',
      type: 'Single',
      priceNaira: 80000,
      duration: '2 Hours',
      features: [
        '1 Hour Deep Tissue Massage/Swedish Massage',
        'Deep Cleansing Facial',
      ],
    },
    {
      name: 'Gold Experience',
      type: 'Couple',
      priceNaira: 290000,
      duration: '3 Hours 30 Mins',
      popular: true,
      features: [
        'Couple 1 Hour Deep Tissue Massage/Swedish Massage',
        'Detox Body Scrub (Salt/Sugar) + Steam',
        'Deep Cleansing Facial',
        'ManiPedi or Wax treatment worth 25,000',
      ],
    },
    {
      name: 'Silver Experience',
      type: 'Couple',
      priceNaira: 210000,
      duration: '2 Hours 50 Mins',
      features: [
        '1 Hour Deep Tissue Massage/Swedish Massage OR Detox Body Scrub + Steam',
        'Deep Cleansing Facial',
        'ManiPedi or Wax treatment worth 25,000',
      ],
    },
    {
      name: 'Bronze Experience',
      type: 'Couple',
      priceNaira: 160000,
      duration: '2 Hours',
      features: [
        '1 Hour Deep Tissue Massage/Swedish Massage',
        'Deep Cleansing Facial',
      ],
    },
  ] satisfies PackageSpec[],
  giftCards: {
    amounts: [
      { amountNaira: 5000, label: 'Basic Facial' },
      { amountNaira: 8000, label: 'Manicure' },
      { amountNaira: 12000, label: 'Pedicure' },
      { amountNaira: 15000, label: 'Body Massage' },
      { amountNaira: 25000, label: 'Full Spa Day' },
      { amountNaira: 50000, label: 'Premium Package' },
    ],
    customAmountAllowed: true,
    validity: '12 months from purchase',
    deliveryMethods: ['Digital delivery via email', 'Downloadable gift card'],
  },
  policies: {
    privacy: 'Nigeria Data Protection Act (NDPA) aligned (/privacy).',
    terms: 'Terms of Service (/terms).',
    dermaAiTerms: 'Derma AI Terms & Acceptable Use (/derma-ai-terms) — Derma AI is a wellness assistant, not a medical doctor.',
  },
} as const

export const LASER_TECH_HIGHLIGHTS = [
  { name: 'Laser Hair Removal (22 zones, Female & Male pricing)', priceRange: '₦10,000 - ₦160,000', duration: '20-60 mins', link: '/laser-tech' },
  { name: 'Carbon Peel / Acne Laser (9 treatments)', priceRange: '₦30,000 - ₦200,000', duration: 'varies', link: '/laser-tech' },
  { name: 'Laser Package Deals (Full Body, Half Body, Combos)', priceRange: '₦50,000 - ₦600,000', duration: 'up to 2 hrs', link: '/laser-tech' },
] as const

/**
 * Formats live feature flags, maintenance mode, and active branches
 * into a compact, unambiguous status block for the LLM.
 */
export function formatLiveWebsiteStatus(opts: {
  flags: FeatureFlag[]
  effectiveMap: Record<string, boolean>
  maintenance: MaintenanceSettings
  activeLocations?: BookingLocation[]
  recentPosts?: Array<{ title: string; slug: string; categoryName?: string | null }>
}): string {
  const { flags, effectiveMap, maintenance, activeLocations, recentPosts } = opts

  const liveFeatures: string[] = []
  const pausedFeatures: string[] = []

  const knownLabels: Record<string, string> = {
    booking: 'Online booking (/booking)',
    ai_chat: 'Derma AI chat',
    ai_voice: 'Derma AI voice / Live mode',
    gift_cards: 'Gift cards (/gift-cards)',
    vouchers: 'Vouchers & promo code redemption',
    newsletter: 'Newsletter signup',
    referrals: 'Referral program',
    wallet: 'Customer wallet (/dashboard/wallet)',
    push_notifs: 'Push notifications',
    live_chat: 'Live agent chat in support',
    signups: 'New account signups (/signup)',
    reviews: 'Public reviews',
    festive: 'Christmas & holiday features',
  }

  const seenKeys = new Set<string>()
  for (const flag of flags) {
    if (flag.key === 'maintenance') continue
    seenKeys.add(flag.key)
    const label = knownLabels[flag.key] || flag.label || flag.key
    const isVisible = effectiveMap[flag.key] !== false
    if (isVisible) {
      liveFeatures.push(`${label} [${flag.key}]`)
    } else {
      const reason = flag.visibility === 'preview' ? 'admin-only preview / paused for public' : 'paused / off'
      pausedFeatures.push(`${label} [${flag.key}] (${reason})`)
    }
  }

  for (const [key, isVisible] of Object.entries(effectiveMap)) {
    if (key === 'maintenance' || seenKeys.has(key)) continue
    const label = knownLabels[key] || key
    if (isVisible) liveFeatures.push(`${label} [${key}]`)
    else pausedFeatures.push(`${label} [${key}] (paused / off)`)
  }

  const lines: string[] = ['CURRENT WEBSITE STATUS (live runtime state — obey strictly):']

  if (maintenance.enabled) {
    lines.push(
      `- MAINTENANCE MODE: ON ("${maintenance.message}"${maintenance.eta ? `, ETA: ${maintenance.eta}` : ''})`,
    )
  } else {
    lines.push('- MAINTENANCE MODE: OFF (site is live)')
  }

  if (activeLocations && activeLocations.length > 0) {
    lines.push(
      `- ACTIVE BRANCHES: ${activeLocations.map((l) => `${l.name} (${l.address}, ${l.phone})`).join(' | ')}`,
    )
  } else if (activeLocations && activeLocations.length === 0) {
    lines.push('- ACTIVE BRANCHES: None currently active for online booking.')
  }

  lines.push(
    `- LIVE FEATURES: ${liveFeatures.length > 0 ? liveFeatures.join(', ') : 'Standard catalog & info pages'}`,
  )
  lines.push(
    `- PAUSED / UNAVAILABLE FEATURES: ${pausedFeatures.length > 0 ? pausedFeatures.join(', ') : 'None (all configured features are currently live)'}`,
  )

  if (recentPosts && recentPosts.length > 0) {
    lines.push(
      `- RECENT JOURNAL ARTICLES (/blog): ${recentPosts
        .slice(0, 8)
        .map((p) => `"${p.title}" (/blog/${p.slug})`)
        .join(', ')}`,
    )
  }

  return lines.join('\n')
}

/**
 * Formats the canonical Dermaspace website facts block for system prompts.
 * Every name, price, plan, package, and contact detail is copied verbatim
 * from the site's actual pages and modules.
 */
export function buildCanonicalWebsiteFactsPrompt(): string {
  const foundersText = WEBSITE_FACTS.founders
    .map((f) => `${f.name} (${f.role} — ${f.bio})`)
    .join('\n  * ')

  const membershipText = MEMBERSHIP_PLANS.map(
    (m) =>
      `${m.name}: ${formatNgn(m.price)}/year (${m.validityMonths} months), ${formatGlowPoints(m.glowPointsOnSignup)}${
        m.siteWideOnly
          ? ' — site-wide membership, NOT tied to spa service'
          : ` — flagship spa membership (${m.treatmentDiscountPct}% off facial & body treatments, ${m.waxingDiscountPct}% off waxing & mani-pedi, ${formatNgn(m.price)} wallet credit, priority booking every day, complimentary quarterly signature facial)`
      }`,
  ).join('\n  * ')

  const packagesText = WEBSITE_FACTS.packages
    .map((p) => `${p.name} (${p.type}): ${formatNgn(p.priceNaira)} · ${p.duration}`)
    .join(' | ')

  return `CANONICAL DERMASPACE WEBSITE KNOWLEDGE (strict ground truth — NEVER invent or guess names, prices, or features outside this and live tool outputs):
- BRAND & STORY: ${WEBSITE_FACTS.brandName} (${WEBSITE_FACTS.legalName}), founded ${WEBSITE_FACTS.founded} in ${WEBSITE_FACTS.city}. ${WEBSITE_FACTS.mission} Stats: Founded ${WEBSITE_FACTS.stats.founded}, ${WEBSITE_FACTS.stats.happyClients} Happy Clients, ${WEBSITE_FACTS.stats.locationsCount} Locations, ${WEBSITE_FACTS.stats.treatmentsCount} Treatments.
- FOUNDERS & LEADERSHIP (/about):
  * ${foundersText}
- CORE SERVICES (/services, /laser-tech): ${WEBSITE_FACTS.coreAreas.join(', ')}. Use getServices or searchServices for exact live treatment prices and durations.
- SPA PACKAGES (/packages): ${packagesText}.
- MEMBERSHIPS (/membership):
  * ${membershipText}
- GIFT CARDS (/gift-cards): Preset amounts ${WEBSITE_FACTS.giftCards.amounts.map((a) => `${formatNgn(a.amountNaira)} (${a.label})`).join(', ')}, plus custom amount; ${WEBSITE_FACTS.giftCards.validity}; email or downloadable card. (Only available if gift_cards is LIVE below.)
- CONTACT & LOCATIONS:
  * Victoria Island: ${WEBSITE_FACTS.contact.branches[0].address} | ${WEBSITE_FACTS.contact.branches[0].phone}
  * Ikoyi: ${WEBSITE_FACTS.contact.branches[1].address} | ${WEBSITE_FACTS.contact.branches[1].phone}
  * Hours: ${WEBSITE_FACTS.contact.hoursSummary}
  * Email: ${WEBSITE_FACTS.contact.publicEmail} (support inbox: ${WEBSITE_FACTS.contact.supportEmail})
- POLICIES: ${WEBSITE_FACTS.policies.privacy} ${WEBSITE_FACTS.policies.terms} ${WEBSITE_FACTS.policies.dermaAiTerms}
- STRICT GROUNDING RULE: Never guess or fabricate founder names, staff names, prices, services, or active features. If a feature is listed under PAUSED / UNAVAILABLE FEATURES below, tell the user honestly that it is temporarily paused on the website right now and do not send them to use that paused feature.`
}

/**
 * Formats categories & treatments from `getMergedCatalog()` for `getServices`.
 */
export function formatServicesCatalogForAI(
  catalog: CatalogCategory[],
  category: 'facial' | 'body' | 'nail' | 'waxing' | 'laser' | 'all',
) {
  const slugMatchers: Record<Exclude<typeof category, 'all'>, string[]> = {
    facial: ['facial-treatments', 'dermaspace-peels'],
    body: ['body-treatments', 'bulk-packages'],
    nail: ['nail-care'],
    waxing: ['waxing'],
    laser: ['laser-hair-removal', 'laser-package-deals', 'hollywood-peel'],
  }

  const mapCategory = (c: CatalogCategory) => ({
    name: c.title,
    slug: c.slug,
    tagline: c.tagline,
    link: c.slug.startsWith('laser') || c.slug === 'hollywood-peel' ? '/laser-tech' : `/services/${c.slug}`,
    services: c.treatments.map((t) => ({
      name: t.name,
      price: formatNgn(t.priceFrom),
      duration: t.duration,
      ...(t.variants?.length
        ? {
            options: t.variants.map((v) => `${v.label}: ${formatNgn(v.price)} (${v.duration})`),
          }
        : {}),
    })),
  })

  if (category === 'all') {
    return {
      success: true,
      categories: catalog.map(mapCategory),
      overviewLink: '/services',
    }
  }

  const targetSlugs = slugMatchers[category]
  const matched = catalog.filter((c) => targetSlugs.includes(c.slug))
  return {
    success: true,
    categories: matched.map(mapCategory),
    link: matched[0]
      ? matched[0].slug.startsWith('laser') || matched[0].slug === 'hollywood-peel'
        ? '/laser-tech'
        : `/services/${matched[0].slug}`
      : '/services',
  }
}

/**
 * Searches merged catalog categories & treatments by keyword/phrase.
 */
export function searchMergedCatalogForAI(catalog: CatalogCategory[], query: string) {
  const q = query.trim().toLowerCase()
  const tokens = q.split(/\s+/).filter((t) => t.length > 1)
  const matches: Array<{
    name: string
    price: string
    duration: string
    category: string
    link: string
    score: number
  }> = []

  for (const cat of catalog) {
    const link =
      cat.slug.startsWith('laser') || cat.slug === 'hollywood-peel'
        ? '/laser-tech'
        : `/services/${cat.slug}`
    for (const t of cat.treatments) {
      const haystack = `${t.name} ${cat.title} ${t.description} ${(t.concerns || []).join(' ')}`.toLowerCase()
      let score = 0
      if (t.name.toLowerCase().includes(q)) score += 5
      if (cat.title.toLowerCase().includes(q)) score += 3
      for (const tok of tokens) {
        if (haystack.includes(tok)) score += 1
      }
      if (score > 0) {
        matches.push({
          name: t.name,
          price: formatNgn(t.priceFrom),
          duration: t.duration,
          category: cat.title,
          link,
          score,
        })
      }
    }
  }

  matches.sort((a, b) => b.score - a.score)
  return {
    success: true,
    query,
    matches: matches.slice(0, 8).map(({ score: _s, ...rest }) => rest),
    noResults: matches.length === 0,
    servicesLink: '/services',
  }
}
