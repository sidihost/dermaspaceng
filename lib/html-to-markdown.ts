// ---------------------------------------------------------------------------
// lib/html-to-markdown.ts
//
// HTML → Markdown converter for the WYSIWYG blog editor. The editor stores
// posts as Markdown (so the public renderer in lib/markdown.ts and the
// existing DB column `content_md` keep working unchanged), but TipTap
// emits HTML. This file does the round-trip.
//
// We use Turndown (the same library Notion / GitHub use server-side) with
// a small set of rules tuned to the markdown subset our renderer accepts:
//
//   • Headings as ATX (`## H2`, `### H3`)
//   • Bold/italic/strike using *emphasis* and **strong**
//   • Links rendered as `[text](href)`
//   • Images as `![alt](src)`
//   • Bulleted lists using `-`, ordered lists using `1.`
//   • Blockquotes as `> ` lines
//   • Horizontal rules as `---`
//   • Inline `code`, fenced ```code blocks```
//
// Any HTML the editor lets through that we don't have a markdown rule for
// (raw `<div>` pasted by an author, e.g.) falls back to plain text via
// turndown's default behaviour, which keeps the stored value parseable.
// ---------------------------------------------------------------------------

import TurndownService from 'turndown'

let cached: TurndownService | null = null

function getService(): TurndownService {
  if (cached) return cached

  const td = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    strongDelimiter: '**',
    linkStyle: 'inlined',
    linkReferenceStyle: 'full',
    hr: '---',
  })

  // Strikethrough — turndown core ships with it disabled; enable so our
  // toolbar's strike button produces ~~strike~~ instead of plain text.
  td.addRule('strikethrough', {
    filter: ['del', 's', 'strike'],
    replacement: (content) => `~~${content}~~`,
  })

  // Underline — markdown has no underline syntax, but our renderer doesn't
  // emit underline either, so we drop the tags and keep the inner text.
  // This matches the public site behaviour where underline-only spans are
  // visually identical to plain text.
  td.addRule('underline', {
    filter: ['u'],
    replacement: (content) => content,
  })

  // Tighten ordered list output — turndown's default uses "1.  Item"
  // (two spaces); the markdown renderer accepts both but the single-space
  // form is the convention used by every other markdown source in the
  // codebase, so we match it for consistency.
  td.addRule('listItem', {
    filter: 'li',
    replacement: (content, node, options) => {
      const cleaned = content
        .replace(/^\n+/, '') // remove leading newlines
        .replace(/\n+$/, '\n') // single trailing newline
        .replace(/\n/gm, '\n    ') // indent nested content under the bullet
      const parent = node.parentNode as HTMLElement | null
      const isOrdered = parent && parent.nodeName === 'OL'
      const start = parent?.getAttribute('start')
      const index = parent
        ? Array.prototype.indexOf.call(parent.children, node as HTMLElement)
        : 0
      const number = (start ? Number(start) : 1) + index
      const prefix = isOrdered ? `${number}. ` : `${options.bulletListMarker} `
      return prefix + cleaned + (node.nextSibling && !/\n$/.test(cleaned) ? '\n' : '')
    },
  })

  cached = td
  return td
}

/**
 * Convert HTML emitted by the WYSIWYG editor into Markdown that the
 * public renderer can consume. Empty input returns empty — the editor's
 * "empty document" state is `<p></p>`, which we collapse so a fresh post
 * doesn't get a stray blank paragraph saved to the DB.
 */
export function htmlToMarkdown(html: string): string {
  if (!html) return ''
  const trimmed = html.trim()
  if (trimmed === '' || trimmed === '<p></p>' || trimmed === '<br>') return ''
  try {
    return getService().turndown(trimmed).trim()
  } catch (err) {
    console.error('[html-to-markdown] convert failed', err)
    // Fall back to a stripped plain text so the editor never silently
    // loses the user's content on a transform bug.
    return trimmed
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }
}
