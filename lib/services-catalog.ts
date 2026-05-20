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
// it into Postgres — the data is small, changes rarely, and ships with
// the deploy so we never serve stale prices on a cache miss. When the
// catalog grows (per-branch pricing, dynamic availability), promote it
// to a `services` table and re-export the same shape from a
// Postgres-backed loader.
//
// Pricing source
// --------------
// All prices and durations below come from the official Dermaspace
// price list (May 2026 revision — "ALL PRICES ARE VAT INCLUSIVE").
// Where the print sheet lists separate female/male pricing (waxing,
// laser hair removal, laser rejuvenation, laser package deals) we
// expose the female ("starting from") price via `priceFrom`. Male
// uplifts and couple pricing are documented in the `description` so
// the booking wizard and AI assistant can communicate them clearly
// without us forking the shape.
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
        priceFrom: 42000,
        description:
          "Thorough cleansing and extraction for clear, refreshed skin. Couple option available from ₦78,000.",
        popular: true,
        concerns: ["congested skin", "blackheads", "oily skin", "dull skin"],
      },
      {
        id: "acne-facial",
        name: "Acne Facial",
        duration: "60 mins",
        priceFrom: 46000,
        description:
          "Targeted treatment for acne-prone skin with calming, anti-bacterial actives.",
        concerns: ["acne", "breakouts", "oily skin"],
      },
      {
        id: "acne-facial-with-extraction",
        name: "Acne Facial with Extraction",
        duration: "90 mins",
        priceFrom: 50000,
        description:
          "Extended acne facial with thorough manual extractions for stubborn congestion.",
        concerns: ["acne", "blackheads", "whiteheads", "congested skin"],
      },
      {
        id: "detoxifying-acne-facial",
        name: "Detoxifying Facial for Acne-Prone Skin",
        duration: "70 mins",
        priceFrom: 80000,
        description:
          "Deep detoxifying protocol for active acne and post-acne marks.",
        concerns: ["acne", "post-acne marks", "oily skin"],
      },
      {
        id: "signature-facial-rejuvenation",
        name: "Signature Facial Rejuvenation",
        duration: "60 mins",
        priceFrom: 55000,
        description: "Our signature rejuvenating treatment, customised to your skin profile.",
        popular: true,
        concerns: ["all skin types", "general rejuvenation"],
      },
      {
        id: "signature-facial-rejuvenation-plus",
        name: "Signature Facial Rejuvenation Plus (Milk Peel)",
        duration: "60 mins",
        priceFrom: 62000,
        description:
          "Signature rejuvenation enhanced with a brightening milk peel for instant glow.",
        concerns: ["dullness", "uneven tone", "brightening"],
      },
      {
        id: "babytox",
        name: "Babytox",
        duration: "90 mins",
        priceFrom: 300000,
        description:
          "Advanced micro-dose treatment for refined pores, smoother texture and a youthful glass-skin finish.",
        concerns: ["fine lines", "pore refinement", "glow", "anti-ageing"],
      },
      {
        id: "hydro-jelly-facial",
        name: "Hydro-Jelly Facial",
        duration: "60 mins",
        priceFrom: 48000,
        description:
          "Cooling hydro-jelly mask treatment that drenches the skin in hydration.",
        concerns: ["dehydration", "dullness", "sensitive skin"],
      },
      {
        id: "layo-facial",
        name: "Layo Facial",
        duration: "70 mins",
        priceFrom: 65000,
        description:
          "Our exclusive Layo protocol — a multi-step luxury facial for visible radiance.",
        concerns: ["dullness", "luxury treatment", "glow"],
      },
      {
        id: "gentlemans-facial",
        name: "Gentleman's Facial",
        duration: "60 mins",
        priceFrom: 45000,
        description:
          "Tailored facial for male skin — addresses razor irritation, ingrown hairs and congestion.",
        concerns: ["men's grooming", "ingrown hairs", "razor bumps"],
      },
      {
        id: "hairline-microneedling",
        name: "Hairline Microneedling / Hydraneedling",
        duration: "40 mins",
        priceFrom: 35000,
        description:
          "Targeted microneedling for the hairline to stimulate growth. Hydraneedling upgrade from ₦80,000.",
        concerns: ["hair loss", "thinning edges", "hairline regrowth"],
      },
      {
        id: "hydra-facial",
        name: "Hydra Facial",
        duration: "90 mins",
        priceFrom: 100000,
        description:
          "Multi-step treatment that cleanses, exfoliates, extracts and infuses serums for deep hydration.",
        popular: true,
        concerns: ["dehydration", "dullness", "fine lines", "uneven tone"],
      },
      {
        id: "rejuvenating-hydra-facial",
        name: "Rejuvenating Hydra Facial",
        duration: "90 mins",
        priceFrom: 120000,
        description:
          "Premium hydra facial enriched with rejuvenating serums and boosters.",
        concerns: ["anti-ageing", "glow", "fine lines"],
      },
      {
        id: "microneedling",
        name: "Microneedling / Hydra Microneedling",
        duration: "120 mins",
        priceFrom: 190000,
        description:
          "Collagen-induction therapy that smooths texture and softens scarring. Hydra Microneedling from ₦240,000.",
        concerns: ["acne scars", "fine lines", "skin texture", "stretch marks"],
      },
      {
        id: "dermaplaning-add-on",
        name: "Dermaplaning Add-On",
        duration: "30 mins",
        priceFrom: 30000,
        description:
          "Add-on physical exfoliation that removes peach fuzz and dead skin for smoother makeup application.",
        concerns: ["exfoliation", "smoothness", "glow"],
      },
      {
        id: "consultation",
        name: "Consultation",
        duration: "90 mins",
        priceFrom: 25000,
        description:
          "One-on-one skin assessment with our therapists to design your personalised plan.",
        concerns: ["skin assessment", "treatment planning"],
      },
    ],
  },
  {
    slug: "dermaspace-peels",
    title: "Dermaspace Peels",
    tagline: "Advanced Pigmentation Correction",
    description:
      "Clinical-grade chemical peels for pigmentation, melasma and deep tone correction. Performed by trained therapists with full consultation.",
    image:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6462-2048x1463.jpg-768x549-2-aOLyIQYjwEGezoOTEw78F0jLOjfkia.webp",
    treatments: [
      {
        id: "depigmentation-peel",
        name: "Depigmentation Peel",
        duration: "60 mins",
        priceFrom: 300000,
        description:
          "Advanced peel system for stubborn pigmentation and uneven tone.",
        popular: true,
        concerns: ["pigmentation", "melasma", "uneven tone"],
      },
      {
        id: "acnelan-depigmentation-peel",
        name: "Acnelan + Depigmentation Peel",
        duration: "60 mins",
        priceFrom: 300000,
        description:
          "Combined Acnelan and depigmentation protocol for acne-prone skin with marks.",
        concerns: ["acne", "post-acne marks", "pigmentation"],
      },
      {
        id: "cosmelan-peel",
        name: "Cosmelan Peel",
        duration: "60 mins",
        priceFrom: 650000,
        description:
          "The gold standard for melasma — a globally renowned in-clinic peel and home-care system.",
        concerns: ["melasma", "deep pigmentation", "sun damage"],
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
        id: "deep-tissue-massage",
        name: "Deep Tissue Massage",
        duration: "60 mins",
        priceFrom: 42000,
        description:
          "Targets deep muscle tension and chronic pain. Couple from ₦76,000. 90-min option from ₦55,000 (couple ₦86,000).",
        popular: true,
        concerns: ["muscle pain", "knots", "sports recovery"],
      },
      {
        id: "swedish-massage",
        name: "Swedish Massage",
        duration: "60 mins",
        priceFrom: 40000,
        description:
          "Classic relaxation massage with long, flowing strokes. Couple from ₦73,000. 90-min option from ₦51,000 (couple ₦80,000).",
        popular: true,
        concerns: ["stress", "muscle tension", "relaxation"],
      },
      {
        id: "deep-tissue-massage-nap",
        name: "Deep Tissue Massage with 20-min Nap",
        duration: "80 mins",
        priceFrom: 47000,
        description:
          "Our deep tissue massage followed by a guided 20-minute power nap to fully reset.",
        concerns: ["stress", "muscle pain", "fatigue"],
      },
      {
        id: "swedish-massage-nap",
        name: "Swedish Massage with 20-min Nap",
        duration: "80 mins",
        priceFrom: 50000,
        description:
          "Swedish massage paired with a 20-minute restorative nap.",
        concerns: ["stress", "relaxation", "fatigue"],
      },
      {
        id: "four-hands-massage",
        name: "4 Hands Massage (DTM / Swedish)",
        duration: "45 mins",
        priceFrom: 55000,
        description:
          "Two therapists working in unison. Swedish from ₦55,000, DTM from ₦60,000. With 20-min nap from ₦60,000 / ₦65,000 (65 mins).",
        concerns: ["luxury", "stress", "deep relaxation"],
      },
      {
        id: "teen-massage",
        name: "Teen Massage",
        duration: "40 mins",
        priceFrom: 35000,
        description:
          "Gentle massage designed for teenagers and younger guests.",
        concerns: ["stress", "growing pains", "relaxation"],
      },
      {
        id: "back-head-shoulder-massage",
        name: "Back, Head & Shoulder Massage",
        duration: "30 mins",
        priceFrom: 25000,
        description:
          "Focused massage on the most stress-prone areas — quick and effective.",
        concerns: ["tension headaches", "neck pain", "shoulder pain"],
      },
      {
        id: "reflexology-foot-massage",
        name: "Reflexology / Foot Massage",
        duration: "30 mins",
        priceFrom: 25000,
        description:
          "Pressure-point therapy on the feet to support whole-body wellness.",
        concerns: ["circulation", "tired feet", "wellness"],
      },
      {
        id: "hot-stone-massage",
        name: "Hot Stone Massage",
        duration: "90 mins",
        priceFrom: 60000,
        description: "Heated stones placed along key points for deeper, warming relaxation.",
        popular: true,
        concerns: ["stress", "stiffness", "circulation"],
      },
      {
        id: "pregnancy-massage",
        name: "Pregnancy Massage",
        duration: "70 mins",
        priceFrom: 50000,
        description: "Safe, soothing massage for expectant mothers.",
        concerns: ["prenatal care", "back pain", "swelling"],
      },
      {
        id: "post-partum-massage",
        name: "New Mum / Post-Partum Massage",
        duration: "60 mins",
        priceFrom: 50000,
        description:
          "Restorative massage for new mothers — eases shoulder, back and hip tension.",
        concerns: ["postnatal recovery", "back pain", "fatigue"],
      },
      {
        id: "detox-body-scrub-steam",
        name: "Detox Body Scrub + Steam (Salt / Sugar)",
        duration: "45 mins",
        priceFrom: 42000,
        description:
          "Exfoliating salt or sugar scrub followed by a detoxifying steam.",
        concerns: ["dull skin", "exfoliation", "detox"],
      },
      {
        id: "detox-body-scrub-massage",
        name: "Detox Body Scrub + 30-min Massage",
        duration: "45 mins",
        priceFrom: 55000,
        description:
          "Detox scrub paired with a 30-min massage. Add an extra hour of massage from ₦75,000.",
        concerns: ["exfoliation", "relaxation", "glow"],
      },
      {
        id: "detox-coffee-body-scrub",
        name: "Detox Coffee Body Scrub",
        duration: "45 mins",
        priceFrom: 45000,
        description:
          "Stimulating coffee-grain scrub for firmer, smoother skin. Add a 30-min massage from ₦55,000.",
        concerns: ["cellulite", "exfoliation", "circulation"],
      },
      {
        id: "dermaspace-body-glow",
        name: "Dermaspace Body Glow",
        duration: "60 mins",
        priceFrom: 50000,
        description:
          "Signature body-brightening treatment for an even, radiant finish from neck to toe.",
        concerns: ["brightening", "evenness", "glow"],
      },
      {
        id: "one-hour-massage-steam",
        name: "1 Hour Massage + Steam",
        duration: "90 mins",
        priceFrom: 60000,
        description:
          "Full hour of massage rounded out with a relaxing detox steam.",
        concerns: ["stress", "detox", "relaxation"],
      },
      {
        id: "wooden-lymphatic-drainage",
        name: "Wooden Lymphatic Drainage Massage",
        duration: "60 mins",
        priceFrom: 70000,
        description:
          "Traditional wood-therapy lymphatic drainage. Add a 30-min massage from ₦90,000.",
        concerns: ["lymphatic drainage", "bloating", "contouring"],
      },
      {
        id: "steam",
        name: "Steam",
        duration: "20 mins",
        priceFrom: 30000,
        description: "Stand-alone detoxifying steam session.",
        concerns: ["detox", "relaxation", "skin prep"],
      },
      {
        id: "hammam-scrub",
        name: "Hammam Scrub",
        duration: "90 mins",
        priceFrom: 100000,
        description:
          "Traditional Moroccan hammam ritual — black soap, steam and full-body exfoliation.",
        concerns: ["exfoliation", "detox", "luxury treatment"],
      },
      {
        id: "hammam-glow",
        name: "Hammam Glow",
        duration: "90 mins",
        priceFrom: 120000,
        description:
          "Our premium hammam ritual finished with a glow-boosting body mask.",
        concerns: ["luxury treatment", "brightening", "glow"],
      },
    ],
  },
  {
    slug: "bulk-packages",
    title: "Bulk Packages",
    tagline: "Buy a Course, Save More",
    description:
      "Pre-purchase a multi-session course of our most-loved treatments at a meaningful discount over the per-session price.",
    image:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6462-2048x1463.jpg-768x549-2-aOLyIQYjwEGezoOTEw78F0jLOjfkia.webp",
    treatments: [
      {
        id: "bulk-dcf-3",
        name: "Bulk Deep Cleansing Facial (3 sessions)",
        duration: "60 mins",
        priceFrom: 117000,
        description: "Three Deep Cleansing Facial sessions, prepaid.",
        concerns: ["course of treatment", "savings"],
      },
      {
        id: "bulk-acne-facial-3",
        name: "Bulk Acne Facial (3 sessions)",
        duration: "60 mins",
        priceFrom: 130000,
        description: "Three Acne Facial sessions, prepaid.",
        concerns: ["acne", "course of treatment"],
      },
      {
        id: "bulk-dtm-6",
        name: "Bulk Deep Tissue Massage (6 sessions)",
        duration: "60 mins",
        priceFrom: 220000,
        description: "Six Deep Tissue Massage sessions, prepaid.",
        popular: true,
        concerns: ["course of treatment", "muscle pain"],
      },
      {
        id: "bulk-swedish-6",
        name: "Bulk Swedish Massage (6 sessions)",
        duration: "60 mins",
        priceFrom: 210000,
        description: "Six Swedish Massage sessions, prepaid.",
        popular: true,
        concerns: ["course of treatment", "relaxation"],
      },
      {
        id: "bulk-four-hands-swedish-6",
        name: "Bulk 4 Hands Swedish Massage (6 sessions)",
        duration: "45 mins",
        priceFrom: 315000,
        description: "Six 4-hands Swedish sessions, prepaid.",
        concerns: ["course of treatment", "luxury"],
      },
      {
        id: "bulk-four-hands-dtm-6",
        name: "Bulk 4 Hands Deep Tissue Massage (6 sessions)",
        duration: "45 mins",
        priceFrom: 320000,
        description: "Six 4-hands DTM sessions, prepaid.",
        concerns: ["course of treatment", "muscle pain"],
      },
    ],
  },
  {
    slug: "waxing",
    title: "Waxing",
    tagline: "Silky Smooth Perfection",
    description:
      "Achieve smooth, hair-free skin with our professional waxing services. We use premium wax for comfortable, long-lasting results. Female pricing shown — male pricing available at the clinic.",
    image:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-young-girl-beauty-salon-1024x681.jpg-oxGrqVSRoD400FZKPP5mLOdN42EJvX.webp",
    treatments: [
      {
        id: "eyebrow-wax",
        name: "Eyebrow Wax",
        duration: "30 mins",
        priceFrom: 12000,
        description: "Shaped eyebrow waxing. Male from ₦15,000.",
        concerns: ["facial grooming"],
      },
      {
        id: "chin-wax",
        name: "Chin Wax",
        duration: "30 mins",
        priceFrom: 10000,
        description: "Quick chin waxing. Male from ₦15,000.",
        concerns: ["facial grooming"],
      },
      {
        id: "upper-lip-wax",
        name: "Upper Lip Wax",
        duration: "10 mins",
        priceFrom: 5000,
        description: "Fast upper-lip waxing.",
        concerns: ["facial grooming"],
      },
      {
        id: "underarm-wax",
        name: "Underarm Wax",
        duration: "15 mins",
        priceFrom: 10000,
        description:
          "Quick, comfortable underarm waxing. Male from ₦12,000. Hard wax option from ₦10,000 (25 mins).",
        popular: true,
        concerns: ["hair removal"],
      },
      {
        id: "chest-neck-wax",
        name: "Chest Wax / Neck Wax",
        duration: "30 mins",
        priceFrom: 10000,
        description:
          "Chest wax from ₦10,000, neck wax from ₦4,000. Male from ₦15,000 each.",
        concerns: ["hair removal", "men's grooming"],
      },
      {
        id: "back-wax",
        name: "Back Wax",
        duration: "30 mins",
        priceFrom: 15000,
        description: "Full back waxing. Male from ₦20,000.",
        concerns: ["hair removal", "men's grooming"],
      },
      {
        id: "full-face-wax",
        name: "Full Face Wax",
        duration: "30 mins",
        priceFrom: 20000,
        description: "Complete facial waxing.",
        concerns: ["facial grooming"],
      },
      {
        id: "full-arm-wax",
        name: "Full Arm Wax",
        duration: "30 mins",
        priceFrom: 25000,
        description: "Complete arm hair removal. Male from ₦30,000.",
        concerns: ["hair removal"],
      },
      {
        id: "half-arm-wax",
        name: "Half Arm Wax",
        duration: "30 mins",
        priceFrom: 15000,
        description: "Half-arm waxing. Male from ₦20,000.",
        concerns: ["hair removal"],
      },
      {
        id: "full-leg-wax",
        name: "Full Leg Wax",
        duration: "45 mins",
        priceFrom: 35000,
        description: "Complete leg hair removal. Male from ₦45,000.",
        popular: true,
        concerns: ["hair removal", "smooth skin"],
      },
      {
        id: "half-leg-wax",
        name: "Half Leg Wax",
        duration: "30 mins",
        priceFrom: 20000,
        description: "Lower leg waxing. Male from ₦25,000.",
        concerns: ["hair removal"],
      },
      {
        id: "bum-belly-wax",
        name: "Bum Wax / Belly Wax",
        duration: "30 mins",
        priceFrom: 10000,
        description:
          "Bum wax from ₦10,000, belly wax from ₦5,000. Male from ₦20,000 / ₦10,000.",
        concerns: ["hair removal"],
      },
      {
        id: "bikini-belly-wax",
        name: "Bikini Line + Belly Wax",
        duration: "20 mins",
        priceFrom: 20000,
        description: "Bikini line paired with belly wax. Male from ₦30,000.",
        concerns: ["hair removal"],
      },
      {
        id: "bikini-bottom-wax",
        name: "Bikini Bottom Wax",
        duration: "30 mins",
        priceFrom: 22000,
        description: "Lower bikini-area waxing. Male from ₦30,000.",
        concerns: ["intimate hair removal"],
      },
      {
        id: "brazilian-hollywood-wax",
        name: "Brazilian / Hollywood Wax (Belly–Butt Hole)",
        duration: "40 mins",
        priceFrom: 30000,
        description:
          "Brazilian from ₦30,000 (30 mins), Hollywood from ₦33,000 (40 mins). Male from ₦40,000 / ₦45,000. Hard wax option from ₦30,000 (1 hour).",
        popular: true,
        concerns: ["intimate hair removal"],
      },
      {
        id: "hollywood-brazilian-underarm-wax",
        name: "Hollywood / Brazilian + Underarm Wax",
        duration: "45 mins",
        priceFrom: 36000,
        description:
          "Combo waxing service. Male from ₦50,000. Hard wax option from ₦35,000 (1 hour).",
        concerns: ["hair removal", "combo"],
      },
      {
        id: "full-body-wax",
        name: "Full Body Wax",
        duration: "120 mins",
        priceFrom: 90000,
        description: "Complete body hair removal in one appointment. Male from ₦100,000.",
        concerns: ["full grooming", "events"],
      },
    ],
  },
  {
    slug: "laser-hair-removal",
    title: "Laser Hair Removal",
    tagline: "Permanent Reduction, Safely Delivered",
    description:
      "FDA-cleared diode and Nd:YAG laser hair removal, safe on deeper skin tones. Female pricing shown — male pricing available at the clinic.",
    image: "/images/laser-hair-removal-ng.jpg",
    treatments: [
      {
        id: "laser-chin-cheeks",
        name: "Chin / Cheeks Laser",
        duration: "30 mins",
        priceFrom: 40000,
        description: "Laser hair removal on chin or cheeks. Male from ₦50,000.",
        concerns: ["hair removal", "facial grooming"],
      },
      {
        id: "laser-neck",
        name: "Neck Laser",
        duration: "30 mins",
        priceFrom: 30000,
        description: "Laser hair removal on the neck. Male from ₦40,000.",
        concerns: ["hair removal"],
      },
      {
        id: "laser-upper-lip",
        name: "Upper Lip Laser",
        duration: "20 mins",
        priceFrom: 20000,
        description: "Laser hair removal on the upper lip. Male from ₦30,000.",
        concerns: ["facial grooming"],
      },
      {
        id: "laser-nostrils",
        name: "Nostrils Laser",
        duration: "20 mins",
        priceFrom: 20000,
        description: "Discreet nostril hair laser treatment.",
        concerns: ["facial grooming"],
      },
      {
        id: "laser-half-face",
        name: "Half Face Laser",
        duration: "30 mins",
        priceFrom: 55000,
        description: "Half-face laser hair removal. Male from ₦65,000.",
        concerns: ["facial grooming"],
      },
      {
        id: "laser-full-face",
        name: "Full Face Laser",
        duration: "45 mins",
        priceFrom: 70000,
        description: "Full-face laser hair removal.",
        concerns: ["facial grooming"],
      },
      {
        id: "laser-full-arm",
        name: "Full Arm Laser",
        duration: "60 mins",
        priceFrom: 100000,
        description: "Full arm laser hair removal.",
        popular: true,
        concerns: ["hair removal"],
      },
      {
        id: "laser-half-arm",
        name: "Half Arm Laser",
        duration: "45 mins",
        priceFrom: 50000,
        description: "Half arm laser hair removal. Male from ₦60,000.",
        concerns: ["hair removal"],
      },
      {
        id: "laser-underarm",
        name: "Underarm Laser",
        duration: "30 mins",
        priceFrom: 40000,
        description: "Underarm laser hair removal.",
        popular: true,
        concerns: ["hair removal"],
      },
      {
        id: "laser-chest",
        name: "Chest Laser",
        duration: "30 mins",
        priceFrom: 40000,
        description: "Chest laser hair removal. Male from ₦50,000.",
        concerns: ["hair removal", "men's grooming"],
      },
      {
        id: "laser-nipples",
        name: "Nipples Laser",
        duration: "30 mins",
        priceFrom: 30000,
        description: "Nipple-area laser. Male from ₦40,000.",
        concerns: ["hair removal"],
      },
      {
        id: "laser-full-back",
        name: "Full Back Laser",
        duration: "45 mins",
        priceFrom: 100000,
        description: "Full back laser hair removal. Male from ₦120,000.",
        concerns: ["hair removal", "men's grooming"],
      },
      {
        id: "laser-half-back",
        name: "Half Back Laser",
        duration: "45 mins",
        priceFrom: 60000,
        description: "Half back laser hair removal. Male from ₦70,000.",
        concerns: ["hair removal"],
      },
      {
        id: "laser-belly",
        name: "Belly Laser",
        duration: "30 mins",
        priceFrom: 30000,
        description: "Full belly laser hair removal. Male from ₦40,000.",
        concerns: ["hair removal"],
      },
      {
        id: "laser-half-belly",
        name: "Half Belly Laser",
        duration: "30 mins",
        priceFrom: 20000,
        description: "Half belly laser hair removal. Male from ₦30,000.",
        concerns: ["hair removal"],
      },
      {
        id: "laser-bikini-line",
        name: "Bikini Line Laser",
        duration: "30 mins",
        priceFrom: 40000,
        description: "Bikini line laser hair removal. Male from ₦60,000.",
        concerns: ["intimate hair removal"],
      },
      {
        id: "laser-brazilian",
        name: "Brazilian Laser",
        duration: "45 mins",
        priceFrom: 80000,
        description: "Brazilian laser hair removal. Male from ₦100,000.",
        popular: true,
        concerns: ["intimate hair removal"],
      },
      {
        id: "laser-hollywood-combo",
        name: "Hollywood + Bell Line + Butt Hole Laser",
        duration: "45 mins",
        priceFrom: 100000,
        description:
          "Promotional Hollywood combo — most thorough intimate laser package. Male from ₦120,000.",
        concerns: ["intimate hair removal", "promo"],
      },
      {
        id: "laser-butt-cheeks",
        name: "Butt Cheeks Laser",
        duration: "60 mins",
        priceFrom: 60000,
        description: "Butt cheek laser hair removal. Male from ₦70,000.",
        concerns: ["hair removal"],
      },
      {
        id: "laser-insep",
        name: "Insep Laser",
        duration: "45 mins",
        priceFrom: 40000,
        description: "Inner-thigh / insep laser hair removal. Male from ₦50,000.",
        concerns: ["hair removal"],
      },
      {
        id: "laser-full-leg",
        name: "Full Leg Laser",
        duration: "90 mins",
        priceFrom: 150000,
        description: "Full leg laser hair removal. Male from ₦160,000.",
        concerns: ["hair removal"],
      },
      {
        id: "laser-half-leg",
        name: "Half Leg Laser",
        duration: "45 mins",
        priceFrom: 70000,
        description: "Half leg laser hair removal.",
        concerns: ["hair removal"],
      },
    ],
  },
  {
    slug: "laser-package-deals",
    title: "Laser Package Deals",
    tagline: "Bigger Areas, Bigger Savings",
    description:
      "Pre-bundled laser hair removal packages covering multiple areas in one session at a discounted rate.",
    image: "/images/laser-hair-removal-ng.jpg",
    treatments: [
      {
        id: "laser-full-body",
        name: "Full Body Laser",
        duration: "150 mins",
        priceFrom: 500000,
        description: "Full body laser hair removal. Male from ₦600,000.",
        popular: true,
        concerns: ["full grooming", "hair removal"],
      },
      {
        id: "laser-half-body",
        name: "Half Body Laser",
        duration: "90 mins",
        priceFrom: 300000,
        description: "Half body laser hair removal. Male from ₦350,000.",
        concerns: ["hair removal"],
      },
      {
        id: "laser-chin-neck",
        name: "Chin + Neck Laser",
        duration: "45 mins",
        priceFrom: 50000,
        description: "Chin and neck combo (promo). Male from ₦70,000.",
        concerns: ["facial grooming", "promo"],
      },
      {
        id: "laser-full-leg-bikini",
        name: "Full Leg + Bikini Line Laser",
        duration: "120 mins",
        priceFrom: 160000,
        description: "Full leg and bikini line combo (promo). Male from ₦170,000.",
        concerns: ["hair removal", "promo"],
      },
      {
        id: "laser-full-arm-underarm",
        name: "Full Arm + Underarm Laser",
        duration: "75 mins",
        priceFrom: 120000,
        description: "Full arm and underarm combo (promo).",
        concerns: ["hair removal", "promo"],
      },
      {
        id: "laser-bikini-belly",
        name: "Bikini Line + Belly Line Laser",
        duration: "45 mins",
        priceFrom: 50000,
        description: "Bikini and belly line combo (promo). Male from ₦70,000.",
        concerns: ["hair removal", "promo"],
      },
      {
        id: "laser-underarm-hollywood",
        name: "Underarm + Hollywood Laser",
        duration: "75 mins",
        priceFrom: 130000,
        description: "Underarm and Hollywood combo (promo). Male from ₦140,000.",
        concerns: ["intimate hair removal", "promo"],
      },
    ],
  },
  {
    slug: "laser-rejuvenation",
    title: "Laser Rejuvenation & Brightening",
    tagline: "Brighten and Even Tone",
    description:
      "Laser brightening treatments to even tone and refine dark patches across the face and body.",
    image: "/images/laser-rejuvenation-ng.jpg",
    treatments: [
      {
        id: "rejuv-chin",
        name: "Chin Rejuvenation",
        duration: "30 mins",
        priceFrom: 20000,
        description: "Chin brightening laser. Male from ₦30,000.",
        concerns: ["pigmentation", "brightening"],
      },
      {
        id: "rejuv-cheeks-sideface",
        name: "Cheeks (Sideface) Rejuvenation",
        duration: "30 mins",
        priceFrom: 25000,
        description: "Cheeks/sideface brightening laser. Male from ₦30,000.",
        concerns: ["pigmentation", "brightening"],
      },
      {
        id: "rejuv-neck-underarm",
        name: "Neck / Underarm Rejuvenation",
        duration: "30 mins",
        priceFrom: 30000,
        description: "Neck or underarm brightening laser.",
        popular: true,
        concerns: ["pigmentation", "brightening", "underarm dark patches"],
      },
      {
        id: "rejuv-bikini-line",
        name: "Bikini Line Rejuvenation",
        duration: "30 mins",
        priceFrom: 25000,
        description: "Bikini line brightening laser. Male from ₦30,000.",
        concerns: ["pigmentation", "brightening"],
      },
      {
        id: "rejuv-brazilian-hollywood",
        name: "Brazilian / Hollywood Rejuvenation",
        duration: "45 mins",
        priceFrom: 30000,
        description: "Brazilian or Hollywood brightening laser. Male from ₦40,000.",
        concerns: ["pigmentation", "brightening", "intimate brightening"],
      },
    ],
  },
  {
    slug: "hollywood-peel",
    title: "Hollywood Peel (Laser Carbon Peel)",
    tagline: "Red-Carpet Glow",
    description:
      "Carbon laser peels for instant glow, refined pores and clearer skin — the favourite red-carpet treatment.",
    image: "/images/carbon-peel-ng.jpg",
    treatments: [
      {
        id: "full-face-carbon-peel",
        name: "Full Face Carbon Peel",
        duration: "45 mins",
        priceFrom: 200000,
        description: "Signature full-face Hollywood carbon peel for instant glow.",
        popular: true,
        concerns: ["glow", "pore refinement", "brightening"],
      },
      {
        id: "half-face-carbon-peel",
        name: "Half Face Carbon Peel",
        duration: "30 mins",
        priceFrom: 120000,
        description: "Carbon peel focused on half the face.",
        concerns: ["glow", "pore refinement"],
      },
      {
        id: "full-face-acne-laser",
        name: "Full Face Acne Laser Treatment",
        duration: "45 mins",
        priceFrom: 60000,
        description: "Targeted laser acne treatment across the full face.",
        concerns: ["acne", "post-acne marks"],
      },
      {
        id: "half-back-acne-laser",
        name: "Half Back Acne Laser",
        duration: "45 mins",
        priceFrom: 60000,
        description: "Laser acne treatment on the upper or lower back.",
        concerns: ["body acne", "back acne"],
      },
      {
        id: "full-back-acne-laser",
        name: "Full Back Acne Laser",
        duration: "60 mins",
        priceFrom: 100000,
        description: "Full-back laser acne treatment.",
        concerns: ["body acne", "back acne"],
      },
      {
        id: "elbow-carbon-peel",
        name: "Elbow Carbon Peel",
        duration: "30 mins",
        priceFrom: 40000,
        description: "Carbon peel for dark elbow patches.",
        concerns: ["pigmentation", "brightening"],
      },
      {
        id: "knee-carbon-peel",
        name: "Knee Carbon Peel",
        duration: "30 mins",
        priceFrom: 40000,
        description: "Carbon peel for dark knee patches.",
        concerns: ["pigmentation", "brightening"],
      },
      {
        id: "full-neck-carbon-peel",
        name: "Full Neck Carbon Peel",
        duration: "30 mins",
        priceFrom: 60000,
        description: "Carbon peel across the full neck.",
        concerns: ["brightening", "neck rejuvenation"],
      },
      {
        id: "half-neck-carbon-peel",
        name: "Half Neck Carbon Peel",
        duration: "20 mins",
        priceFrom: 30000,
        description: "Carbon peel focused on half the neck.",
        concerns: ["brightening"],
      },
      {
        id: "carbon-laser-underarm",
        name: "Carbon Laser Underarm",
        duration: "30 mins",
        priceFrom: 50000,
        description: "Carbon laser brightening for the underarms.",
        popular: true,
        concerns: ["underarm dark patches", "brightening"],
      },
    ],
  },
  {
    slug: "electrolysis-hair-removal",
    title: "Electrolysis Hair Removal",
    tagline: "Permanent, Hair-By-Hair Removal",
    description:
      "Electrolysis is the gold-standard for permanent hair removal — safe on any skin tone and any hair colour. Pricing confirmed at consultation.",
    image: "/images/laser-treatment.jpg",
    treatments: [
      {
        id: "electrolysis-chin",
        name: "Electrolysis Chin",
        duration: "30 mins",
        priceFrom: 25000,
        description: "Permanent chin hair removal via electrolysis. Final price confirmed at consultation.",
        concerns: ["permanent hair removal", "facial grooming"],
      },
      {
        id: "electrolysis-underarm",
        name: "Electrolysis Underarm",
        duration: "30 mins",
        priceFrom: 25000,
        description: "Permanent underarm hair removal via electrolysis. Final price confirmed at consultation.",
        concerns: ["permanent hair removal"],
      },
      {
        id: "electrolysis-brazilian",
        name: "Electrolysis Brazilian",
        duration: "60 mins",
        priceFrom: 25000,
        description: "Permanent Brazilian hair removal via electrolysis. Final price confirmed at consultation.",
        concerns: ["permanent hair removal", "intimate"],
      },
      {
        id: "electrolysis-full-face",
        name: "Electrolysis Full Face",
        duration: "60 mins",
        priceFrom: 25000,
        description: "Permanent full-face hair removal via electrolysis. Final price confirmed at consultation.",
        concerns: ["permanent hair removal", "facial grooming"],
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
    slug: "experience-packages",
    title: "Dermaspace Experience Packages",
    tagline: "Save With a Curated Day",
    description:
      "Pre-bundled multi-treatment experiences — Bronze, Silver and Gold — available as single or couple bookings.",
    image:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6462-2048x1463.jpg-768x549-2-aOLyIQYjwEGezoOTEw78F0jLOjfkia.webp",
    treatments: [
      {
        id: "bronze-experience-single",
        name: "Bronze Experience (Single)",
        duration: "2 hours",
        priceFrom: 77000,
        description:
          "1hr Deep Tissue / Swedish Massage + Deep Cleansing Facial. Was ₦84,000.",
        concerns: ["package", "self-care day"],
      },
      {
        id: "bronze-experience-couple",
        name: "Bronze Experience (Couple)",
        duration: "2 hours",
        priceFrom: 149000,
        description:
          "Couple 1hr Deep Tissue / Swedish Massage + Deep Cleansing Facial. Was ₦154,000.",
        concerns: ["package", "couple", "self-care day"],
      },
      {
        id: "silver-experience-single",
        name: "Silver Experience (Single)",
        duration: "3 hours 50 mins",
        priceFrom: 97000,
        description:
          "1hr Deep Tissue / Swedish Massage OR Detox Bodyscrub & Steam + Deep Cleansing Facial + Mani-Pedi or Wax worth ₦20,000. Was ₦109,000.",
        popular: true,
        concerns: ["package", "self-care day"],
      },
      {
        id: "silver-experience-couple",
        name: "Silver Experience (Couple)",
        duration: "2 hours 30 mins",
        priceFrom: 185000,
        description:
          "Couple 1hr Deep Tissue / Swedish Massage OR Detox Bodyscrub & Steam + Deep Cleansing Facial + Mani-Pedi or Wax worth ₦20,000. Was ₦204,000.",
        concerns: ["package", "couple", "self-care day"],
      },
      {
        id: "gold-experience-single",
        name: "Gold Experience (Single)",
        duration: "3 hours 30 mins",
        priceFrom: 141000,
        description:
          "1hr Deep Tissue / Swedish Massage + Detox Bodyscrub & Steam + Deep Cleansing Facial + Mani-Pedi or Wax worth ₦20,000. Was ₦151,000.",
        popular: true,
        concerns: ["package", "self-care day", "luxury"],
      },
      {
        id: "gold-experience-couple",
        name: "Gold Experience (Couple)",
        duration: "3 hours 30 mins",
        priceFrom: 245000,
        description:
          "Couple 1hr Deep Tissue / Swedish Massage + Detox Bodyscrub & Steam + Deep Cleansing Facial + Mani-Pedi or Wax worth ₦20,000. Was ₦288,000.",
        concerns: ["package", "couple", "luxury"],
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
