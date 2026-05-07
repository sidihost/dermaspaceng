'use client'

// ---------------------------------------------------------------------------
// components/blog/wysiwyg-editor.tsx
//
// Real WYSIWYG blog editor — admins were unhappy that the previous editor
// showed raw markdown source ("## Heading", "**bold**") in the textarea
// even though the public post rendered them correctly. Modern blog editors
// (Substack, Ghost, Medium) all show formatting effects live as the author
// types. This component does the same using TipTap (a thin wrapper over
// ProseMirror), while still persisting the body as Markdown so the public
// renderer in lib/markdown.ts and the rest of the system don't change.
//
// Round-trip:
//   Markdown stored in DB → markdownToHtml() → TipTap content (HTML)
//   On change → htmlToMarkdown() (turndown) → Markdown back to parent
//
// Design notes
// • Toolbar is sticky at the top of the editor card so it stays in reach
//   during long writing sessions, and uses brand purple #7B2D8E for the
//   active state — never amber/orange/violet.
// • Image button uploads to Cloudflare R2 via /api/upload/r2 and inserts
//   the resulting URL inline; admins should never have to copy/paste an
//   external URL by hand.
// • Headings use H2/H3 only. The H1 belongs to the post title, so we
//   intentionally don't expose H1 inside the body.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import LinkExtension from '@tiptap/extension-link'
import ImageExtension from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading2,
  Heading3,
  Quote,
  List,
  ListOrdered,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Minus,
  Undo2,
  Redo2,
  Loader2,
} from 'lucide-react'
import { markdownToHtml } from '@/lib/markdown'
import { htmlToMarkdown } from '@/lib/html-to-markdown'

interface Props {
  /** Markdown body — what we read from / write to the DB. */
  value: string
  /** Receives the latest Markdown whenever the document changes. */
  onChange: (markdown: string) => void
  placeholder?: string
}

