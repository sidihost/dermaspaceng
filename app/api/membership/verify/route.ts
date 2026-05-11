import { NextRequest, NextResponse } from 'next/server'
import { verifyPayment, fromKobo } from '@/lib/paystack'
import {
  getTransactionByReference,
  updateTransactionStatus,
  creditWallet,
  createInvoice,
  deleteAbandonedPayment,
} from '@/lib/wallet'
import { query, sql } from '@/lib/db'
import { getUserById } from '@/lib/auth'
import { getMembershipPlan, type MembershipTierId } from '@/lib/membership-plans'
import { invalidateUserMe } from '@/lib/redis'
import { sendMembershipConfirmation } from '@/lib/wallet-emails'
import { awardGlowPoints } from '@/lib/glow-points'

/*
 * GET /api/membership/verify?reference=<paystack-ref>
 *
 * Paystack callback for the membership flow. Mirrors
 * /api/wallet/verify, but on success we don&apos;t just credit the
 * wallet — we also flip the user&apos;s membership block on `users`
 * (tier / status / started_at / expires_at / funded amount) so the
 * dashboard recognises them as an active member from this moment
 * forward.
 *
 * Successful path lands the customer on
 * /membership/receipt/<reference> which renders a printable
 * receipt + sends a confirmation email with the same details.
 *
 * Idempotent: if Paystack retries the callback (or the customer
 * refreshes the success URL) the route notices the transaction is
 * already `completed` and short-circuits to the receipt.
 */
