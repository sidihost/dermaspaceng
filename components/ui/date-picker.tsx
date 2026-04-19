'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Cake, ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * A branded, dependency-free date picker that replaces the native
 * `<input type="date">`. Built specifically for date-of-birth selection
 * (fast year navigation, decades-back range, no future dates) but general
 * enough to reuse anywhere we want the Dermaspace purple instead of the
 * browser's stock calendar.
 *
 * Why not a library?
 * - `react-day-picker` and friends bring ~40kB + their own theming layer
 *   that would need heavy overriding to match our brand tokens.
 * - This component is small, a11y-aware (keyboard-nav, proper roles),
 *   and uses only Tailwind + our brand palette.
 *
 * Values are exchanged as ISO date strings (`YYYY-MM-DD`) — the exact
 * format our signup/profile APIs already expect.
 */

const BRAND = '#7B2D8E'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

// ---- Date helpers (timezone-safe: we operate on local-time dates) --------
function isoFromDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function dateFromIso(iso: string | null | undefined): Date | null {
  if (!iso) return null
  // Parse components manually so we get a *local-midnight* Date. Using
  // `new Date(iso)` treats "YYYY-MM-DD" as UTC, which can render the
  // previous day in +0100 timezones like Lagos.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(d.getTime()) ? null : d
}

