import Link from 'next/link'
import Image from 'next/image'
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin, Clock, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
    <footer className="bg-gradient-to-b from-white via-[#f8f5fc] to-[#f0e8f5]">
      {/* CTA Section */}
      <div className="border-y border-[#7B2D8E]/10">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-16">
          <div className="bg-gradient-to-r from-[#7B2D8E] via-[#9B4DB0] to-[#7B2D8E] rounded-3xl p-10 md:p-14 text-center relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-[#D4A853] blur-3xl" />
            </div>
            
            <div className="relative z-10">
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Experience Luxury?
              </h3>
              <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
                Book your appointment today and discover why Dermaspace is the premier spa destination in Lagos
              </p>
              <Button
                asChild
                size="lg"
                className="bg-white text-[#7B2D8E] hover:bg-[#D4A853] hover:text-white rounded-full px-10 h-14 text-lg font-semibold shadow-xl"
              >
                <Link href="/booking" className="flex items-center gap-2">
                  Book Your Visit
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-1 space-y-6">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-Lt9143hBJM7NrscuLhkTb3426o5KzH.webp"
              alt="Dermaspace"
              width={180}
              height={45}
              className="h-12 w-auto"
            />
            <p className="text-gray-600 text-base leading-relaxed">
              A boutique spa promoting skin confidence and body wellness. Recognized as one of the best esthetic spas in Lagos, Nigeria.
            </p>
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-11 h-11 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center text-[#7B2D8E] hover:bg-[#7B2D8E] hover:text-white transition-all duration-300"
                  aria-label={social.name}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Services Column */}
          <div>
            <h3 className="text-base font-bold mb-6 text-gray-900">Our Services</h3>
            <ul className="space-y-4">
              {footerLinks.services.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-gray-600 hover:text-[#7B2D8E] transition-colors text-base flex items-center gap-2 group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E]/30 group-hover:bg-[#7B2D8E] transition-colors" />
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links Column */}
          <div>
            <h3 className="text-base font-bold mb-6 text-gray-900">Quick Links</h3>
            <ul className="space-y-4">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-gray-600 hover:text-[#7B2D8E] transition-colors text-base flex items-center gap-2 group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E]/30 group-hover:bg-[#7B2D8E] transition-colors" />
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Column */}
          <div>
            <h3 className="text-base font-bold mb-6 text-gray-900">Contact Us</h3>
            <ul className="space-y-5">
              <li>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-[#7B2D8E]" />
                  </div>
                  <div className="text-base text-gray-600">
                    <p className="font-semibold text-gray-900 mb-1">Victoria Island</p>
                    <p>237B Muri Okunola Street</p>
                  </div>
                </div>
              </li>
              <li>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-[#7B2D8E]" />
                  </div>
                  <div className="text-base text-gray-600">
                    <p className="font-semibold text-gray-900 mb-1">Ikoyi</p>
                    <p>9 Agbeke Rotinwa Close, Dolphin Extension</p>
                  </div>
                </div>
              </li>
              <li>
                <a href="tel:+2349017972919" className="flex items-center gap-3 text-gray-600 hover:text-[#7B2D8E] transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-[#7B2D8E]" />
                  </div>
                  <span className="text-base font-medium">+234 901 797 2919</span>
                </a>
              </li>
              <li>
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-[#7B2D8E]" />
                  </div>
                  <span className="text-base">Mon - Sun: 9AM - 7PM</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-[#7B2D8E]/10 bg-[#f0e8f5]">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <p>&copy; {new Date().getFullYear()} Dermaspace Esthetic & Wellness Centre. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="hover:text-[#7B2D8E] transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-[#7B2D8E] transition-colors">
                Terms of Service
              </Link>
              <Link href="/survey" className="hover:text-[#7B2D8E] transition-colors">
                Feedback
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
