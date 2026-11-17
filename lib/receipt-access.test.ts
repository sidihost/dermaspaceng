import test from 'node:test'
import assert from 'node:assert/strict'
import {
  canAccessReceipt,
  getReceiptHref,
  isTeamMember,
  resolveStaffBookingAccessRole,
} from './receipt-access'

test('isTeamMember identifies staff and admin roles only', () => {
  assert.equal(isTeamMember('staff'), true)
  assert.equal(isTeamMember('admin'), true)
  assert.equal(isTeamMember('user'), false)
  assert.equal(isTeamMember(null), false)
  assert.equal(isTeamMember(undefined), false)
})

test('canAccessReceipt allows owner, staff, and admin while blocking other users and anonymous viewers', () => {
  assert.equal(canAccessReceipt(null, 'u1'), false)
  assert.equal(canAccessReceipt({ id: 'u1', role: 'user' }, 'u1'), true)
  assert.equal(canAccessReceipt({ id: 10, role: 'user' }, '10'), true)
  assert.equal(canAccessReceipt({ id: 'u2', role: 'user' }, 'u1'), false)
  assert.equal(canAccessReceipt({ id: 's1', role: 'staff' }, 'u1'), true)
  assert.equal(canAccessReceipt({ id: 'a1', role: 'admin' }, 'u1'), true)
  assert.equal(canAccessReceipt({ id: 'u1', role: 'user' }, null), false)
})

test('getReceiptHref picks booking, membership, or transaction receipt routes accurately', () => {
  assert.equal(
    getReceiptHref({ bookingReference: 'DS-2026-101', reference: 'BK_123' }),
    '/booking/DS-2026-101',
  )
  assert.equal(
    getReceiptHref({ reference: 'DS-999' }),
    '/booking/DS-999',
  )
  assert.equal(
    getReceiptHref({ reference: 'MEM_ABC123', metadataType: 'membership_subscription' }),
    '/membership/receipt/MEM_ABC123',
  )
  assert.equal(
    getReceiptHref({ reference: 'WF_987654' }),
    '/dashboard/transactions/WF_987654',
  )
  assert.equal(getReceiptHref({ reference: '   ', bookingReference: null }), null)
})

test('resolveStaffBookingAccessRole distinguishes assigned, granted, and readonly', () => {
  assert.equal(resolveStaffBookingAccessRole({ isAssigned: true, isAdmin: false, hasGrant: false }), 'assigned')
  assert.equal(resolveStaffBookingAccessRole({ isAssigned: false, isAdmin: true, hasGrant: false }), 'granted')
  assert.equal(resolveStaffBookingAccessRole({ isAssigned: false, isAdmin: false, hasGrant: true }), 'granted')
  assert.equal(resolveStaffBookingAccessRole({ isAssigned: false, isAdmin: false, hasGrant: false }), 'readonly')
})
