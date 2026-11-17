"use client"

/**
 * /staff/money
 *
 * DermaspaceNG Money & Ledger console. Tabs:
 *
 *   - DermaspaceNG Wallet → balance + virtual account + transactions
 *   - Payments            → Paystack-funded transactions only
 *   - Expense             → operating expenses recorded by staff
 *   - Finance             → completed ledger entries for reconciliation
 */

import { useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import {
  Database,
  Wallet,
  Info,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Copy,
  Check,
  ArrowDownLeft,
  Plus,
  Receipt,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useNotify } from "@/components/shared/notify"
import { cn } from "@/lib/utils"
import { getReceiptHref } from "@/lib/receipt-access"
import { safeFetcher } from "@/lib/safe-fetcher"
import { DataLoadError } from "@/components/shared/data-load-error"

const fetcher = (url: string) => safeFetcher(url, { cache: "no-store" })

interface MoneyData {
  wallet: { availableBalance: number; totalBalance: number; currency: string }
  virtualAccount: { bankName: string; accountName: string; accountNumber: string }
  defaultBranchLabel?: string
  transactions: {
    id: string
    reference: string | null
    bookingReference?: string | null
    metadataType?: string | null
    type: "credit" | "debit" | "refund" | "expense"
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
  finance: "finance",
}

const EXPENSE_CATEGORIES = [
  "Supplies & Products",
  "Equipment & Maintenance",
  "Utilities",
  "Staff & Operations",
  "Marketing",
  "Other",
]

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
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function StaffMoneyPage() {
  const notify = useNotify()
  const [tab, setTab] = useState<Tab>("wallet")
  const [page, setPage] = useState(1)
  const [copied, setCopied] = useState(false)
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [receiveOpen, setReceiveOpen] = useState(false)
  const [expenseCategory, setExpenseCategory] = useState(EXPENSE_CATEGORIES[0])
  const [expenseAmount, setExpenseAmount] = useState("")
  const [expenseDescription, setExpenseDescription] = useState("")
  const [savingExpense, setSavingExpense] = useState(false)
  const pageSize = 25

  const { data, error, isLoading, mutate } = useSWR<{ success: boolean } & MoneyData>(
    `/api/staff/money?tab=${tabToParam[tab]}&limit=${pageSize}&offset=${(page - 1) * pageSize}`,
    fetcher,
    { revalidateOnFocus: false }
  )

  const txs = data?.transactions ?? []
  const wallet = data?.wallet
  const va = data?.virtualAccount
  const hasAccountNumber = Boolean(va?.accountNumber?.trim())
  const total = data?.total ?? 0
  const lastPage = Math.max(1, Math.ceil(total / pageSize))

  const copyAccount = async () => {
    if (!va?.accountNumber?.trim()) return
    try {
      await navigator.clipboard.writeText(va.accountNumber)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* noop */
    }
  }

  const handleRecordExpense = async () => {
    const amountNum = Number(expenseAmount)
    if (!expenseDescription.trim() || !Number.isFinite(amountNum) || amountNum <= 0) {
      notify.error("Invalid expense", "Enter a description and a positive amount.")
      return
    }
    setSavingExpense(true)
    try {
      const res = await fetch("/api/staff/money", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: expenseCategory,
          description: expenseDescription.trim(),
          amount: amountNum,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        notify.error("Could not save expense", json?.error || `HTTP ${res.status}`)
        return
      }
      notify.success("Expense recorded", `${naira(amountNum)} logged under ${expenseCategory}.`)
      setExpenseOpen(false)
      setExpenseAmount("")
      setExpenseDescription("")
      setTab("expense")
      setPage(1)
      mutate()
    } catch {
      notify.error("Network error", "Could not record expense.")
    } finally {
      setSavingExpense(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Money</h1>
        <div className="flex items-center gap-2">
          <div className="hidden sm:inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600">
            <MapPin className="h-3.5 w-3.5 text-[#7B2D8E]" />
            Branch:&nbsp;<span className="font-medium text-gray-900">{data?.defaultBranchLabel || "All branches"}</span>
          </div>
          <Button
            size="sm"
            onClick={() => setExpenseOpen(true)}
            className="gap-1.5 bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white rounded-full"
          >
            <Plus className="h-3.5 w-3.5" />
            Record expense
          </Button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1 rounded-full bg-gray-100 p-1 w-fit">
        {([
          ["wallet", "DermaspaceNG Wallet"],
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
                ? "bg-white text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Dark flat wallet card (brand purple surface, zero gradients) */}
      <section className="relative overflow-hidden rounded-3xl bg-[#1F0626] p-5 sm:p-6 text-white border border-[#7B2D8E]/30">
        <div className="relative z-10 grid gap-4 lg:grid-cols-2">
          {/* Available balance */}
          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 border border-white/15">
                <Wallet className="h-4 w-4" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-xs text-white/70">
                  Available Balance <Info className="h-3.5 w-3.5" />
                </div>
                <p className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight tabular-nums">
                  {wallet ? naira(wallet.availableBalance) : "₦0"}
                </p>
                <p className="mt-1 text-xs text-white/70">
                  Total Credits{" "}
                  <span className="text-white font-semibold tabular-nums">
                    {wallet ? naira(wallet.totalBalance) : "₦0"}
                  </span>
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={() => setExpenseOpen(true)}
                className="bg-white text-[#1F0626] hover:bg-white/90 font-semibold rounded-xl"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Record expense
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setReceiveOpen(true)}
                className="border-white/30 text-white hover:bg-white/10 rounded-xl bg-transparent"
              >
                Get paid
              </Button>
            </div>
          </div>

          {/* Virtual account */}
          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 border border-white/15">
                <Database className="h-4 w-4" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-xs text-white/70">
                  Settlement Account <Info className="h-3.5 w-3.5" />
                </div>
                <p className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight tabular-nums truncate">
                  {hasAccountNumber ? va!.accountNumber : "Not configured"}
                </p>
                <p className="mt-1 text-xs text-white/70 truncate">
                  {va?.accountName ?? "Dermaspace Operations"}{" "}
                  <span className="text-white font-semibold">{va?.bankName ?? ""}</span>
                </p>
              </div>
            </div>
            <div className="mt-4">
              <Button
                type="button"
                onClick={copyAccount}
                disabled={!hasAccountNumber}
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 rounded-xl bg-transparent gap-2 disabled:opacity-40"
              >
                {copied ? <Check className="h-4 w-4 text-white" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy account number"}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {error && !data ? (
        <DataLoadError title="Could not load money ledger" error={error} onRetry={() => mutate()} />
      ) : (
        <section className="rounded-2xl border border-gray-100 bg-white">
          {/* Column headers */}
          <div className="hidden md:grid grid-cols-12 gap-3 border-b border-gray-100 bg-gray-50/50 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            <div className="col-span-3">Date</div>
            <div className="col-span-4">Description</div>
            <div className="col-span-2">Method</div>
            <div className="col-span-2 text-right">Amount</div>
            <div className="col-span-1 text-right">Receipt</div>
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
                const isDebit = t.type === "debit" || t.type === "expense"
                const receiptHref = getReceiptHref({
                  reference: t.reference,
                  bookingReference: t.bookingReference,
                  metadataType: t.metadataType,
                })
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
                    <div className="col-span-5 md:col-span-2 text-xs sm:text-sm text-gray-600 capitalize truncate">
                      {t.paymentMethod === "paystack"
                        ? "Paystack"
                        : t.paymentMethod === "wallet"
                          ? "DermaspaceNG Wallet"
                          : t.paymentMethod === "bank_transfer"
                            ? "Bank transfer"
                            : t.paymentMethod ?? t.type}
                    </div>
                    <div
                      className={cn(
                        "col-span-4 md:col-span-2 text-sm font-semibold tabular-nums text-right",
                        isDebit ? "text-[#7B2D8E]" : "text-gray-900"
                      )}
                    >
                      {isDebit ? "- " : "+ "}
                      {naira(t.amount)}
                    </div>
                    <div className="col-span-3 md:col-span-1 text-right">
                      {receiptHref ? (
                        <Link
                          href={receiptHref}
                          className="inline-flex items-center gap-1 rounded-full border border-[#7B2D8E]/30 px-2.5 py-1 text-[11px] font-semibold text-[#7B2D8E] hover:bg-[#7B2D8E]/5"
                        >
                          <Receipt className="h-3 w-3" />
                          <span className="hidden sm:inline">Receipt</span>
                        </Link>
                      ) : (
                        <span className="text-[11px] text-gray-400">—</span>
                      )}
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
      )}

      {/* Record Expense Dialog */}
      <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
        <DialogContent className="max-w-md border-gray-200 bg-white">
          <DialogHeader>
            <DialogTitle>Record operating expense</DialogTitle>
            <DialogDescription>
              Log a salon purchase or payout. This deducts from available balance and appears in the Expense report.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="expense-category">Category</Label>
              <select
                id="expense-category"
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value)}
                className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#7B2D8E] focus:outline-none"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="expense-amount">Amount (NGN)</Label>
              <Input
                id="expense-amount"
                type="number"
                min={1}
                step="100"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                placeholder="e.g. 15000"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="expense-desc">Description</Label>
              <Textarea
                id="expense-desc"
                value={expenseDescription}
                onChange={(e) => setExpenseDescription(e.target.value)}
                rows={3}
                placeholder="e.g. Restocked hyaluronic serums and cotton pads"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpenseOpen(false)} disabled={savingExpense}>
              Cancel
            </Button>
            <Button
              onClick={handleRecordExpense}
              disabled={savingExpense}
              className="bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white"
            >
              {savingExpense ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Save expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Get Paid / Receive Payment Dialog */}
      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogContent className="max-w-md border-gray-200 bg-white">
          <DialogHeader>
            <DialogTitle>Receive client payment</DialogTitle>
            <DialogDescription>
              Share settlement transfer details or direct walk-in clients to the booking checkout.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-xl border border-gray-200 bg-[#FBF9FC] p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Bank</span>
                <span className="font-semibold text-gray-900">{va?.bankName || "Wema Bank"}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Account name</span>
                <span className="font-semibold text-gray-900">{va?.accountName || "Dermaspace Operations"}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Account number</span>
                <span className="font-mono text-sm font-bold text-[#7B2D8E]">
                  {hasAccountNumber ? va!.accountNumber : "Not configured"}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!hasAccountNumber}
                onClick={copyAccount}
                className="flex-1 gap-1.5 border-[#7B2D8E]/30 text-[#7B2D8E]"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy account"}
              </Button>
              <Link
                href="/book"
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-md bg-[#7B2D8E] px-3 text-sm font-medium text-white hover:bg-[#5A1D6A]"
              >
                Walk-in checkout
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
