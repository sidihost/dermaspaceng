import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  getTicketStatusEmailMeta,
  shouldSendTicketStatusEmail,
} from './ticket-status-email'

describe('shouldSendTicketStatusEmail', () => {
  it('returns false when email is missing or whitespace', () => {
    assert.equal(
      shouldSendTicketStatusEmail({ previousStatus: 'open', nextStatus: 'in_progress', email: '' }),
      false,
    )
    assert.equal(
      shouldSendTicketStatusEmail({ previousStatus: 'open', nextStatus: 'closed', email: null }),
      false,
    )
  })

  it('returns false when clicking the same status pill repeatedly', () => {
    assert.equal(
      shouldSendTicketStatusEmail({
        previousStatus: 'in_progress',
        nextStatus: 'in_progress',
        email: 'ada@example.com',
      }),
      false,
    )
  })

  it('returns true on any real status transition with a valid email', () => {
    for (const nextStatus of ['open', 'in_progress', 'resolved', 'closed'] as const) {
      const prev = nextStatus === 'open' ? 'closed' : 'open'
      assert.equal(
        shouldSendTicketStatusEmail({
          previousStatus: prev,
          nextStatus,
          email: 'ada@example.com',
        }),
        true,
      )
    }
  })

  it('returns true even when previousStatus is unknown/null', () => {
    assert.equal(
      shouldSendTicketStatusEmail({
        previousStatus: null,
        nextStatus: 'in_progress',
        email: 'ada@example.com',
      }),
      true,
    )
  })
})

describe('getTicketStatusEmailMeta', () => {
  it('returns Dermaspace brand palette colors for resolved and in_progress', () => {
    const inProg = getTicketStatusEmailMeta('in_progress', 'ticket')
    assert.equal(inProg.badgeBg, '#fef3c7')
    assert.equal(inProg.badgeText, '#92400e')
    assert.match(inProg.subjectLine('DS-2026-001'), /DS-2026-001/)

    const resolved = getTicketStatusEmailMeta('resolved', 'complaint')
    assert.equal(resolved.badgeBg, '#F3E6F7')
    assert.equal(resolved.badgeText, '#5A1D6A')

    const closed = getTicketStatusEmailMeta('closed', 'ticket')
    assert.equal(closed.badgeBg, '#f3f4f6')
    assert.equal(closed.badgeText, '#4b5563')
  })
})
