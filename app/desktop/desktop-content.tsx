'use client'

/**
 * /desktop — native app marketing & download page.
 *
 * Auto-detects the visitor's operating system from `navigator` and
 * surfaces the correct primary download button as the page hero CTA,
 * while still listing every supported platform below for visitors on
 * unrecognized OSes (or for users grabbing a build for a different
 * machine).
 *
 * Wiring up the actual binaries
 * -----------------------------
 * The `BUILDS` map below points at static files under `/public/downloads/`.
 * When the team ships a new desktop release with `pnpm tauri build`,
 * dropping the produced binaries into that folder is all that's needed
 * for every CTA on this page to start serving live downloads.
 *
 * The page is fully responsive and stays inside the brand palette
 * (deep plum #7B2D8E, near-black ink, off-white surface).
 */

import * as React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  Check,
  Bell,
  Sparkles,
  Zap,
  Shield,
  Wifi,
  Cpu,
  HardDrive,
  Calendar,
  MessageCircle,
  Wallet,
  Download,
} from 'lucide-react'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'

// ---------------------------------------------------------------------------
// Build manifest — keep version + filenames in lockstep with whatever
// the CI release pipeline actually publishes. Bumping APP_VERSION here
// should be the only change needed for a normal release; the URLs are
// derived deterministically below.
// ---------------------------------------------------------------------------
const APP_VERSION = '1.0.0'
const RELEASED_ON = 'May 2026'
const APP_SIZE_MB = 84

type OS = 'windows' | 'macos-apple-silicon' | 'macos-intel' | 'linux-deb' | 'linux-appimage'

interface BuildEntry {
  os: OS
  label: string
  /** Short subtitle under the row label. */
  subLabel: string
  href: string
  /** Marketing string surfaced inline on the row. */
  fileSize: string
}

const BUILDS: Record<OS, BuildEntry> = {
  windows: {
    os: 'windows',
    label: 'Windows',
    subLabel: 'Windows 10 / 11 · 64-bit installer',
    href: `/downloads/Dermaspace-${APP_VERSION}-x64-setup.exe`,
    fileSize: `${APP_SIZE_MB} MB · .exe`,
  },
  'macos-apple-silicon': {
    os: 'macos-apple-silicon',
    label: 'macOS — Apple Silicon',
    subLabel: 'M1, M2, M3, M4 chips · macOS 12+',
    href: `/downloads/Dermaspace-${APP_VERSION}-arm64.dmg`,
    fileSize: `${APP_SIZE_MB} MB · .dmg`,
  },
  'macos-intel': {
    os: 'macos-intel',
    label: 'macOS — Intel',
    subLabel: 'Intel Macs · macOS 11+',
    href: `/downloads/Dermaspace-${APP_VERSION}-x64.dmg`,
    fileSize: `${APP_SIZE_MB} MB · .dmg`,
  },
  'linux-deb': {
    os: 'linux-deb',
    label: 'Linux — Debian / Ubuntu',
    subLabel: 'Debian, Ubuntu, Pop!_OS · 64-bit',
    href: `/downloads/dermaspace_${APP_VERSION}_amd64.deb`,
    fileSize: `${APP_SIZE_MB} MB · .deb`,
  },
  'linux-appimage': {
    os: 'linux-appimage',
    label: 'Linux — AppImage',
    subLabel: 'Fedora, Arch, openSUSE, anything else · 64-bit',
    href: `/downloads/Dermaspace-${APP_VERSION}.AppImage`,
    fileSize: `${APP_SIZE_MB} MB · .AppImage`,
  },
}

// ---------------------------------------------------------------------------
// OS detection. Tries `navigator.userAgentData` first (modern, opt-in,
// no parsing required) and falls back to the legacy `navigator.platform`
// + UA sniffing for browsers that don't expose UA-CH yet (Safari).
// Returns null until the effect runs so SSR doesn't lock in a wrong
// guess on first paint.
// ---------------------------------------------------------------------------
type NavigatorUAData = {
  platform?: string
  getHighEntropyValues?: (hints: string[]) => Promise<{
    architecture?: string
    platform?: string
  }>
}

