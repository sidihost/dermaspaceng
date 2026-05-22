/**
 * Formatting helpers shared across the app.
 */

/**
 * Format a number of naira as a localized currency string, e.g. "₦12,500".
 * Accepts an amount already expressed in naira (NOT kobo).
 */
export function naira(amount: number): string {
  const value = Number.isFinite(amount) ? amount : 0
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}
