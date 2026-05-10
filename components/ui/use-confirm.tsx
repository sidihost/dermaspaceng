'use client'

/**
 * useConfirm — branded drop-in replacement for `window.confirm()`.
 *
 * Why this exists
 * ---------------
 * Until now, several admin/staff actions ("Delete this voucher?",
 * "Cancel this booking?", etc.) were gated by the native browser
 * dialog. That dialog ignores our brand entirely — it renders as a
 * grey system sheet, often using the OS-provided "OK / Cancel"
 * labels, and on Chrome it displays the page hostname above the
 * message ("dermaspaceng.com says…") which makes the action feel
 * like a security warning instead of a deliberate confirmation.
 *
 * The branded {@link ConfirmDialog} already exists for the customer
 * dashboard. This hook lets any admin / staff page call it as if it
 * were a Promise-based `confirm()`:
 *
 *   const { confirm, dialog } = useConfirm()
 *   ...
 *   if (!(await confirm({
 *     title: 'Delete this voucher?',
 *     description: 'Existing redemptions will be removed too.',
 *     confirmLabel: 'Yes, delete',
 *     variant: 'destructive',
 *   }))) return
 *
 *   // and somewhere in the JSX:
 *   {dialog}
 *
 * The hook resolves with `true` when the user taps the primary
 * button and `false` when they dismiss (overlay tap, Cancel button,
 * Escape key). It never throws.
 */

import * as React from 'react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

type ConfirmOptions = {
  title: string
  description?: React.ReactNode
  /** Optional icon for the rounded tile on the left. Defaults to a
   *  warning triangle inside ConfirmDialog. */
  icon?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** `destructive` only changes the icon tint — the primary button
   *  stays brand purple to match the rest of the dashboard. */
  variant?: 'default' | 'destructive'
}

type Resolver = (value: boolean) => void

export function useConfirm() {
  // Single-slot queue: opening a new confirm while another is open
  // resolves the previous one as `false` (user dismissed) so we never
  // leak a hanging promise. In practice nothing should ever stack
  // these, but the safety net is cheap.
  const [opts, setOpts] = React.useState<ConfirmOptions | null>(null)
  const resolverRef = React.useRef<Resolver | null>(null)
  // We track "was confirmed" separately because ConfirmDialog calls
  // onOpenChange(false) AFTER onConfirm resolves — we need to know
  // not to overwrite the `true` resolution with a `false` close.
  const confirmedRef = React.useRef(false)

  const confirm = React.useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      // If something is already open, treat it as cancelled before
      // showing the new prompt.
      if (resolverRef.current) {
        resolverRef.current(false)
      }
      resolverRef.current = resolve
      confirmedRef.current = false
      setOpts(options)
    })
  }, [])

  const handleOpenChange = React.useCallback((open: boolean) => {
    if (open) return
    // Resolve as `false` only if the user actually dismissed without
    // confirming. If onConfirm already fired, confirmedRef is true.
    if (!confirmedRef.current && resolverRef.current) {
      resolverRef.current(false)
    }
    resolverRef.current = null
    confirmedRef.current = false
    setOpts(null)
  }, [])

  const handleConfirm = React.useCallback(() => {
    confirmedRef.current = true
    if (resolverRef.current) {
      resolverRef.current(true)
      resolverRef.current = null
    }
    // ConfirmDialog will call onOpenChange(false) after this resolves,
    // which clears `opts` via handleOpenChange.
  }, [])

  const dialog = opts ? (
    <ConfirmDialog
      open={true}
      onOpenChange={handleOpenChange}
      title={opts.title}
      description={opts.description}
      icon={opts.icon}
      confirmLabel={opts.confirmLabel}
      cancelLabel={opts.cancelLabel}
      variant={opts.variant}
      onConfirm={handleConfirm}
    />
  ) : null

  return { confirm, dialog }
}
