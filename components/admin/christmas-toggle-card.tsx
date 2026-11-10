'use client'

/**
 * Christmas / Festive Animation Admin Toggle Card
 * ---------------------------------------------------------------
 * Gives administrators direct control over the festive snowfall
 * animation directly from the admin dashboard.
 *
 * Adheres strictly to the Dermaspace design system:
 *   - No drop shadows (flat hairline borders only)
 *   - No gradients (solid brand purple #7B2D8E and neutrals)
 *   - No Zap or Sparkles icons (Snowflake glyph only)
 */

import { useState } from 'react'
import useSWR from 'swr'
import { Snowflake, Bell, Loader2, Check } from 'lucide-react'
import { Switch } from '@/components/ui/switch'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function ChristmasToggleCard() {
  const { data, mutate } = useSWR<{ enabled: boolean; intensity?: string }>(
    '/api/festive',
    fetcher,
    { revalidateOnFocus: false },
  )

  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const isEnabled = data ? data.enabled !== false : true

  const handleToggle = async (checked: boolean) => {
    setSaving(true)
    setFeedback(null)

    // Optimistic update
    mutate({ enabled: checked }, { revalidate: false })

    try {
      const res = await fetch('/api/festive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: checked }),
      })

      if (res.ok) {
        setFeedback(checked ? 'Holiday animation is now live!' : 'Holiday animation turned off.')
        setTimeout(() => setFeedback(null), 3000)
      } else {
        // Rollback
        mutate()
      }
    } catch {
      mutate()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0 relative">
            <Snowflake className="w-4 h-4 text-[#7B2D8E] -translate-x-1" aria-hidden="true" />
            <Bell className="w-3.5 h-3.5 text-[#D4AF37] translate-x-1" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900 tracking-tight">
                Christmas & Holiday Bells Animation
              </h3>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold tracking-wide ${
                  isEnabled
                    ? 'bg-[#7B2D8E] text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {isEnabled ? (
                  <>
                    <Bell className="w-3 h-3 text-[#D4AF37]" />
                    Active on site
                  </>
                ) : (
                  'Turned off'
                )}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              Show subtle holiday snowfall and Christmas bells across the site. Turn it on or off anytime.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          {feedback && (
            <span className="text-[11px] font-medium text-[#7B2D8E] bg-[#7B2D8E]/10 px-2.5 py-1 rounded-full flex items-center gap-1 animate-in fade-in">
              <Check className="w-3 h-3" />
              {feedback}
            </span>
          )}
          {saving && <Loader2 className="w-4 h-4 animate-spin text-[#7B2D8E]" />}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-600">
              {isEnabled ? 'Enabled' : 'Disabled'}
            </span>
            <Switch
              checked={isEnabled}
              onCheckedChange={handleToggle}
              disabled={saving}
              className="data-[state=checked]:bg-[#7B2D8E]"
              aria-label="Toggle Christmas animation"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
