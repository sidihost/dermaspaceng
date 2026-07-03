import Link from 'next/link'
import { Bot } from 'lucide-react'

// Shared top nav for the public Derma AI SaaS marketing surface.
export function SaasNav() {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/derma-ai-saas" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Bot className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-base font-semibold tracking-tight">Derma AI for Business</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            href="/derma-ai-saas/login"
            className="rounded-md px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
          >
            Sign in
          </Link>
          <Link
            href="/derma-ai-saas/signup"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Get started
          </Link>
        </nav>
      </div>
    </header>
  )
}
