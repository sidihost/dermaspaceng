export interface ReceiptViewer {
  id: string | number
  role?: string | null
}

/**
 * Returns true when the authenticated user is a Dermaspace staff member or admin.
 */
export function isTeamMember(role?: string | null): boolean {
  return role === 'staff' || role === 'admin'
}

/**
 * Determines whether a viewer can inspect a customer receipt (booking, wallet transaction, or membership).
 * Staff and admins can inspect all receipts for client care & reconciliation; regular users only their own.
 */
export function canAccessReceipt(
  viewer: ReceiptViewer | null | undefined,
  ownerUserId: string | number | null | undefined,
): boolean {
  if (!viewer) return false
  if (isTeamMember(viewer.role)) return true
  if (ownerUserId == null || ownerUserId === '') return false
  return String(viewer.id) === String(ownerUserId)
}

/**
 * Resolves the canonical receipt route for a transaction, booking, or membership charge.
 */
export function getReceiptHref(opts: {
  reference?: string | null
  bookingReference?: string | null
  metadataType?: string | null
}): string | null {
  const bookingRef = opts.bookingReference?.trim()
  const ref = opts.reference?.trim()

  if (bookingRef && bookingRef.toUpperCase().startsWith('DS-')) {
    return `/booking/${encodeURIComponent(bookingRef)}`
  }
  if (ref && ref.toUpperCase().startsWith('DS-')) {
    return `/booking/${encodeURIComponent(ref)}`
  }
  if (opts.metadataType === 'membership_subscription' && ref) {
    return `/membership/receipt/${encodeURIComponent(ref)}`
  }
  if (ref) {
    return `/dashboard/transactions/${encodeURIComponent(ref)}`
  }
  return null
}

/**
 * Resolves a staff member's access level for a booking record.
 */
export function resolveStaffBookingAccessRole(opts: {
  isAssigned: boolean
  isAdmin: boolean
  hasGrant: boolean
}): 'assigned' | 'granted' | 'readonly' {
  if (opts.isAssigned) return 'assigned'
  if (opts.isAdmin || opts.hasGrant) return 'granted'
  return 'readonly'
}
