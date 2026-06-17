import { sql, query } from './db'

// Types
export interface Wallet {
  id: number
  user_id: number
  balance: number
  currency: string
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: number
  user_id: number
  wallet_id: number | null
  type: 'credit' | 'debit' | 'refund'
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  payment_method: 'wallet' | 'paystack' | 'bank_transfer' | 'cash'
  payment_reference: string | null
  paystack_reference: string | null
  description: string | null
  metadata: Record<string, unknown> | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface AbandonedPayment {
  id: number
  user_id: number
  payment_type: 'booking' | 'gift_card' | 'wallet_funding' | 'service'
  amount: number
  currency: string
  item_details: Record<string, unknown>
  recovery_token: string
  recovery_url: string
  reminder_sent: boolean
  reminder_sent_at: string | null
  expires_at: string
  created_at: string
}

export interface Invoice {
  id: number
  user_id: number
  transaction_id: number
  invoice_number: string
  amount: number
  currency: string
  status: 'draft' | 'sent' | 'paid' | 'cancelled'
  items: Record<string, unknown>[]
  billing_details: Record<string, unknown>
  pdf_url: string | null
  created_at: string
}

export interface WalletSettings {
  id: number
  user_id: number
  monthly_budget: number | null
  budget_alert_threshold: number
  low_balance_alert: number
  email_notifications: boolean
  push_notifications: boolean
  // Granular notification preferences surfaced in /dashboard/settings.
  // Defined in scripts 002 + 542. Optional on the type so older queries
  // that never selected these columns still compile.
  transaction_alerts?: boolean
  budget_alerts?: boolean
  promotional_emails?: boolean
  auto_reload_enabled: boolean
  auto_reload_amount: number | null
  auto_reload_threshold: number | null
  created_at: string
  updated_at: string
}

// Wallet functions
export async function getOrCreateWallet(userId: number): Promise<Wallet> {
  const result = await query<Wallet>(
    'SELECT * FROM wallets WHERE user_id = $1',
    [userId]
  )
  
  if (result.rows.length > 0) {
    return result.rows[0]
  }
  
  // Create new wallet
  const newWallet = await query<Wallet>(
    `INSERT INTO wallets (user_id, balance, currency)
     VALUES ($1, 0, 'NGN')
     RETURNING *`,
    [userId]
  )
  
  return newWallet.rows[0]
}

export async function getWalletBalance(userId: number): Promise<number> {
  const wallet = await getOrCreateWallet(userId)
  return wallet.balance
}

export async function creditWallet(
  userId: number,
  amount: number,
  description: string,
  paymentReference?: string,
  paystackReference?: string
): Promise<{ success: boolean; transaction?: Transaction; error?: string; alreadyProcessed?: boolean }> {
  try {
    const wallet = await getOrCreateWallet(userId)

    // Idempotency guard.
    // ------------------------------------------------------------
    // Both `/api/wallet/verify` (Paystack callback redirect) and
    // `/api/webhooks/paystack` can credit a successful payment, and
    // Paystack also retries webhooks aggressively. Without a guard
    // this function would happily run twice and double-credit the
    // customer's wallet (UPDATE balance = balance + amount).
    //
    // We use the existing pending transaction row as the lock: an
    // atomic conditional UPDATE flips status from 'pending' →
    // 'completed' and only succeeds for the FIRST caller. Every
    // subsequent caller sees rowCount === 0 and exits without
    // touching the wallet balance again.
    if (paymentReference) {
      // Atomic claim + credit in a SINGLE statement.
      // ----------------------------------------------------------
      // The Neon HTTP driver runs each query() as its own implicit
      // transaction, so doing the status flip and the balance
      // increment as two separate queries left a crash window: the
      // row could be marked 'completed' while the balance update
      // never ran, permanently losing the customer's money with no
      // way to retry. A writable CTE makes both happen (or neither)
      // in one atomic Postgres statement. The `status = 'pending'`
      // predicate is still the idempotency lock — only the first
      // caller matches a row; everyone else gets zero rows back.
      const claim = await query<{ id: number }>(
        `WITH claimed AS (
            UPDATE transactions
               SET status = 'completed',
                   paystack_reference = COALESCE(paystack_reference, $2),
                   updated_at = NOW()
             WHERE (reference = $1 OR paystack_reference = $1)
               AND user_id = $3
               AND type = 'credit'
               AND status = 'pending'
            RETURNING id, wallet_id, amount
         ), credited AS (
            UPDATE wallets w
               SET balance = balance + c.amount,
                   updated_at = NOW()
              FROM claimed c
             WHERE w.id = c.wallet_id
            RETURNING w.id
         )
         SELECT id FROM claimed`,
        [paymentReference, paystackReference || null, userId],
      )
      if (claim.rows.length === 0) {
        // The pending-row claim matched nothing. Figure out why.
        const existing = await query<Transaction>(
          `SELECT *, reference AS payment_reference FROM transactions
             WHERE (reference = $1 OR paystack_reference = $1)
               AND user_id = $2
               AND type = 'credit'
             ORDER BY created_at DESC
             LIMIT 1`,
          [paymentReference, userId],
        )

        if (existing.rows[0] && existing.rows[0].status === 'completed') {
          // Already finalised by an earlier caller — idempotent no-op.
          return {
            success: true,
            alreadyProcessed: true,
            transaction: existing.rows[0],
          }
        }

        if (existing.rows[0]) {
          // A row exists for this reference but it wasn't 'pending'
          // (e.g. it was marked 'failed' by an out-of-order webhook,
          // or it's a race we lost). We MUST NOT fall through to the
          // unguarded legacy credit below — that path bumps the
          // balance and THEN inserts a row whose `reference` is UNIQUE,
          // so the insert would throw and leave the balance changed
          // with no ledger entry. Instead, recover it with a second
          // ATOMIC claim keyed on the row id: flip any non-completed
          // state to 'completed' and add the balance in one statement.
          // Only the first caller matches a row; everyone else gets a
          // clean no-op. Safe because we only reach creditWallet after
          // Paystack confirmed the charge succeeded.
          const reclaim = await query<{ id: number }>(
            `WITH claimed AS (
                UPDATE transactions
                   SET status = 'completed',
                       paystack_reference = COALESCE(paystack_reference, $2),
                       updated_at = NOW()
                 WHERE id = $1
                   AND status <> 'completed'
                RETURNING id, wallet_id, amount
             ), credited AS (
                UPDATE wallets w
                   SET balance = balance + c.amount,
                       updated_at = NOW()
                  FROM claimed c
                 WHERE w.id = c.wallet_id
                RETURNING w.id
             )
             SELECT id FROM claimed`,
            [existing.rows[0].id, paystackReference || null],
          )
          const recovered = await query<Transaction>(
            'SELECT *, reference AS payment_reference FROM transactions WHERE id = $1',
            [existing.rows[0].id],
          )
          return {
            success: true,
            alreadyProcessed: reclaim.rows.length === 0,
            transaction: recovered.rows[0],
          }
        }
        // No row exists at all for this reference — genuine legacy /
        // direct credit. Fall through to the original behaviour below.
      } else {
        // We won the claim AND the balance was already credited in the
        // same atomic statement above. Just return the completed row.
        const txRow = await query<Transaction>(
          'SELECT *, reference AS payment_reference FROM transactions WHERE id = $1',
          [claim.rows[0].id],
        )
        return { success: true, transaction: txRow.rows[0] }
      }
    }

    // Create the ledger row FIRST. `reference` is UNIQUE, so if this
    // reference was already credited the INSERT throws here — before
    // we ever touch the balance — which prevents a duplicate credit
    // from leaving the balance changed without a matching record.
    const txResult = await query<Transaction>(
      `INSERT INTO transactions (
        user_id, wallet_id, type, amount, currency, status, 
        payment_method, reference, paystack_reference, description
      ) VALUES ($1, $2, 'credit', $3, 'NGN', 'completed', 'paystack', $4, $5, $6)
      RETURNING *, reference AS payment_reference`,
      [userId, wallet.id, amount, paymentReference, paystackReference, description]
    )

    // Ledger row created — now apply the balance.
    await query(
      'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
      [amount, wallet.id]
    )
    
    return { success: true, transaction: txResult.rows[0] }
  } catch (error) {
    console.error('Credit wallet error:', error)
    return { success: false, error: 'Failed to credit wallet' }
  }
}

export async function debitWallet(
  userId: number,
  amount: number,
  description: string,
  paymentReference?: string
): Promise<{ success: boolean; transaction?: Transaction; error?: string }> {
  try {
    const wallet = await getOrCreateWallet(userId)
    
    if (wallet.balance < amount) {
      return { success: false, error: 'Insufficient wallet balance' }
    }
    
    // Update wallet balance
    await query(
      'UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2',
      [amount, wallet.id]
    )
    
    // Create transaction record. `reference` is NOT NULL in the DB, so
    // fall back to a generated reference when the caller didn't supply one.
    const debitReference = paymentReference || `DBT_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const txResult = await query<Transaction>(
      `INSERT INTO transactions (
        user_id, wallet_id, type, amount, currency, status, 
        payment_method, reference, description
      ) VALUES ($1, $2, 'debit', $3, 'NGN', 'completed', 'wallet', $4, $5)
      RETURNING *, reference AS payment_reference`,
      [userId, wallet.id, amount, debitReference, description]
    )
    
    return { success: true, transaction: txResult.rows[0] }
  } catch (error) {
    console.error('Debit wallet error:', error)
    return { success: false, error: 'Failed to debit wallet' }
  }
}

export async function refundToWallet(
  userId: number,
  amount: number,
  originalTransactionId: number,
  description: string
): Promise<{ success: boolean; transaction?: Transaction; error?: string }> {
  try {
    const wallet = await getOrCreateWallet(userId)
    
    // Update wallet balance
    await query(
      'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
      [amount, wallet.id]
    )
    
    // Create refund transaction. `reference` is NOT NULL, so generate one.
    const refundReference = `RFND_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const txResult = await query<Transaction>(
      `INSERT INTO transactions (
        user_id, wallet_id, type, amount, currency, status, 
        payment_method, reference, description, metadata
      ) VALUES ($1, $2, 'refund', $3, 'NGN', 'completed', 'wallet', $4, $5, $6)
      RETURNING *, reference AS payment_reference`,
      [userId, wallet.id, amount, refundReference, description, JSON.stringify({ original_transaction_id: originalTransactionId })]
    )
    
    return { success: true, transaction: txResult.rows[0] }
  } catch (error) {
    console.error('Refund to wallet error:', error)
    return { success: false, error: 'Failed to process refund' }
  }
}

// Transaction functions
export async function getUserTransactions(
  userId: number,
  limit: number = 50,
  offset: number = 0
): Promise<Transaction[]> {
  const result = await query<Transaction>(
    `SELECT *, reference AS payment_reference FROM transactions 
     WHERE user_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  )
  return result.rows
}

export async function getTransactionById(transactionId: number): Promise<Transaction | null> {
  const result = await query<Transaction>(
    'SELECT *, reference AS payment_reference FROM transactions WHERE id = $1',
    [transactionId]
  )
  return result.rows[0] || null
}

export async function createPendingTransaction(
  userId: number,
  amount: number,
  type: 'credit' | 'debit',
  paymentMethod: 'wallet' | 'paystack',
  description: string,
  paymentReference: string,
  paystackReference?: string,
  metadata?: Record<string, unknown>
): Promise<Transaction | null> {
  try {
    const wallet = await getOrCreateWallet(userId)
    
    const result = await query<Transaction>(
      `INSERT INTO transactions (
        user_id, wallet_id, type, amount, currency, status, 
        payment_method, reference, paystack_reference, description, metadata
      ) VALUES ($1, $2, $3, $4, 'NGN', 'pending', $5, $6, $7, $8, $9)
      RETURNING *, reference AS payment_reference`,
      [userId, wallet.id, type, amount, paymentMethod, paymentReference, paystackReference, description, metadata ? JSON.stringify(metadata) : null]
    )
    
    return result.rows[0]
  } catch (error) {
    console.error('Create pending transaction error:', error)
    return null
  }
}

/**
 * Pending wallet-funding credits that are old enough to be worth
 * re-checking with Paystack but not so old they're surely abandoned.
 *
 * Used by the reconciliation sweep (`lib/reconcile-payments.ts`):
 *   - `minAgeSeconds` skips brand-new rows the user is probably still
 *     paying for, so we don't race the live checkout.
 *   - `maxAgeHours` ignores ancient rows (the abandoned-payment cron
 *     and `expireStalePendingFundings` handle those).
 */
export async function getPendingFundingTransactions(
  minAgeSeconds = 60,
  // Look back far enough to catch every stranded pending. The old 72h
  // window left fundings older than three days stuck at "pending"
  // forever because the sweep never fetched them again. 30 days covers
  // any realistic backlog while still ignoring truly ancient rows.
  maxAgeHours = 24 * 30,
  limit = 100,
): Promise<Transaction[]> {
  const result = await query<Transaction>(
    `SELECT *, reference AS payment_reference
       FROM transactions
      WHERE status = 'pending'
        AND type = 'credit'
        AND payment_method = 'paystack'
        AND created_at <= NOW() - ($1 || ' seconds')::interval
        AND created_at >= NOW() - ($2 || ' hours')::interval
      ORDER BY created_at ASC
      LIMIT $3`,
    [String(minAgeSeconds), String(maxAgeHours), limit],
  )
  return result.rows
}

/**
 * Cancel pending Paystack fundings that are too old to ever complete.
 *
 * A Paystack checkout link is only good for a short time; once the
 * customer abandons it the charge will never move to `success`, so a
 * row that has sat at `pending` past `olderThanHours` is dead weight
 * that clutters the wallet with permanent "Pending" entries.
 *
 * This is the safety net the reconciler's comment always promised but
 * which was never implemented — the reason the Jun 7–10 fundings were
 * stranded. We ONLY touch `credit` / `paystack` rows that are still
 * `pending`, and we set a clear `error_message` so the UI can explain
 * what happened. Reconciliation runs first, so anything that genuinely
 * succeeded is credited before it could ever be expired here.
 */
export async function expireStalePendingFundings(
  olderThanHours = 24,
  userId?: string | number,
): Promise<number> {
  try {
    const params: (string | number)[] = [String(olderThanHours)]
    let userClause = ''
    if (userId !== undefined && userId !== null) {
      params.push(userId)
      userClause = ` AND user_id = $${params.length}`
    }
    const result = await query(
      `UPDATE transactions
          SET status = 'cancelled',
              error_message = 'Payment session expired before it was completed',
              updated_at = NOW()
        WHERE status = 'pending'
          AND type = 'credit'
          AND payment_method = 'paystack'
          AND created_at <= NOW() - ($1 || ' hours')::interval${userClause}`,
      params,
    )
    return result.rowCount ?? 0
  } catch (error) {
    console.error('Expire stale pending fundings error:', error)
    return 0
  }
}

export async function updateTransactionStatus(
  transactionId: number,
  status: 'completed' | 'failed' | 'cancelled',
  errorMessage?: string
): Promise<boolean> {
  try {
    await query(
      `UPDATE transactions 
       SET status = $1, error_message = $2, updated_at = NOW() 
       WHERE id = $3`,
      [status, errorMessage || null, transactionId]
    )
    return true
  } catch (error) {
    console.error('Update transaction status error:', error)
    return false
  }
}

export async function getTransactionByReference(reference: string): Promise<Transaction | null> {
  const result = await query<Transaction>(
    'SELECT *, reference AS payment_reference FROM transactions WHERE reference = $1 OR paystack_reference = $1',
    [reference]
  )
  return result.rows[0] || null
}

// Abandoned payment functions
export async function createAbandonedPayment(
  userId: number,
  paymentType: 'booking' | 'gift_card' | 'wallet_funding' | 'service',
  amount: number,
  itemDetails: Record<string, unknown>,
  recoveryUrl: string
): Promise<AbandonedPayment | null> {
  try {
    const recoveryToken = generateRecoveryToken()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    
    // The live table has no `recovery_url` column — we fold it into the
    // `item_details` jsonb and re-expose it as `recovery_url` on read.
    const result = await query<AbandonedPayment>(
      `INSERT INTO abandoned_payments (
        user_id, payment_type, amount, currency, item_details, 
        recovery_token, expires_at
      ) VALUES ($1, $2, $3, 'NGN', $4, $5, $6)
      RETURNING *, item_details->>'recovery_url' AS recovery_url, (reminder_count > 0) AS reminder_sent`,
      [userId, paymentType, amount, JSON.stringify({ ...itemDetails, recovery_url: recoveryUrl }), recoveryToken, expiresAt.toISOString()]
    )
    
    return result.rows[0]
  } catch (error) {
    console.error('Create abandoned payment error:', error)
    return null
  }
}

export async function getAbandonedPaymentByToken(token: string): Promise<AbandonedPayment | null> {
  const result = await query<AbandonedPayment>(
    `SELECT *, item_details->>'recovery_url' AS recovery_url, (reminder_count > 0) AS reminder_sent
     FROM abandoned_payments WHERE recovery_token = $1 AND expires_at > NOW()`,
    [token]
  )
  return result.rows[0] || null
}

export async function markAbandonedPaymentReminderSent(paymentId: number): Promise<boolean> {
  try {
    await query(
      `UPDATE abandoned_payments 
       SET reminder_count = reminder_count + 1, reminder_sent_at = NOW() 
       WHERE id = $1`,
      [paymentId]
    )
    return true
  } catch (error) {
    console.error('Mark reminder sent error:', error)
    return false
  }
}

export async function deleteAbandonedPayment(paymentId: number): Promise<boolean> {
  try {
    await query('DELETE FROM abandoned_payments WHERE id = $1', [paymentId])
    return true
  } catch (error) {
    console.error('Delete abandoned payment error:', error)
    return false
  }
}

export async function getUnsentAbandonedPaymentReminders(): Promise<AbandonedPayment[]> {
  const result = await query<AbandonedPayment>(
    `SELECT *, item_details->>'recovery_url' AS recovery_url, (reminder_count > 0) AS reminder_sent
     FROM abandoned_payments 
     WHERE reminder_count = 0 
     AND expires_at > NOW()
     AND created_at < NOW() - INTERVAL '1 hour'`
  )
  return result.rows
}

// Invoice functions
export async function createInvoice(
  userId: number,
  transactionId: number,
  amount: number,
  items: Record<string, unknown>[],
  billingDetails: Record<string, unknown>
): Promise<Invoice | null> {
  try {
    const invoiceNumber = generateInvoiceNumber()
    
    // The live `invoices` table stores money as subtotal/tax/total (no
    // `amount` column) and has no `billing_details` column — the billing
    // info is folded into the `items` jsonb. We alias total → amount and
    // items → billing_details on the way out so callers keep working.
    const result = await query<Invoice>(
      `INSERT INTO invoices (
        user_id, transaction_id, invoice_number, subtotal, tax, total, currency, 
        status, items, paid_at
      ) VALUES ($1, $2, $3, $4, 0, $4, 'NGN', 'paid', $5, NOW())
      RETURNING *, total AS amount, items AS billing_details`,
      [userId, transactionId, invoiceNumber, amount, JSON.stringify({ items, billing: billingDetails })]
    )
    
    return result.rows[0]
  } catch (error) {
    console.error('Create invoice error:', error)
    return null
  }
}

export async function getInvoiceById(invoiceId: number): Promise<Invoice | null> {
  const result = await query<Invoice>(
    'SELECT *, total AS amount, items AS billing_details FROM invoices WHERE id = $1',
    [invoiceId]
  )
  return result.rows[0] || null
}

export async function getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | null> {
  const result = await query<Invoice>(
    'SELECT *, total AS amount, items AS billing_details FROM invoices WHERE invoice_number = $1',
    [invoiceNumber]
  )
  return result.rows[0] || null
}

export async function getUserInvoices(userId: number): Promise<Invoice[]> {
  const result = await query<Invoice>(
    'SELECT *, total AS amount, items AS billing_details FROM invoices WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  )
  return result.rows
}

// Wallet settings functions
export async function getOrCreateWalletSettings(userId: number): Promise<WalletSettings> {
  // Alias `low_balance_threshold` (numeric column) → `low_balance_alert`
  // for the rest of the app; see updateWalletSettings for the matching
  // write-side mapping.
  const SELECT_COLS = `id, user_id, monthly_budget, budget_alert_threshold,
    low_balance_threshold AS low_balance_alert,
    email_notifications, push_notifications,
    transaction_alerts, budget_alerts, promotional_emails,
    auto_reload_enabled, auto_reload_amount, auto_reload_threshold,
    created_at, updated_at`

  const result = await query<WalletSettings>(
    `SELECT ${SELECT_COLS} FROM wallet_settings WHERE user_id = $1`,
    [userId]
  )
  
  if (result.rows.length > 0) {
    return result.rows[0]
  }
  
  // Create default settings
  const newSettings = await query<WalletSettings>(
    `WITH ins AS (
       INSERT INTO wallet_settings (user_id) VALUES ($1) RETURNING *
     )
     SELECT ${SELECT_COLS} FROM ins`,
    [userId]
  )
  
  return newSettings.rows[0]
}

export async function updateWalletSettings(
  userId: number,
  settings: Partial<Omit<WalletSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<WalletSettings | null> {
  try {
    const updates: string[] = []
    const values: unknown[] = []
    let paramIndex = 1
    
    if (settings.monthly_budget !== undefined) {
      updates.push(`monthly_budget = $${paramIndex++}`)
      values.push(settings.monthly_budget)
    }
    if (settings.budget_alert_threshold !== undefined) {
      updates.push(`budget_alert_threshold = $${paramIndex++}`)
      values.push(settings.budget_alert_threshold)
    }
    if (settings.low_balance_alert !== undefined) {
      // The wallet_settings table stores the numeric threshold in
      // `low_balance_threshold`. We accept the legacy `low_balance_alert`
      // field name from the API for backwards compatibility but route
      // it to the correct column. (The boolean `low_balance_alert`
      // column from script 001 is unused by the current UI.)
      updates.push(`low_balance_threshold = $${paramIndex++}`)
      values.push(settings.low_balance_alert)
    }
    if (settings.email_notifications !== undefined) {
      updates.push(`email_notifications = $${paramIndex++}`)
      values.push(settings.email_notifications)
    }
    if (settings.push_notifications !== undefined) {
      updates.push(`push_notifications = $${paramIndex++}`)
      values.push(settings.push_notifications)
    }
    // Notification preference toggles surfaced in /dashboard/settings.
    // Each is its own DB column (added via scripts 002 + 542). Skipping
    // a field here was the original cause of "Failed to update settings"
    // when the user flipped the Transaction Alerts toggle.
    if (settings.transaction_alerts !== undefined) {
      updates.push(`transaction_alerts = $${paramIndex++}`)
      values.push(settings.transaction_alerts)
    }
    if (settings.budget_alerts !== undefined) {
      updates.push(`budget_alerts = $${paramIndex++}`)
      values.push(settings.budget_alerts)
    }
    if (settings.promotional_emails !== undefined) {
      updates.push(`promotional_emails = $${paramIndex++}`)
      values.push(settings.promotional_emails)
    }
    if (settings.auto_reload_enabled !== undefined) {
      updates.push(`auto_reload_enabled = $${paramIndex++}`)
      values.push(settings.auto_reload_enabled)
    }
    if (settings.auto_reload_amount !== undefined) {
      updates.push(`auto_reload_amount = $${paramIndex++}`)
      values.push(settings.auto_reload_amount)
    }
    if (settings.auto_reload_threshold !== undefined) {
      updates.push(`auto_reload_threshold = $${paramIndex++}`)
      values.push(settings.auto_reload_threshold)
    }
    
    if (updates.length === 0) {
      return await getOrCreateWalletSettings(userId)
    }
    
    updates.push('updated_at = NOW()')
    values.push(userId)
    
    const result = await query<WalletSettings>(
      `UPDATE wallet_settings 
       SET ${updates.join(', ')} 
       WHERE user_id = $${paramIndex}
       RETURNING id, user_id, monthly_budget, budget_alert_threshold,
         low_balance_threshold AS low_balance_alert,
         email_notifications, push_notifications,
         transaction_alerts, budget_alerts, promotional_emails,
         auto_reload_enabled, auto_reload_amount, auto_reload_threshold,
         created_at, updated_at`,
      values
    )
    
    return result.rows[0]
  } catch (error) {
    console.error('Update wallet settings error:', error)
    return null
  }
}

// Admin functions
export async function getAllTransactions(
  filters?: {
    status?: string
    type?: string
    userId?: number
    startDate?: string
    endDate?: string
    search?: string
  },
  limit: number = 50,
  offset: number = 0
): Promise<{ transactions: Transaction[]; total: number }> {
  let whereClause = 'WHERE 1=1'
  const values: unknown[] = []
  let paramIndex = 1
  
  if (filters?.status) {
    whereClause += ` AND t.status = $${paramIndex++}`
    values.push(filters.status)
  }
  if (filters?.type) {
    whereClause += ` AND t.type = $${paramIndex++}`
    values.push(filters.type)
  }
  if (filters?.userId) {
    whereClause += ` AND t.user_id = $${paramIndex++}`
    values.push(filters.userId)
  }
  if (filters?.startDate) {
    whereClause += ` AND t.created_at >= $${paramIndex++}`
    values.push(filters.startDate)
  }
  if (filters?.endDate) {
    whereClause += ` AND t.created_at <= $${paramIndex++}`
    values.push(filters.endDate)
  }
  if (filters?.search) {
    whereClause += ` AND (t.reference ILIKE $${paramIndex} OR t.paystack_reference ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`
    values.push(`%${filters.search}%`)
    paramIndex++
  }
  
  // Get total count
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM transactions t ${whereClause}`,
    values
  )
  const total = parseInt(countResult.rows[0].count, 10)
  
  // Get transactions
  values.push(limit, offset)
  const result = await query<Transaction>(
    `SELECT t.*, t.reference AS payment_reference FROM transactions t 
     ${whereClause} 
     ORDER BY t.created_at DESC 
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    values
  )
  
  return { transactions: result.rows, total }
}

export async function getTransactionStats(): Promise<{
  totalTransactions: number
  totalRevenue: number
  pendingAmount: number
  failedCount: number
  todayRevenue: number
}> {
  // Revenue = money the business actually earned = completed booking/service
  // payments. Those are `debit` transactions (we debit the customer's wallet
  // when they pay for a booking). Wallet top-ups are `credit` and are NOT
  // revenue — they're just the customer moving their own money in. Refunds
  // (money paid back out) are subtracted. The previous query summed
  // `completed + credit`, which is why the dashboard showed ₦0 despite many
  // completed booking payments.
  const stats = await query<{
    total_transactions: string
    total_revenue: string
    pending_amount: string
    failed_count: string
    today_revenue: string
  }>(`
    SELECT 
      COUNT(*) as total_transactions,
      COALESCE(SUM(CASE WHEN status = 'completed' AND type = 'debit' THEN amount ELSE 0 END), 0)
        - COALESCE(SUM(CASE WHEN status = 'completed' AND type = 'refund' THEN amount ELSE 0 END), 0) as total_revenue,
      COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount,
      COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
      COALESCE(SUM(CASE WHEN status = 'completed' AND type = 'debit' AND created_at >= CURRENT_DATE THEN amount ELSE 0 END), 0)
        - COALESCE(SUM(CASE WHEN status = 'completed' AND type = 'refund' AND created_at >= CURRENT_DATE THEN amount ELSE 0 END), 0) as today_revenue
    FROM transactions
  `)
  
  const row = stats.rows[0]
  return {
    totalTransactions: parseInt(row.total_transactions, 10),
    totalRevenue: parseFloat(row.total_revenue),
    pendingAmount: parseFloat(row.pending_amount),
    failedCount: parseInt(row.failed_count, 10),
    todayRevenue: parseFloat(row.today_revenue),
  }
}

export async function getAllAbandonedPayments(
  limit: number = 50,
  offset: number = 0
): Promise<AbandonedPayment[]> {
  const result = await query<AbandonedPayment>(
    `SELECT *, item_details->>'recovery_url' AS recovery_url, (reminder_count > 0) AS reminder_sent
     FROM abandoned_payments 
     ORDER BY created_at DESC 
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  )
  return result.rows
}

// Helper functions
function generateRecoveryToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

function generateInvoiceNumber(): string {
  const prefix = 'INV'
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

// Format currency for display
export function formatCurrency(amount: number, currency: string = 'NGN'): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
