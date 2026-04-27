'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Send,
  Loader2,
  // WandSparkles replaces the previous Sparkles tile icon. Sparkles
  // (3 stars) was reading as a "decorative bling" element — the
  // wand-with-stars glyph signals "AI rewrite tool" much more
  // directly, matching how Linear Magic / Notion AI / Vercel v0
  // present the same affordance.
  WandSparkles,
  ChevronDown,
  Check,
  Wand2,
  Scissors,
  Heart,
  AlertCircle,
  Briefcase,
  Plus,
  ArrowDown,
} from 'lucide-react'
import { useNotify } from '@/components/shared/notify'

/**
 * Shared admin reply composer.
 *
 * Built so the complaint detail, consultation detail, gift-card detail
 * and ticket detail pages all use the same input — keeping the AI
 * "improve text" controls and the "send as" sender picker
 * consistent across every surface where staff replies to a customer.
 *
 * Props are intentionally minimal:
 *   • value / onChange       → controlled textarea content
 *   • isInternal / onIsInternalChange → checkbox for internal notes
 *   • senderName / onSenderNameChange → display name selector
 *   • sending                → disables Send while POST is in flight
 *   • onSend                 → fires when admin hits Send
 *   • aiContext (optional)   → one-line note passed to the AI improver
 *                              for better rewrites ("Replying about a
 *                              gift card refund").
 *   • allowSenderPicker (default true) → hide the sender row on
 *                              surfaces (e.g. internal-only notes)
 *                              where it doesn't apply.
 */

type Mode = 'polish' | 'shorten' | 'expand' | 'friendly' | 'formal' | 'apologise' | 'plain'

type AiAction = {
  id: Mode
  label: string
  icon: React.ComponentType<{ className?: string }>
  hint: string
}

const AI_ACTIONS: AiAction[] = [
  { id: 'polish', label: 'Polish', icon: Wand2, hint: 'Fix grammar, keep meaning' },
  { id: 'shorten', label: 'Shorten', icon: Scissors, hint: 'Cut to 2–3 sentences' },
  { id: 'expand', label: 'Expand', icon: Plus, hint: 'Warmer, slightly longer' },
  { id: 'friendly', label: 'Friendlier', icon: Heart, hint: 'Warmer & casual' },
  { id: 'formal', label: 'More formal', icon: Briefcase, hint: 'Polite & professional' },
  { id: 'apologise', label: 'Apologise', icon: AlertCircle, hint: 'Lead with sincere apology' },
  { id: 'plain', label: 'Plain English', icon: ArrowDown, hint: 'Strip jargon' },
]

// Names admins can sign as. The first option is the staff's own name —
// the rest are the salon's customer-facing personas.
const PRESET_SENDERS = ['Admin', 'Franca', 'Itunu'] as const

export interface ReplyComposerProps {
  value: string
  onChange: (next: string) => void
  isInternal: boolean
  onIsInternalChange: (next: boolean) => void
  senderName: string
  onSenderNameChange: (next: string) => void
  /** Default presented in the sender picker (usually the admin's own name). */
  defaultSenderName: string
  sending: boolean
  /**
   * Fired when admin clicks Send. May be sync (legacy) or async — the
   * composer awaits the returned promise so it can show a success
   * toast on resolve and an error toast on reject. Existing parents
   * that return `void` are still supported (the awaited value is
   * `undefined` and the success toast fires once their handler
   * finishes).
   */
  onSend: () => void | Promise<void>
  aiContext?: string
  allowSenderPicker?: boolean
  placeholder?: string
}

