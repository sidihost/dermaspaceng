import { Eye } from 'lucide-react'

/**
 * Thin banner shown to admins/staff when they're viewing a feature that
 * is in "Admin only" preview mode — i.e. hidden from the public but open
 * to the team for testing. Amber, so it reads clearly as an internal
 * state rather than a normal part of the page.
 */
export function FeaturePreviewBanner({ label }: { label: string }) {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-center text-xs font-medium text-amber-900 border-b border-amber-200"
    >
      <Eye className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
      <span className="text-pretty">{label}</span>
    </div>
  )
}