export function WysiwygEditor({ value, onChange, placeholder }: Props) {
  // Track whether the current onChange originated inside the editor so
  // we don't fight the user's keystrokes by re-setting content from the
  // parent on every render. We only setContent when an external value
  // arrives (e.g. a draft loaded from the API).
  const isInternalUpdate = useRef(false)
  const lastEmittedMd = useRef<string>(value)

  const editor = useEditor({
    // Avoid SSR hydration mismatches — TipTap should only mount on the
    // client because ProseMirror manipulates the DOM directly.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // Heading levels limited to H2/H3 — the page-level <h1> is the
        // post title above this editor.
        heading: { levels: [2, 3] },
        // We provide our own LinkExtension below with custom options.
        link: false,
      }),
      Underline,
      LinkExtension.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
          class: 'text-[#7B2D8E] underline underline-offset-2',
        },
      }),
      ImageExtension.configure({
        HTMLAttributes: {
          class: 'rounded-lg my-2 max-w-full h-auto',
        },
      }),
      Placeholder.configure({
        placeholder:
          placeholder ??
          'Start writing… select text to format, or use the toolbar above.',
      }),
    ],
    // Preload existing Markdown by converting it to HTML the same way
    // the public site does — so the author opens an existing post and
    // sees exactly what the reader sees.
    content: value ? markdownToHtml(value) : '',
    editorProps: {
      attributes: {
        class:
          'blog-prose prose-lg prose-headings:font-semibold prose-headings:text-gray-900 ' +
          'prose-p:text-gray-800 prose-strong:text-gray-900 ' +
          'min-h-[420px] max-w-none px-4 py-4 outline-none focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      isInternalUpdate.current = true
      const md = htmlToMarkdown(editor.getHTML())
      lastEmittedMd.current = md
      onChange(md)
    },
  })

  // Sync external Markdown changes into the editor. We only setContent
  // when the new value differs from what we last emitted — otherwise we
  // would clobber the user's caret on every keystroke.
  useEffect(() => {
    if (!editor) return
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false
      return
    }
    if (value === lastEmittedMd.current) return
    const html = value ? markdownToHtml(value) : ''
    editor.commands.setContent(html, { emitUpdate: false })
    lastEmittedMd.current = value
  }, [value, editor])

  if (!editor) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white min-h-[460px] grid place-items-center text-sm text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin text-[#7B2D8E]" />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

function Toolbar({ editor }: { editor: Editor }) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Force re-render when the selection changes so the active states on
  // toolbar buttons (bold pressed, heading active, etc.) stay in sync.
  const [, force] = useState(0)
  useEffect(() => {
    if (!editor) return
    const update = () => force((n) => n + 1)
    editor.on('selectionUpdate', update)
    editor.on('transaction', update)
    return () => {
      editor.off('selectionUpdate', update)
      editor.off('transaction', update)
    }
  }, [editor])

  const setLink = useCallback(() => {
    const previous = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Link URL', previous ?? 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    const safe =
      /^https?:\/\//.test(url) ||
      /^mailto:/.test(url) ||
      /^tel:/.test(url) ||
      /^\//.test(url) ||
      /^#/.test(url)
    if (!safe) {
      window.alert('Only http(s), mailto, tel, or same-site links are allowed.')
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  const handleImageUpload = useCallback(
    async (file: File) => {
      setUploading(true)
      try {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('folder', 'blog')
        const res = await fetch('/api/upload/r2', { method: 'POST', body: fd })
        const data = await res.json()
        if (!res.ok || !data?.url) {
          window.alert(data?.error || 'Image upload failed')
          return
        }
        editor.chain().focus().setImage({ src: data.url, alt: file.name }).run()
      } catch (err) {
        console.error('[WYSIWYG] image upload', err)
        window.alert('Image upload failed — please try again.')
      } finally {
        setUploading(false)
      }
    },
    [editor],
  )

  const onPickImage = () => fileInputRef.current?.click()

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 bg-white px-1.5 py-1 sticky top-0 z-10"
    >
      <ToolbarButton
        label="Bold (⌘B)"
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
      >
        <Bold className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Italic (⌘I)"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
      >
        <Italic className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Underline (⌘U)"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive('underline')}
      >
        <UnderlineIcon className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive('strike')}
      >
        <Strikethrough className="w-3.5 h-3.5" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        label="Heading 2"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive('heading', { level: 2 })}
      >
        <Heading2 className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Heading 3"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive('heading', { level: 3 })}
      >
        <Heading3 className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Quote"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive('blockquote')}
      >
        <Quote className="w-3.5 h-3.5" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        label="Bulleted list"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')}
      >
        <List className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')}
      >
        <ListOrdered className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Inline code"
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={editor.isActive('code')}
      >
        <Code className="w-3.5 h-3.5" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        label="Link (⌘K)"
        onClick={setLink}
        active={editor.isActive('link')}
      >
        <LinkIcon className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label={uploading ? 'Uploading…' : 'Insert image'}
        onClick={onPickImage}
        disabled={uploading}
      >
        {uploading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <ImageIcon className="w-3.5 h-3.5" />
        )}
      </ToolbarButton>
      <ToolbarButton
        label="Divider"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <Minus className="w-3.5 h-3.5" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        label="Undo"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      >
        <Undo2 className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Redo"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
      >
        <Redo2 className="w-3.5 h-3.5" />
      </ToolbarButton>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleImageUpload(file)
          // Reset so picking the same file twice still triggers onChange.
          e.target.value = ''
        }}
      />
    </div>
  )
}

function ToolbarButton({
  children,
  onClick,
  active,
  disabled,
  label,
}: {
  children: React.ReactNode
  onClick: () => void
  active?: boolean
  disabled?: boolean
  label: string
}) {
  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
        active
          ? 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
          : 'text-gray-600 hover:text-[#7B2D8E] hover:bg-[#7B2D8E]/10'
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span aria-hidden className="mx-1 h-5 w-px bg-gray-200 self-center" />
}
