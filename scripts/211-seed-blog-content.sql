-- ---------------------------------------------------------------------------
-- 211-seed-blog-content.sql
--
-- Seeds the blog with foundational SEO-optimised content. Every insert is
-- idempotent (ON CONFLICT DO NOTHING on slug) so re-running this script is
-- safe and won't overwrite content that an admin has since edited in the UI.
--
-- The seed posts are deliberately written for the Lagos / Nigeria spa search
-- market: they target long-tail queries ("best luxury spa in Lagos",
-- "AI skin analysis Nigeria", "spa Victoria Island vs Ikoyi") and link
-- internally to /services, /about and /book to consolidate ranking signal
-- on the booking funnel.
-- ---------------------------------------------------------------------------

-- 1) Categories ------------------------------------------------------------
INSERT INTO blog_categories (slug, name, description, position) VALUES
  ('derma-ai',           'Derma AI',           'Updates, guides, and policy around our AI-powered skin and wellness assistant.', 10),
  ('skincare',           'Skincare',           'Evidence-based guidance for radiant, healthy skin in the Lagos climate.',         20),
  ('wellness',           'Wellness',           'Massage, recovery, and holistic wellness rituals at Dermaspace.',                  30),
  ('lagos-spa-guide',    'Lagos Spa Guide',    'Choosing the right spa in Lagos — neighbourhood guides, comparisons & tips.',     40),
  ('inside-dermaspace',  'Inside Dermaspace',  'Behind the scenes — our therapists, our standards, our story.',                   50)
ON CONFLICT (slug) DO NOTHING;

-- 2) Posts -----------------------------------------------------------------
-- We use a CTE per insert so we can resolve the category id by slug without
-- hardcoding numeric ids (those vary per environment).

-- Post 1: Derma AI launch announcement
WITH cat AS (SELECT id FROM blog_categories WHERE slug = 'derma-ai')
INSERT INTO blog_posts (
  slug, title, excerpt, content_md, cover_image_url, category_id,
  author_name, author_role, status, published_at, seo_title, seo_description, seo_keywords, reading_minutes, featured
)
SELECT
  'introducing-derma-ai-nigerias-first-ai-spa-assistant',
  'Introducing Derma AI: Nigeria''s First AI-Powered Spa & Skin Assistant',
  'Dermaspace is the first spa in Nigeria to integrate and build a dedicated AI assistant for skin, body and wellness consultations — meet Derma AI.',
  E'## A first for the Nigerian spa industry\n\nFor years, booking a spa appointment in Lagos has meant guessing which treatment you actually need. Is it a deep-cleansing facial, or a chemical peel? A Swedish massage, or deep tissue? Most spas leave you to figure it out from a brochure.\n\nDermaspace is changing that. **We are the first spa in Nigeria to design, integrate and ship a dedicated AI assistant** — Derma AI — built specifically around our therapists'' protocols, our product library, and the realities of skin and wellness in the Lagos climate.\n\n## What Derma AI actually does\n\nDerma AI is not a generic chatbot bolted onto our website. It is trained on:\n\n- The full Dermaspace treatment menu and the indications for each\n- Common skin concerns we see in Lagos (hyperpigmentation, heat-related breakouts, post-inflammatory marks, sensitivity from harmattan)\n- Our therapists'' actual recommendations for combining treatments and home-care\n- Safety rules — what we will *not* recommend without an in-person consultation\n\nYou can describe what you''re feeling in plain English (or pidgin), upload a photo of your skin if you choose to, and Derma AI will suggest treatments, explain what to expect, and hand you off to a real therapist the moment the conversation needs human judgement.\n\n## Why this matters for you\n\n- **Faster, clearer decisions.** No more scrolling through twenty service descriptions.\n- **Honest expectations.** Derma AI will tell you when a treatment is *not* right for your concern.\n- **Privacy first.** Photos are processed for the consultation only and are never sold or used to train external models. Read our [Privacy Policy](/privacy) for the full detail.\n- **Always a human in the loop.** Every booking is confirmed by a Dermaspace therapist before your appointment.\n\n## Where to try it\n\nDerma AI is live now at [dermaspaceng.com/derma-ai](/derma-ai). You can also tap the assistant button on any page of our site. If you''d rather speak to a human first, our therapists are at our Victoria Island and Ikoyi locations seven days a week — [book here](/book).\n\nThis is just the beginning. Over the coming months Derma AI will learn from anonymised therapist feedback, expand into wellness and massage planning, and roll out personalised home-care reminders for returning guests. Welcome to the future of the Nigerian spa.',
  '/dermaspace-derma-ai-launch.jpg',
  (SELECT id FROM cat),
  'Dermaspace Editorial',
  'admin',
  'published',
  NOW() - INTERVAL '2 days',
  'Derma AI: Nigeria''s First AI-Powered Spa Assistant | Dermaspace',
  'Meet Derma AI — the first AI skin and wellness assistant built by a Nigerian spa. Get personalised treatment recommendations from Dermaspace in seconds.',
  ARRAY['derma ai', 'ai spa nigeria', 'ai skin analysis lagos', 'dermaspace', 'best spa in lagos', 'ai skincare nigeria'],
  4,
  TRUE
