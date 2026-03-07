import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { ArrowRight, Clock, Star } from 'lucide-react'

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
    duration: 'From 60 mins',
    rating: 4.9,
  },
  {
    title: 'Facial Treatments',
    description: 'Rejuvenate your skin with our expert facial therapies ranging from deep cleansing to advanced chemical peels.',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6462-2048x1463.jpg-768x549-2-aOLyIQYjwEGezoOTEw78F0jLOjfkia.webp',
    href: '/services/facial-treatments',
    treatments: ['Deep Cleansing Facial', 'Hydra Facial', 'Acne Facial', 'Microneedling', 'Chemical Peels', 'Signature Facial'],
    duration: 'From 45 mins',
    rating: 4.8,
  },
  {
    title: 'Nail Care',
    description: 'Perfect manicures and pedicures for beautiful, healthy nails with premium products and expert techniques.',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/young-woman-getting-her-nails-done-salon-scaled.jpg-768x512-1-dTT1qPz9fJm1tSGBMYraVrKPoDeTdC.webp',
    href: '/services/nail-care',
    treatments: ['Hot Wax Mani-Pedi', 'Jelly Pedicure', 'Classic Manicure', 'Classic Pedicure', 'Gel Polish', 'Nail Art'],
    duration: 'From 30 mins',
    rating: 4.7,
  },
  {
    title: 'Waxing',
    description: 'Smooth, hair-free skin with gentle waxing services using premium strip wax and hot wax techniques.',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-young-girl-beauty-salon-1024x681.jpg-oxGrqVSRoD400FZKPP5mLOdN42EJvX.webp',
    href: '/services/waxing',
    treatments: ['Full Body Wax', 'Brazilian Wax', 'Bikini Wax', 'Arm Wax', 'Leg Wax', 'Underarm Wax'],
    duration: 'From 15 mins',
    rating: 4.8,
  },
]

export default function ServicesPage() {
  return (
    <main>
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-16 bg-[#7B2D8E] overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-8 h-0.5 bg-[#D4A853]" />
            <svg className="w-4 h-4 text-[#D4A853]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <div className="w-8 h-0.5 bg-[#D4A853]" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Our Services
          </h1>
          <p className="text-sm text-white/80 max-w-md mx-auto">
            Expertly crafted treatments to rejuvenate your body and mind
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-12 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-6">
            {serviceCategories.map((category) => (
              <Link
                key={category.title}
                href={category.href}
                className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-[#7B2D8E]/30 transition-all"
              >
                {/* Image */}
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={category.image}
                    alt={category.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  
                  {/* Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 bg-white/90 rounded-full">
                    <Star className="w-3 h-3 text-[#D4A853] fill-current" />
                    <span className="text-xs font-semibold text-gray-900">{category.rating}</span>
                  </div>
                  
                  {/* Title on image */}
                  <div className="absolute bottom-3 left-4">
                    <h2 className="text-lg font-bold text-white">{category.title}</h2>
                    <div className="flex items-center gap-1 text-white/80">
                      <Clock className="w-3 h-3" />
                      <span className="text-xs">{category.duration}</span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {category.description}
                  </p>

                  {/* Treatments Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {category.treatments.slice(0, 3).map((treatment) => (
                      <span 
                        key={treatment}
                        className="px-2 py-0.5 text-[10px] font-medium text-[#7B2D8E] bg-[#7B2D8E]/5 rounded"
                      >
                        {treatment}
                      </span>
                    ))}
                    {category.treatments.length > 3 && (
                      <span className="px-2 py-0.5 text-[10px] font-medium text-gray-500 bg-gray-100 rounded">
                        +{category.treatments.length - 3} more
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-sm font-medium text-[#7B2D8E] group-hover:gap-2 transition-all">
                    View Details
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 bg-[#FDFBF9]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            Not sure which service is right for you?
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Our expert team is here to help you choose the perfect treatment
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white text-sm font-medium rounded-full hover:bg-[#5A1D6A] transition-colors"
          >
            Contact Us
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  )
}
