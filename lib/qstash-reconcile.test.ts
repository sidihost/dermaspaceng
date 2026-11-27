import test from 'node:test'
import assert from 'node:assert/strict'
import {
  extractSchedulePathname,
  findMatchingSchedulesForPath,
  getAllowedQStashVerifyUrls,
  reconcileManifestWithLiveSchedules,
} from './qstash-reconcile'

test('findMatchingSchedulesForPath matches across www and apex origins', () => {
  const live = [
    {
      scheduleId: 'scd_old_www',
      destination: 'https://www.dermaspaceng.com/api/cron/birthday-wishes',
      cron: '0 6 * * *',
      createdAt: 1000,
      paused: false,
    },
    {
      scheduleId: 'scd_new_apex',
      destination: 'https://dermaspaceng.com/api/cron/birthday-wishes',
      cron: '5 23 * * *',
      createdAt: 2000,
      paused: false,
    },
    {
      scheduleId: 'scd_other',
      destination: 'https://dermaspaceng.com/api/cron/broadcasts',
      cron: '*/5 * * * *',
      createdAt: 1500,
      paused: false,
    },
  ]

  const matches = findMatchingSchedulesForPath(live, '/api/cron/birthday-wishes')
  assert.deepEqual(
    matches.map((m) => m.scheduleId),
    ['scd_old_www', 'scd_new_apex'],
  )
})

test('reconcileManifestWithLiveSchedules picks canonical schedule and flags drifted duplicate as orphan', () => {
  const manifest = [
    {
      id: 'birthday-wishes',
      path: '/api/cron/birthday-wishes',
      cron: '5 23 * * *',
      label: 'Birthday wishes',
      description: 'Daily birthday emails',
    },
  ]

  const live = [
    {
      scheduleId: 'scd_drifted_old',
      destination: 'https://www.dermaspaceng.com/api/cron/birthday-wishes',
      cron: '0 6 * * *',
      createdAt: 1000,
      paused: false,
    },
    {
      scheduleId: 'scd_canonical_new',
      destination: 'https://dermaspaceng.com/api/cron/birthday-wishes',
      cron: '5 23 * * *',
      createdAt: 2000,
      paused: false,
    },
  ]

  const { manifest: out, orphans } = reconcileManifestWithLiveSchedules(
    manifest,
    live,
    'https://dermaspaceng.com',
  )

  assert.equal(out.length, 1)
  assert.equal(out[0].scheduleId, 'scd_canonical_new')
  assert.equal(out[0].cronInSync, true)
  assert.equal(out[0].originInSync, true)
  assert.equal(out[0].duplicateCount, 1)
  assert.deepEqual(
    orphans.map((o) => o.scheduleId),
    ['scd_drifted_old'],
  )
})

test('getAllowedQStashVerifyUrls allows both apex and www for canonical production host', () => {
  const urls = getAllowedQStashVerifyUrls(
    'https://dermaspaceng.com',
    '/api/cron/birthday-wishes',
  )
  assert.ok(urls.includes('https://dermaspaceng.com/api/cron/birthday-wishes'))
  assert.ok(urls.includes('https://www.dermaspaceng.com/api/cron/birthday-wishes'))
  assert.equal(urls.length, 2)
})

test('getAllowedQStashVerifyUrls does not expand non-production origins', () => {
  const urls = getAllowedQStashVerifyUrls(
    'https://staging.example.com',
    '/api/cron/birthday-wishes',
  )
  assert.deepEqual(urls, ['https://staging.example.com/api/cron/birthday-wishes'])
})

test('extractSchedulePathname normalizes trailing slashes and rejects malformed URLs', () => {
  assert.equal(
    extractSchedulePathname('https://dermaspaceng.com/api/cron/birthday-wishes/'),
    '/api/cron/birthday-wishes',
  )
  assert.equal(extractSchedulePathname('not-a-url'), null)
})
