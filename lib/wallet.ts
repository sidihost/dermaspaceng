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
): Promise<{ success: boolean; transaction?: Transaction; error?: string }> {
  try {
    const wallet = await getOrCreateWallet(userId)
    
    // Update wallet balance
    await query(
      'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
      [amount, wallet.id]
    )
    
    // Create transaction record
    const txResult = await query<Transaction>(
      `INSERT INTO transactions (
        user_id, wallet_id, type, amount, currency, status, 
        payment_method, payment_reference, paystack_reference, description
      ) VALUES ($1, $2, 'credit', $3, 'NGN', 'completed', 'paystack', $4, $5, $6)
      RETURNING *`,
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
    
    // Create transaction record
    const txResult = await query<Transaction>(
      `INSERT INTO transactions (
        user_id, wallet_id, type, amount, currency, status, 
        payment_method, payment_reference, description
      ) VALUES ($1, $2, 'debit', $3, 'NGN', 'completed', 'wallet', $4, $5)
      RETURNING *`,
      [userId, wallet.id, amount, paymentReference, description]
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
    
    // Create refund transaction
    const txResult = await query<Transaction>(
      `INSERT INTO transactions (
        user_id, wallet_id, type, amount, currency, status, 
        payment_method, description, metadata
      ) VALUES ($1, $2, 'refund', $3, 'NGN', 'completed', 'wallet', $4, $5)
      RETURNING *`,
      [userId, wallet.id, amount, description, JSON.stringify({ original_transaction_id: originalTransactionId })]
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
    `SELECT * FROM transactions 
     WHERE user_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  )
  return result.rows
}

export async function getTransactionById(transactionId: number): Promise<Transaction | null> {
  const result = await query<Transaction>(
    'SELECT * FROM transactions WHERE id = $1',
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
        payment_method, payment_reference, paystack_reference, description, metadata
      ) VALUES ($1, $2, $3, $4, 'NGN', 'pending', $5, $6, $7, $8, $9)
      RETURNING *`,
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
    'SELECT * FROM transactions WHERE payment_reference = $1 OR paystack_reference = $1',
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
    
    const result = await query<AbandonedPayment>(
      `INSERT INTO abandoned_payments (
        user_id, payment_type, amount, currency, item_details, 
        recovery_token, recovery_url, expires_at
      ) VALUES ($1, $2, $3, 'NGN', $4, $5, $6, $7)
      RETURNING *`,
      [userId, paymentType, amount, JSON.stringify(itemDetails), recoveryToken, recoveryUrl, expiresAt.toISOString()]
    )
    
    return result.rows[0]
  } catch (error) {
    console.error('Create abandoned payment error:', error)
    return null
  }
}

export async function getAbandonedPaymentByToken(token: string): Promise<AbandonedPayment | null> {
  const result = await query<AbandonedPayment>(
    'SELECT * FROM abandoned_payments WHERE recovery_token = $1 AND expires_at > NOW()',
    [token]
  )
  return result.rows[0] || null
}

export async function markAbandonedPaymentReminderSent(paymentId: number): Promise<boolean> {
  try {
    await query(
      `UPDATE abandoned_payments 
       SET reminder_sent = true, reminder_sent_at = NOW() 
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
    `SELECT * FROM abandoned_payments 
     WHERE reminder_sent = false 
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
    
    const result = await query<Invoice>(
      `INSERT INTO invoices (
        user_id, transaction_id, invoice_number, amount, currency, 
        status, items, billing_details
      ) VALUES ($1, $2, $3, $4, 'NGN', 'paid', $5, $6)
      RETURNING *`,
      [userId, transactionId, invoiceNumber, amount, JSON.stringify(items), JSON.stringify(billingDetails)]
    )
    
    return result.rows[0]
  } catch (error) {
    console.error('Create invoice error:', error)
    return null
  }
}

export async function getInvoiceById(invoiceId: number): Promise<Invoice | null> {
  const result = await query<Invoice>(
    'SELECT * FROM invoices WHERE id = $1',
    [invoiceId]
  )
  return result.rows[0] || null
}

export async function getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | null> {
  const result = await query<Invoice>(
    'SELECT * FROM invoices WHERE invoice_number = $1',
    [invoiceNumber]
  )
  return result.rows[0] || null
}

export async function getUserInvoices(userId: number): Promise<Invoice[]> {
  const result = await query<Invoice>(
    'SELECT * FROM invoices WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  )
  return result.rows
}

// Wallet settings functions
export async function getOrCreateWalletSettings(userId: number): Promise<WalletSettings> {
  const result = await query<WalletSettings>(
    'SELECT * FROM wallet_settings WHERE user_id = $1',
    [userId]
  )
  
  if (result.rows.length > 0) {
    return result.rows[0]
  }
  
  // Create default settings
  const newSettings = await query<WalletSettings>(
    `INSERT INTO wallet_settings (user_id)
     VALUES ($1)
     RETURNING *`,
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
      updates.push(`low_balance_alert = $${paramIndex++}`)
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
       RETURNING *`,
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
    whereClause += ` AND (t.payment_reference ILIKE $${paramIndex} OR t.paystack_reference ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`
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
    `SELECT t.* FROM transactions t 
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
    `SELECT * FROM abandoned_payments 
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
