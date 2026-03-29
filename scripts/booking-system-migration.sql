-- Booking System Migration
-- Creates tables for complete booking system with payments, services, and staff permissions

-- Services table (available treatments/services)
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  price DECIMAL(10,2) NOT NULL,
  deposit_amount DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Service categories
CREATE TABLE IF NOT EXISTS service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Staff availability/working hours
CREATE TABLE IF NOT EXISTS staff_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_working BOOLEAN DEFAULT true,
  location VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(staff_id, day_of_week)
);

-- Staff blocked/vacation days
CREATE TABLE IF NOT EXISTS staff_blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(staff_id, blocked_date)
);

-- Staff service assignments (which staff can perform which services)
CREATE TABLE IF NOT EXISTS staff_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(staff_id, service_id)
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference VARCHAR(20) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  service_id UUID NOT NULL REFERENCES services(id),
  staff_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Client info (for guest bookings or snapshot)
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255) NOT NULL,
  client_phone VARCHAR(50) NOT NULL,
  
  -- Booking details
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  location VARCHAR(100),
  
  -- Status: pending, confirmed, in_progress, completed, cancelled, no_show
  status VARCHAR(50) DEFAULT 'pending',
  
  -- Pricing
  service_price DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  deposit_amount DECIMAL(10,2) DEFAULT 0,
  deposit_paid BOOLEAN DEFAULT false,
  
  -- Notes
  client_notes TEXT,
  staff_notes TEXT,
  cancellation_reason TEXT,
  
  -- Metadata
  source VARCHAR(50) DEFAULT 'website',
  created_by UUID REFERENCES users(id),
  confirmed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_reference VARCHAR(50) UNIQUE NOT NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Payment details
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'NGN',
  payment_type VARCHAR(50) NOT NULL, -- deposit, full_payment, refund, tip
  payment_method VARCHAR(50), -- card, bank_transfer, cash, paystack, flutterwave
  
  -- Status: pending, processing, successful, failed, refunded
  status VARCHAR(50) DEFAULT 'pending',
  
  -- Provider details (Paystack, Flutterwave, etc.)
  provider VARCHAR(50),
  provider_reference VARCHAR(255),
  provider_response JSONB,
  
  -- Error tracking
  error_code VARCHAR(100),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMP,
  
  -- Client info snapshot
  client_name VARCHAR(255),
  client_email VARCHAR(255),
  
  -- Timestamps
  paid_at TIMESTAMP,
  refunded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment error logs (detailed error tracking)
CREATE TABLE IF NOT EXISTS payment_error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  error_type VARCHAR(100) NOT NULL,
  error_code VARCHAR(100),
  error_message TEXT NOT NULL,
  error_details JSONB,
  provider VARCHAR(50),
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Staff permissions table
CREATE TABLE IF NOT EXISTS staff_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Permission flags
  can_view_bookings BOOLEAN DEFAULT true,
  can_create_bookings BOOLEAN DEFAULT true,
  can_edit_bookings BOOLEAN DEFAULT true,
  can_cancel_bookings BOOLEAN DEFAULT false,
  
  can_view_clients BOOLEAN DEFAULT true,
  can_edit_clients BOOLEAN DEFAULT false,
  can_export_clients BOOLEAN DEFAULT false,
  
  can_view_payments BOOLEAN DEFAULT true,
  can_process_payments BOOLEAN DEFAULT false,
  can_issue_refunds BOOLEAN DEFAULT false,
  
  can_view_reports BOOLEAN DEFAULT true,
  can_export_reports BOOLEAN DEFAULT false,
  
  can_manage_services BOOLEAN DEFAULT false,
  can_manage_schedule BOOLEAN DEFAULT true,
  
  can_respond_complaints BOOLEAN DEFAULT true,
  can_respond_consultations BOOLEAN DEFAULT true,
  can_process_gift_cards BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(staff_id)
);

-- Client notes/history
CREATE TABLE IF NOT EXISTS client_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES users(id) ON DELETE SET NULL,
  note_type VARCHAR(50) DEFAULT 'general', -- general, medical, preference, allergy
  note TEXT NOT NULL,
  is_important BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Booking reminders
