import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Our Services',
  description: 'Explore our comprehensive range of spa services including body treatments, facial therapies, nail care, waxing, and advanced skincare treatments at Dermaspace Lagos.',
}

const serviceCategories = [
  {
    title: 'Body Treatments',
    description: 'Indulge in luxurious body treatments for complete relaxation including massages, body scrubs, and therapeutic sessions.',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-african-woman-resting-relaxing-with-sea-salt-back-spa-salon-5-768x512-1.jpg-qzDnc9aVQiTjypUgkMMu2l5wqwyRZG.webp',
    href: '/services/body-treatments',
    treatments: ['Hot Stone Massage', 'Thai Massage', 'Sports Massage', 'Detox Body Scrub', 'Pregnancy Massage', 'Reflexology'],
  },
  {
    title: 'Facial Treatments',
    description: 'Rejuvenate your skin with our expert facial therapies ranging from deep cleansing to advanced chemical peels.',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6462-2048x1463.jpg-768x549-2-aOLyIQYjwEGezoOTEw78F0jLOjfkia.webp',
    href: '/services/facial-treatments',
    treatments: ['Deep Cleansing Facial', 'Hydra Facial', 'Acne Facial', 'Microneedling', 'Chemical Peels', 'Signature Facial'],
  },
  {
    title: 'Nail Care',
    description: 'Perfect manicures and pedicures for beautiful, healthy nails with premium products and expert techniques.',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/young-woman-getting-her-nails-done-salon-scaled.jpg-768x512-1-dTT1qPz9fJm1tSGBMYraVrKPoDeTdC.webp',
    href: '/services/nail-care',
    treatments: ['Hot Wax Mani-Pedi', 'Jelly Pedicure', 'Classic Manicure', 'Classic Pedicure', 'Gel Polish', 'Nail Art'],
  },
  {
    title: 'Waxing',
    description: 'Smooth, hair-free skin with gentle waxing services using premium strip wax and hot wax techniques.',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-young-girl-beauty-salon-1024x681.jpg-oxGrqVSRoD400FZKPP5mLOdN42EJvX.webp',
    href: '/services/waxing',
    treatments: ['Full Body Wax', 'Brazilian Wax', 'Bikini Wax', 'Arm Wax', 'Leg Wax', 'Underarm Wax'],
  },
]

export default function ServicesPage() {
  return (
    <main>
      <Header />
      
      {/* Hero Section */}
      <section className="py-20 bg-[#FDFBF9]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest mb-4">
            Our Services
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Premium <span className="text-[#7B2D8E]">Spa Services</span>
          </h1>
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-0.5 bg-[#D4A853]" />
            <div className="w-2 h-0.5 bg-[#7B2D8E]/30" />
          </div>
          <p className="text-gray-600 max-w-xl mx-auto">
            Expertly crafted treatments to rejuvenate your body and mind.
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="space-y-24">
            {serviceCategories.map((category, index) => (
              <div 
                key={category.title}
                className={`grid lg:grid-cols-2 gap-12 items-center ${index % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}
              >
                {/* Image */}
                <div className={`relative rounded-2xl overflow-hidden aspect-[4/3] ${index % 2 === 1 ? 'lg:order-2' : ''}`}>
                  <Image
                    src={category.image}
                    alt={category.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-[#7B2D8E]/10" />
                </div>

                {/* Content */}
                <div className={index % 2 === 1 ? 'lg:order-1' : ''}>
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 section-title">
                    {category.title}
                  </h2>
                  <p className="mt-6 text-lg text-gray-600 leading-relaxed">
                    {category.description}
                  </p>

                  {/* Treatments List */}
                  <div className="mt-8 grid grid-cols-2 gap-3">
                    {category.treatments.map((treatment) => (
                      <div 
                        key={treatment}
                        className="flex items-center gap-2 text-gray-700"
                      >
                        <div className="w-2 h-2 rounded-full bg-[#7B2D8E]" />
                        <span className="text-sm">{treatment}</span>
                      </div>
                    ))}
                  </div>

                  <Link
                    href={category.href}
                    className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#7B2D8E] text-white font-medium hover:bg-[#5A1D6A] transition-colors group"
                  >
                    View Details
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
