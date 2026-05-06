'use client'

// ---------------------------------------------------------------------------
// components/blog/markdown-toolbar.tsx
//
// Formatting toolbar for the blog post editor. The editor's storage is
// Markdown (so raw `.md` content can be copied / diffed / version-controlled
// the way every modern CMS allows), but admins shouldn't have to *type*
// markdown by hand. This toolbar mirrors the GitHub / Reddit / Discord
// pattern: select text, click a button, the surrounding markdown gets
// inserted around the selection.
//
// Why a markdown toolbar instead of a full WYSIWYG (TipTap, Lexical, etc.)?
//
//   1. Storage is already markdown end-to-end (lib/markdown.ts renders
//      the public blog), so a contenteditable WYSIWYG would need a
//      bidirectional HTML↔MD transform — every transform loses fidelity.
//   2. Plain textareas paste cleanly from Word / Google Docs / Notion;
//      contenteditable surfaces drag inline styles + spans across that
//      blow up the database.
//   3. A toolbar adds <2KB and zero new dependencies. TipTap + its
//      extensions ships ~120KB just to give you the same five buttons.
//
// The component is self-contained: it owns the textarea ref, all DOM
// manipulation, and the keyboard shortcuts. The parent passes
// `value` / `onChange` and gets back markdown — same contract as a
// regular controlled textarea, so the parent doesn't change.
// ---------------------------------------------------------------------------

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'
import {
  Heading1,
  Heading2,
  Heading3,
  Bold,
  Italic,
  Code,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Code2,
  Minus,
  Image as ImageIcon,
} from 'lucide-react'

interface Props {
  value: string
  onChange: (next: string) => void
  placeholder?: string
  /**
   * Number of visible rows for the underlying textarea. Defaults to 20 —
   * enough that the editor reads as the primary surface on the page,
   * not a tiny inline note field.
   */
  rows?: number
  /**
   * `id`/`name` for accessibility — lets a label/htmlFor pair work
   * normally even though the textarea is owned by this component.
   */
  id?: string
  name?: string
}

export interface MarkdownEditorHandle {
  /** Imperatively focus the underlying textarea (used after toolbar clicks). */
  focus: () => void
}

// ---------------------------------------------------------------------------
// Wrapping helpers
//
// All toolbar buttons follow the same recipe: read the textarea's current
// selection, build new markdown around it (or replace it if it spans
// multiple lines), and write back the new value + updated selection so
// the cursor lands somewhere useful.
//
// We do this with `setRangeText` (which the browser also tracks for
// undo/redo) before falling back to a manual splice — `setRangeText`
// gives the user one Ctrl+Z to undo a toolbar click, which matches the
// expectation set by Notion / Linear / VS Code.
// ---------------------------------------------------------------------------

/** Replace the textarea's selection with `next`, preserving undo history. */
function replaceSelection(
  ta: HTMLTextAreaElement,
  next: string,
  selectionOffset?: { start: number; end: number },
): void {
  const start = ta.selectionStart
  const end = ta.selectionEnd
  // setRangeText keeps the action in the browser's native undo stack,
  // so Ctrl+Z reverts a toolbar click cleanly.
  if (typeof ta.setRangeText === 'function') {
    ta.setRangeText(next, start, end, 'end')
  } else {
    ta.value = ta.value.slice(0, start) + next + ta.value.slice(end)
  }
  if (selectionOffset) {
    ta.selectionStart = start + selectionOffset.start
    ta.selectionEnd = start + selectionOffset.end
  } else {
    ta.selectionStart = ta.selectionEnd = start + next.length
  }
}

/** Wrap the current selection (or insert a placeholder) in `before`/`after`. */
function wrap(
  ta: HTMLTextAreaElement,
  before: string,
  after: string,
  placeholder = 'text',
): void {
  const start = ta.selectionStart
  const end = ta.selectionEnd
  const selected = ta.value.slice(start, end)
  const inner = selected || placeholder
  const next = `${before}${inner}${after}`
  replaceSelection(ta, next, {
    start: before.length,
    end: before.length + inner.length,
  })
}

/**
 * Apply a line-prefix transform — used for headings, lists, and
 * blockquotes. We expand the selection to whole lines first so prefixing
 * works whether the cursor is mid-line or has a multi-line selection.
 */