function formatDisplay(iso: string | null | undefined): string {
  const d = dateFromIso(iso ?? null)
  if (!d) return ''
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export interface DatePickerProps {
  value: string                              // ISO YYYY-MM-DD or empty string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  /** ISO max (inclusive). Defaults to today so birthdates can't be in the future. */
  max?: string
  /** ISO min (inclusive). Defaults to 110 years ago. */
  min?: string
  /** Override the trigger's leading icon (defaults to Cake for DOB use). */
  icon?: React.ReactNode
  className?: string
  ariaLabel?: string
}

export function DatePicker({
  value,
  onChange,
  disabled,
  placeholder = 'Select a date',
  max,
  min,
  icon,
  className = '',
  ariaLabel = 'Choose a date',
}: DatePickerProps) {
  const today = useMemo(() => new Date(), [])
  const maxDate = useMemo(
    () => dateFromIso(max) ?? new Date(today.getFullYear(), today.getMonth(), today.getDate()),
    [max, today],
  )
  const minDate = useMemo(
    () => dateFromIso(min) ?? new Date(today.getFullYear() - 110, 0, 1),
    [min, today],
  )

  const [open, setOpen] = useState(false)
  const selected = useMemo(() => dateFromIso(value), [value])

  // The month currently displayed in the grid — decoupled from the selected
  // date so the user can browse without committing.
  const [viewDate, setViewDate] = useState<Date>(() => {
    if (selected) return new Date(selected.getFullYear(), selected.getMonth(), 1)
    // For birthdays we default to showing ~30 years ago — saves 30 clicks
    // on the back arrow when a new user opens this with nothing selected.
    const defaultYear = today.getFullYear() - 30
    return new Date(defaultYear, 0, 1)
  })

  // Re-sync the viewDate if the parent value changes (e.g. user edits the
  // field elsewhere, or we hydrate the form from the API).
  useEffect(() => {
    if (selected) setViewDate(new Date(selected.getFullYear(), selected.getMonth(), 1))
  }, [selected])

  // Close on outside click / Escape — classic popover behaviour.
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Build a 6x7 calendar grid — same approach Google Calendar uses so the
  // grid height is stable regardless of how the month starts.
  const grid = useMemo(() => {
    const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
    const startOffset = first.getDay() // 0 = Sunday
    const gridStart = new Date(first)
    gridStart.setDate(first.getDate() - startOffset)
    const cells: Date[] = []
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart)
      d.setDate(gridStart.getDate() + i)
      cells.push(d)
    }
    return cells
  }, [viewDate])

  // Years list for the jump dropdown: from min year → max year, newest first.
  const years = useMemo(() => {
    const out: number[] = []
    for (let y = maxDate.getFullYear(); y >= minDate.getFullYear(); y--) out.push(y)
    return out
  }, [minDate, maxDate])

  const canGoPrev = () => {
    const prev = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1)
    const endOfPrev = new Date(viewDate.getFullYear(), viewDate.getMonth(), 0)
    return endOfPrev >= new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
      && prev <= maxDate
  }
  const canGoNext = () => {
    const next = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)
    return next <= new Date(maxDate.getFullYear(), maxDate.getMonth(), 1)
  }

  const pickDay = (d: Date) => {
    // Clamp to bounds; don't commit out-of-range picks.
    if (d < minDate || d > maxDate) return
    onChange(isoFromDate(d))
    setOpen(false)
  }

  const display = formatDisplay(value)

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm text-left flex items-center transition-colors ${
          disabled
            ? 'bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed'
            : open
              ? 'border-[#7B2D8E] ring-2 ring-[#7B2D8E]/20 outline-none text-gray-900 bg-white'
              : 'border-gray-200 hover:border-[#7B2D8E]/40 text-gray-900 bg-white'
        }`}
      >
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          {icon ?? <Cake className="w-4 h-4" />}
        </span>
        <span className={display ? 'text-gray-900' : 'text-gray-400'}>
          {display || placeholder}
        </span>
      </button>

      {open && !disabled && (
        <div
          role="dialog"
          aria-label="Date picker"
          className="absolute z-50 mt-2 w-[300px] sm:w-[320px] rounded-2xl border border-gray-100 bg-white shadow-xl p-3"
        >
          {/* Header — month nav + year jump */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <button
              type="button"
              onClick={() =>
                canGoPrev() &&
                setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
              }
              aria-label="Previous month"
              disabled={!canGoPrev()}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-[#7B2D8E]/10 hover:text-[#7B2D8E] disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 flex-1 justify-center">
              {/* Month select */}
              <select
                value={viewDate.getMonth()}
                onChange={(e) =>
                  setViewDate(new Date(viewDate.getFullYear(), Number(e.target.value), 1))
                }
                className="text-sm font-semibold text-gray-900 bg-transparent rounded-md px-1.5 py-1 hover:bg-[#7B2D8E]/10 focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/30 cursor-pointer"
                aria-label="Select month"
              >
                {MONTH_NAMES.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
              {/* Year select — the big DOB win: no need to click back 30+ months. */}
              <select
                value={viewDate.getFullYear()}
                onChange={(e) =>
                  setViewDate(new Date(Number(e.target.value), viewDate.getMonth(), 1))
                }
                className="text-sm font-semibold text-gray-900 bg-transparent rounded-md px-1.5 py-1 hover:bg-[#7B2D8E]/10 focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/30 cursor-pointer"
                aria-label="Select year"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() =>
                canGoNext() &&
                setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))
              }
              aria-label="Next month"
              disabled={!canGoNext()}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-[#7B2D8E]/10 hover:text-[#7B2D8E] disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday header row */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="text-[11px] font-medium text-gray-400 text-center py-1"
              >
                {w}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-0.5">
            {grid.map((d, i) => {
              const inMonth = d.getMonth() === viewDate.getMonth()
              const disabledCell = d < minDate || d > maxDate
              const isSelected = selected ? isSameDay(d, selected) : false
              const isToday = isSameDay(d, today)
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => pickDay(d)}
                  disabled={disabledCell}
                  aria-label={isoFromDate(d)}
                  aria-pressed={isSelected}
                  className={`relative h-9 w-full rounded-lg text-[13px] font-medium transition-colors ${
                    isSelected
                      ? 'bg-[#7B2D8E] text-white shadow-sm'
                      : disabledCell
                        ? 'text-gray-300 cursor-not-allowed'
                        : inMonth
                          ? 'text-gray-900 hover:bg-[#7B2D8E]/10 hover:text-[#7B2D8E]'
                          : 'text-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {d.getDate()}
                  {/* Today dot — hidden when the cell is also the selection
                      (the filled purple pill already communicates state). */}
                  {isToday && !isSelected && (
                    <span
                      className="absolute left-1/2 -translate-x-1/2 bottom-1 w-1 h-1 rounded-full"
                      style={{ background: BRAND }}
                      aria-hidden="true"
                    />
                  )}
                </button>
              )
            })}
          </div>

          {/* Footer quick actions */}
          <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                onChange('')
                setOpen(false)
              }}
              className="text-xs font-medium text-gray-500 px-2 py-1 rounded-md hover:bg-gray-100"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => pickDay(today)}
              disabled={today < minDate || today > maxDate}
              className="text-xs font-semibold text-[#7B2D8E] px-2 py-1 rounded-md hover:bg-[#7B2D8E]/10 disabled:opacity-50"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
