import {
  creditWallet,
  createInvoice,
  deleteAbandonedPayment,
  updateTransactionStatus,
  type Transaction,
} from '@/lib/wallet'
import { query, sql } from '@/lib/db'
import { getUserById } from '@/lib/auth'
import { getMembershipPlan, type MembershipTierId } from '@/lib/membership-plans'
import { invalidateUserMe } from '@/lib/redis'
import { sendMembershipConfirmation } from '@/lib/wallet-emails'
import { awardGlowPoints } from '@/lib/glow-points'
import { notifyUser } from '@/lib/notifications'

export interface FinalizeMembershipResult {
  activated: boolean
  alreadyProcessed?: boolean
  error?: 'plan_not_found' | 'amount_mismatch' | 'wallet_credit_failed'
}

/**
 * Atomically activates a pending Paystack membership subscription.
 * Safe to invoke concurrently from /api/membership/verify, Paystack webhooks,
 * and background/admin reconciliation — only the winning caller flips the
 * pending transaction to `completed` and applies tier activation + email.
 */
export async function finalizeMembershipPaystackPayment(opts: {
  transaction: Transaction
  paystackReference: string
  amountPaid: number
  customerEmail?: string | null
}): Promise<FinalizeMembershipResult> {
  const { transaction, paystackReference, amountPaid, customerEmail } = opts

  const meta = (transaction.metadata || {}) as Record<string, unknown>
  const planId = (meta.plan_id as MembershipTierId | undefined) || undefined
  const plan = getMembershipPlan(planId)
  if (!plan) {
    return { activated: false, error: 'plan_not_found' }
  }

  const reference =
    transaction.payment_reference ||
    (transaction as { reference?: string }).reference ||
    paystackReference

  if (Math.abs(amountPaid - plan.price) > 1) {
    console.error('membership verify amount mismatch', {
      reference,
      amountPaid,
      planPrice: plan.price,
    })
    await updateTransactionStatus(
      transaction.id,
      'failed',
      `Amount mismatch: paid ${amountPaid}, expected ${plan.price}`,
    )
    return { activated: false, error: 'amount_mismatch' }
  }

  const walletCredit = plan.siteWideOnly ? 0 : plan.price
  let creditTxId: number | null = null

  if (!plan.siteWideOnly && walletCredit > 0) {
    const creditResult = await creditWallet(
      transaction.user_id,
      walletCredit,
      `${plan.name} membership signup`,
      reference,
      paystackReference,
    )
    if (!creditResult.success || !creditResult.transaction) {
      console.error('credit wallet failed for membership', { reference })
      return { activated: false, error: 'wallet_credit_failed' }
    }
    if (creditResult.alreadyProcessed) {
      return { activated: false, alreadyProcessed: true }
    }
    creditTxId = creditResult.transaction.id
  } else {
    // Site-wide tiers (Silver / Gold) do not credit wallet balance — claim
    // the pending row atomically so only one caller activates + emails.
    const claim = await query<{ id: number }>(
      `UPDATE transactions
          SET status = 'completed',
              paystack_reference = COALESCE(paystack_reference, $2),
              updated_at = NOW()
        WHERE id = $1
          AND status <> 'completed'
        RETURNING id`,
      [transaction.id, paystackReference || null],
    )
    if (claim.rows.length === 0) {
      return { activated: false, alreadyProcessed: true }
    }
  }

  await awardGlowPoints({
    userId: String(transaction.user_id),
    delta: plan.glowPointsOnSignup,
    reason: 'membership_signup',
    description: `${plan.name} membership signup reward`,
    reference,
  }).catch((err) => {
    console.error('awardGlowPoints failed for membership', { reference, err })
  })

  if (creditTxId && creditTxId !== transaction.id) {
    await updateTransactionStatus(transaction.id, 'completed')
  }

  const expiresInterval = `${plan.validityMonths} months`
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

  await invalidateUserMe(String(transaction.user_id)).catch((err) => {
    console.error('invalidateUserMe after membership verify failed', err)
  })

  const user = await getUserById(String(transaction.user_id))
  const invoiceTxId = creditTxId ?? transaction.id
  const invoiceItems: Record<string, unknown>[] = [
    {
      description: `${plan.name} Membership (${plan.validityMonths} months)`,
      amount: plan.price,
      quantity: 1,
    },
  ]

  const invoice = await createInvoice(
    transaction.user_id,
    invoiceTxId,
    plan.price,
    invoiceItems,
    {
      name: user
        ? `${user.first_name} ${user.last_name}`
        : customerEmail || 'Member',
      email: user?.email || customerEmail || '',
      payment_method: 'Paystack',
      payment_reference: reference,
      plan_id: plan.id,
      plan_name: plan.name,
    },
  )

  const abandonedResult = await query<{ id: number }>(
    `SELECT id FROM abandoned_payments
     WHERE user_id = $1 AND payment_type = 'service'
     ORDER BY created_at DESC LIMIT 1`,
    [transaction.user_id],
  )
  if (abandonedResult.rows[0]) {
    await deleteAbandonedPayment(abandonedResult.rows[0].id)
  }

  await notifyUser({
    userId: String(transaction.user_id),
    title: `${plan.name} membership active`,
    message: plan.siteWideOnly
      ? `Your ${plan.name} membership is active and you earned ${plan.glowPointsOnSignup.toLocaleString('en-NG')} Glow Points.`
      : `Your ${plan.name} membership is active and ₦${walletCredit.toLocaleString('en-NG')} has been credited to your wallet.`,
    type: 'status_update',
    referenceType: 'membership',
    referenceId: reference,
    actionUrl: `/membership/receipt/${encodeURIComponent(reference)}`,
    priority: 'normal',
  }).catch(() => {})

  const recipientEmail = user?.email || customerEmail
  if (recipientEmail) {
    await sendMembershipConfirmation({
      email: recipientEmail,
      firstName: user?.first_name || 'there',
      planName: plan.name,
      planPrice: plan.price,
      walletCredit,
      glowPointsAwarded: plan.glowPointsOnSignup,
      siteWideOnly: plan.siteWideOnly,
      validityMonths: plan.validityMonths,
      reference,
      invoiceNumber: invoice?.invoice_number || null,
    }).catch((err) => {
      console.error('sendMembershipConfirmation failed', err)
    })
  }

  return { activated: true }
}