function detectOS(): OS | null {
  if (typeof navigator === 'undefined') return null

  const ua = navigator.userAgent || ''
  const platform = (navigator as { platform?: string }).platform || ''
  const uaData = (navigator as { userAgentData?: NavigatorUAData }).userAgentData

  const isMac =
    /Mac/i.test(uaData?.platform || platform) || /Macintosh/i.test(ua)
  const isWindows =
    /Windows/i.test(uaData?.platform || platform) || /Windows/i.test(ua)
  const isLinux =
    /Linux/i.test(uaData?.platform || platform) ||
    (/Linux/i.test(ua) && !/Android/i.test(ua))

  if (isWindows) return 'windows'
  // For Mac we default to Apple Silicon — that's the dominant chip on
  // every machine sold from late 2020 onward, and an Intel Mac user
  // can still pick the right build from the table below.
  if (isMac) return 'macos-apple-silicon'
  if (isLinux) return 'linux-appimage'
  return null
}

// ---------------------------------------------------------------------------
// Lightweight inline OS glyphs. Lucide doesn't ship platform marks
// (Apple, Microsoft, Linux) and the brand wants neutral, unbranded
// shapes anyway. Each glyph is sized to slot inside a 24/28/32 grid.
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

function LinuxGlyph({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12.5 2.2c-2.1.1-3.4 1.7-3.4 4.4 0 .9.2 1.7.5 2.5.4.9.5 1.5.4 2.2-.2.9-1 1.6-2.1 2.6-1.5 1.4-3.4 3.2-3.4 5.6 0 1.6 1 2.5 2.6 2.5.6 0 1.1-.1 1.5-.4.4-.3.6-.7.7-1.3.1-.5.4-.9.8-1.1.4-.3.9-.4 1.5-.3.5.1.9.4 1.2.8.3.4.5.9.6 1.4.1.5.4.8.8 1 .4.2.8.2 1.2.1.7-.2 1.1-.7 1.4-1.4.2-.6.5-.9 1-1.1.5-.2 1-.2 1.5.1.5.2.8.6 1 1.1.1.3.2.6.5.8.3.2.6.3 1 .3 1.1 0 1.7-.7 1.7-2 0-1.7-1.1-3.1-2.4-4.4-1.1-1.1-2-2-2.2-3-.1-.6 0-1.2.4-2 .4-1 .7-1.9.7-3 0-2.8-1.4-4.4-3.5-4.4Zm-1.4 4c.3-.3.7-.4 1.1-.4.4 0 .7.1 1 .4.2.2.3.5.3.8 0 .3-.1.6-.4.9-.3.3-.6.4-1 .4-.3 0-.6-.1-.9-.3-.3-.3-.4-.6-.4-1 0-.3.1-.6.3-.8Z" />
    </svg>
  )
}

function osGlyph(os: OS, className?: string) {
  if (os === 'windows') return <WindowsGlyph className={className} />
  if (os === 'linux-deb' || os === 'linux-appimage')
    return <LinuxGlyph className={className} />
  return <AppleGlyph className={className} />
}

// ---------------------------------------------------------------------------
// Page content
// ---------------------------------------------------------------------------

