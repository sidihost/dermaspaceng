// ---------------------------------------------------------------------------
// lib/services-catalog.ts
//
// Single source of truth for the Dermaspace services catalog.
//
// History
// -------
// The data used to live in two places (a Record<string, …> at the top
// of `app/services/[slug]/page.tsx` for the public service detail page,
// and a hard-coded object inside the `getServices` tool in
// `app/api/chat/route.ts`). That meant any time we tweaked a price the
// chatbot drifted out of sync with the public site — exactly the kind
// of trust-eroding bug we can't afford on a customer-facing assistant.
//
// This module is now the canonical structured catalog. Everywhere that
// renders or mentions a treatment should import from here:
//
//   • /services/[slug]                 → render the page
//   • Derma AI's `getServices` tool    → answer "what facials do you
//                                          have?"
//   • Vector indexer                   → seed Upstash Vector with one
//                                          entry per category + per
//                                          treatment for semantic
//                                          search
//   • Recommendation surfaces (e.g.
//     /dashboard, /booking)            → "treatments you might like"
//
// Schema
// ------
// We deliberately keep this catalog plain TypeScript instead of moving
// it into Postgres — the data is small (40-ish treatments), changes
// rarely, and ships with the deploy so we never serve stale prices on
// a cache miss. When the catalog grows (per-branch pricing, dynamic
// availability), promote it to a `services` table and re-export the
// same shape from a Postgres-backed loader.
// ---------------------------------------------------------------------------

export interface CatalogTreatment {
  /** Lower-case kebab id, unique within a category. Used as part of
   *  the vector entry id and as the canonical anchor on the service
   *  detail page (`#hydra-facial`). */
  id: string
  name: string
  duration: string
  /** Starting price in NGN (whole number, no commas, no kobo). The
   *  public site formats this as "₦25,000". */
  priceFrom: number
  description: string
  /** When true the treatment is rendered with the "Most Popular"
   *  treatment cards on the service detail page AND boosted slightly
   *  in semantic search re-ranking. */
  popular?: boolean
  /** Optional curated tags — primary skin/body concerns this treatment
   *  is intended to address. They're concatenated into the embedding
   *  text so a search for "melasma" matches the same vector
   *  neighbourhood as our pigmentation-targeting treatments. */
  concerns?: string[]
}

export interface CatalogCategory {
  /** URL slug — `/services/${slug}`. */
  slug: string
  title: string
  tagline: string
  description: string
  image: string
  treatments: CatalogTreatment[]
}

// ---------------------------------------------------------------------------
// The catalog itself
// ---------------------------------------------------------------------------
// Intentionally written as a flat array (not a Record keyed by slug) so
// iteration order is stable and we can ship a deterministic vector seed.

