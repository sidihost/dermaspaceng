# dermaspaceng

Booking, content and AI assistant platform for [Dermaspace](https://dermaspaceng.com) — a Lagos-based skin and wellness studio.

Production: https://dermaspaceng.com

---

## Stack

- **Next.js 16** (App Router, RSC, Turbopack) on **React 19.2**
- **TypeScript** end-to-end
- **Tailwind CSS v4** + a small set of Radix primitives wrapped under `components/ui`
- **Neon** (serverless Postgres) via `@neondatabase/serverless` — no ORM, just tagged SQL through `lib/db.ts`
- **Upstash** — Redis for rate limits / caches / sessions, QStash for scheduled jobs, Vector for semantic search
- **Vercel Blob** for user uploads (avatars, post media, AI photo analysis)
- **AI SDK 6** with Mistral / Groq behind the Vercel AI Gateway — powers the in-app skin assistant, blog TTS and semantic search
- **WebAuthn** (`@simplewebauthn`) + TOTP (`otpauth`) for passkey and 2FA login
- **Web Push** (`web-push`) for booking, reminder and conversation notifications
- **Nodemailer** for transactional email (booking confirmations, OTP, marketing opt-ins)
- **hCaptcha** on every public auth form

## Layout

```
app/                 Next.js routes — RSC by default, "use client" where needed
  api/               Route handlers (REST-ish JSON over App Router)
  (admin)/admin/     Staff-only console (auth-gated in middleware)
  blog/              Public journal + reader
  services/          Service catalogue + booking funnel
components/
  ui/                Radix-based primitives (Button, Dialog, Toast, …)
  blog/ home/ ...    Feature components, one folder per surface
hooks/               Reusable client hooks (useAuth, useToast, …)
lib/                 Server-side libraries — db, auth, email, push, blob, ai
scripts/             Numbered SQL migrations + the build-time runner
public/              Static assets
```

## Local development

Requirements: **Node 20+** and **pnpm 9+**.

```bash
pnpm install
cp .env.example .env.local        # fill in the values you need (see below)
pnpm dev                          # http://localhost:3000
```

The dev server uses Turbopack and supports HMR. `pnpm dev` will start without most third-party keys — features that need them (push, email, AI) will fail soft and log a warning instead of crashing the page.

### Required env vars

The app touches a lot of services. The bare minimum to boot the homepage and most read-only pages:

```
DATABASE_URL=                 # Neon connection string
JWT_SECRET=                   # any 32+ char random string
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Add the rest as you work on those features. A non-exhaustive list:

| Feature                          | Vars                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------ |
| Email (signup, OTP, bookings)    | `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASSWORD` `SMTP_FROM`                |
| Web push                         | `VAPID_PUBLIC_KEY` `VAPID_PRIVATE_KEY` `NEXT_PUBLIC_VAPID_PUBLIC_KEY`          |
| Upstash Redis / QStash / Vector  | `UPSTASH_REDIS_REST_URL` `UPSTASH_REDIS_REST_TOKEN` `QSTASH_TOKEN` `UPSTASH_VECTOR_REST_URL` `UPSTASH_VECTOR_REST_TOKEN` |
| Blob uploads                     | `BLOB_READ_WRITE_TOKEN`                                                        |
| AI assistant + TTS               | `MISTRAL_API_KEY` (or rely on `AI_GATEWAY_API_KEY`)                            |
| hCaptcha                         | `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` `HCAPTCHA_SECRET`                              |
| WebAuthn                         | `NEXT_PUBLIC_RP_ID` `NEXT_PUBLIC_RP_ORIGIN`                                    |

When deployed on Vercel, all of these come from the linked project — `vercel env pull .env.local` is the easiest way to bootstrap a working dev environment.

## Database

We talk to Postgres directly. There is no ORM. Conventions:

- Every schema change is a **new** numbered SQL file under `scripts/` — never edit a file that has already been applied. The file name is its identity.
- Migrations are idempotent where possible (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, …) so reruns are safe.
- `scripts/_runner.mjs` is invoked from `pnpm build` on Vercel **production** only. It tracks applied files in a `_migrations` table and runs each new file inside a transaction. Preview deploys do not migrate by default — see the header comment in `_runner.mjs` for the override flag.
- To run pending migrations against your local `DATABASE_URL`:
  ```bash
  pnpm migrate
  ```

Common ops (e.g. picking a row by id, transactions) live in `lib/db.ts`. Use the tagged-template `sql\`...\`` form so values are always parameterised.

## Auth

- Email + password with bcrypt. Sessions are signed JWTs in an HTTP-only cookie.
- Passkeys (WebAuthn) and TOTP 2FA are both supported and live next to the password flow in `app/api/auth/**`.
- Server-side helpers: `getCurrentUser()` / `requireUser()` from `lib/auth.ts`.
- Client-side: `useAuth()` from `hooks/use-auth.ts`. SWR-backed, deduped per render tree, never fetches before mount.
- Admin routes are gated by middleware (`middleware.ts` → `proxy.ts` shim) which checks the JWT role claim.

## Notifications

Three channels, all opt-in:

- **Web push** — registered through `app/api/push/**`, delivered via `web-push`. The service worker is `public/sw.js`.
- **Email** — sent through Nodemailer. Templates are inlined React components in `lib/email/templates`.
- **In-app** — stored in `notifications` and surfaced via the bell in the header.

Scheduled fan-out (booking reminders, daily digests) is queued onto QStash and processed by `app/api/cron/*` route handlers.

## AI

- The in-app assistant ("Derma AI") streams responses with the AI SDK and uses Mistral as the default model. Tools include catalogue lookup, booking creation, and image analysis on uploaded photos.
- Blog content is embedded into Upstash Vector and queried by the semantic search bar on `/services` and the related-posts rail on each article.
- Article TTS is browser-side `SpeechSynthesis` — no server round-trip. Users pick and persist their preferred voice locally.

## Conventions

- App Router server components by default. Client components opt in with `"use client"` and live next to their server parents.
- No `useEffect` for data fetching. Either pass props from a server component or use SWR.
- All money is stored in **kobo** (integer), never naira floats.
- All times are stored in UTC. Render in `Africa/Lagos` only at the edges.
- Brand colors live in `app/globals.css` as CSS variables. Don't hardcode hex outside that file unless you have a good reason.
- Don't introduce purple gradients. Solid plum (`#7B2D8E`) + supporting neutrals is the look.

## Deploying

Pushes to `main` deploy to production. PRs get preview deploys with their own URL. The migration runner only fires on production builds; previews share the prod database read-mostly. If a PR needs schema changes, merge the migration to `main` first (or open a separate "migrate" PR), then merge the code.

## License

UNLICENSED — all rights reserved by Dermaspace.
