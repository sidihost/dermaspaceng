import { Globe, Mail } from 'lucide-react'

export const metadata = {
  title: 'Not Available in Your Region',
  description: 'Dermaspace is currently not available in your region.',
  robots: { index: false, follow: false },
}

export default function BlockedPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="inline-block mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-EdcQ7u5ESh5sPzpgMsL9Sep8NnY0iu.webp"
            alt="Dermaspace"
            className="h-11 w-auto mx-auto"
          />
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-7 sm:p-8">
          <div className="w-16 h-16 bg-[#7B2D8E]/10 rounded-full flex items-center justify-center mx-auto mb-5">
            <Globe className="w-8 h-8 text-[#7B2D8E]" aria-hidden="true" />
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7B2D8E] mb-2">
            Service Unavailable
          </p>

          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
            Not Available in Your Region
          </h1>

          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            Dermaspace Esthetic &amp; Wellness Centre is currently not available in
            your country or region. Access to this website and booking services is
            restricted in your area.
          </p>

          <div className="bg-[#7B2D8E]/5 border border-[#7B2D8E]/15 rounded-xl p-4 mb-6 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#7B2D8E] mb-1">
              Currently serving
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">
              Nigeria (Lagos &mdash; Victoria Island &amp; Ikoyi), United Kingdom,
              United States, UAE, Ghana, and South Africa.
            </p>
          </div>

          <a
            href="mailto:info@dermaspaceng.com?subject=Regional%20Access%20Inquiry"
            className="w-full py-3 px-4 bg-[#7B2D8E] text-white text-sm font-semibold rounded-xl hover:bg-[#5A1D6A] transition-colors flex items-center justify-center gap-2"
          >
            <Mail className="w-4 h-4" aria-hidden="true" />
            Contact Support
          </a>
        </div>

        <p className="mt-5 text-xs text-gray-500">
          If you believe you are seeing this message in error, email{' '}
          <a
            href="mailto:info@dermaspaceng.com"
            className="text-[#7B2D8E] font-medium hover:underline"
          >
            info@dermaspaceng.com
          </a>
        </p>
      </div>
    </main>
  )
}