function prefixLines(
  ta: HTMLTextAreaElement,
  prefix: string | ((lineIndex: number) => string),
): void {
  const value = ta.value
  const start = ta.selectionStart
  const end = ta.selectionEnd

  // Snap selection to whole lines.
  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  const lineEndRaw = value.indexOf('\n', end)
  const lineEnd = lineEndRaw === -1 ? value.length : lineEndRaw

  const block = value.slice(lineStart, lineEnd)
  const lines = block.length === 0 ? [''] : block.split('\n')
  const transformed = lines
    .map((ln, i) => {
      const p = typeof prefix === 'string' ? prefix : prefix(i)
      // Don't double-prefix if the line already has the marker — feels
      // like a toggle the way Notion / Bear do it.
      if (ln.startsWith(p)) return ln
      return `${p}${ln}`
    })
    .join('\n')

  ta.selectionStart = lineStart
  ta.selectionEnd = lineEnd
  if (typeof ta.setRangeText === 'function') {
    ta.setRangeText(transformed, lineStart, lineEnd, 'end')
  } else {
    ta.value = value.slice(0, lineStart) + transformed + value.slice(lineEnd)
  }
  ta.selectionStart = lineStart
  ta.selectionEnd = lineStart + transformed.length
}

/** Insert a complete block (newlines + body) at the start of the current line. */
function insertBlock(ta: HTMLTextAreaElement, block: string): void {
  const value = ta.value
  const start = ta.selectionStart
  // Pad with leading newline if we're not already on a fresh line, so
  // blocks (like `---` or fenced code) don't get glued to a paragraph.
  const needsLeading = start > 0 && value[start - 1] !== '\n'
  const next = `${needsLeading ? '\n' : ''}${block}\n`
  if (typeof ta.setRangeText === 'function') {
    ta.setRangeText(next, start, start, 'end')
  } else {
    ta.value = value.slice(0, start) + next + value.slice(start)
  }
  ta.selectionStart = ta.selectionEnd = start + next.length
}

// ---------------------------------------------------------------------------
// Toolbar buttons — declared up top so the JSX render reads as data, not
// a wall of <button> elements. Each entry is one logical action.
// ---------------------------------------------------------------------------

type Action = (ta: HTMLTextAreaElement) => void

interface ButtonSpec {
  key: string
  label: string
  shortcut?: string
  icon: React.ComponentType<{ className?: string }>
  run: Action
}

