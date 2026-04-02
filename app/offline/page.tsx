import { WifiOff, RefreshCw, Home, Phone } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Offline | Dermaspace',
  description: 'You are currently offline',
}

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#7B2D8E]/5 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Offline Icon */}
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto bg-[#7B2D8E]/10 rounded-full flex items-center justify-center mb-6">
            <WifiOff className="w-12 h-12 text-[#7B2D8E]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
            You&apos;re Offline
          </h1>
          <p className="text-gray-600 leading-relaxed">
            It looks like you&apos;ve lost your internet connection. Don&apos;t worry, some features are still available!
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3 mb-8">
          <button
            onClick={() => window.location.reload()}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white rounded-xl hover:bg-[#6B2D7E] transition-colors font-medium"
          >
            <RefreshCw className="w-5 h-5" />
            Try Again
          </button>
          
          <Link
            href="/"
            className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
          >
            <Home className="w-5 h-5" />
            Go to Homepage
          </Link>
        </div>

        {/* Contact Info */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">Need to reach us?</h2>
          <div className="space-y-3 text-sm">
            <a
              href="tel:+2349017972919"
              className="flex items-center justify-center gap-2 text-[#7B2D8E] hover:underline"
            >
              <Phone className="w-4 h-4" />
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
        <p className="text-xs text-gray-400 mt-6">
          Previously visited pages may still be available while offline.
        </p>
      </div>
    </div>
  )
}