export const SERVICES_CATALOG: CatalogCategory[] = [
  {
    slug: "facial-treatments",
    title: "Facial Treatments",
    tagline: "Radiance Starts Here",
    description:
      "Transform your skin with our expert facial treatments. From deep cleansing to advanced therapies, we offer solutions for every skin type and concern.",
    image:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6462-2048x1463.jpg-768x549-2-aOLyIQYjwEGezoOTEw78F0jLOjfkia.webp",
    treatments: [
      {
        id: "deep-cleansing-facial",
        name: "Deep Cleansing Facial",
        duration: "60 mins",
        priceFrom: 25000,
        description: "Thorough cleansing and extraction for clear, refreshed skin.",
        concerns: ["congested skin", "blackheads", "oily skin", "dull skin"],
      },
      {
        id: "hydra-facial",
        name: "Hydra Facial",
        duration: "75 mins",
        priceFrom: 50000,
        description:
          "Multi-step treatment that cleanses, exfoliates, extracts and infuses serums for deep hydration.",
        popular: true,
        concerns: ["dehydration", "dullness", "fine lines", "uneven tone"],
      },
      {
        id: "signature-facial",
        name: "Signature Facial",
        duration: "90 mins",
        priceFrom: 45000,
        description: "Our signature rejuvenating treatment, customised to your skin profile.",
        popular: true,
        concerns: ["all skin types", "general rejuvenation"],
      },
      {
        id: "acne-facial",
        name: "Acne Facial",
        duration: "60 mins",
        priceFrom: 30000,
        description: "Targeted treatment for acne-prone skin with calming, anti-bacterial actives.",
        concerns: ["acne", "breakouts", "post-acne marks", "oily skin"],
      },
      {
        id: "microneedling",
        name: "Microneedling",
        duration: "60 mins",
        priceFrom: 80000,
        description:
          "Collagen-induction therapy that smooths texture and softens scarring over a course of sessions.",
        concerns: ["acne scars", "fine lines", "skin texture", "stretch marks"],
      },
      {
        id: "chemical-peel",
        name: "Chemical Peel",
        duration: "45 mins",
        priceFrom: 50000,
        description: "Exfoliating treatment for skin renewal — brightens, evens tone and refines pores.",
        concerns: ["pigmentation", "melasma", "dull skin", "uneven tone"],
      },
      {
        id: "led-light-therapy",
        name: "LED Light Therapy",
        duration: "30 mins",
        priceFrom: 20000,
        description: "Light-based treatment that calms inflammation and supports collagen production.",
        concerns: ["redness", "acne", "post-procedure recovery"],
      },
      {
        id: "vitamin-c-facial",
        name: "Vitamin C Facial",
        duration: "60 mins",
        priceFrom: 35000,
        description: "Brightening, antioxidant-rich treatment for radiance and tone correction.",
        concerns: ["pigmentation", "dullness", "sun damage", "uneven tone"],
      },
    ],
  },
  {
    slug: "body-treatments",
    title: "Body Treatments",
    tagline: "Revitalize Your Body & Soul",
    description:
      "Indulge in luxurious body treatments designed to melt away tension and leave you feeling completely renewed.",
    image:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-african-woman-resting-relaxing-with-sea-salt-back-spa-salon-5-768x512-1.jpg-qzDnc9aVQiTjypUgkMMu2l5wqwyRZG.webp",
    treatments: [
      {
        id: "swedish-massage",
        name: "Swedish Massage",
        duration: "60 mins",
        priceFrom: 25000,
        description: "Classic relaxation massage with long, flowing strokes to release tension.",
        popular: true,
        concerns: ["stress", "muscle tension", "relaxation"],
      },
      {
        id: "deep-tissue-massage",
        name: "Deep Tissue Massage",
        duration: "60 mins",
        priceFrom: 30000,
        description: "Targets deep muscle tension and chronic pain.",
        concerns: ["muscle pain", "knots", "sports recovery"],
      },
      {
        id: "hot-stone-massage",
        name: "Hot Stone Massage",
        duration: "75 mins",
        priceFrom: 40000,
        description: "Heated stones placed along key points for deeper, warming relaxation.",
        popular: true,
        concerns: ["stress", "stiffness", "circulation"],
      },
      {
        id: "thai-massage",
        name: "Thai Massage",
        duration: "90 mins",
        priceFrom: 35000,
        description: "Traditional stretching and pressure-point therapy.",
        concerns: ["flexibility", "energy", "stiffness"],
      },
      {
        id: "sports-massage",
        name: "Sports Massage",
        duration: "60 mins",
        priceFrom: 30000,
        description: "Designed for active individuals and athletes — recovery-focused.",
        concerns: ["recovery", "performance", "muscle pain"],
      },
      {
        id: "pregnancy-massage",
        name: "Pregnancy Massage",
        duration: "60 mins",
        priceFrom: 30000,
        description: "Safe, soothing massage for expectant mothers.",
        concerns: ["prenatal care", "back pain", "swelling"],
      },
      {
        id: "detox-body-scrub",
        name: "Detox Body Scrub",
        duration: "45 mins",
        priceFrom: 25000,
        description: "Exfoliating scrub to reveal smooth, glowing skin.",
        concerns: ["dull skin", "exfoliation", "pre-event glow"],
      },
      {
        id: "body-wrap",
        name: "Body Wrap",
        duration: "60 mins",
        priceFrom: 35000,
        description: "Detoxifying wrap for skin nourishment and toning.",
        concerns: ["detox", "hydration", "tone"],
      },
    ],
  },
  {
    slug: "nail-care",
    title: "Nail Care",
    tagline: "Beauty at Your Fingertips",
    description:
      "Pamper your hands and feet with our premium nail services. We use only the finest products for beautiful, healthy nails.",
    image:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/young-woman-getting-her-nails-done-salon-scaled.jpg-768x512-1-dTT1qPz9fJm1tSGBMYraVrKPoDeTdC.webp",
    treatments: [
      {
        id: "classic-manicure",
        name: "Classic Manicure",
        duration: "30 mins",
        priceFrom: 8000,
        description: "Basic nail care with shaping, cuticle work and polish.",
        concerns: ["nail care", "everyday grooming"],
      },
      {
        id: "classic-pedicure",
        name: "Classic Pedicure",
        duration: "45 mins",
        priceFrom: 10000,
        description: "Foot soak, exfoliation and polish.",
        concerns: ["foot care", "everyday grooming"],
      },
      {
        id: "hot-wax-manicure",
        name: "Hot Wax Manicure",
        duration: "45 mins",
        priceFrom: 12000,
        description: "Deep moisturising wax treatment for soft, hydrated hands.",
        popular: true,
        concerns: ["dry hands", "luxury treatment"],
      },
      {
        id: "hot-wax-pedicure",
        name: "Hot Wax Pedicure",
        duration: "60 mins",
        priceFrom: 15000,
        description: "Luxurious wax foot treatment that softens hard skin.",
        popular: true,
        concerns: ["dry feet", "luxury treatment"],
      },
      {
        id: "jelly-pedicure",
        name: "Jelly Pedicure",
        duration: "60 mins",
        priceFrom: 18000,
        description: "Fun and relaxing jelly soak experience.",
        concerns: ["relaxation", "luxury treatment"],
      },
      {
        id: "gel-polish",
        name: "Gel Polish",
        duration: "45 mins",
        priceFrom: 15000,
        description: "Long-lasting, chip-resistant gel finish.",
        concerns: ["long-lasting polish", "events"],
      },
      {
        id: "nail-art",
        name: "Nail Art",
        duration: "30 mins",
        priceFrom: 5000,
        description: "Custom nail designs — from minimalist accents to full sets.",
        concerns: ["self-expression", "events"],
      },
      {
        id: "mani-pedi-combo",
        name: "Mani-Pedi Combo",
        duration: "75 mins",
        priceFrom: 20000,
        description: "Complete hand and foot care in one sitting.",
        concerns: ["full grooming", "self-care day"],
      },
    ],
  },
  {
    slug: "waxing",
    title: "Waxing",
    tagline: "Silky Smooth Perfection",
    description:
      "Achieve smooth, hair-free skin with our professional waxing services. We use premium wax for comfortable, long-lasting results.",
    image:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-young-girl-beauty-salon-1024x681.jpg-oxGrqVSRoD400FZKPP5mLOdN42EJvX.webp",
    treatments: [
      {
        id: "full-leg-wax",
        name: "Full Leg Wax",
        duration: "45 mins",
        priceFrom: 20000,
        description: "Complete leg hair removal.",
        popular: true,
        concerns: ["hair removal", "smooth skin"],
      },
      {
        id: "half-leg-wax",
        name: "Half Leg Wax",
        duration: "30 mins",
        priceFrom: 12000,
        description: "Lower leg waxing.",
        concerns: ["hair removal"],
      },
      {
        id: "full-arm-wax",
        name: "Full Arm Wax",
        duration: "30 mins",
        priceFrom: 12000,
        description: "Complete arm hair removal.",
        concerns: ["hair removal"],
      },
      {
        id: "underarm-wax",
        name: "Underarm Wax",
        duration: "15 mins",
        priceFrom: 5000,
        description: "Quick, comfortable underarm waxing.",
        concerns: ["hair removal"],
      },
      {
        id: "brazilian-wax",
        name: "Brazilian Wax",
        duration: "30 mins",
        priceFrom: 15000,
        description: "Complete bikini waxing for total smoothness.",
        popular: true,
        concerns: ["intimate hair removal"],
      },
      {
        id: "bikini-wax",
        name: "Bikini Wax",
        duration: "20 mins",
        priceFrom: 10000,
        description: "Bikini-line waxing.",
        concerns: ["hair removal"],
      },
      {
        id: "full-body-wax",
        name: "Full Body Wax",
        duration: "120 mins",
        priceFrom: 50000,
        description: "Complete body hair removal in one appointment.",
        concerns: ["full grooming", "events"],
      },
      {
        id: "facial-wax",
        name: "Facial Wax",
        duration: "15 mins",
        priceFrom: 5000,
        description: "Upper lip, chin or eyebrow waxing.",
        concerns: ["facial grooming"],
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Convenience accessors
// ---------------------------------------------------------------------------

export function getCategoryBySlug(slug: string): CatalogCategory | null {
  return SERVICES_CATALOG.find((c) => c.slug === slug) ?? null
}

export function getAllTreatments(): Array<{
  category: CatalogCategory
  treatment: CatalogTreatment
}> {
  const out: Array<{ category: CatalogCategory; treatment: CatalogTreatment }> = []
  for (const category of SERVICES_CATALOG) {
    for (const treatment of category.treatments) {
      out.push({ category, treatment })
    }
  }
  return out
}

export function formatNaira(amount: number): string {
  // We always render whole-Naira pricing on the public site
  // ("₦25,000"), so format consistently here.
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
