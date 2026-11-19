import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildStaffCsv,
  computeStaffSummary,
  filterAndSortStaff,
  formatInvitationExpiry,
  formatInviterName,
  getMemberDisplayName,
  getMemberInitials,
  getMemberStatus,
  getMemberTotalActivity,
  isPlaceholderEmail,
  type StaffInvitation,
  type StaffMember,
} from './admin-staff'

function makeMember(overrides: Partial<StaffMember> = {}): StaffMember {
  return {
    id: 'user-1',
    email: 'ada@dermaspaceng.com',
    username: 'ada',
    first_name: 'Ada',
    last_name: 'Okafor',
    phone: '08012345678',
    avatar_url: null,
    role: 'staff',
    is_active: true,
    email_verified: true,
    must_change_password: false,
    is_super_admin: false,
    can_manage_services: false,
    created_at: '2025-02-01T10:00:00.000Z',
    replies_count: 4,
    complaints_assigned: 2,
    consultations_assigned: 3,
    gift_cards_assigned: 1,
    live_chats_assigned: 2,
    bookings_assigned: 5,
    ...overrides,
  }
}

describe('lib/admin-staff helpers', () => {
  it('handles placeholder emails and null/empty names safely', () => {
    assert.equal(isPlaceholderEmail('pending+itunu@dermaspaceng.invalid'), true)
    assert.equal(isPlaceholderEmail('u123@staff.dermaspace.local'), true)
    assert.equal(isPlaceholderEmail(null), true)
    assert.equal(isPlaceholderEmail(''), true)
    assert.equal(isPlaceholderEmail('ada@dermaspaceng.com'), false)

    assert.equal(getMemberInitials('Ada', 'Okafor'), 'AO')
    assert.equal(getMemberInitials(null, null, 'ada@dermaspaceng.com'), 'AD')
    assert.equal(getMemberInitials(null, null, 'pending+x@dermaspaceng.invalid'), 'DS')
    assert.equal(getMemberInitials('Chidi', null), 'CH')

    assert.equal(
      getMemberDisplayName({
        first_name: null,
        last_name: null,
        username: 'frontdesk',
        email: 'pending+frontdesk@dermaspaceng.invalid',
      }),
      '@frontdesk'
    )
    assert.equal(
      getMemberDisplayName({
        first_name: null,
        last_name: null,
        username: null,
        email: 'pending+none@dermaspaceng.invalid',
      }),
      'Unnamed staff'
    )
    assert.equal(formatInviterName('Itunu', 'Ade'), 'Itunu Ade')
    assert.equal(formatInviterName(null, null), '—')
  })

  it('derives member status accurately (suspended > pending > verified)', () => {
    assert.equal(
      getMemberStatus({ is_active: false, email_verified: true, must_change_password: false }),
      'suspended'
    )
    assert.equal(
      getMemberStatus({ is_active: false, email_verified: false, must_change_password: true }),
      'suspended'
    )
    assert.equal(
      getMemberStatus({ is_active: true, email_verified: true, must_change_password: true }),
      'pending'
    )
    assert.equal(
      getMemberStatus({ is_active: true, email_verified: false, must_change_password: false }),
      'pending'
    )
    assert.equal(
      getMemberStatus({ is_active: true, email_verified: true, must_change_password: false }),
      'verified'
    )
  })

  it('computes accurate summary counts including admin implicit service access', () => {
    const staff: StaffMember[] = [
      makeMember({ id: 'u1', role: 'admin', is_super_admin: true, can_manage_services: false }),
      makeMember({ id: 'u2', role: 'staff', can_manage_services: true, must_change_password: true }),
      makeMember({ id: 'u3', role: 'staff', is_active: false, email_verified: true }),
    ]
    const invites: StaffInvitation[] = [
      {
        id: 'inv-1',
        email: 'new@dermaspaceng.com',
        role: 'staff',
        expires_at: '2026-01-10T00:00:00.000Z',
        created_at: '2026-01-03T00:00:00.000Z',
        invited_by_name: 'Super',
        invited_by_last: 'Admin',
        invite_url: 'https://dermaspaceng.com/accept-invite?token=abc',
      },
    ]

    const summary = computeStaffSummary(staff, invites)
    assert.deepEqual(summary, {
      total: 3,
      admins: 1,
      staffCount: 2,
      verified: 1,
      pending: 1,
      suspended: 1,
      serviceEditors: 2,
      invitationsCount: 1,
    })
  })

  it('filters by query, status, and role, and sorts deterministically', () => {
    const members: StaffMember[] = [
      makeMember({
        id: 'u1',
        first_name: 'Zara',
        last_name: 'Bello',
        role: 'staff',
        created_at: '2025-01-10T00:00:00.000Z',
        replies_count: 1,
        complaints_assigned: 0,
        consultations_assigned: 0,
        gift_cards_assigned: 0,
        live_chats_assigned: 0,
        bookings_assigned: 0,
      }),
      makeMember({
        id: 'u2',
        first_name: 'Amaka',
        last_name: 'Eze',
        role: 'admin',
        is_super_admin: true,
        created_at: '2025-03-01T00:00:00.000Z',
        replies_count: 10,
        complaints_assigned: 5,
        consultations_assigned: 4,
        gift_cards_assigned: 2,
      }),
      makeMember({
        id: 'u3',
        first_name: 'Bola',
        last_name: 'Ade',
        role: 'staff',
        email: 'pending+bola@dermaspaceng.invalid',
        username: 'bola_desk',
        email_verified: false,
        created_at: '2025-02-15T00:00:00.000Z',
        replies_count: 0,
        complaints_assigned: 0,
        consultations_assigned: 0,
        gift_cards_assigned: 0,
        live_chats_assigned: 0,
        bookings_assigned: 0,
      }),
    ]

    // Newest first
    assert.deepEqual(
      filterAndSortStaff(members, { query: '', status: 'all', role: 'all', sort: 'newest' }).map((m) => m.id),
      ['u2', 'u3', 'u1']
    )

    // Name sort
    assert.deepEqual(
      filterAndSortStaff(members, { query: '', status: 'all', role: 'all', sort: 'name' }).map((m) => m.id),
      ['u2', 'u3', 'u1']
    )

    // Most active sort
    assert.deepEqual(
      filterAndSortStaff(members, { query: '', status: 'all', role: 'all', sort: 'active' }).map((m) => m.id),
      ['u2', 'u1', 'u3']
    )

    // Role sort (super admin -> admin -> staff)
    assert.deepEqual(
      filterAndSortStaff(members, { query: '', status: 'all', role: 'all', sort: 'role' }).map((m) => m.id),
      ['u2', 'u3', 'u1']
    )

    // Placeholder email should NOT match search for "invalid"
    assert.deepEqual(
      filterAndSortStaff(members, { query: 'invalid', status: 'all', role: 'all', sort: 'newest' }).map((m) => m.id),
      []
    )

    // Username search matches pending staff
    assert.deepEqual(
      filterAndSortStaff(members, { query: 'bola_desk', status: 'pending', role: 'staff', sort: 'newest' }).map((m) => m.id),
      ['u3']
    )
  })

  it('formats invitation expiry countdown accurately across boundaries', () => {
    const now = Date.parse('2026-05-01T12:00:00.000Z')
    assert.deepEqual(formatInvitationExpiry('2026-05-01T11:00:00.000Z', now), {
      label: 'Expired',
      isExpired: true,
      isUrgent: true,
    })
    assert.deepEqual(formatInvitationExpiry('2026-05-01T12:30:00.000Z', now), {
      label: 'Expires in <1h',
      isExpired: false,
      isUrgent: true,
    })
    assert.deepEqual(formatInvitationExpiry('2026-05-01T20:00:00.000Z', now), {
      label: 'Expires in 8h',
      isExpired: false,
      isUrgent: true,
    })
    assert.deepEqual(formatInvitationExpiry('2026-05-06T12:00:00.000Z', now), {
      label: 'Expires in 5d',
      isExpired: false,
      isUrgent: false,
    })
  })

  it('builds properly RFC-4180 escaped CSV output', () => {
    const member = makeMember({
      id: 'u7',
      first_name: 'Chika, "C"',
      last_name: 'Obi',
      email: 'pending+chika@dermaspaceng.invalid',
      username: 'chika',
    })
    assert.equal(getMemberTotalActivity(member), 17)
    const csv = buildStaffCsv([member])
    const lines = csv.split('\n')
    assert.equal(lines.length, 2)
    assert.ok(lines[0].startsWith('ID,Name,Email,Username,'))
    assert.ok(lines[1].includes('"Chika, ""C"" Obi"'))
    assert.ok(!lines[1].includes('@dermaspaceng.invalid'))
  })
})
