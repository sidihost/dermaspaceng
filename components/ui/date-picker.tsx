'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Cake, ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * A branded, dependency-free date picker that replaces the native
 * `<input type="date">`. Built for date-of-birth (fast year navigation,
 * decades-back range, no future dates) but reusable anywhere we want
 * Dermaspace styling instead of the browser's default.
 *
 * UX details that make it feel premium without visual noise:
 * 1. Header has TWO tappable pills — one for month, one for year — that
 *    open an in-popover month grid (4x3) and year grid (scrollable). This
 *    is the same pattern Apple Calendar / Google Calendar use, and it's
 *    the fastest way to jump to a 1984 birthday.
 * 2. Month navigation slides left/right with a CSS animation so the change
 *    feels physical, not snappy.
 * 3. Flat surfaces + brand accent strip. No drop shadows anywhere — we
 *    rely on a thin border for elevation so the popover matches the rest
 *    of the app chrome.
 *
 * Values are exchanged as ISO date strings (`YYYY-MM-DD`) — the exact
 * format our signup/profile APIs already expect.
 */

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
  // Ref to the scrollable year grid so we can programmatically land the
  // viewport on the user's currently-viewed year when the year picker
  // opens, instead of forcing them to scroll from the most-recent year.
  const yearsScrollRef = useRef<HTMLDivElement>(null)
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

  // Whenever we flip into the years view, land the scroll viewport on
  // the currently-viewed year so the user doesn't have to scroll down
  // 40+ years to get near their birthday. We query the grid for the
  // button tagged with our current year and center it.
  useEffect(() => {
    if (view !== 'years') return
    const scroller = yearsScrollRef.current
    if (!scroller) return
    const target = scroller.querySelector<HTMLButtonElement>(
      `button[data-year="${viewDate.getFullYear()}"]`,
    )
    if (!target) return
    // `scrollIntoView({ block: 'center' })` is supported everywhere we
    // ship and gives a buttery land — no manual math needed.
    target.scrollIntoView({ block: 'center', behavior: 'auto' })
  }, [view, viewDate])

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

  // Keyboard navigation inside the days grid — the detail that turns
  // the popover from "a widget" into "a real calendar". We mirror what
  // Google Calendar / macOS Calendar do:
  //   ← → ↑ ↓     move focus by 1 day / 1 week
  //   Home / End  jump to start / end of the week
  //   PageUp/Down jump 1 month (hold Shift for 1 year)
  //   Enter       select the focused day
  // Focus is driven off `focusedDate` rather than real DOM focus so the
  // slide animation doesn't steal it mid-transition.
  const [focusedDate, setFocusedDate] = useState<Date | null>(null)

  // When the popover opens, seed keyboard focus on the selected day (or
  // today, or the first day of the default viewDate). Resetting on
  // close keeps the indicator from bleeding into the next open.
  useEffect(() => {
    if (!open) {
      setFocusedDate(null)
      return
    }
    if (view !== 'days') return
    setFocusedDate((prev) => {
      if (prev) return prev
      if (selected) return selected
      if (today >= minDate && today <= maxDate) return today
      return new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
    })
    // viewDate is intentionally excluded — seeding should only happen
    // once per open, not every time the month changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, view])

  const moveFocus = (delta: number) => {
    setFocusedDate((prev) => {
      const base = prev ?? selected ?? today
      const next = new Date(base.getFullYear(), base.getMonth(), base.getDate() + delta)
      if (next < minDate || next > maxDate) return prev
      // Advance the month view if the new focus fell outside it.
      if (
        next.getFullYear() !== viewDate.getFullYear() ||
        next.getMonth() !== viewDate.getMonth()
      ) {
        setSlide(delta > 0 ? 1 : -1)
        setViewDate(new Date(next.getFullYear(), next.getMonth(), 1))
        setTimeout(() => setSlide(0), 260)
      }
      return next
    })
  }

  const onDayGridKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (view !== 'days') return
    switch (e.key) {
      case 'ArrowLeft':  e.preventDefault(); moveFocus(-1); break
      case 'ArrowRight': e.preventDefault(); moveFocus(1); break
      case 'ArrowUp':    e.preventDefault(); moveFocus(-7); break
      case 'ArrowDown':  e.preventDefault(); moveFocus(7); break
      case 'Home':       e.preventDefault(); moveFocus(-((focusedDate ?? today).getDay())); break
      case 'End':        e.preventDefault(); moveFocus(6 - (focusedDate ?? today).getDay()); break
      case 'PageUp':
        e.preventDefault()
        goMonth(e.shiftKey ? -12 : -1)
        break
      case 'PageDown':
        e.preventDefault()
        goMonth(e.shiftKey ? 12 : 1)
        break
      case 'Enter':
      case ' ':
        if (focusedDate) {
          e.preventDefault()
          pickDay(focusedDate)
        }
        break
    }
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
        className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm text-left flex items-center transition-colors ${
          disabled
            ? 'bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed'
            : open
              ? 'border-[#7B2D8E] outline-none text-gray-900 bg-white'
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
          className="absolute z-50 mt-2 w-[288px] rounded-xl bg-white overflow-hidden border border-gray-200"
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
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-[#7B2D8E]/10 hover:text-[#7B2D8E] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
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
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-[#7B2D8E]/10 hover:text-[#7B2D8E] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Days view */}
          {view === 'days' && (
            <div
              className="px-3 pb-3 focus:outline-none"
              role="grid"
              aria-label="Calendar grid"
              tabIndex={0}
              onKeyDown={onDayGridKeyDown}
            >
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
                    const isFocused =
                      !!focusedDate &&
                      isSameDay(d, focusedDate) &&
                      inMonth &&
                      !disabledCell
                    return (
                      <button
                        key={i}
                        type="button"
                        tabIndex={-1}
                        onClick={() => pickDay(d)}
                        disabled={disabledCell}
                        aria-label={isoFromDate(d)}
                        aria-pressed={isSelected}
                        aria-current={isToday ? 'date' : undefined}
                        className={`relative h-9 w-full rounded-lg text-[13px] font-semibold transition-colors ${
                          isSelected
                            ? 'bg-[#7B2D8E] text-white'
                            : disabledCell
                              ? 'text-gray-300 cursor-not-allowed'
                              : isToday
                                // Today gets a thin brand ring so it
                                // reads as "today" even when not the
                                // currently-selected pill.
                                ? 'text-[#7B2D8E] ring-1 ring-[#7B2D8E]/40 hover:bg-[#7B2D8E]/10'
                                : inMonth
                                  ? 'text-gray-900 hover:bg-[#7B2D8E]/10 hover:text-[#7B2D8E]'
                                  : 'text-gray-300 hover:bg-gray-50'
                        } ${
                          // Keyboard focus outline — mirrors native
                          // `:focus-visible` but driven off our state
                          // so arrow-key nav works without stealing
                          // real focus from the grid container.
                          isFocused && !isSelected
                            ? 'ring-2 ring-[#7B2D8E]/60 ring-offset-1'
                            : ''
                        }`}
                      >
                        {d.getDate()}
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
                      className={`h-10 rounded-lg text-[13px] font-semibold transition-colors ${
                        isCurrent
                          ? 'bg-[#7B2D8E] text-white'
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

          {/* Years view — scrollable grid, newest at the top. Two details
              that make it feel like a real calendar instead of a raw
              div:
                1. `overscroll-contain` + `touch-action: pan-y` keep the
                   scroll momentum inside this grid on mobile so the page
                   behind (or the bottom-sheet host) doesn't lurch when
                   the user reaches the top/bottom. This is THE fix for
                   the "everything scrolls together" complaint.
                2. On open we auto-scroll the currently viewed year into
                   the middle of the viewport (see the effect right
                   above the JSX return). Someone with a 1984 birthday
                   shouldn't have to flick through 42 years every time. */}
          {view === 'years' && (
            <div className="px-3 pb-3">
              <div
                ref={yearsScrollRef}
                className="grid grid-cols-4 gap-2 max-h-[240px] overflow-y-auto overscroll-contain touch-pan-y ds-dp-scroll"
              >
                {years.map((y) => {
                  const isCurrent = y === viewDate.getFullYear()
                  const isSelectedYear = selected && selected.getFullYear() === y
                  return (
                    <button
                      key={y}
                      type="button"
                      data-year={y}
                      onClick={() => pickYear(y)}
                      className={`h-10 rounded-lg text-[13px] font-semibold tabular-nums transition-colors ${
                        isCurrent
                          ? 'bg-[#7B2D8E] text-white'
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

      {/* Scoped visual flourishes — only the directional slide transition
          and a branded scrollbar. No drop shadows: we deliberately keep
          the popover flat so it matches the rest of the app chrome. */}
      <style jsx>{`
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
