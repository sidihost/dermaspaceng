export interface AdminClientEmailRecord {
  id: string
  userId: string
  recipientEmail: string
  subject: string
  message: string | null
  sentById: string | null
  sentByName: string | null
  createdAt: string
  isLegacyLog?: boolean
}

export interface LegacyEmailActivityRow {
  id: string | number
  description: string | null
  staffId: string | null
  staffName: string | null
  createdAt: string
}

/**
 * Sanitizes an optional admin status note (suspension or reactivation reason).
 * Strips unsafe ASCII control characters (preserving line breaks), trims, and
 * caps at maxLength. Returns null when blank.
 */
export function sanitizeAdminStatusReason(
  raw: unknown,
  maxLength = 500,
): string | null {
  if (typeof raw !== 'string') return null
  const cleaned = raw
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
  if (!cleaned) return null
  return cleaned.slice(0, maxLength)
}

/**
 * Resolves the primary workspace route for an already signed-in active user.
 */
export function resolveActiveAccountDashboardHref(role?: string | null): string {
  const normalized = typeof role === 'string' ? role.trim().toLowerCase() : ''
  if (normalized === 'admin') return '/admin'
  if (normalized === 'staff') return '/staff'
  return '/dashboard'
}

export function resolveActiveAccountDashboardLabel(role?: string | null): string {
  const normalized = typeof role === 'string' ? role.trim().toLowerCase() : ''
  if (normalized === 'admin') return 'Go to Admin Dashboard'
  if (normalized === 'staff') return 'Go to Staff Console'
  return 'Go to My Dashboard'
}

function escapeEmailHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Builds the optional note callout box used inside the account reactivation
 * email, matching Dermaspace's flat transactional email design.
 */
export function buildReinstatementNoteHtml(
  reason?: string | null,
  brandColor = '#7B2D8E',
): string {
  const cleaned = sanitizeAdminStatusReason(reason, 500)
  if (!cleaned) return ''
  const safeBody = escapeEmailHtml(cleaned).replace(/\n/g, '<br />')
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 20px; background-color: #FAF6FB; border-radius: 12px; border: 1px solid #ece5f0;">
      <tr>
        <td style="padding: 16px 18px;">
          <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; color: ${brandColor}; text-transform: uppercase; letter-spacing: 0.8px;">Note from Dermaspace</p>
          <p style="margin: 0; font-size: 14px; color: #1c1e21; line-height: 1.55;">${safeBody}</p>
        </td>
      </tr>
    </table>
  `
}

/**
 * Extracts the email subject from legacy `activity_log` rows formatted as
 * `"Emailed <Recipient Name>: <Subject>"`.
 */
export function extractSubjectFromLegacyActivity(description: string | null): string {
  if (!description) return 'Direct email'
  const trimmed = description.trim()
  const match = /^Emailed\s+.+?:\s*(.+)$/i.exec(trimmed)
  if (match && match[1]?.trim()) {
    return match[1].trim()
  }
  return trimmed || 'Direct email'
}

/**
 * Merges full `admin_client_emails` rows with any older `activity_log`
 * `email_sent` entries that predate the dedicated table. Deduplicates legacy
 * entries that match a stored record's subject within a 90-second window.
 */
export function mergeAdminEmailsWithLegacyActivity(
  stored: AdminClientEmailRecord[],
  legacyRows: LegacyEmailActivityRow[],
  fallbackRecipientEmail = '',
  userId = '',
): AdminClientEmailRecord[] {
  const result: AdminClientEmailRecord[] = [...stored]

  for (const row of legacyRows) {
    const legacySubject = extractSubjectFromLegacyActivity(row.description)
    const legacyTs = Date.parse(row.createdAt)

    const isDuplicate = stored.some((item) => {
      if (item.subject.trim().toLowerCase() !== legacySubject.trim().toLowerCase()) {
        return false
      }
      const storedTs = Date.parse(item.createdAt)
      if (Number.isNaN(legacyTs) || Number.isNaN(storedTs)) return true
      return Math.abs(storedTs - legacyTs) <= 90_000
    })

    if (!isDuplicate) {
      result.push({
        id: `legacy-${String(row.id)}`,
        userId,
        recipientEmail: fallbackRecipientEmail,
        subject: legacySubject,
        message: null,
        sentById: row.staffId,
        sentByName: row.staffName,
        createdAt: row.createdAt,
        isLegacyLog: true,
      })
    }
  }

  result.sort((a, b) => {
    const tsA = Date.parse(a.createdAt)
    const tsB = Date.parse(b.createdAt)
    if (Number.isNaN(tsA) && Number.isNaN(tsB)) return 0
    if (Number.isNaN(tsA)) return 1
    if (Number.isNaN(tsB)) return -1
    return tsB - tsA
  })

  return result
}
