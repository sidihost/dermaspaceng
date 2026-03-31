-- Wallet System Migration
-- Creates tables for wallets, transactions, invoices, and abandoned payments
-- Note: user_id is VARCHAR(36) to match existing users table

-- 1. Wallets Table
CREATE TABLE IF NOT EXISTS wallets (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance DECIMAL(12, 2) DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'NGN',
  monthly_budget DECIMAL(12, 2),
  budget_alert_threshold INTEGER DEFAULT 80,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- 2. Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id),
  wallet_id VARCHAR(36) REFERENCES wallets(id),
  reference VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'NGN',
  payment_method VARCHAR(20),
  paystack_reference VARCHAR(100),
  metadata JSONB,
  description TEXT,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Abandoned Payments Table
CREATE TABLE IF NOT EXISTS abandoned_payments (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id),
  transaction_id VARCHAR(36) REFERENCES transactions(id),
  payment_type VARCHAR(20) NOT NULL,
  item_details JSONB NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'NGN',
  recovery_token VARCHAR(100) UNIQUE NOT NULL,
  reminder_sent_at TIMESTAMP,
  reminder_count INTEGER DEFAULT 0,
  recovered BOOLEAN DEFAULT false,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  invoice_number VARCHAR(20) UNIQUE NOT NULL,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id),
  transaction_id VARCHAR(36) REFERENCES transactions(id),
  items JSONB NOT NULL,
  subtotal DECIMAL(12, 2) NOT NULL,
  tax DECIMAL(12, 2) DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'NGN',
  status VARCHAR(20) DEFAULT 'pending',
  due_date TIMESTAMP,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Wallet Settings Table
CREATE TABLE IF NOT EXISTS wallet_settings (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  auto_fund_enabled BOOLEAN DEFAULT false,
  auto_fund_amount DECIMAL(12, 2),
  auto_fund_threshold DECIMAL(12, 2),
  low_balance_alert BOOLEAN DEFAULT true,
  low_balance_threshold DECIMAL(12, 2) DEFAULT 5000,
  transaction_notifications BOOLEAN DEFAULT true,
  weekly_summary_email BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference);
CREATE INDEX IF NOT EXISTS idx_abandoned_payments_user_id ON abandoned_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_abandoned_payments_recovery_token ON abandoned_payments(recovery_token);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
