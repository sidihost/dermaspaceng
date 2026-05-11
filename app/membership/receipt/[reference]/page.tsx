import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { sql } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { getMembershipPlan, type MembershipTierId } from '@/lib/membership-plans'
import ReceiptClient from './receipt-client'

export const metadata: Metadata = {
  title: 'Membership receipt | Dermaspace',
  description: 'Your Dermaspace membership receipt.',
  // Receipts contain personal payment data — keep them out of
  // search engines.
  robots: { index: false, follow: false },
}

/*
 * /membership/receipt/[reference]
 *
 * Printable receipt for a completed membership purchase. We land
 * here in three flows:
 *
 *   1. Direct redirect from /api/membership/verify after a fresh
 *      Paystack payment clears.
 *   2. Reload of a recent receipt (idempotent — the verify route
 *      short-circuits to here when the transaction is already
 *      `completed`).
 *   3. Customer revisits the URL from their confirmation email.
 *
 * Server-side we:
 *   - Authenticate (anyone can&apos;t open someone else&apos;s receipt).
 *   - Resolve the transaction by payment reference.
 *   - Verify it belongs to the signed-in user (or an admin).
 *   - Pull the matching invoice row + the membership snapshot.
 *
 * The actual visual is in ./receipt-client (a client component so
 * we can wire the &quot;Print receipt&quot; button to window.print()).
 */

type TxRow = {
  id: number
  user_id: number
  amount: string | number
  status: string
  payment_reference: string | null
  paystack_reference: string | null
  description: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

type UserRow = {
  id: string
  email: string
  first_name: string
  last_name: string
  membership_tier: string | null
  membership_status: string | null
  membership_started_at: string | null
  membership_expires_at: string | null
  membership_funded_amount: string | number | null
  membership_balance: string | number | null
}

type InvoiceRow = {
  invoice_number: string
  amount: string | number
  created_at: string
}

export default async function MembershipReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>
  searchParams: Promise<{ already_processed?: string }>
}) {
  const [{ reference }, sp] = await Promise.all([params, searchParams])
  const decoded = decodeURIComponent(reference)

  // STAGE 1 - auth. Bounce to signin with a next= so we come back
  // to the same receipt after login.
  const user = await getCurrentUser()
  if (!user) {
    const next = encodeURIComponent(`/membership/receipt/${reference}`)
    redirect(`/signin?next=${next}`)
  }

  // STAGE 2 - look up the transaction by either of the two
  // reference fields (we set both during subscribe -> Paystack
  // hands us back the same string, but defensive against future
  // refactors).
  const txRows = await sql<TxRow[]>`
    SELECT id, user_id, amount, status, payment_reference, paystack_reference,
           description, metadata, created_at
    FROM transactions
    WHERE payment_reference = ${decoded}
       OR paystack_reference = ${decoded}
    ORDER BY created_at DESC
    LIMIT 1
  `
  const tx = txRows[0]
  if (!tx) notFound()

  // STAGE 3 - membership transactions only. Wallet-funding +
  // booking receipts have their own surfaces.
  const meta = (tx.metadata || {}) as Record<string, unknown>
  if (meta.type !== 'membership_subscription') {
    redirect('/dashboard/transactions')
  }

  // STAGE 4 - ownership. Customers see only their own receipts; an
  // admin can open anyone&apos;s. We compare numbers-with-numbers using
  // String() because user.id is a string and tx.user_id is a number.
  const isOwner = String(tx.user_id) === String(user.id)
  const isAdmin = user.role === 'admin'
  if (!isOwner && !isAdmin) notFound()

  // STAGE 5 - hydrate the buyer + invoice for the receipt body.
  const buyerRows = await sql<UserRow[]>`
    SELECT id, email, first_name, last_name,
           membership_tier, membership_status,
           membership_started_at, membership_expires_at,
           COALESCE(membership_funded_amount, 0) AS membership_funded_amount,
           COALESCE(membership_balance, 0)        AS membership_balance
    FROM users
    WHERE id = ${tx.user_id}
    LIMIT 1
  `
  const buyer = buyerRows[0]
  if (!buyer) notFound()

  // Invoice may not exist if the verify route hit a transient
  // failure between credit + invoice — the receipt still renders,
  // just without an invoice number.
  const invoiceRows = await sql<InvoiceRow[]>`
    SELECT invoice_number, amount, created_at
    FROM invoices
    WHERE transaction_id = ${tx.id}
    ORDER BY created_at DESC
    LIMIT 1
  `
  const invoice = invoiceRows[0] || null

  // STAGE 6 - resolve the plan + the bonus math. We prefer the
  // values stamped on the transaction metadata (they were derived
  // at subscribe time and are immutable), and fall back to a fresh
  // catalog lookup if metadata is missing.
  const planId = (meta.plan_id as MembershipTierId | undefined) || undefined
  const plan = getMembershipPlan(planId)
  const siteWideOnly = plan?.siteWideOnly ?? false
  const planPrice = Number(tx.amount) || (plan?.price ?? 0)
  // Site tiers do not credit wallet money — clamp the bonus + total
  // to zero so the receipt doesn&apos;t fall back to a stale catalog
  // calculation that would render a misleading wallet row.
  const bonusCredit = siteWideOnly
    ? 0
    : Number(meta.bonus_credit ?? 0) ||
      (plan ? Math.round(plan.price * (plan.bonusCreditPct / 100)) : 0)
  const totalWalletCredit = siteWideOnly
    ? 0
    : Number(meta.total_wallet_credit ?? 0) || planPrice + bonusCredit
  const validityMonths = Number(meta.validity_months ?? 0) || plan?.validityMonths || 12
  // Friendly payment method label — &quot;Wallet&quot; for the wallet-pay
  // flow, &quot;Paystack&quot; otherwise. The wallet flow stamps `paid_with`
  // on the transaction metadata at debit time.
  const paymentMethod =
    meta.paid_with === 'wallet' ? 'Wallet' : 'Paystack'

  return (
    <ReceiptClient
      reference={tx.paystack_reference || tx.payment_reference || decoded}
      txCreatedAt={tx.created_at}
      txStatus={tx.status}
      alreadyProcessed={sp.already_processed === 'true'}
      plan={{
        id: (planId as string) || 'membership',
        name: plan?.name || 'Membership',
        tagline: plan?.tagline || '',
        accent: plan?.accent || '#7B2D8E',
        bonusCreditPct: plan?.bonusCreditPct || 0,
        validityMonths,
        siteWideOnly,
      }}
      amounts={{
        planPrice,
        bonusCredit,
        totalWalletCredit,
      }}
      buyer={{
        firstName: buyer.first_name,
        lastName: buyer.last_name,
        email: buyer.email,
        membershipStartedAt: buyer.membership_started_at,
        membershipExpiresAt: buyer.membership_expires_at,
      }}
      paymentMethod={paymentMethod}
      invoiceNumber={invoice?.invoice_number || null}
    />
  )
}
