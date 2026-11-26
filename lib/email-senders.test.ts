import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveEmailSender, type EmailSenderCategory } from './email-senders'
import {
  buildAccountSuspendedEmailHtml,
  buildStaffPromotedEmailHtml,
  buildLiveChatTranscriptEmailHtml,
} from './email'
import { buildAppealUrl, getAppealPathForRole } from './suspension-appeals'

describe('resolveEmailSender', () => {
  it('resolves all six context-specific Dermaspace sender identities', () => {
    const cases: Array<{
      category: EmailSenderCategory
      name: string
      email: string
      title: string
    }> = [
      {
        category: 'support',
        name: 'Dermaspace Support',
        email: 'support@dermaspaceng.com',
        title: 'Dermaspace Support',
      },
      {
        category: 'security',
        name: 'Dermaspace Security',
        email: 'security@dermaspaceng.com',
        title: 'Dermaspace Security',
      },
      {
        category: 'team_security',
        name: 'Dermaspace Team Security',
        email: 'security@dermaspaceng.com',
        title: 'Dermaspace Team Security',
      },
      {
        category: 'team',
        name: 'Dermaspace Team',
        email: 'team@dermaspaceng.com',
        title: 'Dermaspace Team',
      },
      {
        category: 'bookings',
        name: 'Dermaspace Bookings',
        email: 'bookings@dermaspaceng.com',
        title: 'Dermaspace Bookings',
      },
      {
        category: 'general',
        name: 'Dermaspace',
        email: 'noreply@dermaspaceng.com',
        title: 'Dermaspace',
      },
    ]

    for (const c of cases) {
      const resolved = resolveEmailSender(c.category, null)
      assert.equal(resolved.name, c.name)
      assert.equal(resolved.email, c.email)
      assert.equal(resolved.title, c.title)
      assert.equal(resolved.from, `"${c.name}" <${c.email}>`)
    }
  })

  it('honors a valid forcedFromEmail override while preserving category name and title', () => {
    const resolved = resolveEmailSender('support', 'alerts@dermaspaceng.com')
    assert.equal(resolved.name, 'Dermaspace Support')
    assert.equal(resolved.title, 'Dermaspace Support')
    assert.equal(resolved.email, 'alerts@dermaspaceng.com')
    assert.equal(resolved.from, '"Dermaspace Support" <alerts@dermaspaceng.com>')
  })

  it('falls back to category email when forcedFromEmail is invalid', () => {
    const resolved = resolveEmailSender('security', 'not-an-email')
    assert.equal(resolved.email, 'security@dermaspaceng.com')
    assert.equal(resolved.from, '"Dermaspace Security" <security@dermaspaceng.com>')
  })
})

