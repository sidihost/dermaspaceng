import test from 'node:test'
import assert from 'node:assert/strict'
import { classifyWindowErrorEvent } from './client-error-filter'

test('ignores blocked third-party scripts, audio, and image resource load events', () => {
  assert.deepEqual(
    classifyWindowErrorEvent({
      isResourceTarget: true,
      tagName: 'SCRIPT',
      resourceSrc: 'https://www.googletagmanager.com/gtm.js?id=GTM-123',
    }),
    { shouldReport: false, message: '', stack: '', shouldTryChunkReload: false },
  )

  assert.deepEqual(
    classifyWindowErrorEvent({
      isResourceTarget: true,
      tagName: 'SCRIPT',
      resourceSrc: 'https://analytics.dermaspaceng.com/script.js',
    }),
    { shouldReport: false, message: '', stack: '', shouldTryChunkReload: false },
  )

  assert.deepEqual(
    classifyWindowErrorEvent({
      isResourceTarget: true,
      tagName: 'AUDIO',
      resourceSrc: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
    }),
    { shouldReport: false, message: '', stack: '', shouldTryChunkReload: false },
  )

  assert.deepEqual(
    classifyWindowErrorEvent({
      isResourceTarget: true,
      tagName: 'IMG',
      resourceSrc: 'https://example.com/photo.jpg',
    }),
    { shouldReport: false, message: '', stack: '', shouldTryChunkReload: false },
  )
})

test('reports and recovers when a first-party Next.js chunk script fails to load', () => {
  const res = classifyWindowErrorEvent({
    isResourceTarget: true,
    tagName: 'SCRIPT',
    resourceSrc: 'https://dermaspaceng.com/_next/static/chunks/app_page_1234.js',
  })
  assert.equal(res.shouldReport, true)
  assert.equal(res.shouldTryChunkReload, true)
  assert.match(res.message, /ChunkLoadError: Failed to load script/)
})

test('ignores opaque empty or contextless cross-origin Script error events', () => {
  assert.equal(
    classifyWindowErrorEvent({ isResourceTarget: false, message: '', errorMessage: '' }).shouldReport,
    false,
  )
  assert.equal(
    classifyWindowErrorEvent({ isResourceTarget: false, message: 'Script error.', stack: '', lineno: 0 }).shouldReport,
    false,
  )
})

test('reports genuine JS ErrorEvents and detects ChunkLoadError messages', () => {
  const runtimeErr = classifyWindowErrorEvent({
    isResourceTarget: false,
    message: 'Uncaught TypeError: Cannot read properties of undefined',
    stack: 'TypeError: Cannot read properties of undefined\n    at Page (page.tsx:10)',
    lineno: 10,
    colno: 5,
  })
  assert.equal(runtimeErr.shouldReport, true)
  assert.equal(runtimeErr.shouldTryChunkReload, false)

  const chunkErr = classifyWindowErrorEvent({
    isResourceTarget: false,
    message: 'ChunkLoadError: Loading chunk 482 failed.',
    stack: '',
    lineno: 1,
    colno: 1,
  })
  assert.equal(chunkErr.shouldReport, true)
  assert.equal(chunkErr.shouldTryChunkReload, true)
})
