'use client'

/**
 * /dashboard/transactions — full wallet transaction history.
 *
 * Mirrors the /dashboard/bookings page so the two account histories
 * have a consistent visual language: filter pills, status counts,
 * branded empty states, and the same row spacing rhythm.
 *
 * Data comes from /api/wallet/transactions which already returns the
 * user's transactions ordered newest-first with pre-formatted
 * amounts. The page is intentionally a "history" surface only —
 * funding the wallet stays on /dashboard/wallet so we don't fork the
 * action UI.
 */

import * as React from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import {
  ArrowLeft,
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Wallet,
  Gift,
  Calendar,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Plus,
} from 'lucide-react'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import PageLoader from '@/components/shared/page-loader'

interface Transaction {
  id: number
  type: 'credit' | 'debit' | 'refund'
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  payment_method: 'wallet' | 'paystack' | 'bank_transfer' | 'cash'
  description: string | null
  created_at: string
  reference?: string | null
  payment_reference?: string | null
  formattedAmount?: string
  formattedDate?: string
}

type FilterKey = 'all' | 'credit' | 'debit' | 'refund'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'credit', label: 'Money in' },
  { key: 'debit', label: 'Spent' },
  { key: 'refund', label: 'Refunds' },
]

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then(async (r) => {
    if (r.status === 401) return { unauthenticated: true } as const
    if (!r.ok) throw new Error('Failed to load transactions')
    return r.json() as Promise<{
      success: boolean
      transactions: Transaction[]
    }>
  })

function formatCurrency(amount: number, currency: string = 'NGN'): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) {
    return date.toLocaleTimeString('en-NG', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) {
    return date.toLocaleDateString('en-NG', { weekday: 'long' })
  }
  return date.toLocaleDateString('en-NG', {
    month: 'short',
    day: 'numeric',
    year: now.getFullYear() !== date.getFullYear() ? 'numeric' : undefined,
  })
}

function transactionIcon(tx: Transaction) {
  const desc = (tx.description ?? '').toLowerCase()
  if (desc.includes('wallet funding')) return Wallet
  if (desc.includes('gift card')) return Gift
  if (desc.includes('booking') || desc.includes('appointment')) return Calendar
  if (tx.type === 'credit') return ArrowDownLeft
  if (tx.type === 'debit') return ArrowUpRight
  if (tx.type === 'refund') return RotateCcw
  return CreditCard
}

function statusBadge(status: Transaction['status']) {
  switch (status) {
    case 'completed':
      return { Icon: CheckCircle2, className: 'text-[#7B2D8E]' }
    case 'pending':
      return { Icon: Clock, className: 'text-amber-500' }
    case 'failed':
      return { Icon: XCircle, className: 'text-red-500' }
    case 'cancelled':
      return { Icon: AlertCircle, className: 'text-gray-400' }
  }
}

