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
      const claim = await query<{ id: number }>(
        `UPDATE transactions
            SET status = 'completed',
                paystack_reference = COALESCE(paystack_reference, $2),
                updated_at = NOW()
          WHERE (reference = $1 OR paystack_reference = $1)
            AND user_id = $3
            AND type = 'credit'
            AND status = 'pending'
          RETURNING id`,
        [paymentReference, paystackReference || null, userId],
      )
      if (claim.rows.length === 0) {
        // Either there was never a pending row (older code path that
        // didn't create one — fall through and credit normally) or
        // somebody else already claimed it (idempotent no-op).
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
          return {
            success: true,
            alreadyProcessed: true,
            transaction: existing.rows[0],
          }
        }
        // No pending row exists — must be a legacy / direct credit
        // path. Fall through to the original behaviour below.
      } else {
        // We successfully claimed the pending row. Apply the wallet
        // credit, then return the now-completed transaction.
        await query(
          'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
          [amount, wallet.id],
        )
        const txRow = await query<Transaction>(
          'SELECT *, reference AS payment_reference FROM transactions WHERE id = $1',
          [claim.rows[0].id],
        )
        return { success: true, transaction: txRow.rows[0] }
      }
    }

    // Update wallet balance
    await query(
      'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
      [amount, wallet.id]
    )
    
    // Create transaction record
    const txResult = await query<Transaction>(
      `INSERT INTO transactions (
        user_id, wallet_id, type, amount, currency, status, 
        payment_method, reference, paystack_reference, description
      ) VALUES ($1, $2, 'credit', $3, 'NGN', 'completed', 'paystack', $4, $5, $6)
      RETURNING *, reference AS payment_reference`,
      [userId, wallet.id, amount, paymentReference, paystackReference, description]
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
  const stats = await query<{
    total_transactions: string
    total_revenue: string
    pending_amount: string
    failed_count: string
    today_revenue: string
  }>(`
    SELECT 
      COUNT(*) as total_transactions,
      COALESCE(SUM(CASE WHEN status = 'completed' AND type = 'credit' THEN amount ELSE 0 END), 0) as total_revenue,
      COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount,
      COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
      COALESCE(SUM(CASE WHEN status = 'completed' AND type = 'credit' AND created_at >= CURRENT_DATE THEN amount ELSE 0 END), 0) as today_revenue
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