export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  const searchParams = request.nextUrl.searchParams
  const reference = searchParams.get('reference') || searchParams.get('trxref')

  if (!reference) {
    return NextResponse.redirect(`${appUrl}/membership?error=missing_reference`)
  }

  try {
    // STAGE 1 - confirm with Paystack. We never trust the query
    // string alone; an attacker could hand us any reference they
    // like.
    const verification = await verifyPayment(reference)
    if (!verification || !verification.status) {
      return NextResponse.redirect(`${appUrl}/membership?error=verification_failed`)
    }
    const { data } = verification

    // STAGE 2 - locate the pending transaction we created in the
    // subscribe step. Missing row = something tampered with the
    // callback, bail to the membership grid.
    const transaction = await getTransactionByReference(reference)
    if (!transaction) {
      return NextResponse.redirect(`${appUrl}/membership?error=transaction_not_found`)
    }

    // Already-processed short circuit (idempotency).
    if (transaction.status === 'completed') {
      return NextResponse.redirect(
        `${appUrl}/membership/receipt/${reference}?already_processed=true`,
      )
    }

    // STAGE 3 - branch on Paystack status.
    if (data.status === 'failed') {
      await updateTransactionStatus(
        transaction.id,
        'failed',
        data.gateway_response || 'Payment failed',
      )
      return NextResponse.redirect(
        `${appUrl}/membership?error=payment_failed&message=${encodeURIComponent(
          data.gateway_response || 'Payment failed',
        )}`,
      )
    }
    if (data.status === 'abandoned') {
      await updateTransactionStatus(transaction.id, 'cancelled', 'Payment abandoned by user')
      return NextResponse.redirect(`${appUrl}/membership?error=payment_abandoned`)
    }
    if (data.status !== 'success') {
      return NextResponse.redirect(`${appUrl}/membership?error=unknown_status`)
    }

    // STAGE 4 - success path. Pull the plan id from the pending
    // transaction&apos;s metadata (we stamped it in the subscribe step)
    // and re-derive the price + bonus so we never trust client or
    // gateway-supplied amounts.
    const meta = (transaction.metadata || {}) as Record<string, unknown>
    const planId = (meta.plan_id as MembershipTierId | undefined) || undefined
    const plan = getMembershipPlan(planId)
    if (!plan) {
      // Catalog row was deleted between subscribe and verify — rare,
      // but surface it cleanly rather than crashing.
      return NextResponse.redirect(`${appUrl}/membership?error=plan_not_found`)
    }

    const amountPaid = fromKobo(data.amount)
    // Site tiers (Silver / Gold) do NOT credit money to the wallet
    // — they grant Glow Points (a loyalty reward, not money). Only
    // the flagship Platinum spa membership funds the wallet on
    // activation, and it credits exactly the plan price (no monetary
    // bonus — the reward is the Glow Points + treatment discounts).
    const walletCredit = plan.siteWideOnly ? 0 : plan.price

    // Sanity check: the amount Paystack confirmed must match the
    // plan price we expected. Mismatched amounts indicate either a
    // catalog price change between subscribe and pay or a tampered
    // callback — either way, refuse to activate the membership and
    // flag for manual review.
    if (Math.abs(amountPaid - plan.price) > 1) {
      console.error('[v0] membership verify amount mismatch', {
        reference,
        amountPaid,
        planPrice: plan.price,
      })
      await updateTransactionStatus(
        transaction.id,
        'failed',
        `Amount mismatch: paid ${amountPaid}, expected ${plan.price}`,
      )
      return NextResponse.redirect(`${appUrl}/membership?error=amount_mismatch`)
    }

    // STAGE 5 - credit wallet.
    //
    // Platinum (the spa tier) credits the plan price to the user&apos;s
    // wallet so their payment lands as spendable balance for in-house
    // treatments. The loyalty reward (Glow Points) is granted
    // separately in STAGE 5b regardless of tier.
    //
    // Site tiers (Silver, Gold) DO NOT credit any money — they only
    // earn Glow Points. We skip the creditWallet call entirely so
    // site memberships never accidentally hand the user back the
    // fee they just paid.
    let creditTxId: number | null = null
    if (!plan.siteWideOnly && walletCredit > 0) {
      const creditResult = await creditWallet(
        transaction.user_id,
        walletCredit,
        `${plan.name} membership signup`,
        reference,
        data.reference,
      )
      if (!creditResult.success || !creditResult.transaction) {
        console.error('[v0] credit wallet failed for membership', { reference })
        return NextResponse.redirect(
          `${appUrl}/membership?error=wallet_credit_failed`,
        )
      }
      creditTxId = creditResult.transaction.id
    }

    // STAGE 5b - award Glow Points. Every tier earns a one-off
    // points award. Idempotent via the unique partial index on
    // (user_id, reason, reference) — a replayed callback is a no-op.
    await awardGlowPoints({
      userId: String(transaction.user_id),
      delta: plan.glowPointsOnSignup,
      reason: 'membership_signup',
      description: `${plan.name} membership signup reward`,
      reference,
    }).catch((err) => {
      // Points award failure is non-fatal — log it but don&apos;t block
      // the membership activation. The admin can re-run the award
      // manually if needed.
      console.error('[v0] awardGlowPoints failed for membership', {
        reference,
        err,
      })
    })

    // Flip the original pending transaction to completed so it
    // doesn&apos;t hang around in the customer&apos;s &quot;pending&quot; list.
    await updateTransactionStatus(transaction.id, 'completed')

    // STAGE 6 - activate the membership on the user row. All six
    // columns were added by script 480 — `tier`, `status`,
    // `started_at`, `expires_at`, `funded_amount`, `balance`.
    // `expires_at` uses Postgres arithmetic (NOW() + INTERVAL) so
    // the timezone is consistent with everything else in the DB.
    const expiresInterval = `${plan.validityMonths} months`
    // Site tiers leave `membership_balance` at 0 (no wallet credit
    // was granted); Platinum stores the credited total so the
    // dashboard membership card surfaces it.
    const membershipBalanceSnapshot = plan.siteWideOnly ? 0 : walletCredit
    await sql`
      UPDATE users
      SET membership_tier           = ${plan.id},
          membership_status         = 'active',
          membership_started_at     = NOW(),
          membership_expires_at     = NOW() + ${expiresInterval}::interval,
          membership_funded_amount  = ${plan.price},
          membership_balance        = ${membershipBalanceSnapshot}
      WHERE id = ${transaction.user_id}
    `

    // Bust the Redis cache so the dashboard sees the new membership
    // on the very next page load instead of 60s later.
    await invalidateUserMe(String(transaction.user_id)).catch((err) => {
      console.error('[v0] invalidateUserMe after membership verify failed', err)
    })

    // STAGE 7 - invoice + email. We keep the invoice items shape
    // matching the wallet-funding flow so the existing
    // /admin/transactions detail page renders our line items
    // without any change.
    const user = await getUserById(String(transaction.user_id))
    // Site tiers don&apos;t produce a credit transaction, so the
    // invoice is tied to the original (now-completed) pending
    // transaction instead.
    const invoiceTxId = creditTxId ?? transaction.id
    const invoiceItems: Record<string, unknown>[] = [
      {
        description: `${plan.name} Membership (${plan.validityMonths} months)`,
        amount: plan.price,
        quantity: 1,
      },
    ]
    // Glow Points are a non-monetary reward and never appear as an
    // invoice line item — they&apos;d add a confusing 0-naira row. The
    // receipt page surfaces the points separately.
    const invoice = await createInvoice(
      transaction.user_id,
      invoiceTxId,
      plan.price,
      invoiceItems,
      {
        name: user
          ? `${user.first_name} ${user.last_name}`
          : data.customer.email,
        email: user?.email || data.customer.email,
        payment_method: 'Paystack',
        payment_reference: reference,
        plan_id: plan.id,
        plan_name: plan.name,
      },
    )

    // Wipe the abandoned-payment row — payment is complete, no
    // recovery email needed. The lookup mirrors the wallet-fund
    // flow so we don&apos;t accidentally delete a different abandoned
    // record from the same user.
    const abandonedResult = await query<{ id: number }>(
      `SELECT id FROM abandoned_payments
       WHERE user_id = $1 AND payment_type = 'service'
       ORDER BY created_at DESC LIMIT 1`,
      [transaction.user_id],
    )
    if (abandonedResult.rows[0]) {
      await deleteAbandonedPayment(abandonedResult.rows[0].id)
    }

    // Confirmation email — wraps the same totals the receipt page
    // shows so the customer&apos;s inbox copy matches what they saw on
    // the web after payment.
    if (user) {
      await sendMembershipConfirmation({
        email: user.email,
        firstName: user.first_name,
        planName: plan.name,
        planPrice: plan.price,
        // Wallet credit fields — zero for site tiers, plan price for Platinum.
        walletCredit,
        glowPointsAwarded: plan.glowPointsOnSignup,
        siteWideOnly: plan.siteWideOnly,
        validityMonths: plan.validityMonths,
        reference,
        invoiceNumber: invoice?.invoice_number || null,
      }).catch((err) => {
        // Email failure is non-blocking — the customer already has
        // their membership and the receipt. Log so we notice.
        console.error('[v0] sendMembershipConfirmation failed', err)
      })
    }

    // Land on the printable receipt. We deliberately use the
    // Paystack reference (already URL-safe) as the route param so
    // refreshes are idempotent.
    return NextResponse.redirect(`${appUrl}/membership/receipt/${reference}`)
  } catch (error) {
    console.error('[v0] membership verify error', error)
    return NextResponse.redirect(`${appUrl}/membership?error=verification_error`)
  }
}