ON CONFLICT (slug) DO NOTHING;

-- Post 2: Derma AI Terms / Policy
WITH cat AS (SELECT id FROM blog_categories WHERE slug = 'derma-ai')
INSERT INTO blog_posts (
  slug, title, excerpt, content_md, cover_image_url, category_id,
  author_name, author_role, status, published_at, seo_title, seo_description, seo_keywords, reading_minutes
)
SELECT
  'derma-ai-acceptable-use-and-data-policy',
  'Derma AI: Acceptable Use & Data Policy',
  'How Derma AI handles your photos, conversations and recommendations — written in plain English, not legal jargon.',
  E'## Why we publish this\n\nDerma AI is a powerful tool, but it lives in a sensitive space — your skin, your body, sometimes your medical history. We owe you a clear, plain-English explanation of how it works and how your data is handled. This post is the human-readable companion to our [Privacy Policy](/privacy) and [Terms of Service](/terms).\n\n## What Derma AI is (and isn''t)\n\nDerma AI is a **wellness consultation assistant**. It can suggest Dermaspace treatments, explain procedures, and give general skincare guidance.\n\nDerma AI is **not a doctor**. It does not diagnose disease, prescribe medication, or replace dermatological care. If your concern looks medical, Derma AI will say so and refer you to a clinician.\n\n## What you can use Derma AI for\n\n- Choosing between Dermaspace treatments\n- Understanding ingredients and procedures before booking\n- Building a home-care routine around your treatments\n- General questions about facials, massage, body treatments and skin\n\n## What you must not use Derma AI for\n\n- Medical diagnosis or emergency advice\n- Recommendations for or about other people without their consent\n- Generating content that is sexual, hateful, or otherwise prohibited by our [Terms of Service](/terms)\n- Attempting to extract or reverse-engineer the underlying model\n\n## Your data, in plain English\n\n- **Conversations** are stored securely and used to improve Derma AI for Dermaspace customers. They are never sold.\n- **Photos** you upload are used for that consultation. We do not use your photos to train external AI models.\n- **Account data** is governed by our [Privacy Policy](/privacy).\n- You can request deletion of your Derma AI history at any time by emailing privacy@dermaspaceng.com.\n\n## When a human steps in\n\nA Dermaspace therapist reviews every booking that comes out of Derma AI before it''s confirmed. If anything in your conversation suggests a medical issue, we route you to a human immediately.\n\n## Updates\n\nAs Derma AI evolves we''ll update this policy. Material changes are announced on this blog and, where appropriate, by email to registered users.\n\nQuestions? Reach us at hello@dermaspaceng.com or call +234 901 797 2919.',
  '/dermaspace-derma-ai-policy.jpg',
  (SELECT id FROM cat),
  'Dermaspace Editorial',
  'admin',
  'published',
  NOW() - INTERVAL '1 day',
  'Derma AI Acceptable Use & Data Policy | Dermaspace',
  'Plain-English explanation of how Derma AI handles your photos, conversations, and recommendations. Read the official Dermaspace AI policy.',
  ARRAY['derma ai policy', 'ai skin assistant privacy', 'dermaspace terms', 'ai skincare nigeria policy'],
  3
ON CONFLICT (slug) DO NOTHING;

