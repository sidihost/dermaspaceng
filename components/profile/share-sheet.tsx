'use client'

/**
 * ShareSheet
 *
 * Bottom-sheet / centered-dialog share surface for public profiles.
 * It offers:
 *   - A rich profile preview card (avatar + name + handle + bio +
 *     brand mark) so the user can see exactly what the link
 *     represents before firing off a share.
 *   - Direct-to-platform deeplinks for the channels Dermaspace users
 *     actually reach for — WhatsApp, X, Facebook, Telegram, and
 *     email — each opening in a new tab with pre-filled text.
 *   - A "Copy link" tile with instant confirmation.
 *   - A native "More options" button on devices that support
 *     `navigator.share` (iOS/Android), so users keep access to
 *     iMessage, Signal, Notes, AirDrop, etc.
 *
 * The goal is a single, consistent surface across mobile and
 * desktop instead of guessing whether `navigator.share` exists.
 */

import * as React from 'react'
import {
  X,
  Link2,
  Check,
  Mail,
  Facebook,
  Send,
  Share2,
} from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
  /** Fully-qualified URL being shared. */
  url: string
  /** Short text used as the share copy — e.g. `Check out Sarah on
   *  Dermaspace`. We append the URL ourselves where needed. */
  shareText: string
  /** Profile preview. */
  profile: {
    firstName: string
    lastName: string
    username: string | null
    avatarUrl?: string | null
    bio?: string | null
  }
}

const BRAND = '#7B2D8E'

// Inline X wordmark so we don't pull in the outdated Twitter bird
// that ships with lucide-react.
function XGlyph({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.53 3h3.07l-6.71 7.66L22 21h-6.18l-4.85-6.33L5.42 21H2.34l7.17-8.2L2 3h6.34l4.38 5.79L17.53 3Zm-1.08 16.2h1.7L7.62 4.7H5.79l10.66 14.5Z" />
    </svg>
  )
}

// WhatsApp glyph — lucide doesn't ship one and WhatsApp is the
// single most important share target for this audience.
function WhatsAppGlyph({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M20.52 3.48A11.9 11.9 0 0 0 12.04 0C5.47 0 .14 5.33.14 11.9c0 2.1.55 4.14 1.6 5.95L0 24l6.33-1.66a11.86 11.86 0 0 0 5.71 1.45h.01c6.56 0 11.9-5.33 11.9-11.9a11.82 11.82 0 0 0-3.43-8.41ZM12.05 21.8h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.76.98 1-3.67-.23-.38a9.88 9.88 0 0 1-1.52-5.24c0-5.46 4.44-9.9 9.91-9.9 2.65 0 5.14 1.03 7.01 2.9a9.85 9.85 0 0 1 2.9 7.01c0 5.46-4.44 9.9-9.91 9.9Zm5.44-7.41c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15s-.77.97-.95 1.17c-.17.2-.35.22-.65.08-.3-.15-1.26-.47-2.4-1.49a9 9 0 0 1-1.66-2.07c-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.08-.15-.67-1.62-.92-2.21-.24-.58-.49-.5-.67-.51l-.57-.01a1.1 1.1 0 0 0-.8.37c-.27.3-1.04 1.01-1.04 2.47s1.07 2.87 1.22 3.07c.15.2 2.1 3.21 5.09 4.5.71.31 1.27.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.77-.72 2.02-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35Z" />
    </svg>
  )
}

