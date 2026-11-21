import test from 'node:test'
import assert from 'node:assert/strict'
import {
  formatChatTimestamp,
  formatLiveChatTranscriptText,
  formatVisitorLocation,
  inferLocationFromTimezone,
  parseVisitorUserAgent,
  sanitizeVisitorHints,
} from './visitor-telemetry'

test('parseVisitorUserAgent detects mobile iOS Safari, Android Chrome, and Desktop Edge', () => {
  const iosSafari = parseVisitorUserAgent(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  )
  assert.deepEqual(iosSafari, {
    browser: 'Safari 17',
    os: 'iOS 17.5',
    device: 'Mobile',
  })

  const androidChrome = parseVisitorUserAgent(
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  )
  assert.deepEqual(androidChrome, {
    browser: 'Chrome 126',
    os: 'Android 14',
    device: 'Mobile',
  })

  const desktopEdge = parseVisitorUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0',
  )
  assert.deepEqual(desktopEdge, {
    browser: 'Edge 126',
    os: 'Windows 10/11',
    device: 'Desktop',
  })
})

test('formatVisitorLocation prioritizes geo headers and gracefully falls back to timezone', () => {
  assert.equal(
    formatVisitorLocation({ city: 'Lagos', region: 'LA', country: 'NG' }),
    'Lagos, LA, Nigeria',
  )
  assert.equal(
    formatVisitorLocation({ city: 'Lagos', region: 'Lagos', country: 'Nigeria' }),
    'Lagos, Nigeria',
  )
  assert.equal(
    formatVisitorLocation({ timezone: 'Africa/Lagos' }),
    'Lagos, Nigeria',
  )
  assert.equal(inferLocationFromTimezone('Europe/London'), 'London, United Kingdom')
  assert.equal(inferLocationFromTimezone('UTC'), null)
})

test('sanitizeVisitorHints strips unsafe protocols and normalizes viewport dimensions', () => {
  const clean = sanitizeVisitorHints({
    pageUrl: '/booking?service=hydrafacial',
    referrer: 'javascript:alert(1)',
    timezone: 'Africa/Lagos',
    language: 'en-NG',
    screen: '390 x 844',
  })
  assert.equal(clean.pageUrl, '/booking?service=hydrafacial')
  assert.equal(clean.referrer, null)
  assert.equal(clean.timezone, 'Africa/Lagos')
  assert.equal(clean.language, 'en-NG')
  assert.equal(clean.screen, '390×844')
})

test('formatChatTimestamp & formatLiveChatTranscriptText format clean support transcripts', () => {
  const stamp = formatChatTimestamp('2026-11-20T18:43:00.000Z')
  assert.ok(stamp.includes('2026'))

  const text = formatLiveChatTranscriptText({
    supportCode: 'DS-LC-7K4M9P',
    customerName: 'Amara Obi',
    customerEmail: 'amara@example.com',
    topic: 'Booking inquiry',
    status: 'active',
    visitor: {
      location: 'Lagos, Nigeria',
      browser: 'Chrome 126',
      os: 'Android 14',
      device: 'Mobile',
      pageUrl: '/services',
    },
    messages: [
      {
        sender_role: 'system',
        body: 'Adaeze joined the chat',
        created_at: '2026-11-20T18:43:00.000Z',
      },
      {
        sender_role: 'user',
        body: 'Hello, can I reschedule?',
        created_at: '2026-11-20T18:44:00.000Z',
      },
      {
        sender_role: 'staff',
        sender_name: 'Adaeze',
        body: 'Of course! Let me check your booking.',
        created_at: '2026-11-20T18:45:00.000Z',
      },
    ],
  })

  assert.ok(text.includes('Support ID: DS-LC-7K4M9P'))
  assert.ok(text.includes('Location: Lagos, Nigeria'))
  assert.ok(text.includes('Environment: Chrome 126 · Android 14 · Mobile'))
  assert.ok(text.includes('--- Adaeze joined the chat ---'))
  assert.ok(text.includes('Amara Obi: Hello, can I reschedule?'))
  assert.ok(text.includes('Adaeze: Of course! Let me check your booking.'))
})
