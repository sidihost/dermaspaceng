"use client"

/**
 * /staff/money
 *
 * Splice "Money" screen — translated to Dermaspace's purple brand and
 * dark-card aesthetic. Tabs:
 *
 *   - Splice wallet  → balance + virtual account + transactions
 *   - Payments       → Paystack-funded transactions only
 *   - Expense        → debits (payouts / refunds) — no editor yet
 *   - Finance        → reserved (P&L summary lands with the expenses
 *                      schema)
 *
 * The dark wallet card uses Dermaspace's deepest purple (#1F0626) with
 * a subtle pattern so the gradient still reads as on-brand rather than
 * "fintech generic black".
 */

import { useState } from "react"
import useSWR from "swr"
import {
  Database,
  Wallet,
  Info,
  MapPin,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Copy,
  Check,
  ArrowDownLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json())

interface MoneyData {
  wallet: { availableBalance: number; totalBalance: number; currency: string }
  virtualAccount: { bankName: string; accountName: string; accountNumber: string }
  transactions: {
    id: string
    reference: string
    type: "credit" | "debit" | "refund"
    status: string
    amount: number
    paymentMethod: string | null
    description: string
    createdAt: string
  }[]
  total: number
}

type Tab = "wallet" | "payments" | "expense" | "finance"

const tabToParam: Record<Tab, string> = {
  wallet: "all",
  payments: "payments",
  expense: "expense",
  finance: "all",
}

