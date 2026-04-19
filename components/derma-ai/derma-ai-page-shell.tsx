'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import useSWR from 'swr'
import { ArrowRight, MessageSquare, ShieldCheck } from 'lucide-react'

// Dynamic import — DermaAI is a heavy client-only component with speech
// APIs, AudioContext, localStorage etc. We keep SSR off so it doesn't
// explode on the server, and we avoid bundling it into the initial
// payload for visitors who haven't logged in yet.
const DermaAI = dynamic(() => import('@/components/shared/derma-ai'), {
  ssr: false,
  loading: () => <PageChatSkeleton />,
})

const authFetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) return null
  return res.json()
}

/**
 * Full-page Derma AI container. Sized to sit inside the marketing shell
 * (Header + Footer) like every other customer-facing page, gives the
 * chat a fixed maximum width on large displays, and falls back to a
 * friendly sign-in prompt for guests so the route still works if
 * someone shares it directly.
 */
export default function DermaAIPageShell() {
  const { data, isLoading } = useSWR('/api/auth/me', authFetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })

  const isAuthenticated = Boolean(data?.user)

  return (
    <section
      className="bg-gray-50 pt-6 pb-12"
      aria-labelledby="derma-ai-page-heading"
    >
      <div className="max-w-6xl mx-auto px-4">
        {/* Page header — matches the layout rhythm of /services,
            /packages and the dashboard. Eyebrow + title + sub-copy
            gives first-time visitors context before they see the chat. */}
        <div className="mb-5 md:mb-7">
          <p className="text-[10px] md:text-xs font-semibold tracking-[0.16em] uppercase text-[#7B2D8E] mb-2">
            Derma AI · Concierge
          </p>
          <h1
            id="derma-ai-page-heading"
            className="text-2xl md:text-3xl font-semibold text-gray-900 tracking-tight text-balance"
          >
            Your spa concierge, on call.
          </h1>
          <p className="mt-2 max-w-2xl text-sm md:text-[15px] text-gray-600 leading-relaxed text-pretty">
            Book visits, check your wallet, cancel or reschedule
            appointments, request callbacks, get product picks — all from
            one chat.
          </p>
        </div>

        {/* Chat surface. Height is pinned so the sidebar + conversation
            never outgrow the viewport on desktop (user scrolls inside
            the chat, not the page). On mobile we relax the height so
            the whole chat is usable without nested scroll. */}
        <div className="relative h-[calc(100vh-14rem)] min-h-[560px] md:min-h-[640px] md:max-h-[780px]">
          {isAuthenticated ? (
            <DermaAI mode="page" />
          ) : isLoading ? (
            <PageChatSkeleton />
          ) : (
            <SignInPrompt />
          )}
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

function SignInPrompt() {
  return (
    <div className="w-full h-full bg-white rounded-2xl border border-gray-200 flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#7B2D8E] text-white flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 tracking-tight">
          Sign in to chat with Derma AI
        </h2>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">
          Derma AI needs your account so it can look up bookings, check your
          wallet, and personalise recommendations. It only acts on requests
          you send and you can revoke permissions in settings any time.
        </p>
        <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/signin"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#7B2D8E] text-white rounded-full font-semibold text-sm hover:bg-[#6B2278] transition-colors"
          >
            Sign in
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-900 rounded-full font-semibold text-sm hover:border-[#7B2D8E]/30 hover:text-[#7B2D8E] transition-colors"
          >
            Create account
          </Link>
        </div>
        <p className="mt-4 inline-flex items-center gap-1.5 text-[11px] text-gray-500">
          <ShieldCheck className="w-3.5 h-3.5 text-[#7B2D8E]" />
          Secured with session cookies — never your password
        </p>
      </div>
    </div>
  )
}
