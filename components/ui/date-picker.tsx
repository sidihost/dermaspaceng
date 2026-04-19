'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Cake, ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * A branded, dependency-free date picker that replaces the native
 * `<input type="date">`. Built for date-of-birth (fast year navigation,
 * decades-back range, no future dates) but reusable anywhere we want
 * Dermaspace styling instead of the browser's default.
 *
 * UX details that make it feel premium:
 * 1. Header has TWO tappable pills — one for month, one for year — that
 *    open an in-popover month grid (4x3) and year grid (scrollable). This
 *    is the same pattern Apple Calendar / Google Calendar use, and it's
 *    the fastest way to jump to a 1984 birthday.
 * 2. Month navigation slides left/right with a CSS animation so the change
 *    feels physical, not snappy.
 * 3. Day cells are bigger, with a soft brand hover and a satisfying
 *    shadow on the selected pill.
 * 4. A subtle brand accent strip anchors the top of the popover so the
 *    widget feels "by Dermaspace" at a glance.
 *
 * Values are exchanged as ISO date strings (`YYYY-MM-DD`) — the exact
 * format our signup/profile APIs already expect.
 */

const BRAND = '#7B2D8E'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

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

type ViewMode = 'days' | 'months' | 'years'

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
  const [view, setView] = useState<ViewMode>('days')
  // Slide direction for the month grid transition: -1 = back, +1 = forward.
  const [slide, setSlide] = useState<0 | -1 | 1>(0)
  const selected = useMemo(() => dateFromIso(value), [value])

  // Month currently displayed — decoupled from the selected date so the
  // user can browse freely without committing.
  const [viewDate, setViewDate] = useState<Date>(() => {
    if (selected) return new Date(selected.getFullYear(), selected.getMonth(), 1)
    // For birthdays default to ~30 years ago — saves dozens of clicks for
    // the average new user opening this with nothing selected.
    const defaultYear = today.getFullYear() - 30
    return new Date(defaultYear, 0, 1)
  })

  // Re-sync the viewDate if the parent value changes (external edits,
  // hydrating from the API, etc.).
  useEffect(() => {
    if (selected) setViewDate(new Date(selected.getFullYear(), selected.getMonth(), 1))
  }, [selected])

  // Close on outside click / Escape — standard popover behaviour.
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target as Node)) {
        setOpen(false)
        setView('days')
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setView('days')
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // 6x7 calendar grid — the Google Calendar approach. Grid height stays
  // stable regardless of which weekday the month starts on.
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

  // Year list for the year-grid view — newest first, clamped to [min, max].
  const years = useMemo(() => {
    const out: number[] = []
    for (let y = maxDate.getFullYear(); y >= minDate.getFullYear(); y--) out.push(y)
    return out
  }, [minDate, maxDate])

  const canGoPrev = () => {
    const endOfPrev = new Date(viewDate.getFullYear(), viewDate.getMonth(), 0)
    return endOfPrev >= new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
  }
  const canGoNext = () => {
    const nextFirst = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)
    return nextFirst <= new Date(maxDate.getFullYear(), maxDate.getMonth(), 1)
  }

  const goMonth = (delta: number) => {
    if (delta < 0 && !canGoPrev()) return
    if (delta > 0 && !canGoNext()) return
    setSlide(delta > 0 ? 1 : -1)
    // Let the outgoing frame paint before swapping — the slide animation
    // is driven off the CSS class below.
    requestAnimationFrame(() => {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1))
      // Clear the direction so a subsequent rerender doesn't re-animate.
      setTimeout(() => setSlide(0), 260)
    })
  }

  const pickDay = (d: Date) => {
    // Clamp to bounds; don't commit out-of-range picks.
    if (d < minDate || d > maxDate) return
    onChange(isoFromDate(d))
    setOpen(false)
    setView('days')
  }

  const pickMonth = (monthIdx: number) => {
    setViewDate(new Date(viewDate.getFullYear(), monthIdx, 1))
    setView('days')
  }

  const pickYear = (year: number) => {
    // Keep the same month when changing years, but clamp to max if needed.
    const targetMonth =
      year === maxDate.getFullYear() && viewDate.getMonth() > maxDate.getMonth()
        ? maxDate.getMonth()
        : viewDate.getMonth()
    setViewDate(new Date(year, targetMonth, 1))
    setView('days')
  }

  const isMonthDisabled = (monthIdx: number) => {
    const firstOfMonth = new Date(viewDate.getFullYear(), monthIdx, 1)
    const lastOfMonth = new Date(viewDate.getFullYear(), monthIdx + 1, 0)
    return (
      lastOfMonth <
        new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()) ||
      firstOfMonth > maxDate
    )
  }

  const display = formatDisplay(value)

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => {
          if (disabled) return
          setOpen((v) => !v)
          setView('days')
        }}
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
          className="absolute z-50 mt-2 w-[320px] rounded-2xl bg-white overflow-hidden ds-dp-shadow ring-1 ring-gray-100"
        >
          {/* Brand accent strip — a slim bar of Dermaspace purple at the
              very top of the popover. Grounds the widget as "ours" the
              moment it opens. */}
          <div className="h-1 bg-[#7B2D8E]" aria-hidden="true" />

          {/* Selected date summary — reads like a pill card at the top, the
              same way Apple Calendar previews the active selection. When
              nothing is picked yet we show a soft hint instead. */}
          <div className="px-4 pt-3 pb-2 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
              <Cake className="w-4 h-4 text-[#7B2D8E]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {selected ? 'Selected' : 'No date picked'}
              </p>
              <p className="text-[13px] font-semibold text-gray-900 truncate leading-tight">
                {display || 'Choose your date below'}
              </p>
            </div>
          </div>

          {/* Header — month/year pills. Clicking either opens a rich
              in-popover picker (month grid / year grid) instead of the
              default browser dropdown. */}
          <div className="px-3 pb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => goMonth(-1)}
              aria-label="Previous month"
              disabled={!canGoPrev() || view !== 'days'}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-[#7B2D8E]/10 hover:text-[#7B2D8E] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setView(view === 'months' ? 'days' : 'months')}
                aria-expanded={view === 'months'}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  view === 'months'
                    ? 'bg-[#7B2D8E] text-white'
                    : 'text-gray-900 hover:bg-[#7B2D8E]/10 hover:text-[#7B2D8E]'
                }`}
              >
                {MONTH_NAMES[viewDate.getMonth()]}
              </button>
              <button
                type="button"
                onClick={() => setView(view === 'years' ? 'days' : 'years')}
                aria-expanded={view === 'years'}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold tabular-nums transition-colors ${
                  view === 'years'
                    ? 'bg-[#7B2D8E] text-white'
                    : 'text-gray-900 hover:bg-[#7B2D8E]/10 hover:text-[#7B2D8E]'
                }`}
              >
                {viewDate.getFullYear()}
              </button>
            </div>

            <button
              type="button"
              onClick={() => goMonth(1)}
              aria-label="Next month"
              disabled={!canGoNext() || view !== 'days'}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-[#7B2D8E]/10 hover:text-[#7B2D8E] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Days view */}
          {view === 'days' && (
            <div className="px-3 pb-3">
              {/* Weekday header */}
              <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS.map((w, i) => (
                  <div
                    key={i}
                    className="text-[10px] font-semibold text-gray-400 text-center py-1 uppercase tracking-wider"
                  >
                    {w}
                  </div>
                ))}
              </div>

              {/* Sliding month frame. We key the frame on month+year so
                  React swaps the whole grid when the user hits prev/next,
                  which lets the CSS `ds-dp-slide-*` classes animate it in
                  from the correct side. */}
              <div className="overflow-hidden">
                <div
                  key={`${viewDate.getFullYear()}-${viewDate.getMonth()}`}
                  className={`grid grid-cols-7 gap-0.5 ${
                    slide === 1
                      ? 'ds-dp-slide-next'
                      : slide === -1
                        ? 'ds-dp-slide-prev'
                        : ''
                  }`}
                >
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
                        className={`relative h-10 w-full rounded-xl text-[13px] font-semibold transition-all ${
                          isSelected
                            ? 'bg-[#7B2D8E] text-white shadow-md shadow-[#7B2D8E]/30 scale-105'
                            : disabledCell
                              ? 'text-gray-300 cursor-not-allowed'
                              : inMonth
                                ? 'text-gray-900 hover:bg-[#7B2D8E]/10 hover:text-[#7B2D8E] active:scale-95'
                                : 'text-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {d.getDate()}
                        {/* Today dot — hidden when selected, since the
                            filled pill already says enough. */}
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
              </div>
            </div>
          )}

          {/* Months view — 4x3 grid, iOS-style. */}
          {view === 'months' && (
            <div className="px-3 pb-3">
              <div className="grid grid-cols-3 gap-2">
                {MONTH_SHORT.map((m, idx) => {
                  const isCurrent = idx === viewDate.getMonth()
                  const isSelectedMonth =
                    selected &&
                    selected.getFullYear() === viewDate.getFullYear() &&
                    selected.getMonth() === idx
                  const dis = isMonthDisabled(idx)
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => pickMonth(idx)}
                      disabled={dis}
                      className={`h-12 rounded-xl text-[13px] font-semibold transition-all ${
                        isCurrent
                          ? 'bg-[#7B2D8E] text-white shadow-md shadow-[#7B2D8E]/25'
                          : isSelectedMonth
                            ? 'bg-[#7B2D8E]/10 text-[#7B2D8E] ring-1 ring-[#7B2D8E]/20'
                            : dis
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-gray-900 hover:bg-[#7B2D8E]/10 hover:text-[#7B2D8E]'
                      }`}
                    >
                      {m}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Years view — scrollable grid, newest at the top. */}
          {view === 'years' && (
            <div className="px-3 pb-3">
              <div className="grid grid-cols-4 gap-2 max-h-[240px] overflow-y-auto ds-dp-scroll">
                {years.map((y) => {
                  const isCurrent = y === viewDate.getFullYear()
                  const isSelectedYear = selected && selected.getFullYear() === y
                  return (
                    <button
                      key={y}
                      type="button"
                      onClick={() => pickYear(y)}
                      className={`h-11 rounded-xl text-[13px] font-semibold tabular-nums transition-all ${
                        isCurrent
                          ? 'bg-[#7B2D8E] text-white shadow-md shadow-[#7B2D8E]/25'
                          : isSelectedYear
                            ? 'bg-[#7B2D8E]/10 text-[#7B2D8E] ring-1 ring-[#7B2D8E]/20'
                            : 'text-gray-900 hover:bg-[#7B2D8E]/10 hover:text-[#7B2D8E]'
                      }`}
                    >
                      {y}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Footer quick actions */}
          <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between gap-2 bg-gray-50/50">
            <button
              type="button"
              onClick={() => {
                onChange('')
                setOpen(false)
                setView('days')
              }}
              className="text-xs font-semibold text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-200/60 transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => pickDay(today)}
              disabled={today < minDate || today > maxDate}
              className="text-xs font-semibold text-white bg-[#7B2D8E] px-3.5 py-1.5 rounded-lg hover:bg-[#6B2278] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Today
            </button>
          </div>
        </div>
      )}

      {/* Scoped visual flourishes. Keeping them next to the component keeps
          the file self-contained + easier for any future refactor. */}
      <style jsx>{`
        .ds-dp-shadow {
          box-shadow:
            0 10px 15px -3px rgba(0, 0, 0, 0.08),
            0 4px 6px -2px rgba(0, 0, 0, 0.04),
            0 30px 60px -12px rgba(123, 45, 142, 0.18);
        }
        .ds-dp-slide-next {
          animation: ds-dp-slide-next 240ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .ds-dp-slide-prev {
          animation: ds-dp-slide-prev 240ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        @keyframes ds-dp-slide-next {
          from {
            transform: translateX(14%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes ds-dp-slide-prev {
          from {
            transform: translateX(-14%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .ds-dp-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .ds-dp-scroll::-webkit-scrollbar-thumb {
          background: rgba(123, 45, 142, 0.25);
          border-radius: 9999px;
        }
        .ds-dp-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(123, 45, 142, 0.45);
        }
      `}</style>
    </div>
  )
}
