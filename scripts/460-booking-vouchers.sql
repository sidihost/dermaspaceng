-- ---------------------------------------------------------------------------
-- 460-booking-vouchers.sql
--
-- Adds voucher / discount columns to the `bookings` table so the
-- booking flow can apply a discount at checkout and we keep an
-- audit trail of what the customer originally would have paid.
--
--   * subtotal_kobo   — sum of all booking_services BEFORE any
--                       discount. NULL for legacy rows; new rows
--                       always populate this.
--   * discount_kobo   — applied discount in kobo. 0 when no
--                       voucher was used.
--   * voucher_code    — copy of the redeemed code (uppercased) so
--                       the receipt can show "WELCOME10 applied"
--                       without joining vouchers (the voucher row
--                       might be edited or deleted later).
--   * voucher_id      — soft FK to vouchers.id. ON DELETE SET NULL
--                       so deleting a voucher doesn't blow up the
--                       booking history.
--
-- `total_price_kobo` continues to be the FINAL amount the customer
-- pays / paid (subtotal − discount), which is what every existing
-- caller already assumes — wallet debit, Paystack init, receipt UI.
-- That keeps this migration backward-compatible: if you ignore the
-- new columns, everything still works.
-- ---------------------------------------------------------------------------

BEGIN;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS subtotal_kobo INTEGER,
  ADD COLUMN IF NOT EXISTS discount_kobo INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS voucher_code  VARCHAR(60),
  ADD COLUMN IF NOT EXISTS voucher_id    UUID REFERENCES vouchers(id) ON DELETE SET NULL;

-- Backfill subtotal for any existing rows so future analytics queries
-- can rely on the column being non-null. Pre-voucher rows had no
-- discount, so subtotal == total.
UPDATE bookings
   SET subtotal_kobo = total_price_kobo
 WHERE subtotal_kobo IS NULL;

-- Light index for "which bookings used voucher X" reporting in the
-- admin voucher console. Partial index keeps it tiny — only rows
-- with a voucher are included.
CREATE INDEX IF NOT EXISTS idx_bookings_voucher_id
  ON bookings (voucher_id)
  WHERE voucher_id IS NOT NULL;

COMMIT;