CREATE TABLE IF NOT EXISTS booking_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  reminder_type VARCHAR(50) NOT NULL, -- email, sms, whatsapp
  scheduled_for TIMESTAMP NOT NULL,
  sent_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending', -- pending, sent, failed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activity log for admin (audit trail)
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  description TEXT NOT NULL,
  metadata JSONB,
  ip_address VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_staff ON bookings(staff_id);
CREATE INDEX IF NOT EXISTS idx_bookings_reference ON bookings(booking_reference);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_errors_payment ON payment_error_logs(payment_id);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_staff ON staff_schedules(staff_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_user ON admin_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_type ON admin_activity_log(action_type);

-- Insert default service categories
INSERT INTO service_categories (name, slug, description, icon, display_order) VALUES
  ('Facial Treatments', 'facial-treatments', 'Professional facial treatments for all skin types', 'Sparkles', 1),
  ('Body Treatments', 'body-treatments', 'Relaxing body treatments and massages', 'Heart', 2),
  ('Nail Care', 'nail-care', 'Manicures, pedicures, and nail art', 'Hand', 3),
  ('Waxing', 'waxing', 'Professional waxing services', 'Scissors', 4),
  ('Laser Treatments', 'laser-treatments', 'Advanced laser skin treatments', 'Zap', 5),
  ('Packages', 'packages', 'Special treatment packages', 'Package', 6)
ON CONFLICT (slug) DO NOTHING;

-- Insert sample services
INSERT INTO services (name, slug, description, category, duration_minutes, price, deposit_amount) VALUES
  ('Classic Facial', 'classic-facial', 'Deep cleansing facial with extraction and mask', 'facial-treatments', 60, 25000, 5000),
  ('Hydrating Facial', 'hydrating-facial', 'Intensive hydration treatment for dry skin', 'facial-treatments', 75, 35000, 7000),
  ('Anti-Aging Facial', 'anti-aging-facial', 'Advanced treatment targeting fine lines and wrinkles', 'facial-treatments', 90, 50000, 10000),
  ('Acne Treatment', 'acne-treatment', 'Specialized treatment for acne-prone skin', 'facial-treatments', 60, 30000, 6000),
  ('Full Body Massage', 'full-body-massage', 'Relaxing full body Swedish massage', 'body-treatments', 60, 25000, 5000),
  ('Deep Tissue Massage', 'deep-tissue-massage', 'Therapeutic deep tissue massage', 'body-treatments', 90, 40000, 8000),
  ('Body Scrub', 'body-scrub', 'Exfoliating body scrub treatment', 'body-treatments', 45, 20000, 4000),
  ('Classic Manicure', 'classic-manicure', 'Traditional manicure with polish', 'nail-care', 45, 8000, 0),
  ('Gel Manicure', 'gel-manicure', 'Long-lasting gel polish manicure', 'nail-care', 60, 15000, 0),
  ('Classic Pedicure', 'classic-pedicure', 'Relaxing pedicure treatment', 'nail-care', 45, 10000, 0),
  ('Full Leg Wax', 'full-leg-wax', 'Complete leg waxing service', 'waxing', 45, 15000, 0),
  ('Brazilian Wax', 'brazilian-wax', 'Professional Brazilian waxing', 'waxing', 30, 12000, 0),
  ('Underarm Wax', 'underarm-wax', 'Quick underarm waxing', 'waxing', 15, 5000, 0),
  ('Laser Hair Removal - Small', 'laser-small', 'Laser hair removal for small areas', 'laser-treatments', 30, 25000, 5000),
  ('Laser Hair Removal - Large', 'laser-large', 'Laser hair removal for large areas', 'laser-treatments', 60, 50000, 10000),
  ('Pamper Package', 'pamper-package', 'Facial + Full Body Massage + Mani-Pedi', 'packages', 180, 80000, 15000),
  ('Bridal Package', 'bridal-package', 'Complete bridal preparation package', 'packages', 240, 150000, 30000)
ON CONFLICT (slug) DO NOTHING;

-- Add default permissions for existing staff
INSERT INTO staff_permissions (staff_id)
SELECT id FROM users WHERE role IN ('staff', 'admin')
ON CONFLICT (staff_id) DO NOTHING;
