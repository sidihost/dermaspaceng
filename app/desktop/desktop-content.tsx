'use client'

/**
 * /desktop — the Dermaspace desktop app install centre.
 *
 * The "desktop app" is a Progressive Web App. The same architecture
 * the entire industry has converged on for native installable
 * experiences (X, Spotify, Photoshop on the Web, Linear, Notion,
 * ChatGPT desktop). It gives us:
 *
 *   - A real, OS-installed app on Windows and macOS
 *   - Standalone window with our own title bar (no browser chrome)
 *   - Dock / taskbar / start-menu icon
 *   - System notifications + offline support (already shipped via
 *     `public/sw.js`)
 *   - Auto-updates on every launch
 *   - Zero distribution overhead — no signing certs, no app stores,
 *     no review queues
 *
 * Officially supported platforms — Windows 10/11 and macOS 12+.
 * Linux and Chrome OS were dropped from the marketing surface
 * because (a) the Nigerian customer base on those platforms is a
 * rounding error and (b) it lets every CTA, screenshot and FAQ
 * line speak with a single confident voice rather than hedging
 * across four operating systems. The PWA still installs perfectly
 * on Linux/Chrome OS for any technical visitor — we just don't
 * advertise or QA against them.
 *
 * The page itself adapts to the user's situation:
 *
 *   1. If the app is ALREADY installed and we're inside the
 *      standalone window → "You're in the app" success state.
 *
 *   2. If `beforeinstallprompt` fired (Chrome / Edge / Brave / Arc /
 *      Opera on every OS, plus Samsung Internet) → big "Install
 *      Dermaspace" button that triggers the native install dialog.
 *
 *   3. If the browser doesn't support automated install (Safari,
 *      Firefox) → a clean, branded step-by-step for the user's OS.
 *
 *   4. If the visitor is on an unsupported OS (Linux, Chrome OS,
 *      anything we can't sniff) → a friendly "we recommend Windows
 *      or macOS" panel that still lets them carry on to the web app.
 *
 * The component listens for the "appinstalled" event so the success
 * state appears the moment the user accepts the dialog, without a
 * page reload.
 *
 * Offline reachability is handled by the service worker's
 * `PRECACHE_PAGES` list — `/desktop` is precached on install so the
 * marketing page itself works the first time the user opens the app
 * with no signal.
 */

import * as React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  Bell,
  Shield,
  WifiOff,
  Cpu,
  Calendar,
  MessageCircle,
  Wallet,
  Download,
  Monitor,
  Share,
  PlusSquare,
  ChevronDown,
  CheckCircle2,
  Rocket,
} from 'lucide-react'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'

// ---------------------------------------------------------------------------
// Type for the BeforeInstallPromptEvent (Chromium + Samsung Internet).
// Not in TS lib.dom yet, so we declare the minimum surface we use.
// ---------------------------------------------------------------------------
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// We only officially support Windows and macOS. Linux and Chrome OS
// visitors are bucketed into 'unsupported' so the UI can show them a
// dedicated, friendly panel instead of pretending we have install
// instructions for them. 'unknown' is reserved for SSR / very old
// browsers where UA sniffing fails outright.
type OS = 'windows' | 'macos' | 'unsupported' | 'unknown'
type Browser =
  | 'chrome'
  | 'edge'
  | 'brave'
  | 'arc'
  | 'opera'
  | 'samsung'
  | 'safari'
  | 'firefox'
  | 'unknown'

function detectOS(): OS {
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent || ''
  const platform = (navigator as { platform?: string }).platform || ''
  if (/Windows/i.test(platform) || /Windows/i.test(ua)) return 'windows'
  if (/Mac/i.test(platform) || /Macintosh/i.test(ua)) return 'macos'
  // Linux desktop or Chrome OS — we don't officially support either,
  // but we don't want to silently ignore them. They get the
  // 'unsupported' branch which renders a polite "use Windows / macOS"
  // panel instead of a broken-looking install card.
  if (/CrOS/i.test(ua)) return 'unsupported'
  if (/Linux/i.test(platform) || (/Linux/i.test(ua) && !/Android/i.test(ua)))
    return 'unsupported'
  return 'unknown'
}

