import Link from 'next/link'
import { Globe, Mail } from 'lucide-react'

export const metadata = {
  title: 'Not Available in Your Region | Dermaspace',
  description: 'Dermaspace is not yet available in your region.',
}

export default function BlockedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <Link href="/" className="inline-block mb-8">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-EdcQ7u5ESh5sPzpgMsL9Sep8NnY0iu.webp"
            alt="Dermaspace"
            className="h-12 w-auto mx-auto"
          />
        </Link>
        
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="w-20 h-20 bg-[#7B2D8E]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Globe className="w-10 h-10 text-[#7B2D8E]" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            We&apos;re Not in Your Region Yet
          </h1>
          
          <p className="text-gray-600 mb-6 leading-relaxed">
            Thank you for your interest in Dermaspace! Unfortunately, we&apos;re not yet available in India. 
            We&apos;re working hard to expand our services to more countries.
          </p>
          
          <div className="bg-[#7B2D8E]/5 rounded-xl p-4 mb-6">
            <p className="text-sm text-gray-700">
              <strong className="text-[#7B2D8E]">Currently available in:</strong>
              <br />
              Nigeria, United Kingdom, United States, UAE, Ghana, South Africa
            </p>
          </div>
          
          <div className="space-y-3">
            <a
              href="mailto:hello@dermaspaceng.com?subject=Notify%20me%20when%20available%20in%20India"
              className="w-full py-3 px-4 bg-[#7B2D8E] text-white text-sm font-semibold rounded-xl hover:bg-[#5A1D6A] transition-colors flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4" />
              Notify Me When Available
            </a>
            
            <p className="text-xs text-gray-500">
              We&apos;ll email you as soon as we launch in your region
            </p>
          </div>
        </div>
        
        <p className="mt-6 text-xs text-gray-400">
          If you believe you&apos;re seeing this in error, please contact{' '}
          <a href="mailto:support@dermaspaceng.com" className="text-[#7B2D8E] hover:underline">
            support@dermaspaceng.com
          </a>
        </p>
      </div>
    </div>
  )
}
