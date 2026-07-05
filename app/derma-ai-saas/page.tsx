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
  BarChart3,
} from 'lucide-react'
import { SaasNav } from '@/components/saas/saas-nav'
import { WidgetDemo } from '@/components/saas/widget-demo'
import { SaasFaq } from '@/components/saas/saas-faq'
import { ButterflyLogo } from '@/components/shared/butterfly-logo'

const features = [
  {
    icon: Palette,
    title: 'Fully rebrandable',
    desc: 'Your name, your assistant, your colour, your welcome message, your logo. Customers only ever see your brand.',
  },
  {
    icon: BookOpen,
    title: 'Trained on your business',
    desc: 'Add your FAQs, prices and policies as simple Q&A entries. The assistant learns them the moment you save.',
  },
  {
    icon: Code2,
    title: 'One line to embed',
    desc: 'Paste a single script tag on any website and the launcher appears. No developers, no plugins, no builds.',
  },
  {
    icon: MessagesSquare,
    title: 'No API keys, ever',
    desc: 'Every conversation runs on our pooled AI credits. You never touch a provider key or pay per message.',
  },
  {
    icon: ShieldCheck,
    title: 'Private and isolated',
    desc: 'Your training data lives in its own isolated space in a dedicated database. It never mixes with anyone else\u2019s.',
  },
  {
    icon: BarChart3,
    title: 'Every conversation logged',
    desc: 'Read exactly what your customers asked and what your assistant replied, right from your dashboard.',
  },
]

const steps = [
  {
    n: '01',
    title: 'Create your account',
    desc: 'Sign up in under a minute. No card required while you set everything up and see how it feels.',
  },
  {
    n: '02',
    title: 'Rebrand and train it',
    desc: 'Set your colours and voice, then paste in the questions your customers actually ask \u2014 and your answers.',
  },
  {
    n: '03',
    title: 'Paste one line of code',
    desc: 'Drop the embed snippet on your website. Your branded assistant is live for every visitor, day and night.',
  },
]

const included = [
  'Unlimited conversations on our AI credits',
  'Full rebranding \u2014 name, colour, logo, voice',
  'Unlimited Q&A training entries',
  'One-line website embed widget',
  'Private, isolated knowledge base',
  'Full conversation history',
  'Domain allowlisting',
  'Priority updates to the AI engine',
]

export default function SaasLandingPage() {
  return (
    <div className="bg-background">
      <SaasNav />

      <main>
        {/* ------------------------------------------------ Hero */}
        <section className="border-b border-border">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 md:py-24 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-16">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
                Derma AI for Business
              </p>
              <h1 className="mt-6 text-balance font-serif text-5xl leading-[1.05] text-foreground md:text-6xl lg:text-7xl">
                Your own AI concierge, on your website tonight.
              </h1>
              <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
                License the same assistant that powers Dermaspace. Rebrand it as yours, teach it
                your business, and embed it with a single line of code &mdash; all running on our AI
                credits.
              </p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/derma-ai-saas/signup"
                  className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Start now
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
                <Link
                  href="#pricing"
                  className="inline-flex items-center justify-center rounded-full border border-border px-7 py-3.5 text-base font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  See pricing
                </Link>
              </div>
              <p className="mt-6 text-sm text-muted-foreground">
                One flat price. No usage fees, no API keys, no surprises.
              </p>
            </div>

            <div aria-label="Live demo of the chat widget">
              <WidgetDemo />
              <p className="mt-3 text-center text-xs text-muted-foreground">
                A real preview of the widget your visitors will see &mdash; try it.
              </p>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ How it works */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-7xl px-4 py-16 md:py-24">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
                How it works
              </p>
              <h2 className="mt-4 text-balance font-serif text-3xl text-foreground md:text-5xl">
                Live in three steps. No developers required.
              </h2>
            </div>
            <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3">
              {steps.map((s) => (
                <div key={s.n} className="bg-card p-8">
                  <span className="font-serif text-5xl text-primary">{s.n}</span>
                  <h3 className="mt-6 text-lg font-semibold text-foreground">{s.title}</h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ Features */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-7xl px-4 py-16 md:py-24">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
                Everything included
              </p>
              <h2 className="mt-4 text-balance font-serif text-3xl text-foreground md:text-5xl">
                You bring the brand. We bring the technology.
              </h2>
            </div>
            <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <div key={f.title} className="bg-card p-8">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-primary text-primary">
                    <f.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold text-foreground">{f.title}</h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ Pricing */}
        <section id="pricing" className="border-b border-border">
          <div className="mx-auto max-w-7xl px-4 py-16 md:py-24">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
                  Pricing
                </p>
                <h2 className="mt-4 text-balance font-serif text-3xl text-foreground md:text-5xl">
                  One plan. Everything in it.
                </h2>
                <p className="mt-6 max-w-md text-pretty text-lg leading-relaxed text-muted-foreground">
                  No tiers, no add-ons, no per-message billing. Set everything up free &mdash; your
                  assistant goes live the moment your subscription is activated.
                </p>
                <div className="mt-10 flex items-baseline gap-2">
                  <span className="font-serif text-6xl text-foreground md:text-7xl">
                    &#8358;35,000
                  </span>
                  <span className="text-lg text-muted-foreground">/year</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Per company. Cancel anytime.</p>
              </div>

              <div className="rounded-xl border border-border bg-card p-8">
                <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  What&apos;s included
                </p>
                <ul className="mt-6 grid gap-4">
                  {included.map((item) => (
                    <li key={item} className="flex items-start gap-3 border-b border-border pb-4 last:border-b-0 last:pb-0">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" aria-hidden="true" />
                      <span className="leading-relaxed text-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/derma-ai-saas/signup"
                  className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Get started <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ FAQ */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-7xl px-4 py-16 md:py-24">
            <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">FAQ</p>
                <h2 className="mt-4 text-balance font-serif text-3xl text-foreground md:text-5xl">
                  Questions, answered.
                </h2>
              </div>
              <SaasFaq />
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ CTA band */}
        <section className="bg-primary">
          <div className="mx-auto flex max-w-7xl flex-col items-center gap-8 px-4 py-16 text-center md:py-24">
            <h2 className="max-w-3xl text-balance font-serif text-3xl text-primary-foreground md:text-5xl">
              Give every visitor an instant, personal answer.
            </h2>
            <p className="max-w-xl text-pretty text-lg leading-relaxed text-primary-foreground/80">
              Join businesses using Derma AI to answer questions, capture leads and support
              customers around the clock.
            </p>
            <Link
              href="/derma-ai-saas/signup"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary-foreground px-7 py-3.5 text-base font-semibold text-primary transition-opacity hover:opacity-90"
            >
              Create your assistant <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-background">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row">
          <p className="flex items-center gap-2">
            <ButterflyLogo className="h-4 w-4 text-primary" />
            Derma AI for Business &mdash; a Dermaspace product.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/derma-ai-saas/login" className="transition-colors hover:text-primary">
              Sign in
            </Link>
            <Link href="/terms" className="transition-colors hover:text-primary">
              Terms
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-primary">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
