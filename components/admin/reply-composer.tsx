'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Send,
  Loader2,
  // Sparkles glyph fully removed from the composer header. The team
  // is dropping every star / sparkle / wand-with-sparkles icon in
  // the dashboard — Wand2 (a plain wand, already imported below)
  // takes its place and keeps the "AI rewrite" semantic without the
  // decorative bling.
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

// Each admin now signs replies as themselves — Itunu and Franca have
// their own admin accounts, and the super admin is the developer at
// Sidihost (not a customer-facing persona). The previous "Reply as
// Itunu / Franca" presets are therefore gone; an admin who genuinely
// needs to send under a different display name can still type one
// into the "Custom name" input below.

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

  // The visible options in the sender popover — just the admin's own
  // name. The customer-facing personas were removed (each admin now
  // has a real account), and a "Custom name" input below the preset
  // covers the rare case where a different display name is needed.
  const senderOptions = [defaultSenderName]

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

      {/* Unified composer surface
          ----------------------------------------------------------
          Per the latest feedback, the AI improve tools used to live
          in a separate purple card BELOW the textarea — visually two
          surfaces stacked on top of each other, with the textarea
          looking lonely above a big "AI panel". The admin asked for
          the rewrite controls to be INSIDE the reply box.
          
          The composer is now a single bordered shell:
            • The textarea sits at the top with no border of its own.
            • A hairline divider separates it from a compact AI toolbar
              underneath, which holds the wand icon, an "AI" chip and
              the rewrite chips on one continuous row (wrapping on
              narrow screens).
          
          The result reads as one input — the AI tools feel like part
          of the box you're typing in, not a separate widget. */}
      <div className="rounded-xl border border-gray-200 bg-white focus-within:border-[#7B2D8E] focus-within:ring-1 focus-within:ring-[#7B2D8E]/20 transition-all overflow-hidden">
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
          className="block w-full px-4 py-3 text-sm bg-transparent border-0 outline-none focus:ring-0 resize-none"
        />

        {/* Inline AI toolbar — wand + label + rewrite chips on one
            row. The whole strip lives inside the same bordered shell
            as the textarea so it reads as a single composer, not a
            second card. Compact icon tile, no gradient backdrop, no
            big intro paragraph — the chips themselves explain what
            each action does via their tooltips. */}
        <div className="border-t border-gray-100 bg-[#7B2D8E]/[0.025] px-3 py-2.5">
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1.5 pr-1.5 mr-0.5 border-r border-gray-200">
              <span className="grid place-items-center w-6 h-6 rounded-md bg-gradient-to-br from-[#9A4DAF] to-[#5A1D6A] flex-shrink-0">
                {/* Wand2 keeps the "AI rewrite" semantic without the
                    sparkle/star bling the team is dropping. */}
                <Wand2 className="w-3.5 h-3.5 text-white" strokeWidth={2.2} />
              </span>
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#7B2D8E] hidden sm:inline">
                Derma&nbsp;AI
              </span>
            </span>

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
                  className={`group/chip inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11.5px] font-medium transition-colors disabled:cursor-not-allowed ${
                    busy
                      ? 'bg-[#7B2D8E] text-white'
                      : 'text-gray-700 hover:bg-[#7B2D8E]/10 hover:text-[#7B2D8E] disabled:opacity-40'
                  }`}
                >
                  {busy ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <ActiveIcon className="w-3 h-3 flex-shrink-0" />
                  )}
                  <span className="truncate">{action.label}</span>
                </button>
              )
            })}
          </div>

          {aiError && (
            <p className="mt-2 text-[11px] text-rose-600">{aiError}</p>
          )}
        </div>
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
