export interface WindowErrorInput {
  isResourceTarget: boolean
  tagName?: string
  resourceSrc?: string
  message?: string
  errorMessage?: string
  stack?: string
  lineno?: number
  colno?: number
}

export interface ClassifiedWindowError {
  shouldReport: boolean
  message: string
  stack: string
  shouldTryChunkReload: boolean
}

const CHUNK_ERROR_RE =
  /ChunkLoadError|Loading chunk \d+ failed|Failed to (?:load|fetch) (?:dynamically imported module|chunk)/i

export function isChunkLoadFailure(message: string, stack: string): boolean {
  return CHUNK_ERROR_RE.test(`${message || ''} ${stack || ''}`)
}

/**
 * Classifies an event received by the capture-phase `window.addEventListener("error", ..., true)`
 * listener in `app/layout.tsx`.
 *
 * Key invariant:
 *   Capture-phase `window` error listeners catch non-bubbling DOM resource load `Event`s
 *   (e.g. blocked third-party analytics `<script>` tags, `<audio>`, `<img>`) where `.message`,
 *   `.lineno`, and `.error` are all `undefined`. Reporting those as `"unknown error"` pollutes
 *   `/api/client-errors` with false positives. Only first-party Next.js chunk script failures
 *   (`/_next/static/`) and genuine JS runtime `ErrorEvent`s should be reported.
 */
export function classifyWindowErrorEvent(input: WindowErrorInput): ClassifiedWindowError {
  if (input.isResourceTarget) {
    const tag = (input.tagName || '').toUpperCase()
    const src = (input.resourceSrc || '').trim()
    if (tag === 'SCRIPT' && src.includes('/_next/static/')) {
      const msg = `ChunkLoadError: Failed to load script ${src}`
      return {
        shouldReport: true,
        message: msg,
        stack: '',
        shouldTryChunkReload: true,
      }
    }
    return {
      shouldReport: false,
      message: '',
      stack: '',
      shouldTryChunkReload: false,
    }
  }

  const msg = (input.message || input.errorMessage || '').trim()
  const stack = (input.stack || '').trim()

  // Ignore completely empty events or opaque cross-origin "Script error." with no context
  if (!msg || (msg === 'Script error.' && !stack && !input.lineno)) {
    return {
      shouldReport: false,
      message: '',
      stack: '',
      shouldTryChunkReload: false,
    }
  }

  return {
    shouldReport: true,
    message: msg,
    stack,
    shouldTryChunkReload: isChunkLoadFailure(msg, stack),
  }
}
