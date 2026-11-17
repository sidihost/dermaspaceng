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
import { LegalAcceptanceGate } from '@/components/legal/legal-acceptance-gate'

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

// Global "Signed in as <user>" banner — only renders when an admin
// has temporarily impersonated a customer to investigate an issue.
// Self-gates via /api/admin/impersonate/status so a regular session
// pays zero render cost beyond a single 200 OK fetch on mount.
const ImpersonationBanner = dynamic(
  () => import('@/components/admin/impersonation-banner'),
  { ssr: false, loading: () => null },
)

// Festive Christmas Snowfall animation — controlled via Admin Dashboard
const ChristmasAnimation = dynamic(
  () => import('@/components/shared/christmas-animation'),
  { ssr: false, loading: () => null },
)

const LiveChatOverlay = dynamic(
  () => import('@/components/shared/live-chat-overlay'),
  { ssr: false, loading: () => null },
)

export default function ClientShell() {
  const aiEnabled = useFeatureFlag('ai_chat')
  const liveChatEnabled = useFeatureFlag('live_chat')
  return (
    <>
      <RootErrorBoundary label="christmas-animation">
        <ChristmasAnimation />
      </RootErrorBoundary>
      <RootErrorBoundary label="ambient-music">
        <AmbientMusic />
      </RootErrorBoundary>
      <RootErrorBoundary label="birthday">
        <BirthdayCelebration />
      </RootErrorBoundary>
      {aiEnabled && <DermaAIMount />}
      {liveChatEnabled && (
        <RootErrorBoundary label="live-chat">
          <LiveChatOverlay />
        </RootErrorBoundary>
      )}
      <RootErrorBoundary label="legal-gate">
        <LegalAcceptanceGate />
      </RootErrorBoundary>
      <RootErrorBoundary label="shake-to-feedback">
        <ShakeToFeedback />
      </RootErrorBoundary>
      <RootErrorBoundary label="impersonation-banner">
        <ImpersonationBanner />
      </RootErrorBoundary>
    </>
  )
}
