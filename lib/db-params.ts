/**
 * Pure helper to convert `$1, $2, ...` positional SQL queries into a
 * Tagged Template Literal `(strings, ...values)` call for Neon.
 *
 * Previously `lib/db.ts` passed `...params` linearly in placeholder
 * appearance order rather than by `$N` index, so any SQL query that
 * repeated a placeholder (e.g. `WHERE reference = $1 OR paystack_reference = $1`)
 * or referenced placeholders out of order shifted parameters and bound
 * `undefined` / `NULL` to subsequent slots.
 */
export function buildNeonTemplate(
  text: string,
  params: unknown[] = [],
): { strings: TemplateStringsArray; values: unknown[] } {
  const parts: string[] = []
  const values: unknown[] = []

  let segmentStart = 0
  let i = 0
  const len = text.length

  while (i < len) {
    const ch = text[i]

    // Skip single-quoted SQL string literals ('...' with '' escape)
    if (ch === "'") {
      i++
      while (i < len) {
        if (text[i] === "'") {
          if (i + 1 < len && text[i + 1] === "'") {
            i += 2
            continue
          }
          i++
          break
        }
        i++
      }
      continue
    }

    // Skip double-quoted SQL identifiers ("..." with "" escape)
    if (ch === '"') {
      i++
      while (i < len) {
        if (text[i] === '"') {
          if (i + 1 < len && text[i + 1] === '"') {
            i += 2
            continue
          }
          i++
          break
        }
        i++
      }
      continue
    }

    // Match positional placeholder $<digits> (e.g. $1, $2, $12)
    if (ch === '$' && i + 1 < len && text[i + 1] >= '0' && text[i + 1] <= '9') {
      let end = i + 1
      while (end < len && text[end] >= '0' && text[end] <= '9') {
        end++
      }
      const index = parseInt(text.slice(i + 1, end), 10)
      if (index >= 1) {
        parts.push(text.slice(segmentStart, i))
        values.push(index <= params.length ? params[index - 1] : undefined)
        segmentStart = end
      }
      i = end
      continue
    }

    i++
  }

  parts.push(text.slice(segmentStart))

  const strings = parts as unknown as TemplateStringsArray
  Object.assign(strings, { raw: [...parts] })

  return { strings, values }
}
