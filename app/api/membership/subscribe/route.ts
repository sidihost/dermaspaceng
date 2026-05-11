import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { initializePayment, generateReference, toKobo } from '@/lib/paystack'
import { createPendingTransaction, createAbandonedPayment } from '@/lib/wallet'
import { getMembershipPlan } from '@/lib/membership-plans'

/*
 * POST /api/membership/subscribe
 *
 * Kicks off a Paystack payment for a Dermaspace membership plan.
 * Mirrors the wallet-funding flow (see /api/wallet/fund) but:
 *
 *   1. Re-derives the price + bonus from the plan catalog on the
 *      server — the client never gets to dictate amounts.
 *   2. Stamps Paystack metadata with `type: 'membership_subscription'`
 *      + the chosen tier, so the verify route can route the success
 *      callback into the membership activation path instead of a
 *      generic wallet top-up.
 *   3. Creates an abandoned-payment record pointing back at the
 *      membership checkout page so we can email a recovery link if
 *      the customer drops off before completing.
 *
 * Returns { authorization_url, reference } on success — the client
 * redirects to authorization_url. Verification + activation happens
 * in /api/membership/verify when Paystack calls our callback.
 */

interface SubscribeBody {
  planId?: string
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Please sign in to continue' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as SubscribeBody
    const plan = getMembershipPlan(body.planId)
    if (!plan) {
      return NextResponse.json({ error: 'Unknown membership plan' }, { status: 400 })
    }

    // Reference is prefixed `MS_` (Membership Subscription) so it
    // stands out from wallet-funding (`WF_`) and booking (`BK_`)
    // refs in the admin transactions list.
    const reference = generateReference('MS')
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/membership/verify?reference=${reference}`

    // Wallet credit (Platinum only) + Glow Points award, stamped on
    // both the Paystack metadata and the pending transaction so the
    // verify route can replay them without recomputing from the
    // catalog. Site tiers (Silver / Gold) don&apos;t credit any money —
    // the loyalty reward is the Glow Points.
    const walletCredit = plan.siteWideOnly ? 0 : plan.price
    const glowPointsOnSignup = plan.glowPointsOnSignup

    const paymentResponse = await initializePayment({
      email: user.email,
      amount: toKobo(plan.price),
      reference,
      callbackUrl,
      metadata: {
        user_id: user.id,
        // verify route reads this to know it&apos;s a membership flow.
        type: 'membership_subscription',
        plan_id: plan.id,
        plan_name: plan.name,
        wallet_credit: walletCredit,
        glow_points: glowPointsOnSignup,
        site_wide_only: plan.siteWideOnly,
        validity_months: plan.validityMonths,
        // Paystack &quot;custom_fields&quot; show up on the merchant dashboard
        // transaction detail, which is gold when finance is trying
        // to reconcile a payment a year from now.
        custom_fields: [
          {
            display_name: 'Customer Name',
            variable_name: 'customer_name',
            value: `${user.first_name} ${user.last_name}`,
          },
          {
            display_name: 'Payment Type',
            variable_name: 'payment_type',
            value: `${plan.name} Membership`,
          },
          {
            display_name: 'Plan',
            variable_name: 'plan',
            value: plan.name,
          },
        ],
      },
    })

    if (!paymentResponse || !paymentResponse.status) {
      return NextResponse.json(
        { error: 'Failed to initialize payment with Paystack' },
        { status: 502 },
      )
    }

    // Pending transaction row — flipped to `completed` (or `failed`)
    // by /api/membership/verify after Paystack confirms. We pass the
    // plan id through metadata so the verify route doesn&apos;t need to
    // round-trip to Paystack just to read it back.
    await createPendingTransaction(
      user.id as unknown as number,
      plan.price,
      'credit',
      'paystack',
      `Membership: ${plan.name}`,
      reference,
      paymentResponse.data.reference,
      {
        type: 'membership_subscription',
        plan_id: plan.id,
        wallet_credit: walletCredit,
        glow_points: glowPointsOnSignup,
        site_wide_only: plan.siteWideOnly,
        validity_months: plan.validityMonths,
      },
    )

    // Abandoned-payment record — if the customer bounces from the
    // Paystack page without paying we can email them a one-click
    // recovery link straight back to the same checkout step.
    await createAbandonedPayment(
      user.id as unknown as number,
      'service',
      plan.price,
      {
        type: 'membership_subscription',
        plan_id: plan.id,
        plan_name: plan.name,
      },
      `${process.env.NEXT_PUBLIC_APP_URL}/membership/checkout?plan=${plan.id}`,
    )

    return NextResponse.json({
      success: true,
      authorization_url: paymentResponse.data.authorization_url,
      reference: paymentResponse.data.reference,
    })
  } catch (error) {
    console.error('[v0] membership subscribe error', error)
    return NextResponse.json(
      { error: 'Failed to start membership checkout' },
      { status: 500 },
    )
  }
}
