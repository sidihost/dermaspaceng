import Link from 'next/link'
import Image from 'next/image'
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin, Clock } from 'lucide-react'

const footerLinks = {
  services: [
    { name: 'Body Treatments', href: '/services/body-treatments' },
    { name: 'Facial Treatments', href: '/services/facial-treatments' },
    { name: 'Nail Care', href: '/services/nail-care' },
    { name: 'Waxing', href: '/services/waxing' },
    { name: 'Acne Treatments', href: '/services/facial-treatments#acne' },
    { name: 'Microneedling', href: '/services/facial-treatments#microneedling' },
  ],
  company: [
    { name: 'About Us', href: '/about' },
    { name: 'Our Team', href: '/about#team' },
    { name: 'Packages', href: '/packages' },
    { name: 'Membership', href: '/membership' },
    { name: 'Contact', href: '/contact' },
    { name: 'Book Appointment', href: '/booking' },
  ],
}

const socialLinks = [
  { name: 'Facebook', href: 'https://www.facebook.com/dermaspaceng/', icon: Facebook },
  { name: 'Instagram', href: 'https://www.instagram.com/dermaspace.ng/', icon: Instagram },
  { name: 'Twitter', href: 'https://x.com/DermaspaceN', icon: Twitter },
]

export default function Footer() {
  return (
    <footer className="bg-gradient-to-b from-[#f8f5fc] to-[#f0e8f5]">
      {/* Decorative Top Border */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#7B2D8E]/30 to-transparent" />
      
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Brand Column */}
          <div className="space-y-4">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-Lt9143hBJM7NrscuLhkTb3426o5KzH.webp"
              alt="Dermaspace"
              width={140}
              height={35}
              className="h-9 w-auto"
            />
            <p className="text-gray-600 text-xs leading-relaxed">
              A boutique spa promoting skin confidence and body wellness. Recognized as one of the best day and esthetic spas in Lagos, Nigeria.
            </p>
            <div className="flex items-center gap-2.5">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center text-[#7B2D8E] hover:bg-[#7B2D8E] hover:text-white transition-all duration-300"
                  aria-label={social.name}
                >
                  <social.icon className="w-3.5 h-3.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Services Column */}
          <div>
            <h3 className="text-xs font-semibold mb-4 text-[#7B2D8E] uppercase tracking-wider">Our Services</h3>
            <ul className="space-y-2">
              {footerLinks.services.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-gray-600 hover:text-[#7B2D8E] transition-colors text-xs"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links Column */}
          <div>
            <h3 className="text-xs font-semibold mb-4 text-[#7B2D8E] uppercase tracking-wider">Quick Links</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-gray-600 hover:text-[#7B2D8E] transition-colors text-xs"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Column */}
          <div>
            <h3 className="text-xs font-semibold mb-4 text-[#7B2D8E] uppercase tracking-wider">Contact Us</h3>
            <ul className="space-y-3">
              <li>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin className="w-2.5 h-2.5 text-[#7B2D8E]" />
                  </div>
                  <div className="text-xs text-gray-600">
                    <p className="font-medium text-gray-800 mb-0.5">Victoria Island</p>
                    <p>237B Muri Okunola St, Victoria Island, Lagos</p>
                  </div>
                </div>
              </li>
              <li>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin className="w-2.5 h-2.5 text-[#7B2D8E]" />
                  </div>
                  <div className="text-xs text-gray-600">
                    <p className="font-medium text-gray-800 mb-0.5">Ikoyi</p>
                    <p>9, Agbeke Rotinwa Close, Dolphin Extension Estate, Ikoyi</p>
                  </div>
                </div>
              </li>
              <li>
                <a href="mailto:info@dermaspaceng.com" className="flex items-center gap-2.5 text-gray-600 hover:text-[#7B2D8E] transition-colors">
                  <div className="w-5 h-5 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center">
                    <Mail className="w-2.5 h-2.5 text-[#7B2D8E]" />
                  </div>
                  <span className="text-xs">info@dermaspaceng.com</span>
                </a>
              </li>
              <li>
                <a href="tel:+2349017972919" className="flex items-center gap-2.5 text-gray-600 hover:text-[#7B2D8E] transition-colors">
                  <div className="w-5 h-5 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center">
                    <Phone className="w-2.5 h-2.5 text-[#7B2D8E]" />
                  </div>
                  <span className="text-xs">+234 901 797 2919</span>
                </a>
              </li>
              <li>
                <div className="flex items-center gap-2.5 text-gray-600">
                  <div className="w-5 h-5 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center">
                    <Clock className="w-2.5 h-2.5 text-[#7B2D8E]" />
                  </div>
                  <span className="text-xs">Mon - Sun: 9:00 AM - 7:00 PM</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-[#7B2D8E]/10">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-gray-500">
            <p>&copy; {new Date().getFullYear()} Dermaspace Esthetic & Wellness Centre. All rights reserved.</p>
            <div className="flex items-center gap-5">
              <Link href="/privacy" className="hover:text-[#7B2D8E] transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-[#7B2D8E] transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