-- Post 3: Comparative — what makes Dermaspace different
WITH cat AS (SELECT id FROM blog_categories WHERE slug = 'lagos-spa-guide')
INSERT INTO blog_posts (
  slug, title, excerpt, content_md, cover_image_url, category_id,
  author_name, author_role, status, published_at, seo_title, seo_description, seo_keywords, reading_minutes, featured
)
SELECT
  'best-luxury-spa-in-lagos-what-makes-dermaspace-different',
  'Best Luxury Spa in Lagos: What Makes Dermaspace Different',
  'How Dermaspace compares to other luxury spas in Lagos — protocols, product standards, AI-powered consultations, and why guests in Victoria Island and Ikoyi keep coming back.',
  E'## The Lagos spa landscape, honestly\n\nLagos has more spas than ever — VI, Ikoyi, Lekki Phase 1, Ikeja GRA. Most are good. A handful are genuinely excellent. The challenge for a guest is that the menus look almost identical: Swedish massage, deep tissue, hydrafacial, body scrub, repeat.\n\nThis post is a straight comparison of what actually separates Dermaspace from the rest of the field. We''re going to be specific.\n\n## 1. The first spa in Nigeria with a built-in AI assistant\n\nDermaspace is the **only spa in Nigeria** that has designed and shipped its own AI consultation assistant — [Derma AI](/derma-ai). Other spas rely on a WhatsApp number and a printed menu. Derma AI gives you a personalised treatment plan in under two minutes, 24/7, before you even step into the spa.\n\n## 2. Therapist-first, not product-first\n\nMany Lagos spas are organised around the products they sell — you walk in and get pushed toward whatever line they imported that quarter. Dermaspace is organised around our therapists. Every guest is matched to a therapist whose specialisation fits the concern, not whose commission needs hitting.\n\n## 3. Two flagship locations, one standard\n\n- **Victoria Island — 237B Muri Okunola Street.** Our flagship.\n- **Ikoyi — 44A Awolowo Road.** Same standards, same protocols, same training.\n\nWherever you book, the treatment you receive is identical. We audit both rooms monthly.\n\n## 4. Climate-aware skincare\n\nMost premium products on the Lagos market are formulated for European or American climates. Our facialists adapt every protocol — humidity, sweat, harmattan, sun exposure — so the result still holds when you step back outside on a 33°C afternoon.\n\n## 5. Transparent pricing, no upsell theatre\n\nEvery price is published on the [services page](/services). We do not invent "premium add-ons" mid-treatment. What you book is what you pay.\n\n## 6. A real privacy posture\n\nWith the rise of AI in beauty, your photos and skin data are now valuable. Read our [Privacy Policy](/privacy) — we don''t sell your data, we don''t train external models on your photos, and we delete on request. Most spas don''t publish a privacy policy at all.\n\n## How to choose\n\nIf you want a quick massage near your office, any decent spa will do. If you want a serious skin or wellness partner — somewhere that remembers your last facial, adapts to your routine, and uses technology to make better recommendations — that''s the gap Dermaspace was built to fill.\n\n[Try Derma AI](/derma-ai) or [book a consultation](/book) and judge for yourself.',
  '/dermaspace-luxury-spa-comparison.jpg',
  (SELECT id FROM cat),
  'Dermaspace Editorial',
  'admin',
  'published',
  NOW() - INTERVAL '5 days',
  'Best Luxury Spa in Lagos: What Makes Dermaspace Different (2026)',
  'Honest comparison of luxury spas in Lagos. See what separates Dermaspace in Victoria Island and Ikoyi — AI consultations, therapist-first care, climate-aware skincare.',
  ARRAY['best spa in lagos', 'luxury spa lagos', 'best spa victoria island', 'best spa ikoyi', 'dermaspace vs', 'top spas in nigeria'],
  6,
  TRUE
ON CONFLICT (slug) DO NOTHING;