const FEATURES = [
  {
    icon: Bell,
    title: 'Native notifications',
    body: 'Get a system notification the second your booking is confirmed, your therapist replies, or a wallet receipt arrives — even when the browser is closed.',
  },
  {
    icon: Zap,
    title: 'Instant launch',
    body: 'No more "let me find the tab". Pin Dermaspace to your dock or taskbar and it opens in under a second to whatever screen you left it on.',
  },
  {
    icon: Wifi,
    title: 'Works offline',
    body: 'Your last bookings, wallet balance, and saved consultations stay readable without a connection. Anything you change syncs back automatically when you\'re online.',
  },
  {
    icon: Shield,
    title: 'Private by default',
    body: 'No browser extensions, no cross-site trackers, no tab snooping. The app talks only to Dermaspace, and your session lives in encrypted system storage.',
  },
  {
    icon: Sparkles,
    title: 'Polished, every detail',
    body: 'Window snapping, dark mode, reduced-motion, system fonts, native scrollbars — the app behaves the way every other app on your machine does.',
  },
  {
    icon: Cpu,
    title: 'Light on resources',
    body: 'Built on Tauri so the app footprint is around 25 MB of RAM at rest. It\'s a fraction of an Electron build and a tiny fraction of a browser tab.',
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
    a: 'Yes — the Dermaspace desktop app is free to download and use. You only pay for the treatments you book, exactly as you do on the website.',
  },
  {
    q: 'Do I need a Dermaspace account?',
    a: 'You can browse services and our journal without one, but you\'ll need to sign in to book, chat, or use your wallet. The app uses the same account you use on dermaspaceng.com.',
  },
  {
    q: 'How does it differ from the website?',
    a: 'It\'s the same Dermaspace experience, packaged as a native app. You get system notifications, instant launch, offline reads, and a window that doesn\'t fight with your browser tabs.',
  },
  {
    q: 'How do I update the app?',
    a: 'The app checks for new versions on launch and updates itself in the background — you\'ll never have to manually re-download a build unless you want to.',
  },
  {
    q: 'Which versions of macOS / Windows / Linux are supported?',
    a: 'macOS 11 (Big Sur) and newer on both Apple Silicon and Intel chips. Windows 10 and 11. On Linux, any recent 64-bit distro that supports .deb (Ubuntu, Debian, Pop!_OS) or AppImage (everything else).',
  },
] as const

