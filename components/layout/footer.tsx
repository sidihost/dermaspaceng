import Link from 'next/link'
import Image from 'next/image'
import { Facebook, Instagram, Twitter, Phone, Mail, MapPin } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-Lt9143hBJM7NrscuLhkTb3426o5KzH.webp"
              alt="Dermaspace"
              width={100}
              height={30}
              className="h-7 w-auto mb-3"
            />
            <p className="text-xs text-gray-500 mb-3">
              Premium spa & wellness in Lagos
            </p>
            <div className="flex gap-2">
              {[
                { icon: Facebook, href: 'https://www.facebook.com/dermaspaceng/' },
                { icon: Instagram, href: 'https://www.instagram.com/dermaspace.ng/' },
                { icon: Twitter, href: 'https://x.com/DermaspaceN' },
              ].map((s, i) => (
                <a
                  key={i}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-[#7B2D8E] hover:text-white transition-colors"
                >
                  <s.icon className="w-3.5 h-3.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Services */}
          <div>
            <p className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">Services</p>
            <ul className="space-y-2">
              {['Body Treatments', 'Facial Treatments', 'Nail Care', 'Waxing'].map((s) => (
                <li key={s}>
                  <Link href={`/services/${s.toLowerCase().replace(' ', '-')}`} className="text-xs text-gray-500 hover:text-[#7B2D8E]">
                    {s}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links */}
          <div>
            <p className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">Links</p>
            <ul className="space-y-2">
              {['About', 'Packages', 'Membership', 'Gallery', 'Contact'].map((s) => (
                <li key={s}>
                  <Link href={`/${s.toLowerCase()}`} className="text-xs text-gray-500 hover:text-[#7B2D8E]">
                    {s}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">Contact</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-xs text-gray-500">
                <MapPin className="w-3 h-3 text-[#7B2D8E] mt-0.5 flex-shrink-0" />
                VI & Ikoyi, Lagos
              </li>
              <li>
                <a href="tel:+2349017972919" className="flex items-center gap-2 text-xs text-gray-500 hover:text-[#7B2D8E]">
                  <Phone className="w-3 h-3 text-[#7B2D8E]" />
                  +234 901 797 2919
                </a>
              </li>
              <li>
                <a href="mailto:info@dermaspaceng.com" className="flex items-center gap-2 text-xs text-gray-500 hover:text-[#7B2D8E]">
                  <Mail className="w-3 h-3 text-[#7B2D8E]" />
                  info@dermaspaceng.com
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <p className="text-center text-[10px] text-gray-400">
            &copy; {new Date().getFullYear()} Dermaspace Esthetic & Wellness Centre
          </p>
        </div>
      </div>
    </footer>
  )
}
