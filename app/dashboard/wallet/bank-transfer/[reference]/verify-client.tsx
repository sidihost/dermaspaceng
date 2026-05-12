'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { cn } from '@/lib/utils'

interface BankTransferVerifyClientProps {
  reference: string
  bank: string
  accountName: string
  accountNumber: string
  amount: string
  expiresAt: string
}

type PollState = 'pending' | 'completed' | 'failed' | 'expired'

const naira = (n: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)

/**
 * Compact mm:ss formatter for the expiry countdown. We render
 * "46 Mins" when there's >2 minutes left and switch to "mm:ss"
 * inside the final two minutes so the customer can see the
 * seconds tick away (psychology — the explicit count nudges them
 * to finish the transfer instead of context-switching).
 */
function formatRemaining(msLeft: number): string {
  if (msLeft <= 0) return 'Expired'
  const totalSec = Math.floor(msLeft / 1000)
  const minutes = Math.floor(totalSec / 60)
  const seconds = totalSec % 60
  if (minutes >= 2) {
    return `${minutes} Min${minutes === 1 ? '' : 's'}`
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function BankTransferVerifyClient({
  reference,
  bank,
  accountName,
  accountNumber,
  amount,
  expiresAt,
}: BankTransferVerifyClientProps) {
  const router = useRouter()
  const amountNum = Number(amount) || 0
  const expiryMs = useMemo(
    () => (expiresAt ? new Date(expiresAt).getTime() : Date.now() + 45 * 60_000),
    [expiresAt],
  )

  const [now, setNow] = useState<number>(() => Date.now())
  const [state, setState] = useState<PollState>('pending')
  const [reason, setReason] = useState<string | null>(null)
  const [copied, setCopied] = useState<'account' | 'amount' | null>(null)
  const [manualChecking, setManualChecking] = useState(false)
  const pollAbortRef = useRef<AbortController | null>(null)

  const msLeft = Math.max(0, expiryMs - now)
  const expired = msLeft === 0

  // Tick the timer every second. Lightweight setInterval — no need
  // for requestAnimationFrame because we only update once a second.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  // Status poll. We hit the lightweight DB-backed status endpoint
  // every 5 seconds and bail as soon as we see a terminal state.
  // The poll also kicks immediately on mount so a customer who
  // already paid in another tab sees the success screen instantly.
  const checkStatus = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) setManualChecking(true)
      pollAbortRef.current?.abort()
      const ctrl = new AbortController()
      pollAbortRef.current = ctrl
      try {
        const res = await fetch(`/api/wallet/fund/status/${reference}`, {
          signal: ctrl.signal,
          cache: 'no-store',
        })
        if (!res.ok) return
        const data = (await res.json()) as {
          status: PollState
          reason?: string | null
          amount?: number
        }
        setState(data.status)
        setReason(data.reason ?? null)
        if (data.status === 'completed') {
          // Hand off to the wallet success screen — the existing
          // /dashboard/wallet success toast handles the rest.
          router.replace(
            `/dashboard/wallet?success=true&amount=${encodeURIComponent(
              String(data.amount ?? amountNum),
            )}`,
          )
        }
      } catch {
        // Network blip — next interval will retry. Don't surface
        // anything to the customer for transient errors; the
        // expiry timer is the real failure mode.
      } finally {
        if (!silent) setManualChecking(false)
      }
    },
    [reference, router, amountNum],
  )

  useEffect(() => {
    void checkStatus({ silent: true })
    const id = window.setInterval(() => {
      if (!expired) void checkStatus({ silent: true })
    }, 5000)
    return () => {
      window.clearInterval(id)
      pollAbortRef.current?.abort()
    }
  }, [checkStatus, expired])

  // Once the virtual account expires, mark the page as expired so
  // we stop polling and surface the recovery CTA.
  useEffect(() => {
    if (expired && state === 'pending') {
      setState('expired')
    }
  }, [expired, state])

  const copy = useCallback(async (value: string, which: 'account' | 'amount') => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(which)
      window.setTimeout(() => setCopied(null), 1800)
    } catch {
      // Older browsers / locked permissions — fall back to a
      // synthetic textarea selection.
      const ta = document.createElement('textarea')
      ta.value = value
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
        setCopied(which)
        window.setTimeout(() => setCopied(null), 1800)
      } finally {
        document.body.removeChild(ta)
      }
    }
  }, [])

  // Missing bank info — the customer hit this URL directly without
  // going through the modal. Send them back to fund.
  if (!accountNumber) {
    return (
      <main className="min-h-screen bg-muted/30">
        <Header />
        <div className="max-w-md mx-auto px-4 py-16 text-center">
          <h1 className="text-lg font-semibold text-gray-900">Transfer details missing</h1>
          <p className="mt-2 text-sm text-gray-500">
            We couldn&apos;t find the bank transfer details for this session. Start a new
            funding request from your wallet.
          </p>
          <Button asChild className="mt-6 bg-[#7B2D8E] hover:bg-[#5A1D6A]">
            <Link href="/dashboard/wallet">Back to wallet</Link>
          </Button>
        </div>
        <Footer />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-muted/30">
      <Header />

      <div className="max-w-xl mx-auto px-4 py-6 sm:py-10">
        {/* Top bar — back arrow + screen title. Matches the
            screenshot's layout but in our light/purple theme. */}
        <div className="flex items-center gap-3 mb-5">
          <button
            type="button"
            onClick={() => router.push('/dashboard/wallet')}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
            aria-label="Back to wallet"
          >
            <ArrowLeft className="h-5 w-5 text-gray-900" />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">Pay with Bank Transfer</h1>
            <p className="text-xs text-gray-500">Reference {reference}</p>
          </div>
        </div>

        {/* Header copy + countdown */}
        <div className="mb-5 text-center sm:text-left">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 text-balance">
            {state === 'completed'
              ? 'Transfer confirmed — crediting your wallet'
              : state === 'failed'
                ? 'We couldn’t confirm your transfer'
                : state === 'expired'
                  ? 'The account number for this transfer has expired'
                  : 'We are waiting to confirm your transfer.'}
          </h2>
          {state === 'pending' && (
            <p className="mt-1 text-xs sm:text-sm text-gray-500">
              This can take a few minutes after you complete the bank transfer.
            </p>
          )}
          {state === 'pending' && !expired && (
            <p className="mt-3 inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-600">
              Account number expires in{' '}
              <span className={cn(
                'font-bold tabular-nums',
                msLeft < 5 * 60_000 ? 'text-red-600' : 'text-[#7B2D8E]',
              )}>
                {formatRemaining(msLeft)}
              </span>
            </p>
          )}
        </div>

        {/* Detail card. Border-dashed echoes the screenshot's
            "transfer voucher" treatment but in brand purple. */}
        <div className="rounded-2xl border-2 border-dashed border-[#7B2D8E]/30 bg-white p-5 sm:p-6 space-y-5">
          <DetailRow
            label="Bank name"
            value={bank || 'Paystack-Titan'}
            icon={<Building2 className="h-4 w-4 text-[#7B2D8E]" />}
          />
          <DetailRow label="Account name" value={accountName || 'Dermaspace Ltd'} />
          <DetailRow
            label="Account number"
            value={accountNumber}
            copyable
            copied={copied === 'account'}
            onCopy={() => copy(accountNumber, 'account')}
            mono
          />
          <DetailRow
            label="Amount"
            value={naira(amountNum)}
            copyable
            copied={copied === 'amount'}
            onCopy={() => copy(String(amountNum), 'amount')}
            mono
          />

          {/* "Sending → Receiving" progress indicator. The
              left node is always filled (the customer has the
              details); the bar fills as we wait; the right node
              fills once the transfer is confirmed. */}
          <div className="pt-4 border-t border-gray-100">
            <SendingReceivingBar state={state} />
          </div>
        </div>

        {/* Action area — depends on state */}
        <div className="mt-5">
          {state === 'pending' && !expired && (
            <>
              <Button
                onClick={() => checkStatus()}
                disabled={manualChecking}
                className="w-full gap-2 bg-[#7B2D8E] hover:bg-[#5A1D6A]"
                size="lg"
              >
                {manualChecking ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking transfer...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    I have paid — verify now
                  </>
                )}
              </Button>
              <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-gray-500">
                <ShieldCheck className="h-3.5 w-3.5 text-[#7B2D8E]" />
                Secured by Paystack. Your wallet is credited automatically.
              </p>
            </>
          )}

          {state === 'completed' && (
            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-[#7B2D8E] py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Redirecting to your wallet...
            </div>
          )}

          {(state === 'failed' || state === 'expired') && (
            <div className="rounded-xl border border-red-100 bg-red-50/50 p-4">
              <div className="flex items-start gap-3">
                <TriangleAlert className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {state === 'expired' ? 'Account number expired' : 'Transfer not confirmed'}
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    {reason ||
                      'Start a new funding request and reserve a fresh account number. If you already sent the transfer it will be refunded by your bank.'}
                  </p>
                </div>
              </div>
              <Button asChild className="mt-4 w-full bg-[#7B2D8E] hover:bg-[#5A1D6A]">
                <Link href="/dashboard/wallet">Back to wallet</Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  )
}

/**
 * Row inside the transfer-details card. Mirrors the screenshot:
 * uppercase tiny label above, primary value below, optional copy
 * button on the right.
 */
function DetailRow({
  label,
  value,
  icon,
  copyable,
  copied,
  onCopy,
  mono,
}: {
  label: string
  value: string
  icon?: React.ReactNode
  copyable?: boolean
  copied?: boolean
  onCopy?: () => void
  mono?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          {icon}
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-gray-500">
            {label}
          </p>
        </div>
        <p
          className={cn(
            'mt-1 text-sm sm:text-base font-semibold text-gray-900 break-all',
            mono && 'font-mono tracking-wide',
          )}
        >
          {value}
        </p>
      </div>
      {copyable && (
        <button
          type="button"
          onClick={onCopy}
          aria-label={`Copy ${label.toLowerCase()}`}
          className={cn(
            'flex-shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-lg border transition-colors',
            copied
              ? 'border-[#7B2D8E] bg-[#7B2D8E] text-white'
              : 'border-gray-200 text-[#7B2D8E] hover:bg-[#7B2D8E]/5',
          )}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      )}
    </div>
  )
}

/**
 * Two-node "Sending → Receiving" progress indicator. While we
 * wait, the left node is solid purple, the bar shows an
 * animated indeterminate fill, and the right node is hollow.
 * On completion both nodes go solid and the bar fills entirely.
 */
function SendingReceivingBar({ state }: { state: PollState }) {
  const sending = true
  const receiving = state === 'completed'
  return (
    <div className="flex items-center gap-3">
      {/* Left node — Sending */}
      <div className="flex flex-col items-center gap-1">
        <div
          className={cn(
            'h-6 w-6 rounded-full border-2 flex items-center justify-center',
            sending ? 'bg-[#7B2D8E] border-[#7B2D8E]' : 'border-gray-300',
          )}
        >
          {sending && <Check className="h-3 w-3 text-white" />}
        </div>
        <span className="text-[10.5px] font-semibold text-gray-700">Sending</span>
      </div>

      {/* Connector bar */}
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden relative">
        {state === 'pending' ? (
          <div className="absolute inset-y-0 left-0 h-full w-1/3 rounded-full bg-[#7B2D8E] animate-[transfer-progress_1.6s_ease-in-out_infinite]" />
        ) : state === 'completed' ? (
          <div className="absolute inset-y-0 left-0 h-full w-full rounded-full bg-[#7B2D8E]" />
        ) : (
          <div className="absolute inset-y-0 left-0 h-full w-1/2 rounded-full bg-gray-300" />
        )}
      </div>

      {/* Right node — Receiving */}
      <div className="flex flex-col items-center gap-1">
        <div
          className={cn(
            'h-6 w-6 rounded-full border-2 flex items-center justify-center',
            receiving ? 'bg-[#7B2D8E] border-[#7B2D8E]' : 'border-gray-300',
          )}
        >
          {receiving && <Check className="h-3 w-3 text-white" />}
        </div>
        <span className="text-[10.5px] font-semibold text-gray-700">Receiving</span>
      </div>

      {/* Keyframes for the indeterminate bar. Inlined as a
          `<style jsx global>` would re-mount; this matches the
          one-off animation pattern used elsewhere in the app. */}
      <style jsx>{`
        @keyframes transfer-progress {
          0% {
            transform: translateX(-30%);
          }
          50% {
            transform: translateX(120%);
          }
          100% {
            transform: translateX(280%);
          }
        }
      `}</style>
    </div>
  )
}
