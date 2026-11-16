import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getUserInitials,
  isDataAvatarUrl,
  isLocalAssetUrl,
  MAX_CACHED_DATA_AVATAR_LEN,
  resolveDisplayAvatar,
  sanitizeAvatarForCache,
} from './avatar-utils'

test('isLocalAssetUrl accepts relative /avatars paths and rejects protocol-relative or external URLs', () => {
  assert.equal(isLocalAssetUrl('/avatars/f1.jpg'), true)
  assert.equal(isLocalAssetUrl('//cdn.example.com/a.jpg'), false)
  assert.equal(isLocalAssetUrl('https://lh3.googleusercontent.com/photo.jpg'), false)
  assert.equal(isLocalAssetUrl(null), false)
})

test('sanitizeAvatarForCache keeps normal URLs and strips oversized data URIs', () => {
  assert.equal(sanitizeAvatarForCache('https://example.com/a.jpg'), 'https://example.com/a.jpg')
  assert.equal(sanitizeAvatarForCache('/avatars/f2.jpg'), '/avatars/f2.jpg')
  assert.equal(sanitizeAvatarForCache('   '), null)
  assert.equal(sanitizeAvatarForCache(null), null)

  const smallData = 'data:image/webp;base64,' + 'A'.repeat(200)
  assert.equal(sanitizeAvatarForCache(smallData), smallData)
  assert.equal(isDataAvatarUrl(smallData), true)

  const oversizedData = 'data:image/png;base64,' + 'A'.repeat(MAX_CACHED_DATA_AVATAR_LEN + 10)
  assert.equal(sanitizeAvatarForCache(oversizedData), null)
})

test('getUserInitials formats initials with fallback', () => {
  assert.equal(getUserInitials('Ada', 'Obi'), 'AO')
  assert.equal(getUserInitials('ada', ''), 'A')
  assert.equal(getUserInitials('', '', 'You'), 'You')
})

test('resolveDisplayAvatar trims uploaded URL and resolves team defaults', () => {
  assert.equal(resolveDisplayAvatar('  /avatars/f3.jpg  ', 'user', 'female'), '/avatars/f3.jpg')
  assert.equal(resolveDisplayAvatar(null, 'admin', 'female'), '/avatars/admin-female-default.jpg')
  assert.equal(resolveDisplayAvatar(null, 'staff', 'female'), '/avatars/team/staff-1.jpg')
  assert.equal(resolveDisplayAvatar(null, 'user', 'female'), null)
})
