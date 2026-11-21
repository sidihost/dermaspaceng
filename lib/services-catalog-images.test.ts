import test from 'node:test'
import assert from 'node:assert/strict'
import { getCategoryBySlug, SERVICES_CATALOG } from './services-catalog'

test('every service catalog category has a non-empty image URL or path', () => {
  assert.ok(SERVICES_CATALOG.length > 0)
  for (const cat of SERVICES_CATALOG) {
    assert.ok(cat.image && cat.image.trim().length > 0, `${cat.slug} missing image`)
    assert.ok(
      cat.image.startsWith('/images/') || cat.image.startsWith('/assets/') || cat.image.startsWith('https://'),
      `${cat.slug} has unexpected image format: ${cat.image}`,
    )
  }
})

test('facial-treatments and nail-care use authentic Dermaspace treatment photography', () => {
  const facial = getCategoryBySlug('facial-treatments')
  const nail = getCategoryBySlug('nail-care')
  assert.ok(facial && nail)
  assert.equal(facial.image, '/images/facial-treatment-hd.jpg')
  assert.equal(nail.image, '/images/nail-care-hd.jpg')
})

test('bulk-packages uses real Dermaspace photography instead of placeholder bottle graphic', () => {
  const bulk = getCategoryBySlug('bulk-packages')
  assert.ok(bulk)
  assert.notEqual(bulk.image, '/images/bulk-packages.png')
  assert.ok(bulk.image.includes('IMG_6401'))
})

test('laser categories use distinct real clinical laser photography', () => {
  const removal = getCategoryBySlug('laser-hair-removal')
  const deals = getCategoryBySlug('laser-package-deals')
  const peel = getCategoryBySlug('hollywood-peel')

  assert.ok(removal && deals && peel)
  assert.notEqual(removal.image, '/images/laser-hair-removal-ng.jpg')
  assert.notEqual(deals.image, '/images/laser-hair-removal-ng.jpg')
  assert.notEqual(removal.image, deals.image)
  assert.notEqual(deals.image, peel.image)
})
