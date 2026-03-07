"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { Phone, Mail, MapPin, Clock, Send, MessageCircle } from "lucide-react"

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsSubmitting(false)
    alert("Thank you for your message! We will get back to you soon.")
    setFormData({ name: "", email: "", phone: "", subject: "", message: "" })
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--derma-cream)]">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--derma-purple)] via-[var(--derma-purple-dark)] to-[var(--derma-magenta)]" />
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-white/20 blur-3xl" />
            <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-[var(--derma-gold)]/20 blur-3xl" />
          </div>
          
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <span className="inline-block px-4 py-2 rounded-full bg-white/10 text-white/90 text-sm font-medium mb-6 backdrop-blur-sm">
              Get In Touch
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              Contact <span className="text-[var(--derma-gold)]">Us</span>
            </h1>
            <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto">
              We would love to hear from you. Reach out to book your appointment or ask any questions.
            </p>
          </div>
        </section>

        {/* Contact Info Cards */}
        <section className="py-16 -mt-10 relative z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: Phone,
                  title: "Call Us",
                  info: ["09017972919 (Franca)", "08071584418 (Itunu)"],
                  action: "tel:+2349017972919",
                  color: "from-[var(--derma-purple)] to-[var(--derma-magenta)]"
                },
                {
                  icon: Mail,
                  title: "Email Us",
                  info: ["info@dermaspaceng.com", "admin@dermaspaceng.com"],
                  action: "mailto:info@dermaspaceng.com",
                  color: "from-[var(--derma-magenta)] to-[var(--derma-purple-light)]"
                },
                {
                  icon: MapPin,
                  title: "Visit Us",
                  info: ["Victoria Island", "Ikoyi, Lagos"],
                  action: "#locations",
                  color: "from-[var(--derma-purple-light)] to-[var(--derma-purple)]"
                },
                {
                  icon: Clock,
                  title: "Working Hours",
                  info: ["Mon - Sat: 9AM - 7PM", "Sunday: 10AM - 5PM"],
                  action: null,
                  color: "from-[var(--derma-purple)] to-[var(--derma-purple-dark)]"
                }
              ].map((item, index) => (
                <div
                  key={index}
                  className="group relative bg-white rounded-2xl p-6 transition-all duration-500 hover:-translate-y-2"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.color} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  <div className="relative z-10">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-4 group-hover:bg-white/20 transition-colors duration-500`}>
                      <item.icon className="w-7 h-7 text-white group-hover:text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--derma-purple-dark)] group-hover:text-white mb-3 transition-colors duration-500">
                      {item.title}
                    </h3>
                    <div className="space-y-1">
                      {item.info.map((line, i) => (
                        <p key={i} className="text-gray-600 group-hover:text-white/90 text-sm transition-colors duration-500">
                          {line}
                        </p>
                      ))}
                    </div>
                    {item.action && (
                      <Link
                        href={item.action}
                        className="inline-flex items-center mt-4 text-[var(--derma-purple)] group-hover:text-white font-medium text-sm transition-colors duration-500"
                      >
                        Contact Now
                        <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Form & WhatsApp */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Contact Form */}
              <div className="bg-white rounded-3xl p-8 md:p-10">
                <div className="mb-8">
                  <h2 className="text-2xl md:text-3xl font-bold text-[var(--derma-purple-dark)] mb-3">
                    Send Us a Message
                  </h2>
                  <p className="text-gray-600">
                    Fill out the form below and we will get back to you within 24 hours.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--derma-purple)] focus:ring-2 focus:ring-[var(--derma-purple)]/20 outline-none transition-all"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--derma-purple)] focus:ring-2 focus:ring-[var(--derma-purple)]/20 outline-none transition-all"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--derma-purple)] focus:ring-2 focus:ring-[var(--derma-purple)]/20 outline-none transition-all"
                        placeholder="+234..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                      <select
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--derma-purple)] focus:ring-2 focus:ring-[var(--derma-purple)]/20 outline-none transition-all"
                      >
                        <option value="">Select a subject</option>
                        <option value="booking">Book Appointment</option>
                        <option value="inquiry">General Inquiry</option>
                        <option value="membership">Membership Info</option>
                        <option value="feedback">Feedback</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                    <textarea
                      required
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--derma-purple)] focus:ring-2 focus:ring-[var(--derma-purple)]/20 outline-none transition-all resize-none"
                      placeholder="How can we help you?"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 px-6 bg-gradient-to-r from-[var(--derma-purple)] to-[var(--derma-magenta)] text-white font-semibold rounded-xl hover:opacity-90 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Send Message
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* WhatsApp & Quick Contact */}
              <div className="space-y-8">
                {/* WhatsApp Cards */}
                <div className="bg-white rounded-3xl p-8">
                  <h3 className="text-xl font-bold text-[var(--derma-purple-dark)] mb-6 flex items-center gap-3">
                    <MessageCircle className="w-6 h-6 text-green-500" />
                    Quick WhatsApp Contact
                  </h3>
                  
                  <div className="space-y-4">
                    <Link
                      href="https://wa.me/+2349013134945"
                      target="_blank"
                      className="group flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-green-500 transition-all duration-300"
                    >
                      <div className="w-14 h-14 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">Ikoyi Branch</p>
                        <p className="text-sm text-gray-500">+234 901 313 4945</p>
                      </div>
                      <div className="text-green-500 group-hover:translate-x-1 transition-transform">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>

                    <Link
                      href="https://wa.me/+2349061836625"
                      target="_blank"
                      className="group flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-green-500 transition-all duration-300"
                    >
                      <div className="w-14 h-14 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">V.I Branch</p>
                        <p className="text-sm text-gray-500">+234 906 183 6625</p>
                      </div>
                      <div className="text-green-500 group-hover:translate-x-1 transition-transform">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                  </div>
                </div>

                {/* Spa Interior Image */}
                <div className="relative rounded-3xl overflow-hidden h-64">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6401-1024x731.jpg-2JIwk298ibQ6byxSACK1nUh6Fnqjcw.webp"
                    alt="Dermaspace Spa Interior"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--derma-purple)]/80 to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6">
                    <p className="text-white font-semibold text-lg">Experience Luxury</p>
                    <p className="text-white/80 text-sm">Our elegant spa awaits you</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Map Section */}
        <section id="locations" className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-2 rounded-full bg-[var(--derma-purple)]/10 text-[var(--derma-purple)] text-sm font-medium mb-4">
                Our Locations
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-[var(--derma-purple-dark)] mb-4">
                Find Us in Lagos
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Visit any of our branches in Victoria Island or Ikoyi for your premium spa experience.
              </p>
            </div>

            {/* Location Cards with Map */}
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Victoria Island */}
              <div className="bg-[var(--derma-cream)] rounded-3xl overflow-hidden">
                <div className="aspect-video relative">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3964.7294567891234!2d3.4219!3d6.4281!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNsKwMjUnNDEuMiJOIDPCsDI1JzE4LjgiRQ!5e0!3m2!1sen!2sng!4v1234567890"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="absolute inset-0"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--derma-purple)] to-[var(--derma-magenta)] flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-[var(--derma-purple-dark)] mb-2">Victoria Island Branch</h3>
                      <p className="text-gray-600 mb-4">237B Muri Okunola Street, Victoria Island, Lagos 106104</p>
                      <div className="flex flex-wrap gap-3">
                        <Link
                          href="https://wa.me/+2349061836625"
                          target="_blank"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                          WhatsApp
                        </Link>
                        <Link
                          href="https://goo.gl/maps/dermaspace-vi"
                          target="_blank"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--derma-purple)] text-white rounded-lg text-sm font-medium hover:bg-[var(--derma-purple-dark)] transition-colors"
                        >
                          <MapPin className="w-4 h-4" />
                          Get Directions
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ikoyi */}
              <div className="bg-[var(--derma-cream)] rounded-3xl overflow-hidden">
                <div className="aspect-video relative">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3964.7294567891234!2d3.4419!3d6.4481!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNsKwMjYnNTMuMiJOIDPCsDI2JzMwLjgiRQ!5e0!3m2!1sen!2sng!4v1234567890"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="absolute inset-0"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--derma-magenta)] to-[var(--derma-purple-light)] flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-[var(--derma-purple-dark)] mb-2">Ikoyi Branch</h3>
                      <p className="text-gray-600 mb-4">9, Agbeke Rotinwa Close, Dolphin Extension Estate, Ikoyi, Lagos</p>
                      <div className="flex flex-wrap gap-3">
                        <Link
                          href="https://wa.me/+2349013134945"
                          target="_blank"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                          WhatsApp
                        </Link>
                        <Link
                          href="https://goo.gl/maps/dermaspace-ikoyi"
                          target="_blank"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--derma-purple)] text-white rounded-lg text-sm font-medium hover:bg-[var(--derma-purple-dark)] transition-colors"
                        >
                          <MapPin className="w-4 h-4" />
                          Get Directions
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