export function ShareSheet({ open, onClose, url, shareText, profile }: Props) {
  const [copied, setCopied] = React.useState(false)
  const [canUseNative, setCanUseNative] = React.useState(false)

  // Lock body scroll, Esc-to-close, detect native share support.
  React.useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    setCanUseNative(
      typeof navigator !== 'undefined' &&
        'share' in navigator &&
        typeof navigator.share === 'function',
    )
    setCopied(false)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  const initials = `${profile.firstName?.charAt(0) || ''}${
    profile.lastName?.charAt(0) || ''
  }`.toUpperCase()

  const encodedUrl = encodeURIComponent(url)
  const encodedText = encodeURIComponent(shareText)
  const encodedTextAndUrl = encodeURIComponent(`${shareText}\n${url}`)

  // All deep-links are documented public endpoints — none of them
  // require an SDK or API key.
  const targets: {
    key: string
    label: string
    href: string
    color: string
    icon: React.ReactNode
  }[] = [
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      href: `https://wa.me/?text=${encodedTextAndUrl}`,
      color: '#25D366',
      icon: <WhatsAppGlyph className="w-5 h-5" />,
    },
    {
      key: 'x',
      label: 'X',
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      color: '#000000',
      icon: <XGlyph className="w-5 h-5" />,
    },
    {
      key: 'facebook',
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: '#1877F2',
      icon: <Facebook className="w-5 h-5" />,
    },
    {
      key: 'telegram',
      label: 'Telegram',
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      color: '#229ED9',
      icon: <Send className="w-5 h-5" />,
    },
    {
      key: 'email',
      label: 'Email',
      href: `mailto:?subject=${encodedText}&body=${encodedTextAndUrl}`,
      color: '#6B7280',
      icon: <Mail className="w-5 h-5" />,
    },
  ]

  const handleCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url)
      } else {
        // Legacy fallback — create a temp textarea, select, execCommand.
        const ta = document.createElement('textarea')
        ta.value = url
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore — user can still tap a platform tile */
    }
  }

  const handleNative = async () => {
    if (!canUseNative) return
    try {
      await navigator.share({ title: shareText, text: shareText, url })
    } catch {
      /* user dismissed the share sheet */
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Share profile"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl flex flex-col"
        style={{ maxHeight: '90dvh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grabber (mobile) */}
        <div className="sm:hidden flex justify-center pt-2 pb-1" aria-hidden="true">
          <span className="w-10 h-1.5 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <header className="flex items-center justify-between px-5 sm:px-6 h-14 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">
            Share profile
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 -mr-1.5 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Close share sheet"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5">
          {/* Preview card — mirrors the profile card aesthetic so the
              user can confirm the shared identity at a glance. */}
          <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-[#F7F1F9] to-white p-4 flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 ring-2 ring-white"
              style={{ backgroundColor: BRAND }}
            >
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatarUrl}
                  alt=""
                  aria-hidden="true"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-base font-bold">
                  {initials}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {profile.firstName} {profile.lastName}
              </p>
              {profile.username && (
                <p className="text-xs font-medium text-[#7B2D8E] truncate">
                  @{profile.username}
                </p>
              )}
              <p className="mt-0.5 text-[11px] text-gray-500 truncate">
                {profile.bio ? profile.bio : 'On Dermaspace'}
              </p>
            </div>
          </div>

          {/* Copy link — primary action, full width. The URL is shown
              in a monospace pill so the user can double-check it
              before committing to a copy/share. */}
          <div>
            <div className="flex items-stretch gap-2">
              <div
                className="flex-1 min-w-0 px-3 flex items-center rounded-xl border border-gray-200 bg-gray-50"
                title={url}
              >
                <Link2 className="w-4 h-4 text-gray-400 flex-shrink-0 mr-2" />
                <span className="text-xs text-gray-700 truncate font-mono">
                  {url.replace(/^https?:\/\//, '')}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 px-4 h-11 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${
                  copied
                    ? 'bg-[#7B2D8E]/10 text-[#7B2D8E] border border-[#7B2D8E]/30'
                    : 'bg-[#7B2D8E] text-white hover:bg-[#6B2278]'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Platform grid */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
              Share to
            </p>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              {targets.map((t) => (
                <a
                  key={t.key}
                  href={t.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col items-center gap-1.5 text-center focus:outline-none"
                >
                  <span
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white transition-transform group-hover:scale-[1.04] group-active:scale-[0.96] shadow-sm"
                    style={{ backgroundColor: t.color }}
                  >
                    {t.icon}
                  </span>
                  <span className="text-[11px] font-medium text-gray-700 group-hover:text-gray-900">
                    {t.label}
                  </span>
                </a>
              ))}

              {/* Native share — only shown when the browser actually
                  implements it. Lets the user reach iMessage, Signal,
                  AirDrop, etc. without us having to implement each. */}
              {canUseNative && (
                <button
                  type="button"
                  onClick={handleNative}
                  className="group flex flex-col items-center gap-1.5 text-center focus:outline-none"
                >
                  <span
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-gray-700 bg-gray-100 group-hover:bg-gray-200 transition-all group-hover:scale-[1.04] group-active:scale-[0.96]"
                  >
                    <Share2 className="w-5 h-5" />
                  </span>
                  <span className="text-[11px] font-medium text-gray-700 group-hover:text-gray-900">
                    More
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Safe-area padding on iOS */}
        <div
          className="flex-shrink-0"
          style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
        />
      </div>
    </div>
  )
}
