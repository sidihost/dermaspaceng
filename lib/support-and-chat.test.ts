import assert from 'node:assert/strict'
import test from 'node:test'
import {
  computeTicketSummary,
  detectHumanHandoffIntent,
  formatFallbackSupportId,
  formatRelativeTimestamp,
  formatWaitSeconds,
  generateLiveChatSupportId,
  getHandoffAutoMessage,
  getLiveChatStatusMeta,
  getTicketPriorityMeta,
  getTicketStatusMeta,
  normalizeSupportIdQuery,
  normalizeTicketPriority,
  normalizeTicketStatus,
  resolveStaffAvatarUrl,
  resolveSupportId,
  TICKET_STATUS_ORDER,
} from './support-and-chat'
import { buildStaffPromotedEmailHtml } from './email'

test('normalizeTicketStatus maps variants cleanly', () => {
  assert.equal(normalizeTicketStatus('open'), 'open')
  assert.equal(normalizeTicketStatus('pending'), 'open')
  assert.equal(normalizeTicketStatus('IN-PROGRESS'), 'in_progress')
  assert.equal(normalizeTicketStatus('in progress'), 'in_progress')
  assert.equal(normalizeTicketStatus('assigned'), 'in_progress')
  assert.equal(normalizeTicketStatus('resolved'), 'resolved')
  assert.equal(normalizeTicketStatus('completed'), 'resolved')
  assert.equal(normalizeTicketStatus('closed'), 'closed')
  assert.equal(normalizeTicketStatus('archived'), 'closed')
  assert.equal(normalizeTicketStatus(undefined), 'open')
})

test('ticket status and priority badges contain zero off-brand green, amber, or rose tokens', () => {
  const banned = /(emerald|green|amber|yellow|rose|red|gradient|shadow)/i
  for (const status of TICKET_STATUS_ORDER) {
    const meta = getTicketStatusMeta(status)
    assert.equal(banned.test(meta.badgeClass), false, `status ${status} badgeClass had off-brand token: ${meta.badgeClass}`)
    assert.equal(banned.test(meta.dotClass), false, `status ${status} dotClass had off-brand token: ${meta.dotClass}`)
  }
  for (const priority of ['urgent', 'high', 'normal', 'low']) {
    const meta = getTicketPriorityMeta(priority)
    assert.equal(banned.test(meta.badgeClass), false, `priority ${priority} badgeClass had off-brand token: ${meta.badgeClass}`)
  }
  assert.equal(normalizeTicketPriority('URGENT'), 'urgent')
  assert.equal(normalizeTicketPriority('unknown'), 'normal')
})

test('live chat status metadata uses Dermaspace palette with zero green/amber/rose', () => {
  const banned = /(emerald|green|amber|yellow|rose|red|gradient|shadow)/i
  for (const status of ['waiting', 'active', 'closed', 'abandoned'] as const) {
    const meta = getLiveChatStatusMeta(status)
    assert.equal(banned.test(meta.badgeClass), false, `chat ${status} badgeClass had off-brand token: ${meta.badgeClass}`)
    assert.equal(banned.test(meta.dotClass), false, `chat ${status} dotClass had off-brand token: ${meta.dotClass}`)
  }
  assert.equal(getLiveChatStatusMeta('active').pulse, true)
  assert.equal(getLiveChatStatusMeta('waiting').pulse, false)
})

test('computeTicketSummary calculates totals, awaitingReply, and resolutionRate accurately', () => {
  const summary = computeTicketSummary({
    open: 4,
    inProgress: 2,
    resolved: 3,
    closed: 1,
  })
  assert.equal(summary.total, 10)
  assert.equal(summary.awaitingReply, 6)
  assert.equal(summary.resolutionRate, 40)
  assert.equal(summary.rows.length, 4)
  assert.equal(summary.rows[0].status, 'open')
  assert.equal(summary.rows[0].percentage, 40)
  assert.equal(summary.rows[1].status, 'in_progress')
  assert.equal(summary.rows[1].percentage, 20)

  const empty = computeTicketSummary(null)
  assert.equal(empty.total, 0)
  assert.equal(empty.resolutionRate, 0)
  assert.equal(empty.rows.every((r) => r.count === 0 && r.percentage === 0), true)
})

test('formatWaitSeconds and formatRelativeTimestamp format edge cases deterministically', () => {
  assert.equal(formatWaitSeconds(null), '—')
  assert.equal(formatWaitSeconds(-5), '—')
  assert.equal(formatWaitSeconds(42), '42s')
  assert.equal(formatWaitSeconds(60), '1m')
  assert.equal(formatWaitSeconds(125), '2m 5s')
  assert.equal(formatWaitSeconds(3660), '1h 1m')

  const now = Date.UTC(2026, 4, 15, 12, 0, 0)
  assert.equal(formatRelativeTimestamp(new Date(now - 20_000).toISOString(), now), 'just now')
  assert.equal(formatRelativeTimestamp(new Date(now - 15 * 60_000).toISOString(), now), '15m ago')
  assert.equal(formatRelativeTimestamp(new Date(now - 3 * 3600_000).toISOString(), now), '3h ago')
  assert.equal(formatRelativeTimestamp(new Date(now - 2 * 86400_000).toISOString(), now), '2d ago')
  assert.equal(formatRelativeTimestamp('invalid', now), '—')
})

