import { describe, it, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  AUTH_UID_COOKIE,
  parseAuthUidCookie,
  resolveValidCachedUser,
  readCachedUser,
  commitAuthenticatedUser,
  clearCachedUser,
  hasClientAuthChangedSinceLoad,
} from './auth-cache'

describe('parseAuthUidCookie', () => {
  it('extracts ds_auth_uid cleanly from a cookie header string', () => {
    assert.equal(
      parseAuthUidCookie(`foo=bar; ${AUTH_UID_COOKIE}=client-123; theme=light`),
      'client-123',
    )
    assert.equal(
      parseAuthUidCookie(`${AUTH_UID_COOKIE}=user%3A42`),
      'user:42',
    )
  })

  it('ignores prefix collisions and empty/missing values', () => {
    assert.equal(parseAuthUidCookie(`other_${AUTH_UID_COOKIE}=wrong`), null)
    assert.equal(parseAuthUidCookie(`${AUTH_UID_COOKIE}=   `), null)
    assert.equal(parseAuthUidCookie('session_id=abc'), null)
    assert.equal(parseAuthUidCookie(null), null)
  })
})

describe('resolveValidCachedUser', () => {
  const now = 1_700_000_000_000

  it('returns display-only fields when UID matches and strips PII', () => {
    const raw = JSON.stringify({
      savedAt: now - 1_000,
      user: {
        id: 'client-123',
        firstName: 'Ada',
        lastName: 'Obi',
        avatarUrl: '/avatars/f1.jpg',
        role: 'user',
        email: 'ada@example.com',
        phone: '+2348000000000',
        mustChangePassword: true,
      },
    })

    const res = resolveValidCachedUser(raw, 'client-123', now)
    assert.equal(res.shouldPurge, false)
    assert.deepEqual(res.user, {
      id: 'client-123',
      firstName: 'Ada',
      lastName: 'Obi',
      avatarUrl: '/avatars/f1.jpg',
      role: 'user',
    })
  })

  it('purges stale admin cache immediately when ds_auth_uid belongs to a client', () => {
    const adminCache = JSON.stringify({
      savedAt: now - 500,
      user: {
        id: 'admin-1',
        firstName: 'Chief',
        lastName: 'Admin',
        avatarUrl: '/avatars/admin-default.jpg',
        role: 'admin',
      },
    })

    const res = resolveValidCachedUser(adminCache, 'client-123', now)
    assert.equal(res.user, null)
    assert.equal(res.shouldPurge, true)
  })

  it('purges stale cache immediately when ds_auth_uid cookie is absent (logged out)', () => {
    const staleCache = JSON.stringify({
      savedAt: now - 500,
      user: {
        id: 'client-123',
        firstName: 'Ada',
        lastName: 'Obi',
        avatarUrl: '/avatars/f1.jpg',
        role: 'user',
      },
    })

    const res = resolveValidCachedUser(staleCache, null, now)
    assert.equal(res.user, null)
    assert.equal(res.shouldPurge, true)
  })

  it('purges expired or malformed envelopes and strips oversized data URIs', () => {
    const expired = JSON.stringify({
      savedAt: now - 8 * 24 * 60 * 60 * 1000,
      user: { id: 'u1', firstName: 'Test', lastName: 'User' },
    })
    assert.deepEqual(resolveValidCachedUser(expired, 'u1', now), {
      user: null,
      shouldPurge: true,
    })

    assert.deepEqual(resolveValidCachedUser('{bad-json', 'u1', now), {
      user: null,
      shouldPurge: true,
    })

    const hugeAvatar = 'data:image/png;base64,' + 'A'.repeat(100 * 1024)
    const withHugeAvatar = JSON.stringify({
      savedAt: now - 100,
      user: {
        id: 'u1',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: hugeAvatar,
      },
    })
    const res = resolveValidCachedUser(withHugeAvatar, 'u1', now)
    assert.equal(res.shouldPurge, false)
    assert.equal(res.user?.avatarUrl, null)
  })
})

describe('commitAuthenticatedUser & readCachedUser browser integration', () => {
  const g = globalThis as Record<string, unknown>
  const origWindow = g.window
  const origDocument = g.document

  afterEach(() => {
    if (origWindow === undefined) delete g.window
    else g.window = origWindow
    if (origDocument === undefined) delete g.document
    else g.document = origDocument
  })

  it('writes whitelisted fields, emits user-updated, and purges on cookie mismatch', () => {
    const store = new Map<string, string>()
    const events: string[] = []
    const cookieJar = { cookie: `${AUTH_UID_COOKIE}=client-99` }

    g.document = cookieJar
    g.window = {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => { store.set(k, v) },
        removeItem: (k: string) => { store.delete(k) },
      },
      dispatchEvent: (ev: Event) => {
        events.push(ev.type)
        return true
      },
    }

    commitAuthenticatedUser({
      id: 'client-99',
      firstName: 'Zara',
      lastName: 'Bello',
      avatarUrl: '/avatars/f2.jpg',
      role: 'user',
      email: 'zara@example.com',
    })

    assert.deepEqual(events, ['user-updated'])
    const cached = readCachedUser()
    assert.equal(cached?.id, 'client-99')
    assert.equal(cached?.firstName, 'Zara')
    assert.equal(cached?.avatarUrl, '/avatars/f2.jpg')
    assert.equal('email' in (cached as unknown as Record<string, unknown>), false)

    assert.equal(hasClientAuthChangedSinceLoad(), true)

    // Switch ds_auth_uid cookie to a different account — cached entry must purge synchronously
    cookieJar.cookie = `${AUTH_UID_COOKIE}=admin-1`
    assert.equal(readCachedUser(), null)
    assert.equal(store.has('dermaspace.auth.user.v2'), false)

    clearCachedUser()
    assert.equal(hasClientAuthChangedSinceLoad(), false)
    assert.equal(parseAuthUidCookie(cookieJar.cookie), null)
  })
})
