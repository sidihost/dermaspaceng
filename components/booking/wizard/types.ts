// Shared types for the booking wizard. Kept in their own module so
// step components don't import from each other (which is what creates
// circular-import drama in big wizards).

export interface WizardLocation {
  id: string
  name: string
  address: string
  phone: string
  whatsapp: string
  opens_at: string
  closes_at: string
  open_days: number[]
  slot_minutes: number
  slots_per_window: number
  image_url: string | null
}

export interface WizardServiceChoice {
  categoryId: string
  categoryName: string
  treatmentId: string
  treatmentName: string
  /** Set when the treatment defines bookable variants (massage
   *  session lengths, couple options, …) and the customer picked
   *  one. Forwarded to /api/bookings/initiate so the server bills
   *  the exact option and the frontdesk records it. */
  variantId?: string
  /** Customer-facing label of the chosen variant, e.g.
   *  "90 Minute Session" — shown on the review step and receipts. */
  variantLabel?: string
  duration: number // minutes
  priceKobo: number
}
