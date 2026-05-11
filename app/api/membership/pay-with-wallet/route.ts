import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getUserById } from '@/lib/auth'
import {
  getWalletBalance,
  debitWallet,
  createInvoice,
} from '@/lib/wallet'
import { generateReference } from '@/lib/paystack'
import { getMembershipPlan } from '@/lib/membership-plans'
import { sql } from '@/lib/db'
import { invalidateUserMe } from '@/lib/redis'
import { sendMembershipConfirmation } from '@/lib/wallet-emails'
import { awardGlowPoints } from '@/lib/glow-points'

/*
 * POST /api/membership/pay-with-wallet
 *
 * Wallet-funded counterpart to /api/membership/subscribe — debits
 * the user&apos;s existing Dermaspace wallet for the plan price and
 * activates the membership in a single round trip. Useful when the
 * customer has already funded their wallet (gift cards, top-ups,
 * refunds) and prefers not to round-trip through Paystack.
 *
 * Reward model:
 *   • Every plan earns Glow Points on activation (the same one-off
 *     award the Paystack flow grants in STAGE 5b of the verify
 *     route). Points are a loyalty reward — they don&apos;t affect the
 *     wallet ledger.
 *   • No monetary &quot;cashback&quot; on either tier when paying from the
 *     wallet — the customer is spending their existing balance, so
 *     refunding any of it would defeat the purpose of charging for
 *     the membership at all.
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
    // the receipt page can resolve the plan + reward the same way
    // it does for Paystack-driven memberships.
    const meta = {
      type: 'membership_subscription',
      plan_id: plan.id,
      plan_name: plan.name,
      glow_points_awarded: plan.glowPointsOnSignup,
      validity_months: plan.validityMonths,
      paid_with: 'wallet',
    }
    await sql`
      UPDATE transactions
      SET metadata = ${JSON.stringify(meta)}::jsonb,
          description = ${`Membership: ${plan.name} (wallet)`}
      WHERE id = ${debit.transaction.id}
    `

    // STAGE 4 - activate the membership on the user row. Same six
    // columns the Paystack verify path writes — keeps the dashboard
    // / membership card / staff lookups all reading from one
    // canonical place. Wallet pay never produces a monetary credit
    // on top of the debit, so `membership_balance` always lands at 0.
    const expiresInterval = `${plan.validityMonths} months`
    await sql`
      UPDATE users
      SET membership_tier           = ${plan.id},
          membership_status         = 'active',
          membership_started_at     = NOW(),
          membership_expires_at     = NOW() + ${expiresInterval}::interval,
          membership_funded_amount  = ${plan.price},
          membership_balance        = 0
      WHERE id = ${userIdNum}
    `

    // STAGE 4b - award Glow Points. Same idempotent helper the
    // Paystack flow uses; reference is the wallet debit ref so a
    // replayed request never double-awards.
    await awardGlowPoints({
      userId: String(userIdNum),
      delta: plan.glowPointsOnSignup,
      reason: 'membership_signup',
      description: `${plan.name} membership signup reward (wallet)`,
      reference,
    }).catch((err) => {
      console.error('[v0] awardGlowPoints (wallet) failed', { reference, err })
    })

    // Bust the Redis /auth/me cache so the dashboard sees the new
    // membership + new Glow Points balance on the next page load.
    await invalidateUserMe(String(userIdNum)).catch((err) => {
      console.error('[v0] invalidateUserMe after wallet membership pay failed', err)
    })

    // STAGE 5 - invoice. Single line item — Glow Points aren&apos;t
    // monetary and never appear on the invoice.
    const fullUser = await getUserById(String(userIdNum))
    const invoiceItems: Record<string, unknown>[] = [
      {
        description: `${plan.name} Membership (${plan.validityMonths} months)`,
        amount: plan.price,
        quantity: 1,
      },
    ]
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

    // STAGE 6 - confirmation email. Same template as the Paystack
    // path — the only difference is the customer paid from their
    // wallet, which is already obvious from the receipt itself.
    if (fullUser) {
      sendMembershipConfirmation({
        email: fullUser.email,
        firstName: fullUser.first_name,
        planName: plan.name,
        planPrice: plan.price,
        // Wallet-pay never credits the wallet back, regardless of tier.
        walletCredit: 0,
        glowPointsAwarded: plan.glowPointsOnSignup,
        siteWideOnly: plan.siteWideOnly,
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