const naira = (n: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(n)

const formatDateTime = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function StaffMoneyPage() {
  const [tab, setTab] = useState<Tab>("wallet")
  const [page, setPage] = useState(1)
  const [copied, setCopied] = useState(false)
  const pageSize = 25

  const { data, isLoading } = useSWR<{ success: boolean } & MoneyData>(
    `/api/staff/money?tab=${tabToParam[tab]}&limit=${pageSize}&offset=${(page - 1) * pageSize}`,
    fetcher,
    { revalidateOnFocus: false }
  )

  const txs = data?.transactions ?? []
  const wallet = data?.wallet
  const va = data?.virtualAccount
  const total = data?.total ?? 0
  const lastPage = Math.max(1, Math.ceil(total / pageSize))

  const copyAccount = async () => {
    if (!va) return
    try {
      await navigator.clipboard.writeText(va.accountNumber)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* noop */
    }
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Money</h1>
        <div className="hidden sm:inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-600">
          <MapPin className="h-3.5 w-3.5 text-[#7B2D8E]" />
          Branch:&nbsp;<span className="font-medium text-gray-900">All branches</span>
          <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
        </div>
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1 rounded-full bg-gray-100 p-1 w-fit">
        {([
          ["wallet", "Splice wallet"],
          ["payments", "Payments"],
          ["expense", "Expense"],
          ["finance", "Finance"],
        ] as const).map(([t, label]) => (
          <button
            key={t}
            onClick={() => {
              setTab(t)
              setPage(1)
            }}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-full transition-colors",
              tab === t
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Dark wallet card */}
      <section className="relative overflow-hidden rounded-3xl bg-[#1F0626] p-5 sm:p-6 text-white">
        {/* Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)`,
              backgroundSize: "30px 30px",
            }}
          />
        </div>
        <div className="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-[#7B2D8E]/15" aria-hidden />
        <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-[#7B2D8E]/10" aria-hidden />

        <div className="relative z-10 grid gap-5 lg:grid-cols-2">
          {/* Available balance */}
          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 border border-white/15">
                <Wallet className="h-5 w-5" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-xs text-white/60">
                  Available Balance <Info className="h-3.5 w-3.5" />
                </div>
                <p className="mt-1 text-3xl sm:text-4xl font-bold tracking-tight">
                  {wallet ? naira(wallet.availableBalance) : "₦0"}
                </p>
                <p className="mt-1 text-xs text-white/60">
                  Total Balance{" "}
                  <span className="text-white font-semibold">
                    {wallet ? naira(wallet.totalBalance) : "₦0"}
                  </span>{" "}
                  <Info className="inline h-3 w-3 text-white/50" />
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-2">
              <Button className="bg-white text-[#1F0626] hover:bg-white/90 font-semibold rounded-xl">
                Withdraw
              </Button>
              <Button
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 rounded-xl bg-transparent"
              >
                Get paid
              </Button>
            </div>
          </div>

          {/* Virtual account */}
          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 border border-white/15">
                <Database className="h-5 w-5" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-xs text-white/60">
                  Virtual account details <Info className="h-3.5 w-3.5" />
                </div>
                <p className="mt-1 text-3xl sm:text-4xl font-bold tracking-tight tabular-nums">
                  {va?.accountNumber ?? "—"}
                </p>
                <p className="mt-1 text-xs text-white/60">
                  {va?.accountName ?? "—"}{" "}
                  <span className="text-white font-semibold">{va?.bankName ?? ""}</span>
                </p>
              </div>
            </div>
            <div className="mt-5">
              <Button
                onClick={copyAccount}
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 rounded-xl bg-transparent gap-2"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy details"}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Transactions table */}
      <section className="rounded-2xl border border-gray-100 bg-white">
        {/* Column headers */}
        <div className="hidden md:grid grid-cols-12 gap-3 border-b border-gray-100 bg-gray-50/50 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
          <div className="col-span-3">Date</div>
          <div className="col-span-4">Description</div>
          <div className="col-span-3">Transaction type</div>
          <div className="col-span-2 text-right">Amount</div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-[#7B2D8E]" />
          </div>
        ) : txs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
            <div className="h-12 w-12 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center text-[#7B2D8E]">
              <ArrowDownLeft className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-semibold text-gray-900">No transactions yet</p>
            <p className="mt-1 text-xs text-gray-500">
              {tab === "expense"
                ? "Log expenses to see them appear here."
                : "Customer payments will show up here as they come in."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {txs.map((t) => {
              const isDebit = t.type === "debit"
              return (
                <li
                  key={t.id}
                  className="grid grid-cols-12 gap-3 items-center px-5 py-3.5 hover:bg-[#7B2D8E]/[0.03] transition-colors"
                >
                  <div className="col-span-12 md:col-span-3 text-xs text-gray-700 tabular-nums">
                    {formatDateTime(t.createdAt)}
                  </div>
                  <div className="col-span-12 md:col-span-4 text-sm text-gray-900 truncate">
                    {t.description}
                  </div>
                  <div className="col-span-6 md:col-span-3 text-sm text-gray-600 capitalize">
                    {t.paymentMethod === "paystack"
                      ? "Paystack"
                      : t.paymentMethod === "wallet"
                        ? "Splice transfer"
                        : t.paymentMethod === "bank_transfer"
                          ? "Bank transfer"
                          : t.paymentMethod ?? t.type}
                  </div>
                  <div
                    className={cn(
                      "col-span-6 md:col-span-2 text-sm font-semibold tabular-nums text-right",
                      isDebit ? "text-[#7B2D8E] line-through" : "text-gray-900"
                    )}
                  >
                    {isDebit ? "- " : ""}
                    {naira(t.amount)}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {/* Paginator */}
        {txs.length > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-5 py-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#7B2D8E] disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, lastPage) }).map((_, i) => {
                const n = i + 1
                return (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={cn(
                      "h-7 min-w-[28px] rounded-md text-sm tabular-nums px-2",
                      n === page
                        ? "bg-[#7B2D8E] text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    {n}
                  </button>
                )
              })}
              {lastPage > 5 && <span className="px-1 text-gray-400">…</span>}
              {lastPage > 5 && (
                <button
                  onClick={() => setPage(lastPage)}
                  className={cn(
                    "h-7 min-w-[28px] rounded-md text-sm tabular-nums px-2",
                    lastPage === page
                      ? "bg-[#7B2D8E] text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  {lastPage}
                </button>
              )}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
              disabled={page >= lastPage}
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#7B2D8E] disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
