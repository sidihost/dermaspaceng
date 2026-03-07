import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { ArrowRight, Clock, Check, ArrowLeft } from 'lucide-react'

const servicesData: Record<string, {
  title: string
  description: string
  image: string
  treatments: { name: string; duration: string; price: string; description: string }[]
}> = {
  'body-treatments': {
    title: 'Body Treatments',
    description: 'Indulge in luxurious body treatments designed to melt away tension and leave you feeling completely renewed. Our skilled therapists use premium products and techniques.',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-african-woman-resting-relaxing-with-sea-salt-back-spa-salon-5-768x512-1.jpg-qzDnc9aVQiTjypUgkMMu2l5wqwyRZG.webp',
    treatments: [
      { name: 'Swedish Massage', duration: '60 mins', price: '25,000', description: 'Classic relaxation massage with long, flowing strokes' },
      { name: 'Deep Tissue Massage', duration: '60 mins', price: '30,000', description: 'Targets deep muscle tension and chronic pain' },
      { name: 'Hot Stone Massage', duration: '75 mins', price: '40,000', description: 'Heated stones for deeper muscle relaxation' },
      { name: 'Thai Massage', duration: '90 mins', price: '35,000', description: 'Traditional stretching and pressure point therapy' },
      { name: 'Sports Massage', duration: '60 mins', price: '30,000', description: 'Designed for active individuals and athletes' },
      { name: 'Pregnancy Massage', duration: '60 mins', price: '30,000', description: 'Safe, soothing massage for expectant mothers' },
      { name: 'Detox Body Scrub', duration: '45 mins', price: '25,000', description: 'Exfoliating scrub to reveal smooth skin' },
      { name: 'Body Wrap', duration: '60 mins', price: '35,000', description: 'Detoxifying wrap for skin nourishment' },
    ],
  },
  'facial-treatments': {
    title: 'Facial Treatments',
    description: 'Transform your skin with our expert facial treatments. From deep cleansing to advanced therapies, we offer solutions for every skin type and concern.',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6462-2048x1463.jpg-768x549-2-aOLyIQYjwEGezoOTEw78F0jLOjfkia.webp',
    treatments: [
      { name: 'Deep Cleansing Facial', duration: '60 mins', price: '25,000', description: 'Thorough cleansing and extraction for clear skin' },
      { name: 'Hydra Facial', duration: '75 mins', price: '50,000', description: 'Multi-step treatment for deep hydration' },
      { name: 'Signature Facial', duration: '90 mins', price: '45,000', description: 'Our signature rejuvenating treatment' },
      { name: 'Acne Facial', duration: '60 mins', price: '30,000', description: 'Targeted treatment for acne-prone skin' },
      { name: 'Microneedling', duration: '60 mins', price: '80,000', description: 'Collagen-boosting skin rejuvenation' },
      { name: 'Chemical Peel', duration: '45 mins', price: '50,000', description: 'Exfoliating treatment for skin renewal' },
      { name: 'LED Light Therapy', duration: '30 mins', price: '20,000', description: 'Light-based skin treatment' },
      { name: 'Vitamin C Facial', duration: '60 mins', price: '35,000', description: 'Brightening and antioxidant treatment' },
    ],
  },
  'nail-care': {
    title: 'Nail Care',
    description: 'Pamper your hands and feet with our premium nail services. We use only the finest products for beautiful, healthy nails.',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/young-woman-getting-her-nails-done-salon-scaled.jpg-768x512-1-dTT1qPz9fJm1tSGBMYraVrKPoDeTdC.webp',
    treatments: [
      { name: 'Classic Manicure', duration: '30 mins', price: '8,000', description: 'Basic nail care and polish' },
      { name: 'Classic Pedicure', duration: '45 mins', price: '10,000', description: 'Foot care with polish' },
      { name: 'Hot Wax Manicure', duration: '45 mins', price: '12,000', description: 'Deep moisturizing wax treatment' },
      { name: 'Hot Wax Pedicure', duration: '60 mins', price: '15,000', description: 'Luxurious wax foot treatment' },
      { name: 'Jelly Pedicure', duration: '60 mins', price: '18,000', description: 'Fun and relaxing jelly soak' },
      { name: 'Gel Polish', duration: '45 mins', price: '15,000', description: 'Long-lasting gel finish' },
      { name: 'Nail Art', duration: '30 mins', price: '5,000', description: 'Custom nail designs' },
      { name: 'Mani-Pedi Combo', duration: '75 mins', price: '20,000', description: 'Complete hand and foot care' },
    ],
  },
  'waxing': {
    title: 'Waxing',
    description: 'Achieve smooth, hair-free skin with our professional waxing services. We use premium wax for comfortable, long-lasting results.',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-young-girl-beauty-salon-1024x681.jpg-oxGrqVSRoD400FZKPP5mLOdN42EJvX.webp',
    treatments: [
      { name: 'Full Leg Wax', duration: '45 mins', price: '20,000', description: 'Complete leg hair removal' },
      { name: 'Half Leg Wax', duration: '30 mins', price: '12,000', description: 'Lower leg waxing' },
      { name: 'Full Arm Wax', duration: '30 mins', price: '12,000', description: 'Complete arm hair removal' },
      { name: 'Underarm Wax', duration: '15 mins', price: '5,000', description: 'Quick underarm waxing' },
      { name: 'Brazilian Wax', duration: '30 mins', price: '15,000', description: 'Complete bikini waxing' },
      { name: 'Bikini Wax', duration: '20 mins', price: '10,000', description: 'Bikini line waxing' },
      { name: 'Full Body Wax', duration: '120 mins', price: '50,000', description: 'Complete body hair removal' },
      { name: 'Facial Wax', duration: '15 mins', price: '5,000', description: 'Upper lip, chin, or eyebrow' },
    ],
  },
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const service = servicesData[slug]
  if (!service) return { title: 'Service Not Found' }
  
  return {
    title: `${service.title} | Dermaspace`,
    description: service.description,
  }
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const service = servicesData[slug]
  
  if (!service) {
    notFound()
  }

  return (
    <main>
      <Header />
      
      {/* Hero Section */}
      <section className="relative h-72 md:h-96 overflow-hidden">
        <Image
          src={service.image}
          alt={service.title}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#7B2D8E]/90 via-[#7B2D8E]/50 to-transparent" />
        
        {/* Decorative Elements */}
        <div className="absolute top-8 right-8 w-20 h-20 border border-white/20 rounded-full hidden md:block" />
        <div className="absolute bottom-20 right-12 w-3 h-3 bg-white/50 rounded-full hidden md:block" />
        
        <div className="absolute inset-0 flex flex-col justify-end p-6 max-w-6xl mx-auto">
          <Link 
            href="/services"
            className="inline-flex items-center gap-1 text-white/80 text-sm mb-4 hover:text-white transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Services
          </Link>
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 mb-3 w-fit">
            <span className="text-xs font-medium text-white uppercase tracking-wider">{service.treatments.length} Treatments Available</span>
          </div>
          
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-3">
            {service.title}
          </h1>
          <p className="text-sm md:text-base text-white/90 max-w-xl">
            {service.description}
          </p>
          
          {/* Decorative line */}
          <div className="flex items-center gap-2 mt-5">
            <div className="w-8 h-0.5 bg-white/30" />
            <div className="w-2 h-2 rounded-full bg-white/50" />
          </div>
        </div>
      </section>

      {/* Treatments List */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Available Treatments</h2>
            <span className="text-sm text-gray-500">{service.treatments.length} services</span>
          </div>

          <div className="space-y-3">
            {service.treatments.map((treatment) => (
              <div 
                key={treatment.name}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:border-[#7B2D8E]/30 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-gray-900 mb-1">{treatment.name}</h3>
                    <p className="text-xs text-gray-500 mb-2">{treatment.description}</p>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Clock className="w-3 h-3" />
                        <span className="text-xs">{treatment.duration}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-bold text-[#7B2D8E]">N{treatment.price}</div>
                    <Link
                      href="/booking"
                      className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-[#7B2D8E] hover:underline"
                    >
                      Book
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-12 bg-[#FDFBF9]">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-lg font-bold text-gray-900 mb-6 text-center">Why Choose Dermaspace?</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              'Professional Staff',
              'Premium Products',
              'Clean Environment',
              'Competitive Prices',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-100">
                <div className="w-6 h-6 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-[#7B2D8E]" />
                </div>
                <span className="text-xs font-medium text-gray-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-12 bg-[#7B2D8E] overflow-hidden">
        {/* Decorative */}
        <div className="absolute top-0 left-1/4 w-20 h-20 bg-white/5 rounded-full -translate-y-1/2" />
        <div className="absolute bottom-0 right-1/4 w-28 h-28 bg-white/5 rounded-full translate-y-1/2" />
        
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-lg font-bold text-white mb-2">Ready to Book?</h2>
          <p className="text-sm text-white/70 mb-5">
            Schedule your {service.title.toLowerCase()} appointment today
          </p>
          <Link
            href="/booking"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-[#7B2D8E] text-sm font-medium rounded-full hover:bg-gray-100 transition-colors"
          >
            Book Appointment
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  )
}
