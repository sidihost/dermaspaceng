import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  ADMIN_DEFAULT_AVATAR,
  ADMIN_FEMALE_DEFAULT_AVATAR,
  ADMIN_MALE_DEFAULT_AVATAR,
  STAFF_DEFAULT_AVATAR,
  STAFF_FEMALE_AVATAR_POOL,
  defaultAvatarForRole,
  isMaleAvatarUrl,
  resolveAdminAvatar,
  resolveStaffAvatar,
} from './admin-avatars'

describe('staff avatar female-portrait guarantee', () => {
  it('identifies known male portraits', () => {
    assert.equal(isMaleAvatarUrl(ADMIN_DEFAULT_AVATAR), true)
    assert.equal(isMaleAvatarUrl(ADMIN_MALE_DEFAULT_AVATAR), true)
    assert.equal(isMaleAvatarUrl('/avatars/team/admin-m1.jpg'), true)
    assert.equal(isMaleAvatarUrl('/avatars/team/admin-m4.jpg'), true)
    assert.equal(isMaleAvatarUrl('/avatars/team/admin-m5.jpg'), true)
    assert.equal(isMaleAvatarUrl('/avatars/team/admin-m6.jpg'), true)
    assert.equal(isMaleAvatarUrl('/avatars/team/admin-m7.jpg'), true)
    assert.equal(isMaleAvatarUrl('/avatars/team/admin-it.jpg'), true)
    assert.equal(isMaleAvatarUrl('/avatars/m3.jpg'), true)
  })

  it('does not flag female or custom uploaded portraits as male', () => {
    assert.equal(isMaleAvatarUrl(STAFF_DEFAULT_AVATAR), false)
    assert.equal(isMaleAvatarUrl(ADMIN_FEMALE_DEFAULT_AVATAR), false)
    assert.equal(isMaleAvatarUrl('/avatars/team/staff-4.jpg'), false)
    assert.equal(isMaleAvatarUrl('/avatars/team/admin-1.jpg'), false)
    assert.equal(isMaleAvatarUrl('/avatars/staff-default.jpg'), false)
    assert.equal(isMaleAvatarUrl('https://cdn.example.com/uploads/ada.jpg'), false)
  })

  it('always resolves null, empty, or male avatars to a female staff portrait', () => {
    const fromNull = resolveStaffAvatar(null)
    assert.equal(fromNull, STAFF_DEFAULT_AVATAR)

    const fromEmpty = resolveStaffAvatar('   ', 2)
    assert.equal(fromEmpty, STAFF_FEMALE_AVATAR_POOL[2])

    const fromMaleAdmin = resolveStaffAvatar(ADMIN_DEFAULT_AVATAR, 1)
    assert.equal(fromMaleAdmin, STAFF_FEMALE_AVATAR_POOL[1])

    const fromMaleExec = resolveStaffAvatar('/avatars/team/admin-m2.jpg', 7)
    assert.equal(fromMaleExec, STAFF_FEMALE_AVATAR_POOL[1])
  })

  it('preserves female staff or custom uploaded portraits', () => {
    assert.equal(
      resolveStaffAvatar('/avatars/team/staff-3.jpg'),
      '/avatars/team/staff-3.jpg',
    )
    assert.equal(
      resolveStaffAvatar('/avatars/team/admin-3.jpg'),
      '/avatars/team/admin-3.jpg',
    )
  })
})

describe('admin female & male avatar resolution', () => {
  it('resolves distinct female and male defaults for admins', () => {
    assert.equal(defaultAvatarForRole('admin', 'female'), ADMIN_FEMALE_DEFAULT_AVATAR)
    assert.equal(defaultAvatarForRole('admin', 'male'), ADMIN_MALE_DEFAULT_AVATAR)
    assert.equal(defaultAvatarForRole('admin'), ADMIN_DEFAULT_AVATAR)
    assert.equal(defaultAvatarForRole('staff', 'male'), STAFF_DEFAULT_AVATAR)
    assert.equal(defaultAvatarForRole('user', 'female'), null)
  })

  it('prefers uploaded portrait over gender default and trims whitespace', () => {
    assert.equal(
      resolveAdminAvatar('  /avatars/team/admin-3.jpg ', 'admin', 'male'),
      '/avatars/team/admin-3.jpg',
    )
    assert.equal(resolveAdminAvatar(null, 'admin', 'female'), ADMIN_FEMALE_DEFAULT_AVATAR)
    assert.equal(resolveAdminAvatar('', 'admin', 'male'), ADMIN_MALE_DEFAULT_AVATAR)
  })
})