export default function TransactionsContent() {
  const [filter, setFilter] = React.useState<FilterKey>('all')
  const { data, error, isLoading, mutate } = useSWR<
    { success: boolean; transactions: Transaction[] } | { unauthenticated: true }
  >('/api/wallet/transactions?limit=200', fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 30_000,
  })

  // Self-heal stuck "Pending" fundings.
  // ------------------------------------------------------------------
  // If Paystack's webhook was missed (or never configured), a wallet
  // funding can sit at "pending" forever — which is exactly what the
  // history screen showed: rows of "Wallet funding via Paystack …
  // Pending" that never resolved. When we detect any pending rows on
  // load we hit /api/wallet/reconcile ONCE (it re-checks each pending
  // funding directly with Paystack, then credits / fails / cancels it
  // via the shared idempotent finaliser) and re-fetch the list so the
  // statuses flip without the customer doing anything. Guarded by a
  // ref so it only fires once per mount, never in a loop.
  const reconciledRef = React.useRef(false)
  const hasPending =
    !!data &&
    'transactions' in data &&
    data.transactions.some((t) => t.status === 'pending')
  React.useEffect(() => {
    if (reconciledRef.current || !hasPending) return
    reconciledRef.current = true
    ;(async () => {
      try {
        await fetch('/api/wallet/reconcile', { credentials: 'include' })
        await mutate()
      } catch {
        /* best-effort — the cron sweep is the backstop */
      }
    })()
  }, [hasPending, mutate])

  // Use a real ellipsis character (…) instead of `\u2026`. JSX
  // double-quoted attributes are parsed as HTML attribute values,
  // not JS string literals, so a backslash-u escape would render
  // as the six literal characters `\u2026` — that was the bug.
  if (isLoading) return <PageLoader label="Loading your transactions…" />

  if (data && 'unauthenticated' in data) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20 text-center">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
              Sign in to see your transactions
            </h1>
            <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
              Your wallet activity is private to your account. Sign in to
              review every credit, debit and refund in one place.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
              <Link
                href="/signin?next=/dashboard/transactions"
                className="inline-flex items-center justify-center gap-2 px-5 h-11 rounded-full bg-[#7B2D8E] text-white text-sm font-semibold hover:bg-[#6B2278] transition-colors"
              >
                Sign in
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  const transactions: Transaction[] =
    (data && 'transactions' in data ? data.transactions : []) ?? []

  const filtered = transactions.filter((t) => {
    if (filter === 'all') return true
    return t.type === filter
  })

  const counts = {
    all: transactions.length,
    credit: transactions.filter((t) => t.type === 'credit').length,
    debit: transactions.filter((t) => t.type === 'debit').length,
    refund: transactions.filter((t) => t.type === 'refund').length,
  }

  // Aggregate totals — money in (completed credits + refunds) and
  // money spent (completed debits). We only count `completed` so a
  // failed/abandoned debit doesn't inflate either side.
  const completed = transactions.filter((t) => t.status === 'completed')
  const totalIn = completed
    .filter((t) => t.type === 'credit' || t.type === 'refund')
    .reduce((s, t) => s + t.amount, 0)
  const totalOut = completed
    .filter((t) => t.type === 'debit')
    .reduce((s, t) => s + t.amount, 0)

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          {/* Breadcrumb */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-[#7B2D8E] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to dashboard
          </Link>

          {/* Header */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                Transactions
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Every wallet credit, debit, and refund on your Dermaspace account.
              </p>
            </div>
            <Link
              href="/dashboard/wallet"
              className="inline-flex items-center justify-center gap-2 self-start sm:self-auto px-5 h-10 rounded-full bg-[#7B2D8E] text-white text-sm font-semibold hover:bg-[#6B2278] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Top up wallet
            </Link>
          </div>

          {/* Summary tiles — quick read of money flow without opening
              individual rows. Hidden from screen readers if there's no
              data, since "₦0 in" carries no meaning in that case. */}
          {transactions.length > 0 && (
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-gray-100 bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  Money in
                </p>
                <p className="mt-1.5 text-xl sm:text-2xl font-bold text-[#7B2D8E]">
                  +{formatCurrency(totalIn)}
                </p>
                <p className="mt-0.5 text-[11px] text-gray-500">
                  {counts.credit + counts.refund} credit{counts.credit + counts.refund === 1 ? '' : 's'}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  Spent
                </p>
                <p className="mt-1.5 text-xl sm:text-2xl font-bold text-gray-900">
                  &minus;{formatCurrency(totalOut)}
                </p>
                <p className="mt-0.5 text-[11px] text-gray-500">
                  {counts.debit} payment{counts.debit === 1 ? '' : 's'}
                </p>
              </div>
            </div>
          )}

          {/* Filter pills */}
          <div className="mt-6 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto scrollbar-hide">
            <div className="inline-flex bg-gray-100 rounded-full p-1 gap-1">
              {FILTERS.map(({ key, label }) => {
                const active = filter === key
                const count = counts[key]
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilter(key)}
                    className={`inline-flex items-center gap-2 px-3.5 h-9 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors ${
                      active
                        ? 'bg-white text-[#7B2D8E] shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {label}
                    <span
                      className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10.5px] font-bold ${
                        active
                          ? 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* List */}
          <div className="mt-6">
            {error ? (
              <div className="rounded-2xl border border-red-100 bg-red-50/40 p-5 text-sm text-red-700">
                We couldn&apos;t load your transactions. Refresh the page or
                try again in a moment.
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState filter={filter} />
            ) : (
              <ul className="rounded-2xl border border-gray-100 bg-white divide-y divide-gray-100 overflow-hidden">
                {filtered.map((tx) => (
                  <TransactionRow key={tx.id} tx={tx} />
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

function EmptyState({ filter }: { filter: FilterKey }) {
  const copy: Record<FilterKey, { title: string; body: string }> = {
    all: {
      title: 'No transactions yet',
      body: 'Top up your wallet or book a treatment and your activity will appear here.',
    },
    credit: {
      title: 'No credits yet',
      body: 'Wallet top-ups and incoming credits will show up here.',
    },
    debit: {
      title: 'Nothing spent yet',
      body: 'Payments for bookings and treatments will appear here.',
    },
    refund: {
      title: 'No refunds',
      body: 'Refunds for cancelled or adjusted bookings would show up here.',
    },
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-8 sm:p-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center mx-auto mb-4">
        <Wallet className="w-7 h-7" />
      </div>
      <h2 className="text-base sm:text-lg font-semibold text-gray-900">
        {copy[filter].title}
      </h2>
      <p className="mt-1.5 text-sm text-gray-500 max-w-sm mx-auto">
        {copy[filter].body}
      </p>
      <Link
        href="/dashboard/wallet"
        className="mt-5 inline-flex items-center justify-center gap-2 px-5 h-10 rounded-full bg-[#7B2D8E] text-white text-sm font-semibold hover:bg-[#6B2278] transition-colors"
      >
        Top up your wallet
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  )
}

function TransactionRow({ tx }: { tx: Transaction }) {
  const Icon = transactionIcon(tx)
  // Deep link to the full detail page when the row has a reference.
  const reference = tx.payment_reference || tx.reference || null
  const isIncoming = tx.type === 'credit' || tx.type === 'refund'
  const sign = isIncoming ? '+' : '\u2212'
  const tone = isIncoming ? 'text-[#7B2D8E]' : 'text-gray-900'
  const iconTone = isIncoming
    ? 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
    : 'bg-[#7B2D8E]/10 text-[#7B2D8E]'

  const status = statusBadge(tx.status)
  const StatusIcon = status?.Icon

  const description =
    tx.description ||
    (tx.type === 'credit'
      ? 'Wallet funding'
      : tx.type === 'refund'
        ? 'Refund'
        : 'Payment')

  const rowInner = (
    <div className="flex items-center gap-3 sm:gap-4">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconTone}`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[14.5px] font-semibold text-gray-900 truncate">
              {description}
            </p>
            <p className={`text-[14.5px] font-semibold whitespace-nowrap ${tone}`}>
              {sign}
              {tx.formattedAmount ?? formatCurrency(tx.amount, tx.currency)}
            </p>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[12px] text-gray-500">
            <span>{formatRelativeDate(tx.created_at)}</span>
            <span aria-hidden="true">&middot;</span>
            <span className="capitalize">
              {tx.payment_method === 'paystack'
                ? 'Card'
                : tx.payment_method.replace('_', ' ')}
            </span>
            {StatusIcon && status && (
              <>
                <span aria-hidden="true">&middot;</span>
                <span className={`inline-flex items-center gap-1 ${status.className}`}>
                  <StatusIcon className="w-3 h-3" />
                  <span className="capitalize">{tx.status}</span>
                </span>
              </>
            )}
          </div>
        </div>
      </div>
  )

  if (reference) {
    return (
      <li>
        <Link
          href={`/dashboard/transactions/${encodeURIComponent(reference)}`}
          className="block px-4 sm:px-5 py-4 hover:bg-gray-50/60 transition-colors"
          aria-label={`View details for ${description}`}
        >
          {rowInner}
        </Link>
      </li>
    )
  }

  return (
    <li className="px-4 sm:px-5 py-4 hover:bg-gray-50/60 transition-colors">
      {rowInner}
    </li>
  )
}