test('detectHumanHandoffIntent matches natural human/support requests and avoids false positives', () => {
  // Positive triggers
  assert.equal(detectHumanHandoffIntent('talk to a human representative'), true)
  assert.equal(detectHumanHandoffIntent('talt human representative'), true)
  assert.equal(detectHumanHandoffIntent('connect me to an agent please'), true)
  assert.equal(detectHumanHandoffIntent('I need customer support'), true)
  assert.equal(detectHumanHandoffIntent('live chat'), true)
  assert.equal(detectHumanHandoffIntent('support'), true)
  assert.equal(detectHumanHandoffIntent('Can I speak to a real person?'), true)
  assert.equal(detectHumanHandoffIntent('transfer me to customer care'), true)

  // Non-triggers (must stay with AI)
  assert.equal(detectHumanHandoffIntent(''), false)
  assert.equal(detectHumanHandoffIntent('What facials do you offer?'), false)
  assert.equal(detectHumanHandoffIntent('Check my support tickets'), false)
  assert.equal(detectHumanHandoffIntent('Open a support ticket for my refund'), false)
  assert.equal(detectHumanHandoffIntent('What is my wallet balance?'), false)
  assert.equal(detectHumanHandoffIntent('Please call me back at 3pm'), false)
})

test('getHandoffAutoMessage returns warm, accurate copy for each live handoff state', () => {
  assert.match(getHandoffAutoMessage('connecting'), /connecting you to an agent/i)
  assert.match(getHandoffAutoMessage('waiting'), /customer representative will join shortly/i)
  assert.match(getHandoffAutoMessage('active', 'Amaka'), /Amaka.*joined the chat/i)
  assert.match(getHandoffAutoMessage('guest_needed'), /name and email/i)
  assert.match(getHandoffAutoMessage('closed'), /ended/i)
})

test('Live Chat Support ID generation, fallback, and normalization work deterministically', () => {
  const generated = generateLiveChatSupportId(() => 0.5)
  assert.match(generated, /^DS-LC-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/)
  // Never contains visually ambiguous 0/O/1/I/L
  assert.equal(/[01OIL]/.test(generated.slice(6)), false)

  assert.equal(
    formatFallbackSupportId('a9f4b210-1234-5678-9abc-def012345678'),
    'DS-LC-A9F4B2',
  )
  assert.equal(
    resolveSupportId('ds-lc-7k4m9p', 'a9f4b210-1234-5678-9abc-def012345678'),
    'DS-LC-7K4M9P',
  )
  assert.equal(
    resolveSupportId(null, 'a9f4b210-1234-5678-9abc-def012345678'),
    'DS-LC-A9F4B2',
  )
  assert.equal(normalizeSupportIdQuery(' #ds-lc-7k4 m9p '), 'DS-LC-7K4M9P')
})

test('resolveStaffAvatarUrl prefers uploaded avatarUrl, then valid slug, then deterministic portrait', () => {
  assert.equal(
    resolveStaffAvatarUrl({
      avatarUrl: 'https://public.blob.vercel-storage.com/staff-amaka.jpg',
      avatarSlug: 'f3',
      staffId: 'staff-1',
    }),
    'https://public.blob.vercel-storage.com/staff-amaka.jpg',
  )
  assert.equal(
    resolveStaffAvatarUrl({
      avatarUrl: '/avatars/team/staff-1.jpg',
      avatarSlug: 'f3',
      staffId: 'staff-1',
    }),
    '/avatars/team/staff-1.jpg',
  )
  assert.equal(
    resolveStaffAvatarUrl({
      avatarUrl: '',
      avatarSlug: 'f4',
      staffId: 'staff-1',
    }),
    '/avatars/f4.jpg',
  )
  const fallbackA = resolveStaffAvatarUrl({ avatarUrl: null, avatarSlug: 'invalid', staffId: 'staff-uuid-alpha' })
  const fallbackB = resolveStaffAvatarUrl({ avatarUrl: null, avatarSlug: null, staffId: 'staff-uuid-alpha' })
  assert.equal(fallbackA, fallbackB)
  assert.match(fallbackA, /^\/avatars\/f([1-9]|1[01])\.jpg$/)
})

test('buildStaffPromotedEmailHtml preserves Dermaspace email shell, escapes inputs, and links to the right workspace', () => {
  const staffMail = buildStaffPromotedEmailHtml({
    firstName: 'Ada<script>',
    newRole: 'staff',
    previousRole: 'user',
    promotedByName: 'Franca Admin',
  })
  assert.equal(staffMail.subject, 'You have been promoted to Staff at Dermaspace')
  assert.match(staffMail.html, /#7B2D8E/i)
  assert.match(staffMail.html, /Welcome to the Dermaspace team/i)
  assert.match(staffMail.html, /Ada&lt;script&gt;/)
  assert.equal(staffMail.html.includes('<script>'), false)
  assert.match(staffMail.html, /\/signin\?next=%2Fstaff/)
  assert.match(staffMail.html, /Franca Admin/)

  const adminMail = buildStaffPromotedEmailHtml({
    firstName: 'Chidi',
    newRole: 'admin',
    previousRole: 'staff',
  })
  assert.equal(adminMail.subject, 'You have been promoted to Admin at Dermaspace')
  assert.match(adminMail.html, /promoted to Admin/i)
  assert.match(adminMail.html, /\/signin\?next=%2Fadmin/)
})


