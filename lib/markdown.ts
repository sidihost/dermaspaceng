// ---------------------------------------------------------------------------
// lib/markdown.ts
//
// Tiny, dependency-free Markdown -> HTML renderer for blog content.
//
// Why hand-rolled?
//   * Posts are author-trusted (admin / staff only) so we don't need a full
//     CommonMark parser with HTML sanitisation. We just need the subset our
//     editors actually use: headings, paragraphs, bold, italic, inline code,
//     links, lists, blockquotes, fenced code, and horizontal rules.
//   * Avoids pulling `marked` + `dompurify` (~80kb+) into the SSR bundle
//     when the input is already trusted.
//   * Output is plain HTML strings used inside `dangerouslySetInnerHTML` on
//     the post page; the rendering happens on the server.
//
// Anything we DON'T render (raw HTML, images via ![]() syntax) is escaped or
// dropped on purpose so a future "untrusted draft" mode is still safe by
// default.
// ---------------------------------------------------------------------------

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Inline pass — runs on a single line. Order matters: we resolve code spans
// first so `**` inside `code` isn't treated as bold.
function renderInline(line: string): string {
  // Inline code `like-this`
  let out = line.replace(/`([^`]+?)`/g, (_, code) => `<code>${escapeHtml(code)}</code>`)

  // Bold **text** — done before italic so **_x_** parses sensibly.
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

  // Italic *text* and _text_
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
  out = out.replace(/(^|[^_])_([^_\n]+)_/g, '$1<em>$2</em>')

  // Links [text](url) — only http(s), mailto, tel and same-site paths
  // (starts with /). Anything else is dropped to plain text to avoid
  // javascript: and data: vectors.
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (full, text: string, href: string) => {
    const safe =
      /^https?:\/\//.test(href) ||
      /^mailto:/.test(href) ||
      /^tel:/.test(href) ||
      /^\//.test(href) ||
      /^#/.test(href)
    if (!safe) return text
    const isExternal = /^https?:\/\//.test(href)
    const rel = isExternal ? ' rel="noopener noreferrer" target="_blank"' : ''
    return `<a href="${escapeHtml(href)}"${rel}>${text}</a>`
  })

  return out
}

// Block-level pass — splits on blank lines, then dispatches per block type.
export function markdownToHtml(input: string): string {
  if (!input) return ''
  const lines = input.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // Fenced code blocks ```lang
    if (/^```/.test(line)) {
      const lang = line.replace(/^```/, '').trim()
      const buf: string[] = []
      i++
      while (i < lines.length && !/^```/.test(lines[i])) {
        buf.push(lines[i])
        i++
      }
      i++ // skip closing fence
      out.push(
        `<pre><code${lang ? ` class="language-${escapeHtml(lang)}"` : ''}>${escapeHtml(
          buf.join('\n'),
        )}</code></pre>`,
      )
      continue
    }

    // ATX headings
    const heading = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line)
    if (heading) {
      const level = heading[1].length
      const slug = heading[2]
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
      out.push(`<h${level} id="${slug}">${renderInline(escapeHtml(heading[2]))}</h${level}>`)
      i++
      continue
    }

    // Horizontal rule
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      out.push('<hr />')
      i++
      continue
    }

    // Blockquote (one or more leading "> ")
    if (/^>\s?/.test(line)) {
      const buf: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      out.push(`<blockquote><p>${renderInline(escapeHtml(buf.join(' ')))}</p></blockquote>`)
      continue
    }

    // Unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      const buf: string[] = []
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*[-*+]\s+/, ''))
        i++
      }
      out.push(`<ul>${buf.map((b) => `<li>${renderInline(escapeHtml(b))}</li>`).join('')}</ul>`)
      continue
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const buf: string[] = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*\d+\.\s+/, ''))
        i++
      }
      out.push(`<ol>${buf.map((b) => `<li>${renderInline(escapeHtml(b))}</li>`).join('')}</ol>`)
      continue
    }

    // Blank line — paragraph separator handled by the outer loop.
    if (/^\s*$/.test(line)) {
      i++
      continue
    }

    // Plain paragraph: gather contiguous non-blank, non-block-starter lines.
    const buf: string[] = []
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^#{1,6}\s+/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i])
    ) {
      buf.push(lines[i])
      i++
    }
    out.push(`<p>${renderInline(escapeHtml(buf.join(' ')))}</p>`)
  }

  return out.join('\n')
}

// Plain-text excerpt for meta description fallbacks.
export function stripMarkdown(md: string, max = 160): string {
  const txt = md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*_~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return txt.length <= max ? txt : txt.slice(0, max - 1).trimEnd() + '…'
}