const ACTIONS: ButtonSpec[] = [
  {
    key: 'h1',
    label: 'Heading 1',
    icon: Heading1,
    run: (ta) => prefixLines(ta, '# '),
  },
  {
    key: 'h2',
    label: 'Heading 2',
    icon: Heading2,
    run: (ta) => prefixLines(ta, '## '),
  },
  {
    key: 'h3',
    label: 'Heading 3',
    icon: Heading3,
    run: (ta) => prefixLines(ta, '### '),
  },
  {
    key: 'bold',
    label: 'Bold',
    shortcut: '⌘B',
    icon: Bold,
    run: (ta) => wrap(ta, '**', '**', 'bold text'),
  },
  {
    key: 'italic',
    label: 'Italic',
    shortcut: '⌘I',
    icon: Italic,
    run: (ta) => wrap(ta, '*', '*', 'italic text'),
  },
  {
    key: 'code',
    label: 'Inline code',
    icon: Code,
    run: (ta) => wrap(ta, '`', '`', 'code'),
  },
  {
    key: 'link',
    label: 'Link',
    shortcut: '⌘K',
    icon: LinkIcon,
    run: (ta) => {
      const url = window.prompt('Link URL', 'https://')
      if (!url || url === 'https://') return
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const selected = ta.value.slice(start, end) || 'link text'
      replaceSelection(ta, `[${selected}](${url})`)
    },
  },
  {
    key: 'ul',
    label: 'Bulleted list',
    icon: List,
    run: (ta) => prefixLines(ta, '- '),
  },
  {
    key: 'ol',
    label: 'Numbered list',
    icon: ListOrdered,
    // Lines numbered 1., 2., 3. — markdown renderers happily accept all-1s
    // too, but real numbers read better in the source view for editors.
    run: (ta) => prefixLines(ta, (i) => `${i + 1}. `),
  },
  {
    key: 'quote',
    label: 'Quote',
    icon: Quote,
    run: (ta) => prefixLines(ta, '> '),
  },
  {
    key: 'codeblock',
    label: 'Code block',
    icon: Code2,
    run: (ta) => insertBlock(ta, '```\n\n```'),
  },
  {
    key: 'image',
    label: 'Image',
    icon: ImageIcon,
    run: (ta) => {
      const url = window.prompt('Image URL', 'https://')
      if (!url || url === 'https://') return
      const alt =
        window.prompt('Alt text (for screen readers and SEO)', '') ?? ''
      replaceSelection(ta, `![${alt}](${url})`)
    },
  },
  {
    key: 'hr',
    label: 'Divider',
    icon: Minus,
    run: (ta) => insertBlock(ta, '---'),
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const MarkdownEditor = forwardRef<MarkdownEditorHandle, Props>(
  function MarkdownEditor(
    { value, onChange, placeholder, rows = 20, id, name },
    ref,
  ) {
    const taRef = useRef<HTMLTextAreaElement | null>(null)

    useImperativeHandle(ref, () => ({
      focus: () => taRef.current?.focus(),
    }))

    /**
     * Run a toolbar action and propagate the new value to the parent.
     * Wrapping every action in this helper means buttons never touch
     * `onChange` directly — the lifecycle (focus → mutate → notify →
     * re-focus) is uniform.
     */
    const runAction = useCallback(
      (action: Action) => {
        const ta = taRef.current
        if (!ta) return
        // Make sure the textarea has the focus so selectionStart/End
        // reflect the cursor (clicking a toolbar button blurs it).
        ta.focus()
        action(ta)
        onChange(ta.value)
      },
      [onChange],
    )

    // Keyboard shortcuts. Bound on the textarea so they only fire when the
    // editor has focus — avoids stealing Cmd+B from the rest of the page.
    const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const meta = e.metaKey || e.ctrlKey
      if (!meta) return
      const key = e.key.toLowerCase()
      if (key === 'b') {
        e.preventDefault()
        runAction(ACTIONS.find((a) => a.key === 'bold')!.run)
      } else if (key === 'i') {
        e.preventDefault()
        runAction(ACTIONS.find((a) => a.key === 'italic')!.run)
      } else if (key === 'k') {
        e.preventDefault()
        runAction(ACTIONS.find((a) => a.key === 'link')!.run)
      }
    }

    // Tab key — indent (insert two spaces) instead of leaving the textarea.
    // Without this Tab moves focus to the next form element, which is
    // jarring when an editor is half-typed. Shift+Tab still moves focus.
    const handleTab = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key !== 'Tab' || e.shiftKey) return
      const ta = e.currentTarget
      e.preventDefault()
      const start = ta.selectionStart
      ta.setRangeText('  ', start, ta.selectionEnd, 'end')
      onChange(ta.value)
    }

    // Auto-grow the textarea based on content. Caps at ~80vh so a
    // 5000-word post doesn't push every other panel off-screen.
    useEffect(() => {
      const ta = taRef.current
      if (!ta) return
      ta.style.height = 'auto'
      const max = Math.min(window.innerHeight * 0.8, 1200)
      ta.style.height = `${Math.min(max, ta.scrollHeight)}px`
    }, [value])

    return (
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {/* Toolbar — sticky to the top of the editor card so it stays in
            reach during long writing sessions. We use `flex-wrap` so it
            collapses gracefully on narrow phones. */}
        <div
          role="toolbar"
          aria-label="Formatting"
          className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 bg-white px-1.5 py-1 sticky top-0 z-10"
        >
          {ACTIONS.map((a, i) => {
            // Insert a vertical divider between logical groups for visual
            // grouping (heading / inline / block) — pure visual sugar.
            const showDividerBefore =
              a.key === 'bold' || a.key === 'ul' || a.key === 'image'
            return (
              <span key={a.key} className="contents">
                {showDividerBefore && i !== 0 ? (
                  <span
                    aria-hidden
                    className="mx-1 h-5 w-px bg-gray-200 self-center"
                  />
                ) : null}
                <button
                  type="button"
                  // tabIndex={-1} keeps Tab navigation flowing past the
                  // toolbar (admins reach for Tab thinking "indent inside
                  // the editor"). The buttons are still keyboard-clickable
                  // via Shift+F10 / mouse / touch.
                  tabIndex={-1}
                  onClick={() => runAction(a.run)}
                  title={a.shortcut ? `${a.label} (${a.shortcut})` : a.label}
                  aria-label={a.label}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-600 hover:text-[#7B2D8E] hover:bg-[#7B2D8E]/10 transition-colors"
                >
                  <a.icon className="w-3.5 h-3.5" />
                </button>
              </span>
            )
          })}
        </div>

        <textarea
          ref={taRef}
          id={id}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            onKeyDown(e)
            handleTab(e)
          }}
          placeholder={
            placeholder ??
            'Start writing… select text and use the toolbar above, or type Markdown directly.'
          }
          rows={rows}
          // `font-sans` (not mono) — the team explicitly asked us to stop
          // making the editor "look like a developer console." Real CMS
          // editors (Notion, Substack, Ghost) use the body font so
          // authors get a closer feel for the rendered post while typing.
          className="block w-full font-sans text-[15px] leading-relaxed text-gray-800 placeholder:text-gray-400 bg-white border-0 px-4 py-4 outline-none resize-none focus:ring-0"
        />
      </div>
    )
  },
)
