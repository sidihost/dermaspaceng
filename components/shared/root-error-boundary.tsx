'use client'

/**
 * RootErrorBoundary
 * ---------------------------------------------------------------
 * Catches any uncaught render/effect error in the floating "global"
 * UI layer (mobile nav, Derma AI, ambient music, birthday banner,
 * location banner, slow-connection banner, etc.) so a single
 * mis-behaving widget can't white-screen the entire site.
 *
 * Scoped deliberately to the decorative/chrome layer. Page content
 * still has its own error boundary from Next.js via `error.tsx`
 * segments — this boundary does NOT swallow those.
 *
 * Behaviour:
 *   • On catch: logs the error with a clear tag for debugging,
 *     then renders nothing (the offending widget simply disappears).
 *   • The page content underneath this boundary keeps working, so
 *     users still see Dermaspace instead of the browser's blank
 *     "Application error" screen.
 */

import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Optional label so the log tells us which subtree failed. */
  label?: string
}

interface State {
  hasError: boolean
}

export class RootErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    // `[v0]` prefix so the log is easy to grep for in production
    // when we're triaging runtime errors.
    console.error(
      `[v0] RootErrorBoundary (${this.props.label ?? 'root'}) caught error:`,
      error,
      info?.componentStack,
    )
  }

  render() {
    if (this.state.hasError) return null
    return this.props.children
  }
}
