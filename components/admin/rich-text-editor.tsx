'use client'

/**
 * RichTextEditor — a lightweight, dependency-free WYSIWYG editor built on
 * `contentEditable`. It outputs plain, email-safe HTML (<p>, <h2>, <ul>,
 * <ol>, <li>, <strong>, <em>, <u>, <a>) into a single string value, which
 * is exactly what the newsletter send pipeline + preview already consume —
 * so it is a drop-in replacement for the old raw-HTML <textarea>.
 *
 * Why contentEditable + document.execCommand instead of a heavy editor lib:
 *   - zero new dependencies and no bundle cost
 *   - produces clean, table-free HTML that survives in email clients
 *   - the value stays a plain HTML string (no JSON doc model to serialize)
 *
 * The toolbar mirrors the grouped, icon-driven layout you see in modern
 * product editors (text styles · headings · lists · link), with each button
 * reflecting the live selection state so the control feels responsive.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Bold,
  Italic,
  Underline,
  Heading,
  List,
  ListOrdered,
  Link2,
  Link2Off,
  RemoveFormatting,
  Undo2,
  Redo2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  disabled?: boolean
  placeholder?: string
}

type Cmd = {
  key: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  /** execCommand name used both to run and to query active state. */
  command?: string
  /** For formatBlock-style toggles (headings). */
  block?: string
  run: () => void
  /** Optional custom active-state resolver. */
  isActive?: () => boolean
}

export function RichTextEditor({
  value,
  onChange,
  disabled,
  placeholder,
}: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<Record<string, boolean>>({})
  const [isEmpty, setIsEmpty] = useState(!value)

  // Sync external value into the editor ONLY when the editor is not the
  // active element. This lets template application / campaign loading push
  // new HTML in, while never yanking the caret mid-typing.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const focused = document.activeElement === el
    if (!focused && el.innerHTML !== value) {
      el.innerHTML = value || ''
      setIsEmpty(!el.textContent?.trim())
    }
  }, [value])

  const refreshActive = useCallback(() => {
    if (typeof document === 'undefined') return
    try {
      setActive({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        insertUnorderedList: document.queryCommandState('insertUnorderedList'),
        insertOrderedList: document.queryCommandState('insertOrderedList'),
        h2: document.queryCommandValue('formatBlock').toLowerCase() === 'h2',
      })
    } catch {
      /* queryCommandState can throw when there is no selection — ignore */
    }
  }, [])

  const emitChange = useCallback(() => {
    const el = ref.current
    if (!el) return
    setIsEmpty(!el.textContent?.trim())
    onChange(el.innerHTML)
  }, [onChange])

  const exec = useCallback(
    (command: string, arg?: string) => {
      if (disabled) return
      const el = ref.current
      if (!el) return
      el.focus()
      document.execCommand('styleWithCSS', false, 'false')
      document.execCommand(command, false, arg)
      emitChange()
      refreshActive()
    },
    [disabled, emitChange, refreshActive],
  )

  const toggleHeading = useCallback(() => {
    const isH2 = document.queryCommandValue('formatBlock').toLowerCase() === 'h2'
    exec('formatBlock', isH2 ? 'p' : 'h2')
  }, [exec])

  const addLink = useCallback(() => {
    const url = window.prompt('Link URL', 'https://')
    if (!url) return
    exec('createLink', url)
  }, [exec])

  const groups: Cmd[][] = [
    [
      { key: 'bold', label: 'Bold', icon: Bold, run: () => exec('bold'), isActive: () => active.bold },
      { key: 'italic', label: 'Italic', icon: Italic, run: () => exec('italic'), isActive: () => active.italic },
      { key: 'underline', label: 'Underline', icon: Underline, run: () => exec('underline'), isActive: () => active.underline },
    ],
    [
      { key: 'h2', label: 'Heading', icon: Heading, run: toggleHeading, isActive: () => active.h2 },
    ],
    [
      { key: 'ul', label: 'Bulleted list', icon: List, run: () => exec('insertUnorderedList'), isActive: () => active.insertUnorderedList },
      { key: 'ol', label: 'Numbered list', icon: ListOrdered, run: () => exec('insertOrderedList'), isActive: () => active.insertOrderedList },
    ],
    [
      { key: 'link', label: 'Insert link', icon: Link2, run: addLink },
      { key: 'unlink', label: 'Remove link', icon: Link2Off, run: () => exec('unlink') },
    ],
    [
      { key: 'clear', label: 'Clear formatting', icon: RemoveFormatting, run: () => exec('removeFormat') },
    ],
    [
      { key: 'undo', label: 'Undo', icon: Undo2, run: () => exec('undo') },
      { key: 'redo', label: 'Redo', icon: Redo2, run: () => exec('redo') },
    ],
  ]

  if (disabled) {
    return (
      <div
        className="prose-email w-full min-h-[120px] px-3.5 py-3 rounded-xl border border-gray-200 bg-gray-50 text-[13.5px] text-gray-600"
        dangerouslySetInnerHTML={{ __html: value || '<p class="text-gray-400">No content</p>' }}
      />
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-[#7B2D8E] focus-within:border-transparent overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 bg-gray-50/80 px-1.5 py-1.5">
        {groups.map((group, gi) => (
          <div key={gi} className="flex items-center gap-0.5">
            {gi > 0 && <span className="mx-1 h-5 w-px bg-gray-200" aria-hidden="true" />}
            {group.map(cmd => {
              const isOn = cmd.isActive?.() ?? false
              const Icon = cmd.icon
              return (
                <button
                  key={cmd.key}
                  type="button"
                  title={cmd.label}
                  aria-label={cmd.label}
                  aria-pressed={isOn}
                  // onMouseDown preventDefault keeps the selection in the
                  // editor when clicking a toolbar button.
                  onMouseDown={e => e.preventDefault()}
                  onClick={cmd.run}
                  className={cn(
                    'inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
                    isOn
                      ? 'bg-[#7B2D8E] text-white'
                      : 'text-gray-600 hover:bg-[#7B2D8E]/10 hover:text-[#7B2D8E]',
                  )}
                >
                  <Icon className="w-4 h-4" />
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Editable surface */}
      <div className="relative">
        {isEmpty && placeholder && (
          <p className="pointer-events-none absolute left-3.5 top-3 text-[13.5px] text-gray-400">
            {placeholder}
          </p>
        )}
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Email body"
          onInput={emitChange}
          onBlur={emitChange}
          onKeyUp={refreshActive}
          onMouseUp={refreshActive}
          onFocus={refreshActive}
          className="prose-email w-full min-h-[220px] max-h-[420px] overflow-y-auto px-3.5 py-3 text-[13.5px] leading-relaxed text-gray-800 focus:outline-none"
        />
      </div>
    </div>
  )
}