export default function DesktopContent() {
  const [detectedOS, setDetectedOS] = React.useState<OS | null>(null)
  const [showAllPlatforms, setShowAllPlatforms] = React.useState(false)

  React.useEffect(() => {
    setDetectedOS(detectOS())
  }, [])

  const primaryBuild = detectedOS ? BUILDS[detectedOS] : BUILDS.windows
  const allBuilds = Object.values(BUILDS)

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white text-gray-900">
        {/* ============================================================
            HERO
            Tight purple wash on top, large product shot, primary CTA.
        ============================================================ */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[#FBF6FE] to-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-12 lg:pt-20 lg:pb-16">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
              {/* Copy */}
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] text-xs font-semibold uppercase tracking-wider px-3 py-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  New · Native Apps
                </div>
                <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-[1.1] tracking-tight text-balance">
                  Dermaspace, on your desktop.
                </h1>
                <p className="mt-4 text-base sm:text-lg text-gray-600 leading-relaxed text-pretty">
                  A lightweight, native app for Windows, macOS, and Linux. Book
                  appointments, chat with your therapist, and pick up
                  notifications — without a single browser tab.
                </p>

                {/* Primary CTA — auto-targets the visitor's OS. */}
                <div className="mt-7 flex flex-col sm:flex-row gap-3">
                  <a
                    href={primaryBuild.href}
                    className="inline-flex items-center justify-center gap-2 px-6 h-12 rounded-full bg-[#7B2D8E] text-white text-sm font-semibold hover:bg-[#6B2278] transition-colors active:scale-[0.98] shadow-sm"
                  >
                    {osGlyph(primaryBuild.os, 'w-4 h-4')}
                    {detectedOS
                      ? `Download for ${primaryBuild.label}`
                      : 'Download for Windows'}
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAllPlatforms(true)
                      // Smooth-scroll to the platform table so visitors
                      // on an unrecognized OS see exactly what they need.
                      const el = document.getElementById('all-platforms')
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }}
                    className="inline-flex items-center justify-center gap-2 px-6 h-12 rounded-full border border-gray-200 text-gray-800 text-sm font-semibold hover:border-[#7B2D8E] hover:text-[#7B2D8E] transition-colors active:scale-[0.98]"
                  >
                    All platforms
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Build meta line */}
                <p className="mt-4 text-xs text-gray-500">
                  Version {APP_VERSION} · {RELEASED_ON} ·{' '}
                  <Link
                    href="/privacy"
                    className="underline underline-offset-2 hover:text-[#7B2D8E]"
                  >
                    Privacy
                  </Link>{' '}
                  ·{' '}
                  <Link
                    href="/terms"
                    className="underline underline-offset-2 hover:text-[#7B2D8E]"
                  >
                    Terms
                  </Link>
                </p>

                {/* Quick action chips — sets expectations for what the
                    app actually does in the first scroll. */}
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
                {/* OS pill */}
                <div className="absolute -bottom-3 left-4 sm:left-6 inline-flex items-center gap-2 rounded-full bg-white border border-gray-200 px-3.5 h-9 shadow-sm">
                  <AppleGlyph className="w-4 h-4 text-gray-900" />
                  <WindowsGlyph className="w-4 h-4 text-gray-900" />
                  <LinuxGlyph className="w-4 h-4 text-gray-900" />
                  <span className="text-[11px] font-semibold text-gray-700">
                    Windows · macOS · Linux
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            FEATURE GRID
        ============================================================ */}
        <section className="bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7B2D8E]">
                Why a native app
              </p>
              <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight text-balance">
                Everything Dermaspace, in its own window.
              </h2>
              <p className="mt-3 text-base text-gray-600 leading-relaxed">
                The web app stays the way you know it. The desktop app gives
                you the same surface plus the things only a native app can do.
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
            ALL PLATFORMS
        ============================================================ */}
        <section
          id="all-platforms"
          className="bg-[#FBF6FE]/60 border-y border-[#7B2D8E]/10"
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
            <div className="text-center max-w-xl mx-auto">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7B2D8E]">
                Downloads
              </p>
              <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight text-balance">
                Pick your platform
              </h2>
              <p className="mt-3 text-sm sm:text-base text-gray-600 leading-relaxed">
                Same Dermaspace, packaged for your operating system. The
                installer is signed and the app verifies its own update
                signatures on every launch.
              </p>
            </div>

            <ul
              className={`mt-8 grid gap-3 ${
                showAllPlatforms ? 'opacity-100' : 'opacity-100'
              }`}
            >
              {allBuilds.map((b) => {
                const isPrimary = b.os === detectedOS
                return (
                  <li key={b.os}>
                    <a
                      href={b.href}
                      className={`group flex items-center gap-4 rounded-2xl bg-white border p-4 sm:p-5 transition-all ${
                        isPrimary
                          ? 'border-[#7B2D8E] shadow-sm'
                          : 'border-gray-200 hover:border-[#7B2D8E]/40 hover:shadow-sm'
                      }`}
                    >
                      <span
                        className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isPrimary
                            ? 'bg-[#7B2D8E] text-white'
                            : 'bg-gray-100 text-gray-900 group-hover:bg-[#7B2D8E]/10 group-hover:text-[#7B2D8E]'
                        }`}
                      >
                        {osGlyph(b.os, 'w-5 h-5')}
                      </span>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm sm:text-base font-semibold text-gray-900">
                            {b.label}
                          </p>
                          {isPrimary && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#7B2D8E] bg-[#7B2D8E]/10 rounded-full px-2 py-0.5">
                              <Check className="w-3 h-3" strokeWidth={3} />
                              Best for you
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-[13px] text-gray-500 mt-0.5">
                          {b.subLabel}
                        </p>
                      </div>

                      <div className="hidden sm:flex flex-col items-end text-right">
                        <span className="text-[11px] font-medium text-gray-400">
                          {b.fileSize}
                        </span>
                      </div>

                      <span
                        className={`flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
                          isPrimary
                            ? 'bg-[#7B2D8E] text-white'
                            : 'bg-gray-100 text-gray-700 group-hover:bg-[#7B2D8E] group-hover:text-white'
                        }`}
                        aria-hidden
                      >
                        <Download className="w-4 h-4" strokeWidth={2.25} />
                      </span>
                    </a>
                  </li>
                )
              })}
            </ul>

            <p className="mt-6 text-center text-xs text-gray-500">
              Installers are checksummed. Need an older release or want to{' '}
              <Link
                href="/contact"
                className="underline underline-offset-2 hover:text-[#7B2D8E]"
              >
                talk to support
              </Link>
              ? We&apos;re here.
            </p>
          </div>
        </section>

        {/* ============================================================
            REQUIREMENTS
        ============================================================ */}
        <section className="bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
            <div className="grid sm:grid-cols-3 gap-5 sm:gap-4">
              <div className="rounded-2xl border border-gray-100 p-5">
                <Cpu className="w-5 h-5 text-[#7B2D8E] mb-3" />
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Processor
                </p>
                <p className="mt-1 text-sm text-gray-900 font-medium">
                  64-bit · Intel, AMD, or Apple Silicon
                </p>
              </div>
              <div className="rounded-2xl border border-gray-100 p-5">
                <HardDrive className="w-5 h-5 text-[#7B2D8E] mb-3" />
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Disk
                </p>
                <p className="mt-1 text-sm text-gray-900 font-medium">
                  ~150 MB free space after install
                </p>
              </div>
              <div className="rounded-2xl border border-gray-100 p-5">
                <Wifi className="w-5 h-5 text-[#7B2D8E] mb-3" />
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Network
                </p>
                <p className="mt-1 text-sm text-gray-900 font-medium">
                  Online for booking & chat. Reads work offline.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            FAQ
        ============================================================ */}
        <section className="bg-[#FBF6FE]/40 border-t border-[#7B2D8E]/10">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7B2D8E]">
                Questions
              </p>
              <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                Frequently asked
              </h2>
            </div>

            <div className="mt-10 divide-y divide-[#7B2D8E]/10 rounded-2xl bg-white border border-[#7B2D8E]/10">
              {FAQ.map((item) => (
                <details
                  key={item.q}
                  className="group p-5 sm:p-6 [&_summary::-webkit-details-marker]:hidden"
                >
                  <summary className="flex items-start justify-between gap-4 cursor-pointer list-none">
                    <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                      {item.q}
                    </h3>
                    <span
                      className="flex-shrink-0 mt-0.5 w-7 h-7 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center transition-transform group-open:rotate-45"
                      aria-hidden
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        className="w-3.5 h-3.5"
                      >
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </span>
                  </summary>
                  <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>

            <p className="mt-8 text-center text-sm text-gray-600">
              Still on the fence?{' '}
              <Link
                href="/contact"
                className="text-[#7B2D8E] font-semibold hover:underline"
              >
                Talk to our team
              </Link>
              .
            </p>
          </div>
        </section>

        {/* ============================================================
            FINAL CTA
        ============================================================ */}
        <section className="bg-[#5A1D6A] text-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20 text-center">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-balance">
              Get the Dermaspace desktop app
            </h2>
            <p className="mt-3 text-sm sm:text-base text-white/75 max-w-xl mx-auto leading-relaxed">
              Free, native, and faster than the browser. Install in under a
              minute and the app updates itself from there.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href={primaryBuild.href}
                className="inline-flex items-center justify-center gap-2 px-6 h-12 rounded-full bg-white text-[#5A1D6A] text-sm font-semibold hover:bg-white/90 transition-colors active:scale-[0.98]"
              >
                {osGlyph(primaryBuild.os, 'w-4 h-4')}
                {detectedOS
                  ? `Download for ${primaryBuild.label}`
                  : 'Download for Windows'}
              </a>
              <Link
                href="#all-platforms"
                className="inline-flex items-center justify-center gap-2 px-6 h-12 rounded-full border border-white/30 text-white text-sm font-semibold hover:bg-white/10 transition-colors"
              >
                See every platform
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
