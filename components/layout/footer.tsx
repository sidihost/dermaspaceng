import Link from 'next/link'
import Image from 'next/image'
import { Phone, Mail, MapPin, Clock } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-block mb-5">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-Lt9143hBJM7NrscuLhkTb3426o5KzH.webp"
                alt="Dermaspace"
                width={140}
                height={42}
                className="h-10 w-auto"
              />
            </Link>
            <p className="text-sm text-gray-600 mb-5 leading-relaxed">
              Your destination for skin confidence and body wellness since 2019.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://instagram.com/dermaspace.ng"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center hover:bg-[#7B2D8E]/20 transition-colors"
                aria-label="Instagram"
              >
                <svg className="w-4 h-4 text-[#7B2D8E]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a
                href="https://wa.me/+2349013134945"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center hover:bg-[#7B2D8E]/20 transition-colors"
                aria-label="WhatsApp"
              >
                <svg className="w-4 h-4 text-[#7B2D8E]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </a>
              <a
                href="https://x.com/DermaspaceN"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center hover:bg-[#7B2D8E]/20 transition-colors"
                aria-label="Twitter/X"
              >
                <svg className="w-4 h-4 text-[#7B2D8E]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Services */}
          <div>
            <p className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Services</p>
            <ul className="space-y-3">
              {['Body Treatments', 'Facials', 'Massages', 'Manicure & Pedicure', 'Waxing'].map((s) => (
                <li key={s}>
                  <Link href={`/services/${s.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`} className="text-sm text-gray-600 hover:text-[#7B2D8E] transition-colors">
                    {s}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <p className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Quick Links</p>
            <ul className="space-y-3">
              {['About', 'Packages', 'Membership', 'Gallery', 'Contact'].map((s) => (
                <li key={s}>
                  <Link href={`/${s.toLowerCase()}`} className="text-sm text-gray-600 hover:text-[#7B2D8E] transition-colors">
                    {s}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/consultation" className="text-sm text-[#7B2D8E] font-medium hover:text-[#5A1D6A] transition-colors">
                  Book Consultation
                </Link>
              </li>
              <li>
                <Link href="/gift-cards" className="text-sm text-gray-600 hover:text-[#7B2D8E] transition-colors">
                  Gift Cards
                </Link>
              </li>
              <li>
                <Link href="/survey" className="text-sm text-gray-600 hover:text-[#7B2D8E] transition-colors">
                  Take Our Survey
                </Link>
              </li>
              <li>
                <Link href="/feedback" className="text-sm text-gray-600 hover:text-[#7B2D8E] transition-colors">
                  Give Feedback
                </Link>
              </li>
              <li>
                <a 
                  href="https://laser-tech.dermaspaceng.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-[#7B2D8E] font-medium hover:text-[#5A1D6A] transition-colors"
                >
                  Laser Tech
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Contact</p>
            <ul className="space-y-3">
              <li>
                <a href="tel:+2349017972919" className="flex items-center gap-3 text-sm text-gray-600 hover:text-[#7B2D8E] transition-colors">
                  <Phone className="w-4 h-4 text-[#7B2D8E]" />
                  +234 901 797 2919
                </a>
              </li>
              <li>
                <a href="mailto:info@dermaspaceng.com" className="flex items-center gap-3 text-sm text-gray-600 hover:text-[#7B2D8E] transition-colors">
                  <Mail className="w-4 h-4 text-[#7B2D8E]" />
                  info@dermaspaceng.com
                </a>
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-600">
                <MapPin className="w-4 h-4 text-[#7B2D8E] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900 mb-1">Victoria Island</p>
                  <p>Plot 5, Block A, Adeola Odeku St</p>
                </div>
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-600">
                <MapPin className="w-4 h-4 text-[#7B2D8E] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900 mb-1">Ikoyi</p>
                  <p>12 Bourdillon Road, Ikoyi</p>
                </div>
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-600">
                <Clock className="w-4 h-4 text-[#7B2D8E]" />
                <span>Mon - Sat: 9am - 7pm</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-6 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} Dermaspace. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <Link href="/signin" className="hover:text-[#7B2D8E] transition-colors">Sign In</Link>
            <Link href="/signup" className="hover:text-[#7B2D8E] transition-colors">Sign Up</Link>
            <Link href="/privacy" className="hover:text-[#7B2D8E] transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-[#7B2D8E] transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