-- Post 4: Skincare for the Lagos climate
WITH cat AS (SELECT id FROM blog_categories WHERE slug = 'skincare')
INSERT INTO blog_posts (
  slug, title, excerpt, content_md, cover_image_url, category_id,
  author_name, author_role, status, published_at, seo_title, seo_description, seo_keywords, reading_minutes
)
SELECT
  'skincare-routine-for-the-lagos-climate',
  'The Skincare Routine That Actually Works in the Lagos Climate',
  'Humidity, harmattan, sun and sweat — a Lagos-specific routine our facialists actually recommend, with the treatments that support it.',
  E'## Why "borrowed" routines fail in Lagos\n\nMost skincare routines on YouTube are built for cool, dry climates. In Lagos, you sweat through your sunscreen by 11am, the harmattan drains your skin barrier in December, and the humidity makes heavy creams a fast track to congestion.\n\nThis is the routine our facialists actually recommend, structured around what each step is *for* — not which brand happens to be trending.\n\n## Morning\n\n1. **Gentle gel cleanser.** Foaming, but not stripping. Skip the soap.\n2. **Vitamin C serum (10–15%).** Brightens, fights pollution damage, layers well under SPF.\n3. **Lightweight moisturiser.** Gel-cream texture in humidity, slightly richer in harmattan.\n4. **Mineral or hybrid SPF 50.** Reapply after midday — non-negotiable in Lagos.\n\n## Evening\n\n1. **Double cleanse.** Oil cleanser first to lift sunscreen and sebum, then a gentle gel.\n2. **Active (alternating nights).** Retinoid for renewal, exfoliating acid for texture, hydrating serum on rest nights.\n3. **Barrier cream.** Slightly richer than your morning moisturiser.\n\n## Where treatments fit in\n\nA home routine maintains your skin. Treatments *change* your skin.\n\n- **Hydrafacial** — every 4–6 weeks for congestion and dullness.\n- **Chemical peel** — quarterly for tone and texture.\n- **LED therapy** — add-on after any active facial.\n- **AI consultation** — start with [Derma AI](/derma-ai) if you''re unsure which one you need.\n\n## When to see a therapist\n\nIf you''ve had persistent breakouts for more than a month, dark patches that aren''t fading, or sensitivity that flares from products that used to be fine — book a consultation. We''ll build the protocol around your skin, not a brochure.\n\n[Book a consultation](/book) at our Victoria Island or Ikoyi location.',
  '/dermaspace-lagos-skincare-routine.jpg',
  (SELECT id FROM cat),
  'Dermaspace Facialists',
  'admin',
  'published',
  NOW() - INTERVAL '8 days',
  'Skincare Routine for the Lagos Climate (Therapist-Approved) | Dermaspace',
  'A Lagos-specific skincare routine from Dermaspace facialists. Climate-aware steps for humidity, harmattan, sun and sweat — plus the treatments that support each step.',
  ARRAY['skincare lagos', 'skincare routine nigeria', 'best skincare lagos', 'humidity skincare', 'harmattan skin'],
  5
ON CONFLICT (slug) DO NOTHING;

-- Post 5: Spa neighbourhood guide
WITH cat AS (SELECT id FROM blog_categories WHERE slug = 'lagos-spa-guide')
INSERT INTO blog_posts (
  slug, title, excerpt, content_md, cover_image_url, category_id,
  author_name, author_role, status, published_at, seo_title, seo_description, seo_keywords, reading_minutes
)
SELECT
  'spa-victoria-island-vs-ikoyi-where-to-book',
  'Spa in Victoria Island vs Ikoyi: Where Should You Book?',
  'Both of our flagship spas deliver the same protocols — but the vibe, parking, and after-treatment options are different. Here is how to choose.',
  E'## Same standards, different neighbourhoods\n\nDermaspace operates two flagship locations in Lagos and we are sometimes asked which one is "better". Honestly: neither. The treatment menu, therapist training, products and audit cycle are identical at both. What *does* differ is the experience around the treatment.\n\n## Victoria Island — 237B Muri Okunola Street\n\n- **Best for** professionals on a lunch break or post-work appointment\n- **Parking** secure on-site bay\n- **Atmosphere** quieter, slightly more clinical, ideal for serious skincare appointments\n- **Nearby** walking distance to several restaurants on Akin Adesola for a post-treatment lunch\n\n## Ikoyi — 44A Awolowo Road\n\n- **Best for** weekend resets, longer wellness sessions, couples appointments\n- **Parking** street parking with valet support\n- **Atmosphere** softer, residential feel, longer rituals work well here\n- **Nearby** boutiques and cafés on Awolowo Road for an unhurried afternoon\n\n## Which to choose\n\nIf you want efficiency, book Victoria Island. If you want to make an afternoon of it, book Ikoyi. If you''re unsure, ask [Derma AI](/derma-ai) — it knows which therapists are at each location and what suits the treatment you''re after.\n\n[Book at Victoria Island](/book?location=vi) or [book at Ikoyi](/book?location=ikoyi).',
  '/dermaspace-vi-vs-ikoyi.jpg',
  (SELECT id FROM cat),
  'Dermaspace Editorial',
  'admin',
  'published',
  NOW() - INTERVAL '12 days',
  'Spa Victoria Island vs Ikoyi: Where to Book in Lagos | Dermaspace',
  'Choosing between Dermaspace Victoria Island and Ikoyi? Here is what is different — vibe, parking, ideal use case — so you book the right one.',
  ARRAY['spa victoria island', 'spa ikoyi', 'best spa lagos', 'luxury spa nigeria', 'dermaspace locations'],
  4
ON CONFLICT (slug) DO NOTHING;
