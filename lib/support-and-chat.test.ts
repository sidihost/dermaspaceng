import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildLiveChatTranscriptDownloadText,
  computeTicketSummary,
  convertLiveChatMessagesToThreadEntries,
  detectHumanHandoffIntent,
  filterAgentTimelineMessages,
  formatFallbackSupportId,
  formatRelativeTimestamp,
  formatThreadMessagesForAiApi,
  formatWaitSeconds,
  generateLiveChatSupportId,
  getHandoffAutoMessage,
  getLiveChatStatusMeta,
  getPresenceStatusMeta,
  getTicketPriorityMeta,
  getTicketStatusMeta,
  isCustomerWaitingNotice,
  mergeIncrementalMessages,
  normalizeSupportIdQuery,
  normalizeTicketPriority,
  normalizeTicketStatus,
  resolveStaffAvatarUrl,
  resolveSupportId,
  sanitizeNetworkErrorMessage,
  TICKET_STATUS_ORDER,
} from './support-and-chat'
import {
  buildLiveChatTranscriptEmailHtml,
  buildStaffPromotedEmailHtml,
} from './email'

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

test('ticket status and priority badges contain zero off-brand green, amber, rose, or dark-purple tokens', () => {
  const banned = /(emerald|green|amber|yellow|rose|red|gradient|shadow|#5A1D6A|#3E104B|#4A1758)/i
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

test('live chat status metadata uses Dermaspace palette with zero green/amber/rose/dark-purple', () => {
  const banned = /(emerald|green|amber|yellow|rose|red|gradient|shadow|#5A1D6A|#3E104B|#4A1758)/i
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
  assert.match(getHandoffAutoMessage('connecting'), /transfer you to a live support representative/i)
  assert.match(getHandoffAutoMessage('waiting'), /transfer you to a live support representative/i)
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

test('buildLiveChatTranscriptEmailHtml preserves Dermaspace email shell, Support ID, multi-rep attribution, and escapes HTML', () => {
  const mail = buildLiveChatTranscriptEmailHtml({
    firstName: 'Ada',
    supportCode: 'DS-LC-7K4M9P',
    topic: 'Reschedule <HydraFacial>',
    startedAt: '2026-11-20T09:00:00.000Z',
    closedAt: '2026-11-20T09:12:00.000Z',
    representatives: ['Amaka O.', 'Tola B.', 'Amaka O.'],
    messages: [
      {
        senderRole: 'user',
        body: 'Hi, please move my slot\nto 2:00 PM <script>alert(1)</script>',
        createdAt: '2026-11-20T09:01:00.000Z',
      },
      {
        senderRole: 'staff',
        senderName: 'Amaka O.',
        body: 'Checking your Lekki booking now.',
        createdAt: '2026-11-20T09:02:00.000Z',
      },
      {
        senderRole: 'system',
        body: 'Tola B. joined and took over the chat from Amaka O.',
        createdAt: '2026-11-20T09:05:00.000Z',
      },
      {
        senderRole: 'staff',
        senderName: 'Tola B.',
        body: 'Done! Your slot is confirmed for 2:00 PM.',
        createdAt: '2026-11-20T09:06:00.000Z',
      },
    ],
  })

  assert.equal(mail.subject, 'Your Dermaspace Chat Transcript (DS-LC-7K4M9P)')
  assert.match(mail.html, /#7B2D8E/i)
  assert.match(mail.html, /DS-LC-7K4M9P/)
  assert.match(mail.html, /Amaka O\., Tola B\./)
  assert.match(mail.html, /Checking your Lekki booking now\./)
  assert.match(mail.html, /Tola B\. joined and took over the chat from Amaka O\./)
  assert.match(mail.html, /Done! Your slot is confirmed for 2:00 PM\./)
  assert.match(mail.html, /to 2:00 PM &lt;script&gt;alert\(1\)&lt;\/script&gt;/)
  assert.equal(mail.html.includes('<script>'), false)
  assert.match(mail.html, /<br>/)
})

test('live-chat-sound tracks customer and staff mute states independently without localStorage', async () => {
  const mod = await import('./live-chat-sound')
  assert.equal(mod.isLiveChatSoundEnabled('customer'), true)
  assert.equal(mod.isLiveChatSoundEnabled('staff'), true)

  mod.setLiveChatSoundEnabled('customer', false)
  assert.equal(mod.isLiveChatSoundEnabled('customer'), false)
  assert.equal(mod.isLiveChatSoundEnabled('staff'), true)

  mod.setLiveChatSoundEnabled('staff', false)
  assert.equal(mod.isLiveChatSoundEnabled('staff'), false)

  mod.setLiveChatSoundEnabled('customer', true)
  mod.setLiveChatSoundEnabled('staff', true)
  assert.equal(mod.isLiveChatSoundEnabled('customer'), true)
  assert.equal(mod.isLiveChatSoundEnabled('staff'), true)
})

test('convertLiveChatMessagesToThreadEntries preserves live-chat turns and formats AI continuity context', () => {
  const converted = convertLiveChatMessagesToThreadEntries({
    sessionId: 'sess-123',
    supportCode: 'DS-LC-7K4M9P',
    staffName: 'Amaka O.',
    messages: [
      {
        id: 'm1',
        sender_role: 'system',
        body: 'A representative will be with you shortly.',
        created_at: '2026-11-20T10:00:00.000Z',
      },
      {
        id: 'm2',
        sender_role: 'system',
        body: 'Amaka O. joined the chat',
        created_at: '2026-11-20T10:01:00.000Z',
      },
      {
        id: 'm3',
        sender_role: 'user',
        body: 'Can I move my HydraFacial to Friday 2pm?',
        created_at: '2026-11-20T10:02:00.000Z',
      },
      {
        id: 'm4',
        sender_role: 'staff',
        sender_name: 'Amaka O.',
        body: 'Yes, Lekki has 2:00 PM open on Friday.',
        created_at: '2026-11-20T10:03:00.000Z',
      },
      {
        id: 'm5',
        sender_role: 'system',
        body: 'Chat ended',
        created_at: '2026-11-20T10:04:00.000Z',
      },
    ],
  })

  // Stub "will be with you shortly" noise is filtered, all substantive + join/end events preserved
  assert.equal(converted.length, 4)
  assert.equal(converted[0].liveChatMeta.kind, 'divider')
  assert.equal(converted[0].aiContent, '[Live Support (DS-LC-7K4M9P) Event]: Amaka O. joined the chat')
  assert.equal(converted[1].role, 'user')
  assert.equal(converted[1].liveChatMeta.kind, 'user')
  assert.equal(converted[2].role, 'assistant')
  assert.equal(converted[2].liveChatMeta.kind, 'staff')
  assert.equal(converted[2].liveChatMeta.senderName, 'Amaka O.')
  assert.equal(converted[2].aiContent, '[Live Support (DS-LC-7K4M9P) · Amaka O.]: Yes, Lekki has 2:00 PM open on Friday.')
  assert.equal(converted[3].content, 'Chat ended')

  // Forwarded to /api/chat alongside AI turns while excluding isError failures
  const outbound = formatThreadMessagesForAiApi([
    { role: 'user', content: 'I need a live agent' },
    { role: 'assistant', content: 'Connecting you...', isError: true },
    ...converted.map((c) => ({
      role: c.role,
      content: c.content,
      aiContent: c.aiContent,
      liveChatMeta: c.liveChatMeta,
    })),
    { role: 'user', content: 'Book that Friday 2pm slot she mentioned' },
  ])

  assert.equal(outbound.length, 6)
  assert.equal(outbound[2].content, 'Can I move my HydraFacial to Friday 2pm?')
  assert.equal(outbound[3].role, 'assistant')
  assert.equal(outbound[3].content, '[Live Support (DS-LC-7K4M9P) · Amaka O.]: Yes, Lekki has 2:00 PM open on Friday.')
  assert.equal(outbound[5].content, 'Book that Friday 2pm slot she mentioned')
})

test('buildLiveChatTranscriptDownloadText formats Support ID, rep attribution, and system dividers cleanly', () => {
  const txt = buildLiveChatTranscriptDownloadText({
    supportCode: 'DS-LC-7K4M9P',
    topic: 'Booking change',
    messages: [
      {
        id: 'm1',
        sender_role: 'system',
        body: 'Amaka O. joined the chat',
        created_at: '2026-11-20T10:01:00.000Z',
      },
      {
        id: 'm2',
        sender_role: 'user',
        body: 'Hi team',
        created_at: '2026-11-20T10:02:00.000Z',
      },
      {
        id: 'm3',
        sender_role: 'staff',
        sender_name: 'Amaka O.',
        body: 'Happy to help!',
        created_at: '2026-11-20T10:03:00.000Z',
      },
    ],
  })
  assert.match(txt, /Dermaspace Live Support Transcript/)
  assert.match(txt, /Support ID: DS-LC-7K4M9P/)
  assert.match(txt, /Topic: Booking change/)
  assert.match(txt, /--- Amaka O\. joined the chat ---/)
  assert.match(txt, /You: Hi team/)
  assert.match(txt, /Amaka O\.: Happy to help!/)
})

test('agent timeline filters out customer waiting notice while keeping join/close milestones', () => {
  const msgs = [
    {
      id: '1',
      sender_role: 'system',
      body: 'One of our customer care reps will be with you shortly. Stay tuned!',
      created_at: '2026-11-22T14:00:00.000Z',
    },
    {
      id: '2',
      sender_role: 'user',
      body: 'Hello, I need help with my booking',
      created_at: '2026-11-22T14:00:10.000Z',
    },
    {
      id: '3',
      sender_role: 'system',
      body: 'Ada O. joined the chat',
      created_at: '2026-11-22T14:01:00.000Z',
    },
  ]

  assert.equal(isCustomerWaitingNotice(msgs[0]), true)
  assert.equal(isCustomerWaitingNotice(msgs[1]), false)
  assert.equal(isCustomerWaitingNotice(msgs[2]), false)

  const filtered = filterAgentTimelineMessages(msgs)
  assert.deepEqual(
    filtered.map((m) => m.id),
    ['2', '3'],
  )
})

test('mergeIncrementalMessages deduplicates by id and preserves chronological order', () => {
  const existing = [
    { id: 'm1', created_at: '2026-11-22T14:00:00.000Z', body: 'hi' },
    { id: 'm2', created_at: '2026-11-22T14:00:05.000Z', body: 'there' },
  ]
  const incoming = [
    { id: 'm2', created_at: '2026-11-22T14:00:05.000Z', body: 'there!' },
    { id: 'm3', created_at: '2026-11-22T14:00:10.000Z', body: 'welcome' },
  ]
  const merged = mergeIncrementalMessages(existing, incoming)
  assert.equal(merged.length, 3)
  assert.equal(merged[1].body, 'there!')
  assert.equal(merged[2].id, 'm3')
})

test('getPresenceStatusMeta never emits contradictory or duplicated "Offline ... Offline" labels', () => {
  const cases = [
    getPresenceStatusMeta({ state: 'online', label: 'Online now' }, 'waiting'),
    getPresenceStatusMeta({ state: 'away', label: 'Away' }, 'active'),
    getPresenceStatusMeta({ state: 'offline', label: 'Offline' }, 'waiting'),
    getPresenceStatusMeta({ state: 'offline', label: 'Last seen 4m ago' }, 'active'),
    getPresenceStatusMeta({ state: 'offline', label: 'Offline' }, 'closed'),
  ]
  for (const c of cases) {
    assert.notEqual(c.leftLabel.toLowerCase(), c.rightLabel.toLowerCase())
    assert.equal(Boolean(c.leftLabel && c.rightLabel), true)
  }
})

test('sanitizeNetworkErrorMessage masks raw browser fetch failures cleanly', () => {
  assert.match(
    sanitizeNetworkErrorMessage(new TypeError('Failed to fetch')),
    /check your connection/i,
  )
  assert.match(
    sanitizeNetworkErrorMessage(new Error('Load failed')),
    /check your connection/i,
  )
  assert.equal(sanitizeNetworkErrorMessage(new Error('Session closed')), 'Session closed')
})
