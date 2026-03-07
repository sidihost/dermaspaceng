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
    <footer className="bg-[#1a1a2e] text-white">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand Column */}
          <div className="space-y-6">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/415302924_1075146177064225_6577577843482783337_n.png-e95maF9TCmUwX5S85lZBjxTzCvbVuH.webp"
              alt="Dermaspace"
              width={220}
              height={60}
              className="h-14 w-auto"
            />
            <p className="text-gray-400 text-sm leading-relaxed">
              A boutique spa promoting skin confidence and body wellness. Recognized as one of the best day and esthetic spas in Lagos, Nigeria.
            </p>
            <div className="flex items-center gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#7B2D8E] transition-colors"
                  aria-label={social.name}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Services Column */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-white">Our Services</h3>
            <ul className="space-y-3">
              {footerLinks.services.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-[#D4A853] transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links Column */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-white">Quick Links</h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-[#D4A853] transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Column */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-white">Contact Us</h3>
            <ul className="space-y-4">
              <li>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#7B2D8E] flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-gray-400">
                    <p className="font-medium text-white mb-1">Victoria Island</p>
                    <p>237B Muri Okunola St, Victoria Island, Lagos</p>
                  </div>
                </div>
              </li>
              <li>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#7B2D8E] flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-gray-400">
                    <p className="font-medium text-white mb-1">Ikoyi</p>
                    <p>9, Agbeke Rotinwa Close, Dolphin Extension Estate, Ikoyi</p>
                  </div>
                </div>
              </li>
              <li>
                <a href="mailto:info@dermaspaceng.com" className="flex items-center gap-3 text-gray-400 hover:text-[#D4A853] transition-colors">
                  <Mail className="w-5 h-5 text-[#7B2D8E]" />
                  <span className="text-sm">info@dermaspaceng.com</span>
                </a>
              </li>
              <li>
                <a href="tel:+2349017972919" className="flex items-center gap-3 text-gray-400 hover:text-[#D4A853] transition-colors">
                  <Phone className="w-5 h-5 text-[#7B2D8E]" />
                  <span className="text-sm">+234 901 797 2919</span>
                </a>
              </li>
              <li>
                <div className="flex items-center gap-3 text-gray-400">
                  <Clock className="w-5 h-5 text-[#7B2D8E]" />
                  <span className="text-sm">Mon - Sun: 9:00 AM - 7:00 PM</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()} Dermaspace Esthetic & Wellness Centre. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="hover:text-[#D4A853] transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-[#D4A853] transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