export default function ReplyComposer({
  value,
  onChange,
  isInternal,
  onIsInternalChange,
  senderName,
  onSenderNameChange,
  defaultSenderName,
  sending,
  onSend,
  aiContext,
  allowSenderPicker = true,
  placeholder,
}: ReplyComposerProps) {
  const [aiBusy, setAiBusy] = useState<Mode | null>(null)
  const [aiError, setAiError] = useState('')
  const [senderOpen, setSenderOpen] = useState(false)
  const senderRef = useRef<HTMLDivElement | null>(null)

  // Branded toasts on send. Wraps the parent-supplied `onSend` so
  // every page that uses this composer (complaints, consultations,
  // gift-card requests, support tickets, the staff console reply
  // surface) gets a consistent confirmation when a reply is delivered
  // — and a clear error message when the API call fails. Previously
  // admins would click Send and see the textarea clear with no
  // visible feedback, which is what the user reported as "the
  // notification not working or showing".
  const notify = useNotify()

  // Close the sender popover on outside click or Escape so it behaves
  // like a real dropdown rather than a panel that has to be toggled
  // manually.
  useEffect(() => {
    if (!senderOpen) return
    function handleClick(e: MouseEvent) {
      if (!senderRef.current) return
      if (!senderRef.current.contains(e.target as Node)) setSenderOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSenderOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [senderOpen])

  const handleSend = async () => {
    if (sending || !value.trim()) return
    // We deliberately don't show a "Sending…" loading toast — the
    // button itself already swaps to a spinner + "Sending" label, so
    // a top-of-screen toast on top of that would just feel noisy.
    // Only the success or error states get a toast.
    try {
      await Promise.resolve(onSend())
      notify.success(
        isInternal ? 'Note saved' : 'Reply sent',
        isInternal
          ? 'Your internal note is visible to staff only.'
          : 'The customer has been notified by email and in-app.',
      )
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
            ? err
            : 'Could not deliver the reply.'
      notify.error(
        isInternal ? 'Could not save note' : 'Could not send reply',
        msg.length > 160 ? msg.slice(0, 160) + '…' : msg,
      )
    }
  }

  const handleImprove = async (mode: Mode) => {
    if (!value.trim() || aiBusy) return
    setAiBusy(mode)
    setAiError('')
    try {
      const res = await fetch('/api/admin/ai-improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: value, mode, context: aiContext }),
      })
      const body = (await res.json().catch(() => ({}))) as {
        improved?: string
        error?: string
      }
      if (!res.ok || !body.improved) {
        throw new Error(body.error || 'AI is unavailable')
      }
      onChange(body.improved)
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Could not improve text')
    } finally {
      setAiBusy(null)
    }
  }

  // The visible options in the sender popover — the admin's real name
  // first, then the curated personas, deduplicated.
  const senderOptions = [
    defaultSenderName,
    ...PRESET_SENDERS.filter((p) => p !== defaultSenderName),
  ]

  return (
    <div className="space-y-3">
      {/* Header row: internal-note toggle + sender picker */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
          <Send className="w-3.5 h-3.5" />
          {isInternal ? 'Add internal note' : 'Reply to customer'}
        </h3>

        <div className="flex items-center gap-3">
          {!isInternal && allowSenderPicker && (
            <div className="relative" ref={senderRef}>
              <button
                type="button"
                onClick={() => setSenderOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-gray-200 bg-white text-xs text-gray-700 hover:border-[#7B2D8E]/30 hover:text-[#7B2D8E] transition-colors"
              >
                <span className="text-gray-400">Send as</span>
                <span className="font-semibold text-gray-900 truncate max-w-[140px]">
                  {senderName || defaultSenderName}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${senderOpen ? 'rotate-180' : ''}`} />
              </button>
              {senderOpen && (
                // Anchored to the LEFT of the trigger on mobile and
                // to the right on sm+. The previous version pinned
                // the popover to `right-0` only — when the header
                // flex row wrapped on a phone the trigger sat near
                // the left edge of the screen and the popover then
                // extended off-screen to the LEFT (this was the
                // "DISPLAY NAME / SIDIHOST DEV" dropdown the user
                // saw clipped). Now the popover opens rightward from
                // the trigger on small screens, then re-aligns to
                // the right edge once the row no longer wraps.
                // `max-w-[calc(100vw-2rem)]` keeps it inside the
                // viewport even if the trigger is wide.
                <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1.5 w-56 max-w-[calc(100vw-2rem)] rounded-lg border border-gray-200 bg-white shadow-lg z-20 overflow-hidden">
                  <div className="px-3 pt-2.5 pb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Display name
                  </div>
                  {senderOptions.map((opt) => {
                    const isActive = (senderName || defaultSenderName) === opt
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          onSenderNameChange(opt)
                          setSenderOpen(false)
                        }}
                        className={`flex items-center justify-between w-full px-3 py-2 text-sm transition-colors ${
                          isActive ? 'bg-[#7B2D8E]/5 text-[#7B2D8E]' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span className="truncate">{opt}</span>
                        {isActive && <Check className="w-4 h-4 flex-shrink-0" />}
                      </button>
                    )
                  })}
                  <div className="border-t border-gray-100 px-3 py-2.5 bg-gray-50">
                    <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                      Custom name
                    </label>
                    <input
                      type="text"
                      value={
                        senderOptions.includes(senderName) ? '' : senderName
                      }
                      placeholder="e.g. Tobi"
                      onChange={(e) => onSenderNameChange(e.target.value)}
                      maxLength={40}
                      className="w-full h-8 px-2 text-sm rounded-md border border-gray-200 bg-white focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none"
                    />
                    <p className="mt-1 text-[10px] text-gray-400">
                      The customer sees this name on the reply.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => onIsInternalChange(e.target.checked)}
              className="rounded border-gray-300 text-[#7B2D8E] focus:ring-[#7B2D8E]/30"
            />
            Internal note
          </label>
        </div>
      </div>

      {/* Textarea */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          placeholder ||
          (isInternal
            ? 'Add an internal note — not visible to the customer…'
            : 'Type your reply here…')
        }
        rows={5}
        className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none transition-all resize-none"
      />

      {/* AI improve action row — premium card.
          ----------------------------------------
          Was a flat lavender panel with 7 generic white pill chips
          stacked underneath. Felt like a "settings block", not a
          delightful AI tool. New layout (inspired by Linear Magic /
          Notion AI / Vercel v0 cmd-K):

            • Surface gets a soft purple-to-white wash (still single
              hue, just opacity-stepped) with a hairline border so the
              card reads as a quietly elevated AI affordance.
            • The Sparkles tile gets a brand-purple gradient ring +
              white star to feel like a "magic" affordance, not a
              static icon.
            • A small "AI" eyebrow chip lives next to the title so
              admins instantly recognise this as an AI surface.
            • Action chips are now rendered as a 2-column grid on
              phones / 3-column on tablets / inline-flex on desktop,
              so the "Polish, Shorten, Expand…" set always lays out
              tidily instead of wrapping awkwardly. Each chip uses
              an icon-tile + label pattern, with the icon tile
              shifting to brand-purple-on-white on hover. Active
              (in-flight) chips get a tinted background so admins
              can see exactly which rewrite is running.
            • A concise helper line under the action grid reminds
              admins they can always undo by retyping — small detail
              that makes the surface feel finished. */}
      {/* Improve with Derma AI — fourth pass.
          --------------------------------------
          Removed the corner blur and all drop-shadows per the user's
          "no shadow" note. The AI tile keeps its brand gradient
          (no shadow) and the chips lose their hover-lift shadow so
          the surface reads as a flat-but-dimensional card.
          The Sparkles icon was replaced by WandSparkles (a wand glyph
          with a tiny sparkle) which reads as "AI rewrite", not as
          decorative bling.
          The "AI" eyebrow chip was previously dull purple-grey at
          12% opacity — it now uses the same brand gradient as the
          tile, so it pops and visually ties into the wand. */}
      <div className="relative rounded-2xl border border-[#7B2D8E]/15 bg-gradient-to-br from-[#7B2D8E]/[0.06] via-[#7B2D8E]/[0.03] to-transparent p-3.5 overflow-hidden">
        <div className="relative flex items-start gap-2.5 mb-3">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-[#9A4DAF] to-[#5A1D6A] flex items-center justify-center flex-shrink-0">
            <WandSparkles className="w-[18px] h-[18px] text-white" strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-[13.5px] font-bold text-gray-900 leading-none tracking-tight">
                Improve with Derma&nbsp;AI
              </p>
              {/* Vibrant brand-gradient AI chip — matches the tile so
                  the two read as a single AI affordance. */}
              <span className="inline-flex items-center text-[9.5px] font-bold uppercase tracking-[0.08em] text-white bg-gradient-to-r from-[#9A4DAF] to-[#5A1D6A] rounded px-1.5 py-0.5 leading-none">
                AI
              </span>
            </div>
            <p className="text-[11.5px] text-gray-600 mt-1 leading-snug">
              Polish, shorten or change the tone of your draft in one tap.
            </p>
          </div>
        </div>

        {/* Action grid — 2 / 3 / inline-flex.
            Mobile gets 2 columns so each chip is a comfortable touch
            target; tablets get 3; ≥ md goes back to inline so wide
            desktop layouts don't have huge stretched chips. Hover
            shadow + translate removed per the "no shadow" rule. */}
        <div className="relative grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap gap-1.5">
          {AI_ACTIONS.map((action) => {
            const ActiveIcon = action.icon
            const busy = aiBusy === action.id
            const disabled = !value.trim() || aiBusy !== null
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => handleImprove(action.id)}
                disabled={disabled}
                title={action.hint}
                className={`group/chip inline-flex items-center justify-center gap-2 px-2.5 py-2 rounded-lg border bg-white text-[12.5px] font-semibold transition-colors disabled:cursor-not-allowed ${
                  busy
                    ? 'border-[#7B2D8E] text-[#7B2D8E] bg-[#7B2D8E]/5'
                    : 'border-[#7B2D8E]/15 text-gray-700 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E] hover:bg-[#7B2D8E]/[0.03] disabled:opacity-40'
                }`}
              >
                <span
                  className={`grid place-items-center w-5 h-5 rounded-md transition-colors flex-shrink-0 ${
                    busy
                      ? 'bg-[#7B2D8E] text-white'
                      : 'bg-[#7B2D8E]/8 text-[#7B2D8E] group-hover/chip:bg-[#7B2D8E] group-hover/chip:text-white'
                  }`}
                >
                  {busy ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <ActiveIcon className="w-3 h-3" />
                  )}
                </span>
                <span className="truncate">{action.label}</span>
              </button>
            )
          })}
        </div>

        {!aiError && (
          <p className="relative mt-2.5 text-[10.5px] text-gray-500 leading-snug">
            Tip: the rewrite replaces your draft. Hit{' '}
            <kbd className="font-mono text-[10px] bg-white border border-gray-200 rounded px-1 py-0.5">
              ⌘Z
            </kbd>{' '}
            to undo.
          </p>
        )}
        {aiError && (
          <p className="relative mt-2 text-[11px] text-rose-600">{aiError}</p>
        )}
      </div>

      {/* Send row */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-gray-400 hidden sm:block">
          {isInternal
            ? 'Only staff with admin access will see this note.'
            : 'The customer will receive this reply by email.'}
        </p>
        <button
          onClick={handleSend}
          disabled={sending || !value.trim()}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7B2D8E] text-white text-sm font-medium rounded-lg hover:bg-[#5A1D6A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ml-auto"
        >
          {sending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              {isInternal ? 'Add note' : 'Send reply'}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
