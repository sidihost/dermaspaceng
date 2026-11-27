'use client'

import { useState } from 'react'
import { Loader2, Undo2, Wand2 } from 'lucide-react'

type AiMode = 'draft' | 'polish' | 'shorten' | 'friendly' | 'formal' | 'plain'

const REWRITE_MODES: Array<{ id: Exclude<AiMode, 'draft'>; label: string }> = [
  { id: 'polish', label: 'Polish' },
  { id: 'shorten', label: 'Shorten' },
  { id: 'friendly', label: 'Friendlier' },
  { id: 'formal', label: 'Formal' },
  { id: 'plain', label: 'Plain' },
]

export interface AiTextToolbarProps {
  value: string
  onChange: (nextValue: string) => void
  /** Context sent to /api/admin/ai-improve so AI drafts & rewrites stay on-topic. */
  context: string
  /** Optional max length cap matching the paired textarea. */
  maxLength?: number
  disabled?: boolean
  /** Compact density for tight dialogs. */
  compact?: boolean
}

/**
 * Reusable flat Dermaspace inline Derma AI composer toolbar.
 * Designed to sit flush inside a bordered textarea shell with zero shadows,
 * zero gradients, and Wand2 iconography matching ReplyComposer.
 */
export function AiTextToolbar({
  value,
  onChange,
  context,
  maxLength,
  disabled = false,
  compact = false,
}: AiTextToolbarProps) {
  const [busyMode, setBusyMode] = useState<AiMode | null>(null)
  const [previousValue, setPreviousValue] = useState<string | null>(null)
  const [error, setError] = useState('')

  const hasText = value.trim().length > 0
  const isBusy = busyMode !== null

  const runAi = async (mode: AiMode) => {
    if (disabled || isBusy) return
    if (mode !== 'draft' && !hasText) return

    setBusyMode(mode)
    setError('')
    const snapshot = value
    try {
      const res = await fetch('/api/admin/ai-improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: value.trim(),
          mode,
          context,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || typeof data?.improved !== 'string' || !data.improved.trim()) {
        setError(data?.error || 'Could not generate suggestion. Try again.')
        return
      }
      const next =
        typeof maxLength === 'number' && maxLength > 0
          ? data.improved.trim().slice(0, maxLength)
          : data.improved.trim()
      setPreviousValue(snapshot)
      onChange(next)
    } catch {
      setError('Could not reach Derma AI right now.')
    } finally {
      setBusyMode(null)
    }
  }

  const handleUndo = () => {
    if (previousValue === null || disabled || isBusy) return
    onChange(previousValue)
    setPreviousValue(null)
    setError('')
  }

  return (
    <div
      className={`border-t border-gray-200/80 bg-[#FBF9FC] ${
        compact ? 'px-2.5 py-2' : 'px-3 py-2.5'
      }`}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1.5 mr-1">
          <span className="grid h-5 w-5 place-items-center rounded-md bg-[#7B2D8E] text-white shrink-0">
            {isBusy ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Wand2 className="h-3 w-3" />
            )}
          </span>
          <span className="text-[11px] font-semibold text-gray-700">
            Derma AI
          </span>
        </span>

        <button
          type="button"
          disabled={disabled || isBusy}
          onClick={() => void runAi('draft')}
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer ${
            busyMode === 'draft'
              ? 'border-[#7B2D8E] bg-[#7B2D8E] text-white'
              : 'border-[#7B2D8E]/30 bg-[#7B2D8E]/10 text-[#7B2D8E] hover:bg-[#7B2D8E] hover:text-white'
          }`}
        >
          {busyMode === 'draft' ? 'Drafting...' : hasText ? 'Rewrite draft' : 'Draft note'}
        </button>

        {REWRITE_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            disabled={disabled || isBusy || !hasText}
            onClick={() => void runAi(m.id)}
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
              busyMode === m.id
                ? 'border-[#7B2D8E] bg-[#7B2D8E] text-white'
                : 'border-gray-200 bg-white text-gray-700 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E]'
            }`}
          >
            {m.label}
          </button>
        ))}

        {previousValue !== null && (
          <button
            type="button"
            disabled={disabled || isBusy}
            onClick={handleUndo}
            className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E] transition-colors disabled:opacity-40 cursor-pointer ml-auto"
          >
            <Undo2 className="h-3 w-3" />
            Undo
          </button>
        )}
      </div>

      {error && (
        <p className="mt-1.5 text-[11px] text-[#5A1D6A]" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
