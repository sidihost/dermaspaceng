'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Cake } from 'lucide-react'

/**
 * Branded, dependency-free date-of-birth picker.
 *
 * UX
 * --
 * On mobile we open a bottom-sheet that pages in three iOS-style wheels —
 * Month, Day, Year — exactly like Apple's UIDatePicker. The selected row
 * sits inside a faintly-tinted band; rows above/below soften toward
 * 30% opacity so the focused value reads instantly. Wheels snap on
 * scroll release using CSS `scroll-snap-type: y mandatory`, so on
 * touch devices we get native momentum + haptic-like detents without
 * shipping a JS animation framework.
 *
 * On desktop the same component drops into a popover under the
 * trigger pill, with the wheels presented horizontally instead of as
 * a sheet.
 *
 * Brand alignment
 * ---------------
 * - Single brand purple (`var(--brand)` / fallback `#7B2D8E`) used for
 *   the focus band, the Confirm CTA, and the trigger icon.
 * - Cancel/Confirm row uses the same flat, borderless action pattern
 *   we use elsewhere — the screenshot uses teal for Confirm; we keep
 *   our purple instead so it stays on-brand.
 * - No drop-shadows; we elevate via a thin border + subtle backdrop
 *   blur so it sits cohesively on the rest of the app chrome.
 *
 * Values are exchanged as ISO `YYYY-MM-DD` strings so we plug into
 * the existing signup / profile APIs unchanged.
 */

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// Each wheel row is exactly this tall — wheels and snap targets all
// agree on this constant. Bigger than iOS's 32px because Lagos users
// often interact with thumb-friendly tap targets.
const ROW_HEIGHT = 44
// 5 rows visible (2 above the focus band + the band + 2 below). The
// extra padding rows are pure spacers (`<li aria-hidden>`) — see
// `Wheel` below.
const VISIBLE_ROWS = 5
const PADDING_ROWS = Math.floor(VISIBLE_ROWS / 2) // 2

