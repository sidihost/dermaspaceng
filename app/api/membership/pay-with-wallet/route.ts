import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getUserById } from '@/lib/auth'
import {
  getWalletBalance,
  debitWallet,
  creditWallet,
  createInvoice,
} from '@/lib/wallet'
import { generateReference } from '@/lib/paystack'
import { getMembershipPlan } from '@/lib/membership-plans'
import { sql } from '@/lib/db'
import { invalidateUserMe } from '@/lib/redis'
import { sendMembershipConfirmation } from '@/lib/wallet-emails'

/*
 * POST /api/membership/pay-with-wallet
 *
 * Wallet-funded counterpart to /api/membership/subscribe — debits
 * the user&apos;s existing Dermaspace wallet for the plan price and
 * activates the membership in a single round trip. Useful when the
 * customer has already funded their wallet (gift cards, top-ups,
 * refunds) and prefers not to round-trip through Paystack.
 *
 * Tier branching:
 *   • Site tiers (Silver, Gold) — `siteWideOnly: true`. We ONLY
 *     debit the plan price; the bonus % is a feature-unlock level
 *     and is never credited to the wallet (matches the Paystack
 *     verify path).
 *   • Platinum — `siteWideOnly: false`. Debits the plan price and
 *     immediately credits the bonus % back so the customer&apos;s net
 *     wallet position mirrors the Paystack flow (paid in, got
 *     bonus back).
 *
 * Responds with { receiptUrl } — the client redirects to the same
 * /membership/receipt/<ref> surface used by Paystack.
 */

interface PayWithWalletBody {
  planId?: string
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Please sign in to continue' },
        { status: 401 },
      )
    }

    const body = (await request.json().catch(() => ({}))) as PayWithWalletBody
    const plan = getMembershipPlan(body.planId)
    if (!plan) {
      return NextResponse.json(
        { error: 'Unknown membership plan' },
        { status: 400 },
      )
    }

    // STAGE 1 - balance check. Bail before debiting so we never
    // leave the wallet in a partially-applied state.
    const userIdNum = user.id as unknown as number
    const balance = await getWalletBalance(userIdNum)
    if (balance < plan.price) {
      return NextResponse.json(
        {
          error: `Your wallet balance is too low. You have \u20A6${balance.toLocaleString(
            'en-NG',
          )} but need \u20A6${plan.price.toLocaleString('en-NG')}.`,
          balance,
          required: plan.price,
        },
        { status: 402 },
      )
    }

    // STAGE 2 - generate a stable reference for the receipt URL.
    // Prefixed `MW_` (Membership Wallet) so it stands out from
    // Paystack-driven `MS_` membership refs in the admin
    // transactions list.
    const reference = generateReference('MW')

    // STAGE 3 - debit the wallet for the plan price. This produces
    // the &quot;debit&quot; transaction the receipt + admin will reference.
    const debit = await debitWallet(
      userIdNum,
      plan.price,
      `Membership: ${plan.name}`,
      reference,
    )
    if (!debit.success || !debit.transaction) {
      return NextResponse.json(
        { error: debit.error || 'Could not debit your wallet.' },
        { status: 500 },
      )
    }

    // Stamp the debit transaction with the membership metadata so
    // the receipt page can resolve the plan + amounts the same way
    // it does for Paystack-driven memberships.
    const bonusCredit = plan.siteWideOnly
      ? 0
      : Math.round(plan.price * (plan.bonusCreditPct / 100))
    const totalWalletCredit = plan.siteWideOnly ? 0 : plan.price + bonusCredit

    const meta = {
      type: 'membership_subscription',
      plan_id: plan.id,
      plan_name: plan.name,
      bonus_credit: bonusCredit,
      total_wallet_credit: totalWalletCredit,
      validity_months: plan.validityMonths,
      paid_with: 'wallet',
    }
    await sql`
      UPDATE transactions
      SET metadata = ${JSON.stringify(meta)}::jsonb,
          description = ${`Membership: ${plan.name} (wallet)`}
      WHERE id = ${debit.transaction.id}
    `

    // STAGE 4 - Platinum bonus credit. Site tiers are NOT credited;
    // their %-figure is purely a feature-unlock level.
    if (!plan.siteWideOnly && bonusCredit > 0) {
      await creditWallet(
        userIdNum,
        bonusCredit,
        `${plan.name} membership bonus (${plan.bonusCreditPct}%)`,
        reference,
      )
    }

    // STAGE 5 - activate the membership on the user row. Same six
    // columns the Paystack verify path writes — keeps the dashboard
    // / membership card / staff lookups all reading from one
    // canonical place.
    const expiresInterval = `${plan.validityMonths} months`
    // For Platinum the wallet "balance" snapshot reflects the
    // credit they just received as a bonus (the plan price was
    // debited from their own balance, not granted by us). For
    // site tiers it stays 0 — no money changed hands beyond the
    // fee.
    const membershipBalance = plan.siteWideOnly ? 0 : bonusCredit
    await sql`
      UPDATE users
      SET membership_tier           = ${plan.id},
          membership_status         = 'active',
          membership_started_at     = NOW(),
          membership_expires_at     = NOW() + ${expiresInterval}::interval,
          membership_funded_amount  = ${plan.price},
          membership_balance        = ${membershipBalance}
      WHERE id = ${userIdNum}
    `

    // Bust the Redis /auth/me cache so the dashboard sees the new
    // membership on the next page load.
    await invalidateUserMe(String(userIdNum)).catch((err) => {
      console.error('[v0] invalidateUserMe after wallet membership pay failed', err)
    })

    // STAGE 6 - invoice. Item lines mirror the Paystack flow so
    // admin transaction details render identically regardless of
    // which payment method was used.
    const fullUser = await getUserById(String(userIdNum))
    const invoiceItems: Record<string, unknown>[] = [
      {
        description: `${plan.name} Membership (${plan.validityMonths} months)`,
        amount: plan.price,
        quantity: 1,
      },
    ]
    if (!plan.siteWideOnly && bonusCredit > 0) {
      invoiceItems.push({
        description: `Bonus wallet credit (${plan.bonusCreditPct}%)`,
        amount: bonusCredit,
        quantity: 1,
      })
    }
    const invoice = await createInvoice(
      userIdNum,
      debit.transaction.id,
      plan.price,
      invoiceItems,
      {
        name: fullUser
          ? `${fullUser.first_name} ${fullUser.last_name}`
          : user.email,
        email: fullUser?.email || user.email,
        payment_method: 'Wallet',
        payment_reference: reference,
        plan_id: plan.id,
        plan_name: plan.name,
      },
    )

    // STAGE 7 - confirmation email. Same template as the Paystack
    // path — the only difference is the customer paid from their
    // wallet, which is already obvious from the receipt itself.
    if (fullUser) {
      sendMembershipConfirmation({
        email: fullUser.email,
        firstName: fullUser.first_name,
        planName: plan.name,
        planPrice: plan.price,
        bonusCredit,
        totalWalletCredit,
        validityMonths: plan.validityMonths,
        reference,
        invoiceNumber: invoice?.invoice_number || null,
      }).catch((err) => {
        console.error('[v0] sendMembershipConfirmation (wallet) failed', err)
      })
    }

    return NextResponse.json({
      success: true,
      reference,
      receiptUrl: `/membership/receipt/${reference}`,
    })
  } catch (error) {
    console.error('[v0] membership pay-with-wallet error', error)
    return NextResponse.json(
      { error: 'Failed to complete wallet payment' },
      { status: 500 },
    )
  }
}
