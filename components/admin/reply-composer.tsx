'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Send,
  Loader2,
  Sparkles,
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
  onSend: () => void
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
                <div className="absolute right-0 top-full mt-1.5 w-56 rounded-lg border border-gray-200 bg-white shadow-lg z-20 overflow-hidden">
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

      {/* AI improve action row — collapses gracefully on small screens */}
      <div className="rounded-xl border border-[#7B2D8E]/15 bg-[#7B2D8E]/5 p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-md bg-[#7B2D8E] text-white flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-gray-900 leading-none">
              Improve with Derma&nbsp;AI
            </p>
            <p className="text-[11px] text-gray-500 mt-1 leading-none truncate">
              Polish, shorten, or change the tone of your draft in one click.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {AI_ACTIONS.map((action) => {
            const ActiveIcon = action.icon
            const busy = aiBusy === action.id
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => handleImprove(action.id)}
                disabled={!value.trim() || aiBusy !== null}
                title={action.hint}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#7B2D8E]/20 bg-white text-xs font-medium text-gray-700 hover:border-[#7B2D8E] hover:text-[#7B2D8E] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {busy ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#7B2D8E]" />
                ) : (
                  <ActiveIcon className="w-3.5 h-3.5" />
                )}
                {action.label}
              </button>
            )
          })}
        </div>
        {aiError && (
          <p className="mt-2 text-[11px] text-rose-600">{aiError}</p>
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
          onClick={onSend}
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
