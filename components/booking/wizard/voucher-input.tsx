'use client'

// ---------------------------------------------------------------------------
// components/booking/wizard/voucher-input.tsx
//
// "Have a voucher code?" widget rendered inside the booking review step.
//
// Design intent
// -------------
// Instead of the usual generic stripe-of-an-input "Promo code", this is
// shaped like a real perforated paper voucher / movie ticket — one half
// holds the code input, the other half holds the Apply CTA, separated
// by a subtle dotted divider with two scalloped notches. It speaks
// "value", which encourages discovery and use of the discount system.
//
// State machine (purely local, validated server-side):
//   idle   → user is typing
//   probing→ POST /api/vouchers/validate in flight
//   ok     → green tick, discount chip; we forward {code, voucherId,
//            discountKobo} to the parent via onApplied()
//   bad    → red message, parent's voucher is cleared via onApplied(null)
//
// We never trust the client outcome on submit — the booking initiate API
// re-validates before persisting; this component just gives the customer
// fast feedback so they know whether the code "took".
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react'
import {
  Ticket,
  CheckCircle2,
  X,
  Loader2,
  TicketX,
  Sparkles,
} from 'lucide-react'

interface AppliedVoucher {
  /** Voucher row id (`vouchers.id`) — we never trust this from the client
   *  on submit, but the server uses the code to re-resolve the row. */
  voucherId: string
  /** Display label, e.g. "WELCOME20" — uppercased by the server. */
  code: string
  /** Discount in kobo for the supplied subtotal. */
  discountKobo: number
  /** Optional human label shown next to the chip ("Welcome offer"). */
  label?: string | null
  /** "percent" → "20% off"; "fixed" → "₦5,000 off" (for the chip). */
  type: 'percent' | 'fixed'
  value: number
}

interface Props {
  /** Booking subtotal in kobo BEFORE the voucher. Used for live discount
   *  preview and sent to the validator as `subtotal` (in naira). */
  subtotalKobo: number
  /** Currently applied voucher, if any — kept in the parent so it
   *  survives wizard step changes. */
  applied: AppliedVoucher | null
  /** Called whenever the applied voucher changes. Pass `null` to clear. */
  onApplied: (voucher: AppliedVoucher | null) => void
}

