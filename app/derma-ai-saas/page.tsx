import Link from 'next/link'
import {
  Palette,
  BookOpen,
  Code2,
  ShieldCheck,
  Globe,
  MessagesSquare,
  Check,
  ArrowRight,
} from 'lucide-react'
import { SaasNav } from '@/components/saas/saas-nav'
import { ButterflyLogo } from '@/components/shared/butterfly-logo'

const features = [
  {
    icon: Palette,
    title: 'Fully rebrandable',
    desc: 'Set your brand name, assistant name, colour, welcome message and logo. Your customers only ever see your brand.',
  },
  {
    icon: BookOpen,
    title: 'Train on your own data',
    desc: 'Add your FAQs, policies and product answers as simple Q&A entries. The assistant learns them instantly.',
  },
  {
    icon: Code2,
    title: 'One line to embed',
    desc: 'Paste a single script tag on any website and the chat launcher appears — no developers required.',
  },
  {
    icon: MessagesSquare,
    title: 'No API keys, no AI bills',
    desc: 'Every conversation runs on our AI credits. You never add a provider key or pay per message.',
  },
  {
    icon: ShieldCheck,
    title: 'Private & isolated',
    desc: 'Your training data lives in its own isolated space. It never mixes with or leaks to any other company.',
  },
  {
    icon: Globe,
    title: 'Works everywhere',
    desc: 'Runs on any website or platform. Restrict it to your own domains whenever you want tighter control.',
  },
]

const steps = [
  {
    n: '1',
    title: 'Create your account',
    desc: 'Sign up in under a minute. No card details needed to start setting things up.',
  },
  {
    n: '2',
    title: 'Rebrand & train',
    desc: 'Add your colours and logo, then paste in the questions and answers your customers ask.',
  },
  {
    n: '3',
    title: 'Copy one line & go live',
    desc: 'Drop the embed snippet on your site. Your branded assistant is instantly available to visitors.',
  },
]

const included = [
  'Unlimited conversations on our AI credits',
  'Full rebranding (name, colour, logo, messages)',
  'Unlimited Q&A training entries',
  'One-line website embed widget',
  'Private, isolated knowledge base',
  'Conversation history',
  'Domain allowlisting',
  'Priority updates to the AI engine',
]

export default function SaasLandingPage() {
  return (
    <div className="bg-white">
      <SaasNav />

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#7B2D8E]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#7B2D8E]">
            <ButterflyLogo className="h-4 w-4 text-[#7B2D8E]" />
            Powered by Derma AI
          </span>
          <h1 className="mt-6 text-balance font-serif text-4xl font-bold leading-tight text-gray-900 md:text-5xl">
            Your own AI assistant, live on your website in minutes
          </h1>
          <p className="mt-5 text-pretty text-lg leading-relaxed text-gray-600">
            License the same AI technology that powers Dermaspace. Rebrand it as your own, train it
            on your business, and embed it anywhere — all running on our AI credits. No API keys, no
            per-message bills.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/derma-ai-saas/signup"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#7B2D8E] px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-[#6B2278] sm:w-auto"
            >
              Start now
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <Link
              href="#pricing"
              className="inline-flex w-full items-center justify-center rounded-full border border-gray-200 bg-white px-6 py-3 text-base font-semibold text-gray-900 transition-colors hover:border-[#7B2D8E]/30 hover:text-[#7B2D8E] sm:w-auto"
            >
              See pricing
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-500">One flat price. No usage fees, ever.</p>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-gray-200 bg-[#7B2D8E]/[0.03]">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <h2 className="text-center font-serif text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
            Up and running in three steps
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="rounded-2xl border border-gray-200 bg-white p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7B2D8E] text-lg font-bold text-white">
                  {s.n}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">{s.title}</h3>
                <p className="mt-2 leading-relaxed text-gray-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-center font-serif text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
          Everything included
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center leading-relaxed text-gray-600">
          A complete, done-for-you AI assistant platform. You bring your brand and your knowledge —
          we handle the technology.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-gray-200 bg-white p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E]">
                <f.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">{f.title}</h3>
              <p className="mt-2 leading-relaxed text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-gray-200 bg-[#7B2D8E]/[0.03]">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <h2 className="text-center font-serif text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
            Simple, flat pricing
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center leading-relaxed text-gray-600">
            One plan. Everything included. No surprises.
          </p>

          <div className="mx-auto mt-10 max-w-xl rounded-3xl border border-gray-200 bg-white p-8">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-2xl font-semibold text-gray-500">&#8358;</span>
              <span className="text-5xl font-bold tracking-tight text-gray-900">35,000</span>
              <span className="text-lg text-gray-500">/year</span>
            </div>
            <p className="mt-2 text-center text-gray-600">
              Per company. Billed annually. Cancel anytime.
            </p>

            <ul className="mt-8 grid gap-3">
              {included.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#7B2D8E] text-white">
                    <Check className="h-3 w-3" aria-hidden="true" />
                  </span>
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/derma-ai-saas/signup"
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#7B2D8E] px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-[#6B2278]"
            >
              Get started <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <p className="mt-3 text-center text-sm text-gray-500">
              Set everything up first — your assistant goes live once your subscription is activated.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="rounded-3xl bg-[#7B2D8E] px-6 py-12 text-center text-white">
          <h2 className="text-balance font-serif text-2xl font-bold tracking-tight md:text-3xl">
            Give your customers instant answers
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-pretty leading-relaxed text-white/85">
            Join businesses using Derma AI to answer questions, capture leads and support customers
            around the clock.
          </p>
          <Link
            href="/derma-ai-saas/signup"
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-base font-semibold text-[#7B2D8E] transition-opacity hover:opacity-90"
          >
            Create your assistant <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-gray-500 sm:flex-row">
          <p className="flex items-center gap-2">
            <ButterflyLogo className="h-4 w-4 text-[#7B2D8E]" />
            Derma AI for Business — a Dermaspace product.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/derma-ai-saas/login" className="hover:text-[#7B2D8E]">
              Sign in
            </Link>
            <Link href="/terms" className="hover:text-[#7B2D8E]">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-[#7B2D8E]">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
