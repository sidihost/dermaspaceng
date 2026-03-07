import Link from 'next/link'
import Image from 'next/image'
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin, Clock } from 'lucide-react'

const footerLinks = {
  services: [
    { name: 'Body Treatments', href: '/services/body-treatments' },
    { name: 'Facial Treatments', href: '/services/facial-treatments' },
    { name: 'Nail Care', href: '/services/nail-care' },
    { name: 'Waxing', href: '/services/waxing' },
  ],
  company: [
    { name: 'About Us', href: '/about' },
    { name: 'Packages', href: '/packages' },
    { name: 'Membership', href: '/membership' },
    { name: 'Gallery', href: '/gallery' },
    { name: 'Contact', href: '/contact' },
  ],
}

const socialLinks = [
  { name: 'Facebook', href: 'https://www.facebook.com/dermaspaceng/', icon: Facebook },
  { name: 'Instagram', href: 'https://www.instagram.com/dermaspace.ng/', icon: Instagram },
  { name: 'Twitter', href: 'https://x.com/DermaspaceN', icon: Twitter },
]

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-Lt9143hBJM7NrscuLhkTb3426o5KzH.webp"
              alt="Dermaspace"
              width={140}
              height={35}
              className="h-9 w-auto mb-4"
            />
            <p className="text-sm text-gray-600 mb-4">
              A boutique spa promoting skin confidence and body wellness in Lagos, Nigeria.
            </p>
            <div className="flex items-center gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center text-[#7B2D8E] hover:bg-[#7B2D8E] hover:text-white transition-colors"
                  aria-label={social.name}
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Services</h3>
            <ul className="space-y-2">
              {footerLinks.services.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-sm text-gray-600 hover:text-[#7B2D8E]">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-sm text-gray-600 hover:text-[#7B2D8E]">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4 text-[#7B2D8E] mt-0.5 flex-shrink-0" />
                <span>237B Muri Okunola St, Victoria Island</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4 text-[#7B2D8E] mt-0.5 flex-shrink-0" />
                <span>9 Agbeke Rotinwa Close, Ikoyi</span>
              </li>
              <li>
                <a href="tel:+2349017972919" className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#7B2D8E]">
                  <Phone className="w-4 h-4 text-[#7B2D8E]" />
                  +234 901 797 2919
                </a>
              </li>
              <li>
                <a href="mailto:info@dermaspaceng.com" className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#7B2D8E]">
                  <Mail className="w-4 h-4 text-[#7B2D8E]" />
                  info@dermaspaceng.com
                </a>
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4 text-[#7B2D8E]" />
                Mon - Sun: 9AM - 7PM
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500">
            <p>&copy; {new Date().getFullYear()} Dermaspace. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="hover:text-[#7B2D8E]">Privacy</Link>
              <Link href="/terms" className="hover:text-[#7B2D8E]">Terms</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