const formatNaira = (kobo: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(kobo / 100)

export function VoucherInput({ subtotalKobo, applied, onApplied }: Props) {
  // Open/closed gate — keep the surface tight for users who don't
  // have a code, but make it absolutely obvious for those who do.
  // We auto-open the panel as soon as a voucher is applied so the
  // customer can see what they redeemed.
  const [open, setOpen] = useState<boolean>(Boolean(applied))
  const [code, setCode] = useState<string>(applied?.code ?? '')
  const [probing, setProbing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Latest probe id — used to drop responses that arrived after a
  // newer request (so the UI reflects the user's latest input even
  // under network flakiness).
  const probeId = useRef(0)

  useEffect(() => {
    // Sync local input with parent — happens when applied is cleared
    // from outside (e.g. customer navigates back, changes services
    // and the parent decides to re-validate).
    setCode(applied?.code ?? '')
  }, [applied?.code])

  // If subtotal changes while a voucher is applied, re-probe so the
  // discount preview stays accurate (e.g. customer adds another
  // treatment). Keeps client + server in sync without a full reload.
  useEffect(() => {
    if (!applied || !applied.code) return
    const id = ++probeId.current
    void (async () => {
      try {
        const res = await fetch('/api/vouchers/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: applied.code,
            subtotal: subtotalKobo / 100,
          }),
        })
        const json = (await res.json()) as
          | { valid: true; voucher: any; discount: number }
          | { valid: false; reason: string }
        if (id !== probeId.current) return
        if (!json.valid) {
          onApplied(null)
          setError(json.reason)
          return
        }
        onApplied({
          voucherId: json.voucher.id,
          code: json.voucher.code,
          discountKobo: Math.round(json.discount * 100),
          label: json.voucher.label,
          type: json.voucher.type,
          value: Number(json.voucher.value),
        })
      } catch {
        /* network blips don't clear an applied voucher; the server
           will re-validate at /api/bookings/initiate. */
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotalKobo])

  const apply = async () => {
    const trimmed = code.trim()
    if (!trimmed) {
      setError('Enter a voucher code')
      return
    }
    setError(null)
    setProbing(true)
    const id = ++probeId.current
    try {
      const res = await fetch('/api/vouchers/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: trimmed,
          // Validator works in naira — convert at the boundary.
          subtotal: subtotalKobo / 100,
        }),
      })
      const json = (await res.json()) as
        | { valid: true; voucher: any; discount: number }
        | { valid: false; reason: string }
      if (id !== probeId.current) return
      if (!json.valid) {
        onApplied(null)
        setError(json.reason || 'Invalid voucher code')
        return
      }
      onApplied({
        voucherId: json.voucher.id,
        code: json.voucher.code,
        discountKobo: Math.round(json.discount * 100),
        label: json.voucher.label,
        type: json.voucher.type,
        value: Number(json.voucher.value),
      })
    } catch {
      setError('Could not check that code. Please try again.')
    } finally {
      setProbing(false)
    }
  }

  const clear = () => {
    setCode('')
    setError(null)
    onApplied(null)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      apply()
    }
  }

  // Collapsed state — single line CTA with a subtle ticket motif.
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-dashed border-[#7B2D8E]/30 bg-gradient-to-r from-[#7B2D8E]/[0.04] to-[#7B2D8E]/[0.08] px-4 py-3 text-left transition-colors hover:border-[#7B2D8E]/60 hover:from-[#7B2D8E]/[0.07] hover:to-[#7B2D8E]/[0.12]"
        aria-expanded="false"
      >
        <span className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E] ring-1 ring-[#7B2D8E]/15">
            <Ticket className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold text-gray-900">
              Have a voucher code?
            </span>
            <span className="block text-[11px] text-gray-500">
              Add it to take money off your booking.
            </span>
          </span>
        </span>
        <span className="rounded-full bg-[#7B2D8E] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm transition-transform group-hover:scale-[1.02]">
          Add code
        </span>
      </button>
    )
  }

  // Successful state — the perforated voucher card.
  if (applied) {
    const valueLabel =
      applied.type === 'percent'
        ? `${Math.round(Number(applied.value))}% off`
        : `${formatNaira(Number(applied.value) * 100)} off`

    return (
      <div
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#7B2D8E] via-[#5A1D6A] to-[#7B2D8E] text-white shadow-[0_18px_40px_-18px_rgba(123,45,142,0.6)]"
        role="status"
        aria-live="polite"
      >
        {/* Decorative scalloped notches — pure CSS, evoke the "tear
            here" of a paper voucher. Hidden from AT. */}
        <span
          aria-hidden
          className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white"
        />
        <span
          aria-hidden
          className="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white"
        />
        {/* Subtle starlight accent — never rendered as a heavy gradient. */}
        <span
          aria-hidden
          className="pointer-events-none absolute right-6 top-3 text-white/30"
        >
          <Sparkles className="h-4 w-4" />
        </span>

        <div className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <CheckCircle2
                className="h-3.5 w-3.5 text-emerald-300"
                aria-hidden
              />
              <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-white/85">
                Voucher applied
              </p>
            </div>
            <p className="mt-1 truncate font-mono text-[15px] font-bold tracking-tight">
              {applied.code}
            </p>
            {applied.label ? (
              <p className="truncate text-[11px] text-white/75">
                {applied.label}
              </p>
            ) : null}
          </div>

          {/* Dotted perforation between the two halves. */}
          <span
            aria-hidden
            className="h-12 w-px self-stretch bg-[radial-gradient(circle,_rgba(255,255,255,0.55)_1px,_transparent_1.5px)] bg-[length:1px_6px] bg-repeat-y"
          />

          <div className="text-right pl-2 sm:pl-3 col-start-2 row-start-1">
            <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider ring-1 ring-white/30">
              {valueLabel}
            </span>
            <p className="mt-1.5 text-[15px] font-bold tabular-nums">
              − {formatNaira(applied.discountKobo)}
            </p>
            <button
              type="button"
              onClick={clear}
              className="mt-1 inline-flex items-center gap-1 text-[10.5px] font-semibold text-white/75 underline underline-offset-2 hover:text-white"
            >
              <X className="h-3 w-3" />
              Remove
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Editing state — input + Apply button shaped like a coupon.
  return (
    <div className="rounded-2xl border border-[#7B2D8E]/20 bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#7B2D8E]">
          <Ticket className="h-3.5 w-3.5" />
          Voucher code
        </p>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            clear()
          }}
          className="text-[11px] font-medium text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <div className="relative flex-1">
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase())
              setError(null)
            }}
            onKeyDown={onKeyDown}
            placeholder="WELCOME20"
            spellCheck={false}
            autoCapitalize="characters"
            autoCorrect="off"
            className="block w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 pr-10 font-mono text-[15px] font-semibold tracking-[0.08em] text-gray-900 outline-none placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-gray-300 focus:border-[#7B2D8E] focus:ring-2 focus:ring-[#7B2D8E]/20"
            aria-label="Voucher code"
            aria-invalid={Boolean(error)}
          />
          {code ? (
            <button
              type="button"
              onClick={() => setCode('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Clear code"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={apply}
          disabled={probing || !code.trim()}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#7B2D8E] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#5A1D6A] disabled:opacity-50"
        >
          {probing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Ticket className="h-4 w-4" />
          )}
          {probing ? 'Checking…' : 'Apply'}
        </button>
      </div>

      {error ? (
        <div className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-rose-600">
          <TicketX className="h-3.5 w-3.5" />
          {error}
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-gray-500">
          Codes are case-insensitive. Discount is applied to your total below.
        </p>
      )}
    </div>
  )
}
