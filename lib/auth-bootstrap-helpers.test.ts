import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  parsePgStringArray,
  shouldRevalidateAuthOnMount,
} from './auth-bootstrap-helpers'

describe('shouldRevalidateAuthOnMount', () => {
  it('skips initial client fetch when SSR cleanly resolved a guest (no session cookie, no uid cookie)', () => {
    assert.equal(
      shouldRevalidateAuthOnMount({
        initialResolved: true,
        hasInitialUser: false,
        hasSessionCookie: false,
        hasCookieUid: false,
        cookieUidMismatch: false,
      }),
      false,
    )
  })

  it('skips initial client fetch when SSR cleanly hydrated the signed-in user with matching uid cookie', () => {
    assert.equal(
      shouldRevalidateAuthOnMount({
        initialResolved: true,
        hasInitialUser: true,
        hasSessionCookie: true,
        hasCookieUid: true,
        cookieUidMismatch: false,
      }),
      false,
    )
  })

  it('revalidates when SSR bootstrap could not resolve cleanly', () => {
    assert.equal(
      shouldRevalidateAuthOnMount({
        initialResolved: false,
        hasInitialUser: false,
        hasSessionCookie: false,
        hasCookieUid: false,
        cookieUidMismatch: false,
      }),
      true,
    )
  })

  it('revalidates when SSR resolved guest but browser carries a ds_auth_uid cookie', () => {
    assert.equal(
      shouldRevalidateAuthOnMount({
        initialResolved: true,
        hasInitialUser: false,
        hasSessionCookie: false,
        hasCookieUid: true,
        cookieUidMismatch: false,
      }),
      true,
    )
  })

  it('revalidates when browser uid cookie mismatches hydrated user id', () => {
    assert.equal(
      shouldRevalidateAuthOnMount({
        initialResolved: true,
        hasInitialUser: true,
        hasSessionCookie: true,
        hasCookieUid: true,
        cookieUidMismatch: true,
      }),
      true,
    )
  })

  it('revalidates when a session cookie existed on SSR without a resolved user', () => {
    assert.equal(
      shouldRevalidateAuthOnMount({
        initialResolved: true,
        hasInitialUser: false,
        hasSessionCookie: true,
        hasCookieUid: false,
        cookieUidMismatch: false,
      }),
      true,
    )
  })
})

describe('parsePgStringArray', () => {
  it('returns clean string arrays untouched', () => {
    assert.deepEqual(parsePgStringArray(['facial', 'waxing']), ['facial', 'waxing'])
  })

  it('parses Postgres curly-brace text array literals', () => {
    assert.deepEqual(parsePgStringArray('{facial,"nail care",waxing}'), [
      'facial',
      'nail care',
      'waxing',
    ])
  })

  it('returns empty array for empty or null values', () => {
    assert.deepEqual(parsePgStringArray(null), [])
    assert.deepEqual(parsePgStringArray(undefined), [])
    assert.deepEqual(parsePgStringArray('{}'), [])
    assert.deepEqual(parsePgStringArray([]), [])
  })
})