function detectBrowser(): Browser {
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent || ''
  // Order matters — Edge/Brave/Opera/Arc all spoof Chrome in their UA.
  if (/Edg\//i.test(ua)) return 'edge'
  if (/OPR\//i.test(ua) || /Opera/i.test(ua)) return 'opera'
  if (/SamsungBrowser/i.test(ua)) return 'samsung'
  // Brave is identifiable by `navigator.brave?.isBrave()`. Deferred
  // detection happens in the effect below; this sniff just returns
  // 'chrome' for Chromium browsers that don't tag themselves.
  if (/Firefox\//i.test(ua)) return 'firefox'
  if (/Chrome\//i.test(ua)) return 'chrome'
  if (/Safari\//i.test(ua)) return 'safari'
  return 'unknown'
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  // iOS Safari uses `navigator.standalone`; everyone else uses the
  // display-mode media query. We check both because Apple still
  // hasn't aligned with the standard 4 years on.
  const mql = window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches
  const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true
  return mql || iosStandalone
}

// ---------------------------------------------------------------------------
// Tiny inline OS marks (Lucide doesn't ship Apple/Microsoft/Linux
// glyphs for trademark reasons — we render neutral, geometric stand-ins).
// ---------------------------------------------------------------------------

function AppleGlyph({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M16.365 1.43c0 1.14-.42 2.21-1.13 3.02-.77.88-2.04 1.56-3.04 1.49-.13-1.14.42-2.32 1.12-3.07.78-.85 2.13-1.49 3.05-1.44zM20.5 17.18c-.55 1.21-.81 1.75-1.51 2.81-.99 1.49-2.39 3.34-4.13 3.36-1.55.02-1.95-1.01-4.05-1-2.1.01-2.54 1.02-4.09 1-1.74-.02-3.07-1.69-4.06-3.18-2.79-4.16-3.08-9.05-1.36-11.65 1.21-1.83 3.13-2.91 4.93-2.91 1.84 0 3 1.01 4.52 1.01 1.48 0 2.38-1.01 4.51-1.01 1.62 0 3.34.88 4.56 2.4-4.01 2.2-3.36 7.94 0 9.17z" />
    </svg>
  )
}

function WindowsGlyph({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M3 5.5 11 4.4v7.1H3V5.5Zm0 13L11 19.6v-7.1H3V18.5Zm9-14.3L21 3v8.5h-9V4.2Zm0 8.3h9V21l-9-1.4v-7.1Z" />
    </svg>
  )
}

function osGlyph(os: OS, className = 'w-4 h-4') {
  if (os === 'windows') return <WindowsGlyph className={className} />
  if (os === 'macos') return <AppleGlyph className={className} />
  // 'unsupported' and 'unknown' both fall through to a neutral
  // monitor icon — we don't render an OS-specific glyph because we
  // don't have an install path to back it.
  return <Monitor className={className} aria-hidden="true" />
}

function osLabel(os: OS): string {
  switch (os) {
    case 'windows':     return 'Windows'
    case 'macos':       return 'macOS'
    // The 'unsupported' label intentionally reads "your computer" so
    // CTA and section copy stays grammatical without us needing
    // dozens of branched strings. Visitors on unsupported OSes still
    // see a dedicated panel that names their OS explicitly.
    case 'unsupported': return 'your computer'
    default:            return 'your computer'
  }
}

// ---------------------------------------------------------------------------
// Static content — features, FAQ. Kept separate from the component so
// it's trivial to translate later, and so each FAQ entry stays a single
// source-of-truth string with no JSX to update.
// ---------------------------------------------------------------------------

const FEATURES = [
  {
    icon: Bell,
    title: 'Native notifications',
    body: 'A system notification arrives the second your booking is confirmed, your therapist replies, or a wallet receipt lands — even when the app is closed.',
  },
  {
    icon: Rocket,
    title: 'Instant launch',
    body: 'Pin Dermaspace to your dock, taskbar, or Start menu. It opens in under a second to whatever screen you left it on, in its own window.',
  },
  {
    icon: WifiOff,
    title: 'Works offline',
    body: 'Your last bookings, wallet balance, and saved consultations stay readable without a connection. Anything you change syncs the moment you\u2019re back.',
  },
  {
    icon: Shield,
    title: 'Private by default',
    body: 'No browser extensions snooping the page, no cross-site cookies, no tab clutter. The app talks only to Dermaspace, and your session lives in encrypted system storage.',
  },
  {
    icon: Cpu,
    title: 'Light on resources',
    body: 'No bulky framework runtime to install. The app reuses the same engine your browser already trusts, so it\u2019s small to download and gentle on battery.',
  },
  {
    icon: CheckCircle2,
    title: 'Always up to date',
    body: 'Updates ship in the background on every launch. You never have to manually re-download a build, and you\u2019re never stuck on an old version.',
  },
] as const

const QUICK_ACTIONS = [
  { icon: Calendar, label: 'Book treatments' },
  { icon: MessageCircle, label: 'Chat with your therapist' },
  { icon: Wallet, label: 'Top up & manage your wallet' },
  { icon: Bell, label: 'Get appointment reminders' },
] as const

const FAQ = [
  {
    q: 'Is the desktop app free?',
    a: 'Yes \u2014 free to install and use. You only pay for the treatments you book, exactly as you do on the website.',
  },
  {
    q: 'How is this different from the website?',
    a: 'It\u2019s the same Dermaspace experience, packaged as a real app on your machine. You get system notifications, a dock/taskbar icon, instant launch, offline reads, and a window that doesn\u2019t fight your browser tabs.',
  },
  {
    q: 'Do I need a Dermaspace account?',
    a: 'You can browse services and our journal without one, but you\u2019ll need to sign in to book, chat, or use your wallet. The app uses the same account you already use on dermaspaceng.com.',
  },
  {
    q: 'How do I update the app?',
    a: 'There\u2019s nothing to do \u2014 the app checks for the latest version on every launch and updates itself in the background. You\u2019re always on the newest build.',
  },
  {
    q: 'Which versions are supported?',
    a: 'Windows 10 and 11, plus macOS 12 (Monterey) and newer on both Apple Silicon and Intel chips. We recommend the latest Chrome, Edge, Brave, Opera, or Safari (macOS only).',
  },
  {
    q: 'How do I uninstall it?',
    a: 'Right-click the app\u2019s icon in your dock / taskbar, choose \u201CUninstall\u201D, and it\u2019s gone in a second \u2014 no leftover files, no system entries.',
  },
] as const

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DesktopContent() {
  const [os, setOS] = React.useState<OS>('unknown')
  const [browser, setBrowser] = React.useState<Browser>('unknown')
  const [installed, setInstalled] = React.useState(false)
  const [installPrompt, setInstallPrompt] =
    React.useState<BeforeInstallPromptEvent | null>(null)
  const [installState, setInstallState] =
    React.useState<'idle' | 'prompting' | 'success' | 'dismissed'>('idle')
  const [openFaq, setOpenFaq] = React.useState<number | null>(0)

  React.useEffect(() => {
    setOS(detectOS())
    setBrowser(detectBrowser())
    setInstalled(isStandalone())

    const onBeforeInstall = (e: Event) => {
      // Stop the mini-infobar Chrome shows by default — we render
      // our own brand-coloured CTA, which is far more discoverable.
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    const onAppInstalled = () => {
      setInstalled(true)
      setInstallPrompt(null)
      setInstallState('success')
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onAppInstalled)

    // Track display-mode flips too (e.g. user just installed via the
    // browser menu rather than our button). This makes the success
    // state appear without a refresh.
    const mql = window.matchMedia('(display-mode: standalone)')
    const onMqlChange = () => setInstalled(isStandalone())
    if (mql.addEventListener) mql.addEventListener('change', onMqlChange)
    else mql.addListener(onMqlChange)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onAppInstalled)
      if (mql.removeEventListener) mql.removeEventListener('change', onMqlChange)
      else mql.removeListener(onMqlChange)
    }
  }, [])

  const canAutoInstall = !!installPrompt && !installed

  // The native prompt can only fire from a user gesture — that's why
  // this is wired to a button onClick, not an effect.
  const handleInstall = React.useCallback(async () => {
    if (!installPrompt) return
    setInstallState('prompting')
    try {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      if (choice.outcome === 'accepted') {
        setInstallState('success')
      } else {
        setInstallState('dismissed')
      }
    } catch {
      setInstallState('dismissed')
    } finally {
      // Single-use event — once consumed, it can't be re-prompted in
      // the same page lifecycle. Drop the reference so the UI falls
      // back to manual instructions on a second click.
      setInstallPrompt(null)
    }
  }, [installPrompt])

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white text-gray-900">
        {/* ============================================================
            HERO
        ============================================================ */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[#FBF6FE] to-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-12 lg:pt-20 lg:pb-16">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
              {/* Copy */}
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] text-[11px] font-semibold uppercase tracking-[0.16em] px-3 py-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E]" />
                  Now on desktop
                </div>
                <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-[1.05] tracking-tight text-balance">
                  Dermaspace, in its own window.
                </h1>
                <p className="mt-4 text-base sm:text-lg text-gray-600 leading-relaxed text-pretty">
                  A real app on your dock, taskbar, or Start menu. Book
                  appointments, chat with your therapist, top up your wallet
                  and pick up notifications &mdash; all without a single browser tab.
                </p>

                {/* Primary CTA — adapts to OS + browser support. */}
                <div className="mt-7 flex flex-col sm:flex-row gap-3">
                  {installed ? (
                    <span className="inline-flex items-center justify-center gap-2 px-6 h-12 rounded-full bg-[#0F8A4D] text-white text-sm font-semibold shadow-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      You&apos;re using the app
                    </span>
                  ) : canAutoInstall ? (
                    <button
                      type="button"
                      onClick={handleInstall}
                      disabled={installState === 'prompting'}
                      className="inline-flex items-center justify-center gap-2 px-6 h-12 rounded-full bg-[#7B2D8E] text-white text-sm font-semibold hover:bg-[#6B2278] transition-colors active:scale-[0.98] shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <Download className="w-4 h-4" />
                      {installState === 'prompting'
                        ? 'Opening installer\u2026'
                        : `Install Dermaspace${os !== 'unknown' ? ` for ${osLabel(os)}` : ''}`}
                    </button>
                  ) : (
                    <a
                      href="#install-steps"
                      className="inline-flex items-center justify-center gap-2 px-6 h-12 rounded-full bg-[#7B2D8E] text-white text-sm font-semibold hover:bg-[#6B2278] transition-colors active:scale-[0.98] shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      How to install on {osLabel(os)}
                    </a>
                  )}
                  <Link
                    href="/booking"
                    className="inline-flex items-center justify-center gap-2 px-6 h-12 rounded-full border border-gray-200 text-gray-800 text-sm font-semibold hover:border-[#7B2D8E] hover:text-[#7B2D8E] transition-colors active:scale-[0.98]"
                  >
                    Book an appointment
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                {/* Secondary feedback */}
                {installState === 'dismissed' && !installed && (
                  <p className="mt-3 text-xs text-gray-500">
                    No worries &mdash; you can install at any time from your
                    browser&apos;s menu, or follow the steps below.
                  </p>
                )}

                {/* Compatibility row */}
                <p className="mt-4 text-xs text-gray-500">
                  Free &middot; auto-updating &middot; works on{' '}
                  <span className="inline-flex items-center gap-1 font-medium text-gray-700">
                    <WindowsGlyph className="w-3 h-3" /> Windows 10 / 11
                  </span>{' '}
                  &amp;{' '}
                  <span className="inline-flex items-center gap-1 font-medium text-gray-700">
                    <AppleGlyph className="w-3 h-3" /> macOS 12+
                  </span>
                </p>

                {/* Quick action chips */}
                <ul className="mt-7 grid grid-cols-2 gap-2.5 max-w-md">
                  {QUICK_ACTIONS.map(({ icon: Icon, label }) => (
                    <li
                      key={label}
                      className="flex items-center gap-2.5 text-sm text-gray-700"
                    >
                      <span className="w-7 h-7 rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
                        <Icon className="w-3.5 h-3.5" />
                      </span>
                      <span className="truncate">{label}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Product shot */}
              <div className="relative">
                <div className="absolute inset-0 -z-10 bg-gradient-to-tr from-[#7B2D8E]/15 via-transparent to-[#9B4DB0]/10 rounded-3xl blur-3xl" />
                <div className="relative rounded-2xl overflow-hidden ring-1 ring-gray-200 shadow-2xl shadow-[#7B2D8E]/15 bg-gray-900">
                  <Image
                    src="/images/desktop-app-hero.jpg"
                    alt="Dermaspace desktop app shown on a MacBook"
                    width={1600}
                    height={1000}
                    priority
                    className="w-full h-auto object-cover"
                  />
                </div>
                {/* OS pill — only the two officially supported platforms
                    so the visual badge matches what we actually ship. */}
                <div className="absolute -bottom-3 left-4 sm:left-6 inline-flex items-center gap-2 rounded-full bg-white border border-gray-200 px-3.5 h-9 shadow-sm">
                  <AppleGlyph className="w-4 h-4 text-gray-900" />
                  <span className="w-px h-3.5 bg-gray-200" aria-hidden="true" />
                  <WindowsGlyph className="w-4 h-4 text-gray-900" />
                  <span className="text-[11px] font-semibold text-gray-700">
                    macOS &middot; Windows
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            FEATURES
        ============================================================ */}
        <section className="bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7B2D8E]">
                Why install
              </p>
              <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight text-balance">
                Everything Dermaspace, in its own window.
              </h2>
              <p className="mt-3 text-base text-gray-600 leading-relaxed">
                The web app stays the way you know it. The desktop app gives
                you the same surface, plus the things only a native app can do.
              </p>
            </div>

            <ul className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <li
                  key={title}
                  className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 hover:border-[#7B2D8E]/30 hover:shadow-sm transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5" strokeWidth={2} />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {title}
                  </h3>
                  <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">
                    {body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ============================================================
            INSTALL STEPS — auto-targets the visitor's OS + browser.
        ============================================================ */}
        <section
          id="install-steps"
          className="bg-[#FBF6FE]/60 border-y border-[#7B2D8E]/10"
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
            <div className="text-center max-w-xl mx-auto">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7B2D8E]">
                Install
              </p>
              <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight text-balance">
                {installed
                  ? 'You\u2019re already running the app'
                  : os === 'unsupported'
                    ? 'Use Dermaspace on the web'
                    : canAutoInstall
                      ? `One tap away on ${osLabel(os)}`
                      : `How to install on ${osLabel(os)}`}
              </h2>
              <p className="mt-2.5 text-sm text-gray-600 leading-relaxed">
                {installed
                  ? 'Pin Dermaspace to your dock or taskbar so it\u2019s one click away on any device.'
                  : os === 'unsupported'
                    ? 'The Dermaspace desktop app is officially built for Windows and macOS. You can keep using the full web experience, or install the app on a Windows or Mac device.'
                    : canAutoInstall
                      ? 'Tap the install button below and confirm in your browser. The app will open in its own window with a real dock / taskbar icon.'
                      : 'Your browser doesn\u2019t support a one-click install, but it takes about 10 seconds either way. Follow the steps below.'}
              </p>
            </div>

            <div className="mt-10">
              {installed ? (
                <InstalledCard />
              ) : os === 'unsupported' ? (
                // Linux / Chrome OS visitors land here. We don't pretend
                // to have a polished install path for them — instead we
                // show a friendly note and route them to the web app so
                // they can keep using Dermaspace without any friction.
                <UnsupportedOSCard />
              ) : canAutoInstall ? (
                <AutoInstallCard
                  os={os}
                  installState={installState}
                  onInstall={handleInstall}
                />
              ) : (
                <ManualInstallCard os={os} browser={browser} />
              )}
            </div>
          </div>
        </section>

        {/* ============================================================
            FAQ
        ============================================================ */}
        <section className="bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7B2D8E]">
              FAQ
            </p>
            <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight text-balance">
              Questions, answered.
            </h2>

            <ul className="mt-8 divide-y divide-gray-100 border-y border-gray-100">
              {FAQ.map(({ q, a }, i) => {
                const open = openFaq === i
                return (
                  <li key={q}>
                    <button
                      type="button"
                      onClick={() => setOpenFaq(open ? null : i)}
                      className="w-full flex items-center justify-between gap-4 py-5 text-left"
                      aria-expanded={open}
                    >
                      <span className="text-[15px] font-semibold text-gray-900">
                        {q}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 flex-shrink-0 text-gray-500 transition-transform ${
                          open ? 'rotate-180 text-[#7B2D8E]' : ''
                        }`}
                      />
                    </button>
                    {open && (
                      <p className="pb-5 -mt-2 text-sm text-gray-600 leading-relaxed">
                        {a}
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>

            <div className="mt-10 rounded-2xl bg-[#FBF6FE] border border-[#7B2D8E]/10 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-gray-700">
                Still stuck? Our team can walk you through it in two minutes.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 self-start sm:self-auto px-5 h-10 rounded-full bg-[#7B2D8E] text-white text-sm font-semibold hover:bg-[#6B2278] transition-colors"
              >
                Contact support
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

// ---------------------------------------------------------------------------
// Sub-components — kept inline so this is a single file with no
// import-graph spaghetti for what is effectively one marketing page.
// ---------------------------------------------------------------------------

/**
 * UnsupportedOSCard — shown to Linux / Chrome OS visitors.
 *
 * The PWA actually does install fine on those platforms, but we
 * deliberately don't advertise or QA against them, so we tell the
 * truth: the desktop app is officially Windows + macOS, here's the
 * web app in the meantime. No misleading "install anyway" button.
 */
function UnsupportedOSCard() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-7">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 text-gray-700 flex items-center justify-center flex-shrink-0">
          <Monitor className="w-7 h-7" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">
            We officially support Windows and macOS only
          </h3>
          <p className="mt-1 text-sm text-gray-600 leading-relaxed">
            The full Dermaspace experience is available right now on the web,
            with offline support, system notifications, and everything you get
            in the desktop app. When you next sign in on a Windows or Mac
            device, you&apos;ll be able to install the native app there.
          </p>
        </div>
      </div>
      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 px-5 h-11 rounded-full bg-[#7B2D8E] text-white text-sm font-semibold hover:bg-[#6B2278] transition-colors"
        >
          Continue on the web
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/contact"
          className="inline-flex items-center justify-center gap-2 px-5 h-11 rounded-full border border-gray-200 text-gray-800 text-sm font-semibold hover:border-[#7B2D8E] hover:text-[#7B2D8E] transition-colors"
        >
          Tell us your platform
        </Link>
      </div>
    </div>
  )
}

function InstalledCard() {
  return (
    <div className="rounded-2xl border border-[#0F8A4D]/30 bg-white p-5 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center gap-5">
      <div className="w-12 h-12 rounded-xl bg-[#0F8A4D]/10 text-[#0F8A4D] flex items-center justify-center flex-shrink-0">
        <CheckCircle2 className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">
          You&apos;re inside the Dermaspace app
        </h3>
        <p className="mt-1 text-sm text-gray-600 leading-relaxed">
          Pin it to your dock or taskbar so it&apos;s a single click away on every
          launch. You&apos;ll get system notifications for confirmations,
          replies and reminders.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 h-10 rounded-full bg-[#7B2D8E] text-white text-sm font-semibold hover:bg-[#6B2278] transition-colors"
        >
          Open dashboard
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}

function AutoInstallCard({
  os,
  installState,
  onInstall,
}: {
  os: OS
  installState: 'idle' | 'prompting' | 'success' | 'dismissed'
  onInstall: () => void
}) {
  return (
    <div className="rounded-2xl border border-[#7B2D8E]/15 bg-white p-5 sm:p-7">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="w-14 h-14 rounded-2xl bg-[#7B2D8E] text-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#7B2D8E]/20">
          {osGlyph(os, 'w-7 h-7')}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">
            Install Dermaspace for {osLabel(os)}
          </h3>
          <p className="mt-1 text-sm text-gray-600 leading-relaxed">
            Your browser supports a one-tap install. The app opens in its own
            window with a dock / taskbar icon. You can uninstall any time.
          </p>
        </div>
        <button
          type="button"
          onClick={onInstall}
          disabled={installState === 'prompting'}
          className="inline-flex items-center justify-center gap-2 px-5 h-11 rounded-full bg-[#7B2D8E] text-white text-sm font-semibold hover:bg-[#6B2278] transition-colors disabled:opacity-60"
        >
          <Download className="w-4 h-4" />
          {installState === 'prompting' ? 'Opening\u2026' : 'Install now'}
        </button>
      </div>

      <ol className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <Step n={1} title="Tap install" body="Click the purple Install button above." />
        <Step n={2} title="Confirm" body="Your browser will show a system dialog. Click Install." />
        <Step n={3} title="Open" body="The app launches in its own window. Pin it to keep it close." />
      </ol>
    </div>
  )
}

function ManualInstallCard({ os, browser }: { os: OS; browser: Browser }) {
  // Pick the right step list based on OS + browser. We show one
  // "primary" path (the one most users on this OS will actually do)
  // and a "Try this instead" panel for anyone whose browser doesn't
  // match.
  const isSafariOnApple = browser === 'safari' && os === 'macos'
  const isFirefox = browser === 'firefox'

  if (isSafariOnApple) {
    return (
      <ManualSteps
        title="Install on macOS with Safari"
        icon={<AppleGlyph className="w-7 h-7" />}
        steps={[
          { icon: Share, t: 'Open Share', b: 'Click the Share button in the Safari toolbar.' },
          { icon: PlusSquare, t: 'Add to Dock', b: 'Choose \u201CAdd to Dock\u201D from the share menu.' },
          { icon: Rocket, t: 'Launch', b: 'Dermaspace appears in your Dock with its own icon.' },
        ]}
        alt="Or use Chrome / Edge / Brave for a one-click install."
      />
    )
  }

  if (isFirefox) {
    return (
      <ManualSteps
        title={`Install on ${osLabel(os)} with Firefox`}
        icon={osGlyph(os, 'w-7 h-7')}
        steps={[
          { icon: Download, t: 'Open in Chromium', b: 'Firefox doesn\u2019t support installable web apps yet. Open dermaspaceng.com/desktop in Chrome, Edge, Brave or Opera.' },
          { icon: PlusSquare, t: 'Click Install', b: 'On the new browser, an Install button will appear in the address bar (or in the menu).' },
          { icon: Rocket, t: 'Launch', b: 'The app pins itself to your taskbar / dock so you don\u2019t need a browser to open it.' },
        ]}
        alt="Once installed it auto-updates regardless of which browser you originally installed it with."
      />
    )
  }

  // Default — Chrome/Edge/Brave on a recognised OS, no
  // beforeinstallprompt yet (e.g. user dismissed the auto banner
  // earlier and the browser hasn't re-armed it).
  return (
    <ManualSteps
      title={`Install on ${osLabel(os)}`}
      icon={osGlyph(os, 'w-7 h-7')}
      steps={[
        { icon: Monitor, t: 'Open the menu', b: 'Click the three-dot menu in the top-right of your browser.' },
        { icon: PlusSquare, t: 'Choose Install', b: 'Pick \u201CInstall Dermaspace\u201D (sometimes shown as \u201CCast, save, and share \u2192 Install page as app\u201D).' },
        { icon: Rocket, t: 'Launch', b: 'The app opens in its own window with a dock / taskbar icon.' },
      ]}
      alt="Tip: look for the small install icon in your address bar \u2014 that&apos;s the fastest path."
    />
  )
}

function ManualSteps({
  title,
  icon,
  steps,
  alt,
}: {
  title: string
  icon: React.ReactNode
  steps: { icon: React.ComponentType<{ className?: string }>; t: string; b: string }[]
  alt: string
}) {
  return (
    <div className="rounded-2xl border border-[#7B2D8E]/15 bg-white p-5 sm:p-7">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[#7B2D8E] text-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#7B2D8E]/20">
          {icon}
        </div>
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">
          {title}
        </h3>
      </div>

      <ol className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {steps.map((s, i) => (
          <Step key={s.t} n={i + 1} title={s.t} body={s.b} icon={s.icon} />
        ))}
      </ol>

      <p className="mt-5 text-xs text-gray-500 leading-relaxed">{alt}</p>
    </div>
  )
}

function Step({
  n,
  title,
  body,
  icon: Icon,
}: {
  n: number
  title: string
  body: string
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <li className="rounded-xl bg-[#FBF6FE] border border-[#7B2D8E]/10 p-4">
      <div className="flex items-center gap-2.5 mb-2">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#7B2D8E] text-white text-[11px] font-bold">
          {n}
        </span>
        {Icon && <Icon className="w-3.5 h-3.5 text-[#7B2D8E]" />}
        <span className="text-[13px] font-semibold text-gray-900">{title}</span>
      </div>
      <p className="text-[12.5px] text-gray-600 leading-relaxed">{body}</p>
    </li>
  )
}
