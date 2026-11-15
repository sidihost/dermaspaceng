/**
 * Pure helpers for ticket / support-request status change emails.
 * Keeps decision rules and status metadata decoupled and unit-testable.
 */

export type SupportStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type SupportTarget = 'ticket' | 'complaint'

export function shouldSendTicketStatusEmail(input: {
  previousStatus?: string | null
  nextStatus: string
  email?: string | null
}): boolean {
  const email = (input.email ?? '').trim()
  if (!email) return false
  if (!['open', 'in_progress', 'resolved', 'closed'].includes(input.nextStatus)) {
    return false
  }
  const prev = (input.previousStatus ?? '').trim().toLowerCase()
  return prev !== input.nextStatus.toLowerCase()
}

export interface TicketStatusEmailMeta {
  eyebrow: string
  heading: string
  intro: string
  ctaLabel: string
  statusLabel: string
  badgeBg: string
  badgeText: string
  subjectLine: (refLabel: string) => string
}

export function getTicketStatusEmailMeta(
  status: SupportStatus,
  target: SupportTarget,
): TicketStatusEmailMeta {
  const itemNoun = target === 'ticket' ? 'support ticket' : 'support request'

  switch (status) {
    case 'in_progress':
      return {
        eyebrow: 'In progress',
        heading: 'Your request is being handled',
        intro: `Our care team is now actively working on your ${itemNoun}. We will update you right here as soon as we have more details.`,
        ctaLabel: target === 'ticket' ? 'View ticket' : 'Visit Dermaspace',
        statusLabel: 'In Progress',
        badgeBg: '#fef3c7',
        badgeText: '#92400e',
        subjectLine: (refLabel) =>
          refLabel
            ? `Update on ${refLabel}: In progress - Dermaspace`
            : `Your ${itemNoun} is in progress - Dermaspace`,
      }
    case 'resolved':
      return {
        eyebrow: 'Resolved',
        heading: 'Your support request is resolved',
        intro: `Our team has marked your ${itemNoun} as resolved. If anything still feels unfinished, simply reply to this email to reopen the conversation.`,
        ctaLabel: target === 'ticket' ? 'View ticket' : 'Contact support',
        statusLabel: 'Resolved',
        badgeBg: '#F3E6F7',
        badgeText: '#5A1D6A',
        subjectLine: (refLabel) =>
          refLabel
            ? `${refLabel} has been resolved - Dermaspace`
            : `Your ${itemNoun} has been resolved - Dermaspace`,
      }
    case 'closed':
      return {
        eyebrow: 'Ticket closed',
        heading: `Your ${itemNoun} has been closed`,
        intro: `We've closed your ${itemNoun}. If you still need help with this issue, just reply to this email anytime and we'll reopen it for you.`,
        ctaLabel: target === 'ticket' ? 'View ticket' : 'Contact support',
        statusLabel: 'Closed',
        badgeBg: '#f3f4f6',
        badgeText: '#4b5563',
        subjectLine: (refLabel) =>
          refLabel
            ? `${refLabel} has been closed - Dermaspace`
            : `Your ${itemNoun} has been closed - Dermaspace`,
      }
    case 'open':
    default:
      return {
        eyebrow: 'Ticket reopened',
        heading: `Your ${itemNoun} is open`,
        intro: `Your ${itemNoun} has been moved back to Open so our team can continue reviewing it with you.`,
        ctaLabel: target === 'ticket' ? 'View ticket' : 'Contact support',
        statusLabel: 'Open',
        badgeBg: '#fef3c7',
        badgeText: '#92400e',
        subjectLine: (refLabel) =>
          refLabel
            ? `${refLabel} is now open - Dermaspace`
            : `Your ${itemNoun} is now open - Dermaspace`,
      }
  }
}
