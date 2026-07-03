import Link from 'next/link'
import {
  Bot,
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

const features = [
  {
    icon: Palette,
    title: 'Fully rebrandable',
    desc: 'Set your brand name, assistant name, color, welcome message, and logo. Your customers only ever see your brand.',
  },
  {
    icon: BookOpen,
    title: 'Train on your own data',
    desc: 'Add your FAQs, policies, and product answers as simple Q&A entries. The assistant learns them instantly.',
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
  { n: '1', title: 'Create your account', desc: 'Sign up in under a minute. No card details needed to start setting things up.' },
  { n: '2', title: 'Rebrand & train', desc: 'Add your colors and logo, then paste in the questions and answers your customers ask.' },
  { n: '3', title: 'Copy one line & go live', desc: 'Drop the embed snippet on your site. Your branded assistant is instantly available to visitors.' },
]

const included = [
  'Unlimited conversations on our AI credits',
  'Full rebranding (name, color, logo, messages)',
  'Unlimited Q&A training entries',
  'One-line website embed widget',
  'Private, isolated knowledge base',
  'Conversation analytics',
  'Domain allowlisting',
  'Priority updates to the AI engine',
]

export default function SaasLandingPage() {
  return (
    <>
      <SaasNav />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">
            <Bot className="h-4 w-4" aria-hidden="true" />
            Powered by Derma AI
          </span>
          <h1 className="mt-6 text-balance text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            Your own AI assistant, live on your website in minutes
          </h1>
          <p className="mt-5 text-pretty text-lg leading-relaxed text-muted-foreground">
            License the same AI technology that powers Dermaspace. Rebrand it as your own, train it
            on your business, and embed it anywhere — all running on our AI credits. No API keys, no
            per-message bills.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/derma-ai-saas/signup"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-base font-semibold text-primary-foreground hover:opacity-90 sm:w-auto"
            >
              Start now <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="#pricing"
              className="inline-flex w-full items-center justify-center rounded-md border border-border bg-card px-6 py-3 text-base font-semibold text-foreground hover:bg-secondary sm:w-auto"
            >
              See pricing
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">One flat price. No usage fees, ever.</p>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-3xl font-bold tracking-tight">Up and running in three steps</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="rounded-xl border border-border bg-background p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-lg font-bold text-primary-foreground">
                  {s.n}
                </span>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold tracking-tight">Everything included</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center leading-relaxed text-muted-foreground">
          A complete, done-for-you AI assistant platform. You bring your brand and your knowledge —
          we handle the technology.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                <f.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-3xl font-bold tracking-tight">Simple, flat pricing</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center leading-relaxed text-muted-foreground">
            One plan. Everything included. No surprises.
          </p>

          <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-border bg-background p-8">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-2xl font-semibold text-muted-foreground">&#8358;</span>
              <span className="text-5xl font-bold tracking-tight">35,000</span>
              <span className="text-lg text-muted-foreground">/year</span>
            </div>
            <p className="mt-2 text-center text-muted-foreground">
              Per company. Billed annually. Cancel anytime.
            </p>

            <ul className="mt-8 grid gap-3">
              {included.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" aria-hidden="true" />
                  </span>
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/derma-ai-saas/signup"
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-base font-semibold text-primary-foreground hover:opacity-90"
            >
              Get started <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <p className="mt-3 text-center text-sm text-muted-foreground">
              Set everything up first — your assistant goes live once your subscription is activated.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-2xl border border-border bg-primary px-6 py-12 text-center text-primary-foreground">
          <h2 className="text-balance text-3xl font-bold tracking-tight">
            Give your customers instant answers
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-pretty leading-relaxed opacity-90">
            Join businesses using Derma AI to answer questions, capture leads, and support customers
            around the clock.
          </p>
          <Link
            href="/derma-ai-saas/signup"
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-md bg-primary-foreground px-6 py-3 text-base font-semibold text-primary hover:opacity-90"
          >
            Create your assistant <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row">
          <p>Derma AI for Business — a Dermaspace product.</p>
          <div className="flex items-center gap-4">
            <Link href="/derma-ai-saas/login" className="hover:text-foreground">
              Sign in
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </>
  )
}