describe('Unified suspension appeals with automatic role detection', () => {
  it('routes all roles (staff, admin, user) to unified /appeal path', () => {
    assert.equal(getAppealPathForRole('staff'), '/appeal')
    assert.equal(getAppealPathForRole('admin'), '/appeal')
    assert.equal(getAppealPathForRole('user'), '/appeal')
    assert.equal(getAppealPathForRole(null), '/appeal')

    const staffUrl = buildAppealUrl('tok_123', 'staff', 'https://www.dermaspaceng.com')
    assert.equal(staffUrl, 'https://www.dermaspaceng.com/appeal?token=tok_123')

    const adminUrl = buildAppealUrl('tok_456', 'admin', 'https://www.dermaspaceng.com')
    assert.equal(adminUrl, 'https://www.dermaspaceng.com/appeal?token=tok_456')

    const clientUrl = buildAppealUrl('tok_789', 'user', 'https://www.dermaspaceng.com')
    assert.equal(clientUrl, 'https://www.dermaspaceng.com/appeal?token=tok_789')

    // Backward-compatible 2-arg call where 2nd arg is an origin URL
    const legacyUrl = buildAppealUrl('tok_legacy', 'https://www.dermaspaceng.com')
    assert.equal(legacyUrl, 'https://www.dermaspaceng.com/appeal?token=tok_legacy')
  })

  it('builds a distinct Dermaspace Team Security email for suspended staff/admin', () => {
    const appealUrl = buildAppealUrl('staff_tok', 'staff', 'https://www.dermaspaceng.com')
    const built = buildAccountSuspendedEmailHtml({
      firstName: 'Ada',
      role: 'staff',
      reason: 'Policy review pending',
      appealUrl,
    })

    assert.equal(built.sender, 'team_security')
    assert.match(built.subject, /Staff Access Has Been Suspended/i)
    assert.match(built.html, /<title>Dermaspace Team Security<\/title>/)
    assert.match(built.html, /Submit Staff Appeal/)
    assert.match(built.html, /\/appeal\?token=staff_tok/)
    assert.doesNotMatch(built.html, /\/appeal\/staff/)
    assert.match(built.html, /#7B2D8E/i)
    assert.doesNotMatch(built.html, /background-color:\s*#3E104B/i)
    assert.doesNotMatch(built.html, /\bclinic\b|\bhospital\b/i)
    assert.match(built.html, /Administrative Note/)
    assert.match(built.html, /Policy review pending/)
    assert.match(built.html, /automated/i)
    assert.match(built.html, /do not reply/i)
    assert.equal(built.html.match(/please do not reply directly/gi)?.length, 1)
    assert.doesNotMatch(built.html, /hello@dermaspaceng\.com/i)
    assert.doesNotMatch(built.html, /reply to this email/i)
  })

  it('builds a distinct Dermaspace Security email for suspended clients', () => {
    const appealUrl = buildAppealUrl('client_tok', 'user', 'https://www.dermaspaceng.com')
    const built = buildAccountSuspendedEmailHtml({
      firstName: 'Chidi',
      role: 'user',
      reason: 'Unusual booking activity',
      appealUrl,
    })

    assert.equal(built.sender, 'security')
    assert.match(built.subject, /Account Has Been Suspended/i)
    assert.doesNotMatch(built.subject, /Staff Access/i)
    assert.match(built.html, /<title>Dermaspace Security<\/title>/)
    assert.match(built.html, /Submit Account Appeal/)
    assert.match(built.html, /\/appeal\?token=client_tok/)
    assert.match(built.html, /bookings, wallet balance, and appointment history remain safely preserved/i)
    assert.match(built.html, /Suspension Note/)
    assert.match(built.html, /automated/i)
    assert.match(built.html, /do not reply/i)
    assert.equal(built.html.match(/please do not reply directly/gi)?.length, 1)
    assert.doesNotMatch(built.html, /hello@dermaspaceng\.com/i)
    assert.doesNotMatch(built.html, /reply to this email/i)
  })
})

describe('Automated transactional email titles & no-reply hygiene', () => {
  it('uses Dermaspace Team title and single automated no-reply copy on staff promotion emails', () => {
    const built = buildStaffPromotedEmailHtml({
      firstName: 'Tola',
      newRole: 'admin',
      previousRole: 'staff',
      promotedByName: 'Spa Director',
    })

    assert.match(built.html, /<title>Dermaspace Team<\/title>/)
    assert.match(built.html, /automated/i)
    assert.match(built.html, /do not reply/i)
    assert.equal(built.html.match(/please do not reply directly/gi)?.length, 1)
    assert.doesNotMatch(built.html, /hello@dermaspaceng\.com/i)
    assert.doesNotMatch(built.html, /reply to this email/i)
    assert.doesNotMatch(built.html, /\bclinic\b|\bhospital\b/i)
  })

  it('uses Dermaspace Support title and single automated no-reply copy on live chat transcript emails', () => {
    const built = buildLiveChatTranscriptEmailHtml({
      firstName: 'Ngozi',
      supportCode: 'DS-LC-9911',
      topic: 'HydraFacial booking',
      startedAt: '2026-11-20T10:00:00.000Z',
      closedAt: '2026-11-20T10:15:00.000Z',
      representatives: ['Amaka'],
      messages: [
        {
          senderRole: 'user',
          senderName: 'Ngozi',
          body: 'Hello, I need help rescheduling.',
          createdAt: '2026-11-20T10:01:00.000Z',
        },
        {
          senderRole: 'staff',
          senderName: 'Amaka',
          body: 'Happy to assist you right away.',
          createdAt: '2026-11-20T10:02:00.000Z',
        },
      ],
    })

    assert.match(built.html, /<title>Dermaspace Support<\/title>/)
    assert.match(built.html, /DS-LC-9911/)
    assert.match(built.html, /automated/i)
    assert.equal(built.html.match(/please do not reply directly/gi)?.length, 1)
    assert.doesNotMatch(built.html, /hello@dermaspaceng\.com/i)
    assert.doesNotMatch(built.html, /reply to this email/i)
  })
})
