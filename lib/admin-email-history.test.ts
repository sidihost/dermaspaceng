import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildReinstatementNoteHtml,
  extractSubjectFromLegacyActivity,
  mergeAdminEmailsWithLegacyActivity,
  resolveActiveAccountDashboardHref,
  resolveActiveAccountDashboardLabel,
  sanitizeAdminStatusReason,
  type AdminClientEmailRecord,
  type LegacyEmailActivityRow,
} from './admin-email-history'

describe('sanitizeAdminStatusReason', () => {
  it('returns null for blank or non-string inputs', () => {
    assert.equal(sanitizeAdminStatusReason(null), null)
    assert.equal(sanitizeAdminStatusReason(undefined), null)
    assert.equal(sanitizeAdminStatusReason('   \n\t  '), null)
    assert.equal(sanitizeAdminStatusReason(123), null)
  })

  it('strips unsafe control characters while preserving newlines and capping length', () => {
    const raw = '  Welcome back!\r\nYour review\u0007 is complete.  '
    assert.equal(
      sanitizeAdminStatusReason(raw),
      'Welcome back!\nYour review is complete.',
    )
    const long = 'a'.repeat(700)
    assert.equal(sanitizeAdminStatusReason(long, 500)?.length, 500)
  })
})

describe('resolveActiveAccountDashboardHref & label', () => {
  it('routes admins, staff, and clients to their respective consoles', () => {
    assert.equal(resolveActiveAccountDashboardHref('admin'), '/admin')
    assert.equal(resolveActiveAccountDashboardLabel('admin'), 'Go to Admin Dashboard')
    assert.equal(resolveActiveAccountDashboardHref('STAFF'), '/staff')
    assert.equal(resolveActiveAccountDashboardLabel('staff'), 'Go to Staff Console')
    assert.equal(resolveActiveAccountDashboardHref('user'), '/dashboard')
    assert.equal(resolveActiveAccountDashboardHref(null), '/dashboard')
    assert.equal(resolveActiveAccountDashboardLabel(undefined), 'Go to My Dashboard')
  })
})

describe('buildReinstatementNoteHtml', () => {
  it('returns empty string when reason is empty', () => {
    assert.equal(buildReinstatementNoteHtml(''), '')
    assert.equal(buildReinstatementNoteHtml(null), '')
  })

  it('escapes HTML safely and preserves line breaks inside flat Dermaspace callout', () => {
    const html = buildReinstatementNoteHtml('Hello <script>alert(1)</script>\nWelcome back!')
    assert.ok(html.includes('Note from Dermaspace'))
    assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;<br />Welcome back!'))
    assert.ok(!html.includes('<script>'))
  })
})

describe('extractSubjectFromLegacyActivity', () => {
  it('extracts subject from standard Emailed <Name>: <Subject> descriptions', () => {
    assert.equal(
      extractSubjectFromLegacyActivity('Emailed Maki Jr: Booking confirmation update'),
      'Booking confirmation update',
    )
    assert.equal(
      extractSubjectFromLegacyActivity('Emailed ada@example.com: Follow-up: Lab results'),
      'Follow-up: Lab results',
    )
    assert.equal(extractSubjectFromLegacyActivity(null), 'Direct email')
  })
})

describe('mergeAdminEmailsWithLegacyActivity', () => {
  it('deduplicates matching legacy log rows within 90s and sorts newest first', () => {
    const stored: AdminClientEmailRecord[] = [
      {
        id: 'eml_new',
        userId: 'u1',
        recipientEmail: 'client@example.com',
        subject: 'Appointment reminder',
        message: 'Looking forward to seeing you tomorrow.',
        sentById: 'a1',
        sentByName: 'Admin One',
        createdAt: '2026-11-27T12:00:00.000Z',
      },
    ]
    const legacy: LegacyEmailActivityRow[] = [
      {
        id: 101,
        description: 'Emailed Jane Doe: Appointment reminder',
        staffId: 'a1',
        staffName: 'Admin One',
        createdAt: '2026-11-27T12:00:08.000Z',
      },
      {
        id: 99,
        description: 'Emailed Jane Doe: Earlier consultation follow-up',
        staffId: 'a2',
        staffName: 'Admin Two',
        createdAt: '2026-11-20T09:00:00.000Z',
      },
    ]

    const merged = mergeAdminEmailsWithLegacyActivity(
      stored,
      legacy,
      'client@example.com',
      'u1',
    )

    assert.equal(merged.length, 2)
    assert.equal(merged[0].id, 'eml_new')
    assert.equal(merged[0].isLegacyLog, undefined)
    assert.equal(merged[1].id, 'legacy-99')
    assert.equal(merged[1].subject, 'Earlier consultation follow-up')
    assert.equal(merged[1].isLegacyLog, true)
    assert.equal(merged[1].message, null)
  })
})
