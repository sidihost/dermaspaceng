'use client'

import dynamic from 'next/dynamic'

// Dynamic import — DermaAI is a heavy client-only component with speech
// APIs, AudioContext, localStorage etc. We keep SSR off so it doesn't
// explode on the server.
const DermaAI = dynamic(() => import('@/components/shared/derma-ai'), {
  ssr: false,
  loading: () => <PageChatSkeleton />,
})

/**
 * Full-page Derma AI container. Sized to sit inside the marketing shell
 * (Header + Footer) like every other customer-facing page, gives the
 * chat a fixed maximum width on large displays. Works for guests AND
 * signed-in members — the AI itself handles the difference (members
 * get wallet/bookings/profile tools; guests get general spa help plus
 * an inline nudge to sign in for the personalised experience).
 */
export default function DermaAIPageShell() {
  return (
    <section
      className="bg-gray-50 pt-3 md:pt-5 pb-12"
      aria-labelledby="derma-ai-page-heading"
    >
      <div className="max-w-6xl mx-auto px-4">
        {/* Page header — tight on mobile so the card doesn't get
            pushed off the first fold, breathes a bit more on desktop. */}
        <div className="mb-3 md:mb-5">
          <p className="text-[10px] md:text-xs font-semibold tracking-[0.16em] uppercase text-[#7B2D8E] mb-1.5">
            Derma AI · Concierge
          </p>
          <h1
            id="derma-ai-page-heading"
            className="text-xl md:text-3xl font-semibold text-gray-900 tracking-tight text-balance"
          >
            Your spa concierge, on call.
          </h1>
          <p className="mt-1.5 max-w-2xl text-[13px] md:text-[15px] text-gray-600 leading-relaxed text-pretty">
            Book a visit, check your wallet, move an appointment, get a product pick —
            just ask. Sign in for the best, personalised experience.
          </p>
        </div>

        {/* Chat surface. We pin the height so the sidebar +
            conversation never outgrow the viewport on desktop (user
            scrolls inside the chat, not the page). */}
        <div className="relative h-[calc(100vh-14rem)] min-h-[420px] sm:min-h-[520px] md:min-h-[640px] md:max-h-[780px]">
          <DermaAI mode="page" />
        </div>
      </div>
    </section>
  )
}

function PageChatSkeleton() {
  return (
    <div className="w-full h-full bg-white rounded-2xl border border-gray-200 overflow-hidden flex">
      {/* Sidebar skeleton */}
      <div className="hidden md:flex w-72 border-r border-gray-100 bg-gray-50 flex-col p-3 gap-2">
        <div className="h-9 rounded-full bg-gray-200/80 animate-pulse" />
        <div className="mt-2 space-y-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-12 rounded-xl bg-gray-200/70 animate-pulse"
              style={{ animationDelay: `${i * 120}ms` }}
            />
          ))}
        </div>
      </div>
      {/* Chat skeleton */}
      <div className="flex-1 flex flex-col">
        <div className="h-12 bg-[#7B2D8E]/90 animate-pulse" />
        <div className="flex-1 p-4 space-y-3">
          <div className="h-16 w-3/4 rounded-2xl bg-gray-100 animate-pulse" />
          <div className="h-12 w-1/2 ml-auto rounded-2xl bg-[#7B2D8E]/20 animate-pulse" />
          <div className="h-20 w-3/4 rounded-2xl bg-gray-100 animate-pulse" />
        </div>
        <div className="border-t border-gray-100 p-3">
          <div className="h-10 rounded-full bg-gray-100 animate-pulse" />
        </div>
      </div>
    </div>
  )
}

