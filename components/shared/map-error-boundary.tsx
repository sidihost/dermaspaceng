'use client'

import React from 'react'
import { MapPin, WifiOff } from 'lucide-react'

interface Props {
  children: React.ReactNode
  height?: string
}

interface State {
  hasError: boolean
}

export class MapErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.warn('InteractiveMap fallback triggered:', error)
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div
        className="w-full rounded-2xl border border-gray-200 bg-[#FAF6FB] flex flex-col items-center justify-center px-6 py-8 text-center"
        style={{ height: this.props.height || '288px' }}
      >
        <div className="w-10 h-10 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center mb-3">
          <WifiOff className="w-5 h-5" />
        </div>
        <p className="text-sm font-semibold text-gray-900">
          Interactive map unavailable offline
        </p>
        <p className="text-xs text-gray-600 mt-1 max-w-sm">
          Branch addresses and phone numbers above remain available. Reconnect
          to load live map tiles.
        </p>
        <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#7B2D8E]">
          <MapPin className="w-3.5 h-3.5" />
          <span>Victoria Island · Ikoyi, Lagos</span>
        </div>
      </div>
    )
  }
}