// ─── Date helpers (timezone-safe: we operate on local-time dates) ──
function pad(n: number) {
  return String(n).padStart(2, '0')
}
function isoFromYMD(y: number, m: number, d: number): string {
  return `${y}-${pad(m + 1)}-${pad(d)}`
}
function dateFromIso(iso: string | null | undefined): Date | null {
  if (!iso) return null
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
function daysInMonth(year: number, monthIdx: number): number {
  // monthIdx is 0-11 — passing month=monthIdx+1, day=0 returns the
  // last day of monthIdx. Standard JS trick.
  return new Date(year, monthIdx + 1, 0).getDate()
}

export interface DatePickerProps {
  value: string                              // ISO YYYY-MM-DD or empty
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  /** ISO max (inclusive). Defaults to today (no future DOBs). */
  max?: string
  /** ISO min (inclusive). Defaults to 110 years ago. */
  min?: string
  /** Override the trigger's leading icon (defaults to Cake for DOB). */
  icon?: React.ReactNode
  className?: string
  ariaLabel?: string
}

export function DatePicker({
  value,
  onChange,
  disabled,
  placeholder = 'Choose your birthday',
  max,
  min,
  icon,
  className = '',
  ariaLabel = 'Choose your birthday',
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

  // We initialise the wheel state from the current value, falling back
  // to a sensible "default DOB" — 25 years ago, January 1st — which is
  // the centre of mass for our spa-going demographic. This matters
  // because if we pick "today" the user has to scroll the year wheel
  // 25 stops before they can pick anything realistic.
  const initial = useMemo(() => {
    const fromValue = dateFromIso(value)
    if (fromValue) {
      return {
        m: fromValue.getMonth(),
        d: fromValue.getDate(),
        y: fromValue.getFullYear(),
      }
    }
    return {
      m: 0,
      d: 1,
      y: Math.max(minDate.getFullYear(), today.getFullYear() - 25),
    }
  }, [value, minDate, today])

  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(initial)

  // When the parent passes in a new value, sync our draft so the wheels
  // jump to the right position the next time the sheet opens.
  useEffect(() => {
    setDraft(initial)
  }, [initial])

  // Year list — newest first matches what most users expect. We reverse
  // the visual list inside the wheel (so older years scroll-up to
  // newer) but keep the underlying source array sorted ascending so
  // the index math is straightforward.
  const years = useMemo(() => {
    const arr: number[] = []
    for (let y = minDate.getFullYear(); y <= maxDate.getFullYear(); y++) arr.push(y)
    return arr
  }, [minDate, maxDate])

  // Day list shrinks/grows based on the selected month + year so we
  // never offer Feb 31 etc.
  const days = useMemo(() => {
    const max = daysInMonth(draft.y, draft.m)
    return Array.from({ length: max }, (_, i) => i + 1)
  }, [draft.m, draft.y])

  // If the current draft.d is now out of range (e.g. user moved from
  // March 31 → April), clamp it to the new month's max.
  useEffect(() => {
    if (draft.d > days.length) setDraft((prev) => ({ ...prev, d: days.length }))
  }, [days.length, draft.d])

  // Bottom-sheet vs popover — we pick at mount time (not on resize)
  // so the experience is stable mid-pick. ≤768px = sheet.
  const [isSheet, setIsSheet] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    setIsSheet(window.matchMedia('(max-width: 768px)').matches)
  }, [open])

  // Body scroll lock while the sheet is open — without this iOS Safari
  // happily scrolls the page underneath when a wheel hits its end.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  const handleConfirm = () => {
    // Re-validate against min/max one last time — wheel positions
    // could in theory pre-empt the bounds if the constraints changed
    // mid-pick (e.g. a parent prop swap).
    const picked = new Date(draft.y, draft.m, Math.min(draft.d, daysInMonth(draft.y, draft.m)))
    const clamped = picked < minDate ? minDate : picked > maxDate ? maxDate : picked
    onChange(isoFromYMD(clamped.getFullYear(), clamped.getMonth(), clamped.getDate()))
    setOpen(false)
  }

  const handleCancel = () => {
    setDraft(initial)
    setOpen(false)
  }

  const display = formatDisplay(value)

  return (
    <div className={className}>
      {/* Trigger — pill with icon + value/placeholder + chevron. We use
          flat surfaces and the brand purple only for the icon so the
          rest of the field stays neutral and matches our other inputs. */}
      <button
        type="button"
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-4 h-14 rounded-full bg-gray-100 text-left transition-colors hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2D8E]/40"
      >
        <span className="flex items-center justify-center w-6 h-6 text-[#7B2D8E]">
          {icon ?? <Cake className="w-5 h-5" />}
        </span>
        <span className={`flex-1 text-[15px] ${display ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
          {display || placeholder}
        </span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 shrink-0" aria-hidden>
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {open && (
        isSheet ? (
          <BottomSheet
            ariaLabel={ariaLabel}
            onClose={handleCancel}
            onConfirm={handleConfirm}
          >
            <Wheels
              draft={draft}
              setDraft={setDraft}
              years={years}
              days={days}
            />
          </BottomSheet>
        ) : (
          <Popover
            ariaLabel={ariaLabel}
            onClose={handleCancel}
            onConfirm={handleConfirm}
          >
            <Wheels
              draft={draft}
              setDraft={setDraft}
              years={years}
              days={days}
            />
          </Popover>
        )
      )}
    </div>
  )
}

// ─── Bottom sheet ─────────────────────────────────────────────────
// Mobile presentation — full-width, slides up from the bottom with a
// translucent backdrop. The whole sheet is purposely white (not a
// brand-tinted gradient) so the wheel text reads well. The Confirm
// CTA carries the brand colour so the user's eye lands on it.

function BottomSheet({
  ariaLabel,
  onClose,
  onConfirm,
  children,
}: {
  ariaLabel: string
  onClose: () => void
  onConfirm: () => void
  children: React.ReactNode
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close picker"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 animate-in fade-in duration-200"
      />
      {/* Sheet */}
      <div className="relative w-full bg-white rounded-t-3xl pb-[max(env(safe-area-inset-bottom),0.75rem)] animate-in slide-in-from-bottom duration-300 ease-out">
        {/* Grip handle — small visual affordance that this slides up */}
        <div className="flex items-center justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        <div className="pt-2">{children}</div>

        {/* Action row — flush with the wheels, no border above so the
            sheet feels like a single connected surface. */}
        <div className="flex items-center justify-between px-6 pt-2 pb-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-3 text-[15px] font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-3 text-[15px] font-semibold text-[#7B2D8E] hover:text-[#5d2169] transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Desktop popover ──────────────────────────────────────────────
// We anchor below the trigger via fixed positioning + viewport math
// would be heavy here — instead we render in the same DOM position
// (inline) and let the parent control flow. That trades pixel-perfect
// alignment for code simplicity, which is fine because the desktop
// experience is secondary for this picker (most signups are mobile).

function Popover({
  ariaLabel,
  onClose,
  onConfirm,
  children,
}: {
  ariaLabel: string
  onClose: () => void
  onConfirm: () => void
  children: React.ReactNode
}) {
  // Click-outside dismissal
  const wrapRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) onClose()
    }
    // Defer one tick so the same click that opened us doesn't close us.
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', handler)
    }
  }, [onClose])

  // Escape to dismiss
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      ref={wrapRef}
      role="dialog"
      aria-modal="false"
      aria-label={ariaLabel}
      className="absolute z-50 mt-2 w-[340px] bg-white rounded-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
    >
      <div className="pt-3">{children}</div>
      <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="px-3 py-2 text-sm font-semibold text-[#7B2D8E] hover:text-[#5d2169] transition-colors"
        >
          Confirm
        </button>
      </div>
    </div>
  )
}

// ─── The wheels themselves ────────────────────────────────────────
// Three Wheel components side-by-side, sharing a common focus band.
// We absolutely-position the band BEHIND the wheels so the wheels
// remain individually scrollable.

function Wheels({
  draft,
  setDraft,
  years,
  days,
}: {
  draft: { m: number; d: number; y: number }
  setDraft: React.Dispatch<React.SetStateAction<{ m: number; d: number; y: number }>>
  years: number[]
  days: number[]
}) {
  const wheelHeight = ROW_HEIGHT * VISIBLE_ROWS
  return (
    <div
      className="relative px-4"
      style={{ height: wheelHeight }}
    >
      {/* Focus band — sits behind the wheel content to highlight the
          centred row. We use a single 1px tinted divider top + bottom
          rather than a filled pill so the picker stays light and
          modern. The brand-tinted background is at 6% opacity so it
          doesn't fight with the row text. */}
      <div
        className="pointer-events-none absolute left-2 right-2 top-1/2 -translate-y-1/2 rounded-xl"
        style={{
          height: ROW_HEIGHT,
          background: 'rgba(123, 45, 142, 0.06)',
          boxShadow:
            'inset 0 1px 0 rgba(123, 45, 142, 0.18), inset 0 -1px 0 rgba(123, 45, 142, 0.18)',
        }}
        aria-hidden
      />

      {/* Vertical fade overlays — softens edges of the wheel so the
          centred row reads as the active selection. We use white→
          transparent on top and transparent→white on bottom; the
          parent surface is white in both sheet + popover variants
          so the gradient blends invisibly. */}
      <div
        className="pointer-events-none absolute left-0 right-0 top-0 z-10"
        style={{
          height: ROW_HEIGHT * PADDING_ROWS,
          background: 'linear-gradient(to bottom, #ffffff 0%, rgba(255,255,255,0.6) 60%, rgba(255,255,255,0) 100%)',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-0 right-0 bottom-0 z-10"
        style={{
          height: ROW_HEIGHT * PADDING_ROWS,
          background: 'linear-gradient(to top, #ffffff 0%, rgba(255,255,255,0.6) 60%, rgba(255,255,255,0) 100%)',
        }}
        aria-hidden
      />

      <div className="relative flex h-full">
        <Wheel
          ariaLabel="Month"
          items={MONTH_NAMES}
          index={draft.m}
          onChange={(i) => setDraft((p) => ({ ...p, m: i }))}
          align="left"
        />
        <Wheel
          ariaLabel="Day"
          items={days.map((d) => String(d))}
          index={draft.d - 1}
          onChange={(i) => setDraft((p) => ({ ...p, d: i + 1 }))}
          align="center"
        />
        <Wheel
          ariaLabel="Year"
          items={years.map((y) => String(y))}
          index={years.indexOf(draft.y)}
          onChange={(i) => setDraft((p) => ({ ...p, y: years[i] ?? p.y }))}
          align="right"
        />
      </div>
    </div>
  )
}

// ─── Single wheel ─────────────────────────────────────────────────
// A scroll-snapping <ul> with PADDING_ROWS spacers above and below
// so any item can be centred under the focus band. We listen to
// `scroll` to project the nearest snapped index back up to the
// parent state, debounced via rAF so we don't thrash React.
//
// Each row's opacity & scale is computed from its distance to the
// focus band, giving the iOS "barrel" feel without a 3D transform
// (which would clip badly inside the bottom sheet on Android Chrome).

function Wheel({
  items,
  index,
  onChange,
  ariaLabel,
  align,
}: {
  items: string[]
  index: number
  onChange: (idx: number) => void
  ariaLabel: string
  align: 'left' | 'center' | 'right'
}) {
  const ref = useRef<HTMLUListElement>(null)
  const programmaticScrollRef = useRef(false)
  const [scrollTop, setScrollTop] = useState(index * ROW_HEIGHT)

  // Sync external `index` → scroll position. Only when it differs
  // from the row currently centred — otherwise we'd fight the user
  // mid-scroll.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const target = Math.max(0, index) * ROW_HEIGHT
    if (Math.abs(el.scrollTop - target) > 1) {
      programmaticScrollRef.current = true
      el.scrollTop = target
      setScrollTop(target)
      // Release the lock after the browser settles the scroll —
      // otherwise our scroll listener would treat our own
      // assignment as a user gesture and re-fire onChange.
      requestAnimationFrame(() => {
        programmaticScrollRef.current = false
      })
    }
  }, [index])

  // Scroll listener — derives selected index, calls onChange when it
  // changes, and updates our local scrollTop so child rows can
  // recompute their fade/scale.
  const onScroll = useCallback(() => {
    const el = ref.current
    if (!el) return
    setScrollTop(el.scrollTop)
    if (programmaticScrollRef.current) return
    const idx = Math.round(el.scrollTop / ROW_HEIGHT)
    const clamped = Math.max(0, Math.min(items.length - 1, idx))
    if (clamped !== index) onChange(clamped)
  }, [index, items.length, onChange])

  // Re-snap to the rounded row on scroll-end so we never end up
  // resting between two values — fixes a Chrome Android quirk where
  // the scroll-snap animation doesn't fully converge.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let timer: ReturnType<typeof setTimeout> | null = null
    const onEnd = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        if (!ref.current) return
        const idx = Math.round(ref.current.scrollTop / ROW_HEIGHT)
        const target = idx * ROW_HEIGHT
        if (Math.abs(ref.current.scrollTop - target) > 0.5) {
          programmaticScrollRef.current = true
          ref.current.scrollTo({ top: target, behavior: 'smooth' })
          requestAnimationFrame(() => {
            programmaticScrollRef.current = false
          })
        }
      }, 120)
    }
    el.addEventListener('scroll', onEnd, { passive: true })
    return () => {
      el.removeEventListener('scroll', onEnd)
      if (timer) clearTimeout(timer)
    }
  }, [])

  const focusCentre = scrollTop + (ROW_HEIGHT * PADDING_ROWS)

  const justify =
    align === 'left' ? 'justify-start' : align === 'right' ? 'justify-end' : 'justify-center'

  return (
    <ul
      ref={ref}
      role="listbox"
      aria-label={ariaLabel}
      onScroll={onScroll}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          if (index > 0) onChange(index - 1)
        } else if (e.key === 'ArrowDown') {
          e.preventDefault()
          if (index < items.length - 1) onChange(index + 1)
        }
      }}
      className="flex-1 h-full overflow-y-scroll scrollbar-none [scroll-snap-type:y_mandatory] overscroll-contain focus:outline-none"
      style={{ scrollbarWidth: 'none' }}
    >
      {/* Spacer rows — let the first and last item centre under the
          focus band. We render PADDING_ROWS empty <li>s on each side. */}
      {Array.from({ length: PADDING_ROWS }).map((_, i) => (
        <li key={`pad-top-${i}`} aria-hidden style={{ height: ROW_HEIGHT }} />
      ))}
      {items.map((item, i) => {
        const rowCentre = i * ROW_HEIGHT + ROW_HEIGHT / 2
        const distance = Math.abs(rowCentre - focusCentre - ROW_HEIGHT / 2)
        // Map distance (0 → 2*ROW_HEIGHT) to opacity (1 → 0.25). We
        // also nudge the font-weight on the focused row so the centre
        // value pops without restyling on every paint.
        const t = Math.min(1, distance / (ROW_HEIGHT * 2))
        const opacity = 1 - t * 0.7
        const isSelected = i === index
        return (
          <li
            key={item + i}
            role="option"
            aria-selected={isSelected}
            onClick={() => onChange(i)}
            className={`flex items-center ${justify} px-3 cursor-pointer select-none transition-[opacity] [scroll-snap-align:center]`}
            style={{
              height: ROW_HEIGHT,
              opacity,
              fontWeight: isSelected ? 600 : 400,
              color: isSelected ? '#1a1a1a' : '#3f3f46',
              fontSize: isSelected ? 19 : 17,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {item}
          </li>
        )
      })}
      {Array.from({ length: PADDING_ROWS }).map((_, i) => (
        <li key={`pad-bot-${i}`} aria-hidden style={{ height: ROW_HEIGHT }} />
      ))}
    </ul>
  )
}
