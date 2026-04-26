'use client'

/**
 * ClientShell
 * ---------------------------------------------------------------
 * Hosts every below-the-fold floating widget that we want to
 * lazy-load with `ssr: false`.
 *
 * Why a dedicated client wrapper?
 * Next.js 16 disallows `dynamic(() => import(...), { ssr: false })`
 * inside a Server Component (including the root `app/layout.tsx`).
 * Previously those calls lived in the layout directly, which caused
 * a hard compile error ("`ssr: false` is not allowed with
 * `next/dynamic` in Server Components") and a 500 on the root
 * route — the Derma AI launcher appeared but the panel never
 * mounted because the chunk never actually loaded.
 *
 * Moving the dynamic imports into this `"use client"` shim is the
 * officially supported fix: the server tree still renders the
 * layout synchronously, and each widget (Ambient music, Birthday
 * celebration, Derma AI mount) is code-split into its own async
 * chunk that only downloads on the client.
 *
 * Each widget is wrapped in its own `RootErrorBoundary` so a
 * single mis-behaving widget can't white-screen the site — it
 * just disappears and the rest of the chrome keeps working.
 */

import dynamic from 'next/dynamic'
import { RootErrorBoundary } from '@/components/shared/root-error-boundary'
import { useFeatureFlag } from '@/lib/use-feature-flag'

const AmbientMusic = dynamic(
  () => import('@/components/shared/ambient-music'),
  { ssr: false, loading: () => null },
)

const BirthdayCelebration = dynamic(
  () => import('@/components/shared/birthday-celebration'),
  { ssr: false, loading: () => null },
)

const DermaAIMount = dynamic(
  () => import('@/components/shared/derma-ai-mount'),
  { ssr: false, loading: () => null },
)

// Shake-to-feedback — global accelerometer listener. Lazy-loaded
// because the hook needs `usePathname` / `useRouter`, which are
// client-only, and we don't want it slowing first paint.
const ShakeToFeedback = dynamic(
  () => import('@/components/shared/shake-to-feedback'),
  { ssr: false, loading: () => null },
)

export default function ClientShell() {
  // Admin kill-switch — when an operator toggles "Derma AI chat"
  // OFF in /admin/features, the floating launcher disappears
  // site-wide on the next 30s SWR poll. Defaults to TRUE so the
  // assistant never hides during the brief pre-hydration window
  // (see `useFeatureFlag` doc comment for the safety rationale).
  const aiEnabled = useFeatureFlag('ai_chat')
  return (
    <>
      <RootErrorBoundary label="ambient-music">
        <AmbientMusic />
      </RootErrorBoundary>
      {/* Birthday greeting — renders null for everyone except users
          whose DOB matches today. Shows a dismissible banner +
          confetti burst once per calendar day. */}
      <RootErrorBoundary label="birthday">
        <BirthdayCelebration />
      </RootErrorBoundary>
      {/* Derma AI — the floating assistant is mounted globally so it
          follows signed-in members across every customer surface
          (dashboard, services, booking, wallet, etc.). It self-gates
          on auth and hides itself on admin/staff/auth pages.
          NOTE: deliberately NOT wrapped in a `RootErrorBoundary`
          here. DermaAIMount internally wraps the heavy chat panel
          (the only piece that can realistically throw — speech
          APIs, streaming, IndexedDB, etc.) in its own boundary.
          Wrapping the entire mount here was the bug users kept
          reporting as "the Derma AI launcher icon isn't even
          showing anymore" — when the inner panel threw, the OUTER
          boundary tripped and hid the launcher with it. With only
          the inner boundary in place, the launcher button (which
          has zero risky deps) stays visible and the user can tap
          again or refresh. */}
      {aiEnabled && <DermaAIMount />}
      {/* Shake your phone anywhere on the site to jump straight to
          the feedback form. Replaces the old "Haptic feedback"
          toggle in Derma AI settings — the gesture itself is the
          feature. The component is pure side-effect and renders
          null. */}
      <RootErrorBoundary label="shake-to-feedback">
        <ShakeToFeedback />
      </RootErrorBoundary>
    </>
  )
}
