'use client'

// ---------------------------------------------------------------------------
// components/blog/copy-link-button.tsx
//
// Tiny client-only button that copies a URL to the clipboard and flashes
// a "Copied" label for ~1.6s before reverting. Lives in its own file
// because the parent (`app/blog/[slug]/page.tsx`) is a server component
// and can't host event handlers directly.
//
// Behaviour
// ---------
// * Uses `navigator.clipboard.writeText` when available — the modern
//   path for every supported browser.
// * Silently no-ops on failure (e.g. an iframe with no clipboard
//   permission) — the user can still long-press to copy from the
//   underlying anchor when the browser exposes one.
// ---------------------------------------------------------------------------

import { useState } from 'react'
import { Link as LinkIcon, Check } from 'lucide-react'

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      // 1.6s is long enough to register, short enough that a user
      // who taps twice in quick succession sees the second confirmation.
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard refused (insecure context, embedded iframe, etc).
      // We deliberately don't surface an error toast — the share row
      // still has WhatsApp / Twitter / Facebook fallbacks and a
      // failure here is not worth interrupting the read for.
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={copied ? 'Link copied to clipboard' : 'Copy link to clipboard'}
      className={`inline-flex items-center gap-2 h-9 px-3.5 rounded-full bg-white border text-[12.5px] font-semibold transition-colors ${
        copied
          ? 'border-[#7B2D8E] text-[#7B2D8E]'
          : 'border-gray-200 text-gray-700 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E]'
      }`}
    >
      {copied ? (
        <Check className="w-3.5 h-3.5" aria-hidden />
      ) : (
        <LinkIcon className="w-3.5 h-3.5" aria-hidden />
      )}
      {copied ? 'Copied' : 'Copy link'}
    </button>
  )
}
