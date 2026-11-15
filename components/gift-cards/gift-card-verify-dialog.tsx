'use client'

import { useState } from 'react'
import { QrCode } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { GiftCardVerifyClient } from '@/components/gift-cards/gift-card-verify-client'

interface GiftCardVerifyDialogProps {
  userRole: 'admin' | 'staff'
  initialCode?: string
  buttonLabel?: string
  className?: string
}

export function GiftCardVerifyDialog({
  userRole,
  initialCode = '',
  buttonLabel = 'Scan / Verify Card',
  className = '',
}: GiftCardVerifyDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="open-gift-card-scanner-dialog"
        className={`inline-flex items-center justify-center gap-2 h-9 px-3.5 rounded-lg bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${className}`}
      >
        <QrCode className="w-3.5 h-3.5" aria-hidden="true" />
        <span>{buttonLabel}</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto shadow-none border-gray-200 bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#1a0d1f]">
              Scan or Verify Gift Card
            </DialogTitle>
            <DialogDescription>
              Use your device camera, upload a QR snapshot, or enter a card serial code.
            </DialogDescription>
          </DialogHeader>
          {open && (
            <GiftCardVerifyClient
              compact
              userRole={userRole}
              initialCode={initialCode}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
