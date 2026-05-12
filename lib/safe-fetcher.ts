/**
 * SWR-friendly fetcher that surfaces backend errors instead of
 * swallowing them.
 *
 * The default fetcher we had inlined on every staff page —
 *   `(u) => fetch(u).then((r) => r.json())`
 * — never checks `res.ok`, so a 401/403/500 response gets decoded
 * into `{ error: "..." }` and dropped into `data` as if it were a
 * valid payload. The pages then run `data?.appointments ?? []`,
 * which is always an empty array, and silently render their
 * empty-state UI. From the operator's point of view the page
 * "doesn't work" with zero diagnostic signal.
 *
 * `safeFetcher` instead:
 *   1. Reads the body once (best-effort JSON, falls back to text)
 *   2. On a non-OK response, throws an `Error` whose `.message` is
 *      the server-supplied error string (or a generic
 *      "HTTP <status>" if the body has no `error` / `message`
 *      property).
 *   3. On a network failure, throws the underlying TypeError so
 *      SWR's `error` state fires and the page can render a real
 *      retry surface.
 *
 * Pages should pair this with the shared `<DataLoadError />` tile
 * so the operator gets a "Could not load — Retry" affordance with
 * the real reason printed underneath.
 *
 * Cache semantics:
 *   We DO NOT set `cache: 'no-store'` here — SWR already handles
 *   freshness via its own `revalidate*` knobs, and some routes
 *   actually want HTTP-cache wins. Callers that need no-store
 *   must pass their own `init`.
 */
export class HttpError extends Error {
  status: number
  body: unknown
  constructor(status: number, message: string, body: unknown) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.body = body
  }
}

export async function safeFetcher<T = unknown>(
  input: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(input, {
    credentials: 'include',
    ...init,
  })

  // Try JSON first; fall back to text so a non-JSON error body
  // (e.g. an HTML 502 from a misconfigured route) still surfaces
  // a useful message instead of a `SyntaxError` from JSON.parse.
  const ct = res.headers.get('content-type') || ''
  const raw = ct.includes('application/json')
    ? await res.json().catch(() => null)
    : await res.text().catch(() => null)

  if (!res.ok) {
    const msg =
      (raw && typeof raw === 'object' && 'error' in raw && typeof (raw as Record<string, unknown>).error === 'string'
        ? ((raw as Record<string, string>).error as string)
        : null) ||
      (raw && typeof raw === 'object' && 'message' in raw && typeof (raw as Record<string, unknown>).message === 'string'
        ? ((raw as Record<string, string>).message as string)
        : null) ||
      (typeof raw === 'string' && raw.trim().length > 0 ? raw.trim().slice(0, 240) : null) ||
      `HTTP ${res.status}`
    throw new HttpError(res.status, msg, raw)
  }

  return raw as T
}
