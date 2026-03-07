import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { Clock, ArrowRight, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Body Treatments',
  description: 'Indulge in luxurious body treatments at Dermaspace Lagos. Hot stone massage, Thai massage, detox body scrubs, sports massage, and more.',
}

const treatments = [
  {
    name: 'Hot Stone Massage',
    description: 'This relaxing body massage involves the placing of heated balsamic stones on specific parts of the body followed by relaxing rhythmic kneading. It helps repair damaged soft tissue, improves sleep, and promotes deep relaxation.',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-african-woman-resting-relaxing-with-sea-salt-back-spa-salon-5-768x512-1.jpg-qzDnc9aVQiTjypUgkMMu2l5wqwyRZG.webp',
    duration: '60 mins',
  },
  {
    name: 'Thai Massage',
    description: 'This body treatment helps improve muscle flexibility, helps correct posture problems, increases inner energy levels, boosts mental strength, as well as improves breathing.',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-african-woman-resting-relaxing-with-sea-salt-back-spa-salon-5-768x512-1.jpg-qzDnc9aVQiTjypUgkMMu2l5wqwyRZG.webp',
    duration: '90 mins',
  },
  {
    name: 'Sports Massage & Stretching',
    description: 'Sports Massage & Stretching is a type of massage therapy that uses deep tissue techniques to reduce muscular tension, discomfort, and pain. Perfect for athletes and active individuals.',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-african-woman-resting-relaxing-with-sea-salt-back-spa-salon-5-768x512-1.jpg-qzDnc9aVQiTjypUgkMMu2l5wqwyRZG.webp',
    duration: '60-90 mins',
  },
  {
    name: 'Detox Body Scrub (Salt/Sugar) + Steam',
    description: 'This signature treatment starts with a steam session. It softens and prepares the skin for exfoliation, followed by intense scrubbing off of dead skin cells using our custom mix of salt or sugar scrub. This treatment helps improve body smoothness and rids the skin of cellulite.',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-african-woman-resting-relaxing-with-sea-salt-back-spa-salon-5-768x512-1.jpg-qzDnc9aVQiTjypUgkMMu2l5wqwyRZG.webp',
    duration: '45 mins',
  },
  {
    name: 'Detox Body Scrub + 30mins Massage',
    description: 'This signature treatment starts with a steam session. It softens and prepares the skin for exfoliation, followed by intense scrubbing off of dead skin cells using our custom mix of salt or sugar scrub. This treatment is followed by 30 minutes signature deep tissue massage.',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-african-woman-resting-relaxing-with-sea-salt-back-spa-salon-5-768x512-1.jpg-qzDnc9aVQiTjypUgkMMu2l5wqwyRZG.webp',
    duration: '75 mins',
  },
  {
    name: 'Pregnancy Massage',
    description: 'A relaxing massage recommended for the second and third trimester to assist in releasing lower back pain and water retention. Gentle and safe for expectant mothers.',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-african-woman-resting-relaxing-with-sea-salt-back-spa-salon-5-768x512-1.jpg-qzDnc9aVQiTjypUgkMMu2l5wqwyRZG.webp',
    duration: '60 mins',
  },
  {
    name: 'Reflexology Massage',
    description: 'Complement any spa service with a relaxing pressure-point foot massage designed to heal the body and release energy flow. Perfect for total relaxation and wellness.',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-african-woman-resting-relaxing-with-sea-salt-back-spa-salon-5-768x512-1.jpg-qzDnc9aVQiTjypUgkMMu2l5wqwyRZG.webp',
    duration: '30 mins',
  },
]

export default function BodyTreatmentsPage() {
  return (
    <main>
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-24 bg-gradient-to-br from-[#FBF8F4] via-white to-[#f5f0ff]">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <Link 
            href="/services" 
            className="inline-flex items-center gap-2 text-[#7B2D8E] font-medium mb-6 hover:underline"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Services
          </Link>
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 text-balance">
              Body <span className="gradient-text">Treatments</span>
            </h1>
            <p className="mt-6 text-lg text-gray-600 text-pretty">
              Indulge in our luxurious body treatments designed for complete relaxation. From therapeutic massages to rejuvenating body scrubs, experience total wellness at Dermaspace.
            </p>
          </div>
        </div>
      </section>

      {/* Treatments Grid */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="grid md:grid-cols-2 gap-8">
            {treatments.map((treatment) => (
              <div 
                key={treatment.name}
                className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-[#7B2D8E]/20 transition-colors"
              >
                <div className="relative h-56 overflow-hidden">
                  <Image
                    src={treatment.image}
                    alt={treatment.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-4 left-4 flex items-center gap-2 text-white">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">{treatment.duration}</span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 group-hover:text-[#7B2D8E] transition-colors">
                    {treatment.name}
                  </h3>
                  <p className="mt-3 text-gray-600 text-sm leading-relaxed">
                    {treatment.description}
                  </p>
                  <Button
                    asChild
                    className="mt-6 bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white rounded-full"
                  >
                    <Link href="/booking" className="flex items-center gap-2">
                      Book Now
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
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
