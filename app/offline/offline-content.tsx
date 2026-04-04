'use client'

import { WifiOff, RefreshCw, Home, Phone } from 'lucide-react'
import Link from 'next/link'

export default function OfflineContent() {
  return (
    <div className="-mb-20 md:mb-0 bg-gradient-to-b from-[#7B2D8E]/5 to-white p-5 pt-10 lg:min-h-screen lg:flex lg:items-center lg:justify-center">
      <div className="max-w-sm w-full text-center">
        {/* Offline Icon */}
        <div className="mb-4">
          <div className="w-16 h-16 mx-auto bg-[#7B2D8E]/10 rounded-full flex items-center justify-center mb-3">
            <WifiOff className="w-8 h-8 text-[#7B2D8E]" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-1.5">
            You&apos;re Offline
          </h1>
          <p className="text-sm text-gray-600">
            It looks like you&apos;ve lost your internet connection. Don&apos;t worry, some features are still available!
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-2 mb-4">
          <button
            onClick={() => window.location.reload()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#7B2D8E] text-white text-sm rounded-xl hover:bg-[#6B2D7E] transition-colors font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          
          <Link
            href="/"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm rounded-xl hover:bg-gray-50 transition-colors font-medium"
          >
            <Home className="w-4 h-4" />
            Go to Homepage
          </Link>
        </div>

        {/* Contact Info */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm mb-2">Need to reach us?</h2>
          <div className="space-y-1.5 text-xs">
            <a
              href="tel:+2349017972919"
              className="flex items-center justify-center gap-1.5 text-[#7B2D8E] hover:underline"
            >
              <Phone className="w-3.5 h-3.5" />
              +234 901 797 2919
            </a>
            <p className="text-gray-500">
              Victoria Island: 237b Muri Okunola St
            </p>
            <p className="text-gray-500">
              Ikoyi: 9 Agbeke Rotinwa Close
            </p>
          </div>
        </div>

        {/* Cached Content Notice */}
        <p className="text-[10px] text-gray-400 mt-3">
          Previously visited pages may still be available while offline.
        </p>
      </div>
    </div>
  )
}
