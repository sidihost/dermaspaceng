import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { ArrowRight, Clock, Heart, Shield, Sparkles, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import BankAccountCards from '@/components/laser/bank-account-cards'

export const metadata: Metadata = {
  title: 'Laser Tech | Dermaspace',
  description: 'Advanced laser treatments including hair removal, skin rejuvenation, carbon peel and electrolysis at Dermaspace Lagos.',
}

const laserHairRemoval = [
  { area: 'Chin / Cheeks', female: '40,000', male: '50,000', duration: '30 mins' },
  { area: 'Neck', female: '30,000', male: '40,000', duration: '30 mins' },
  { area: 'Upper Lip', female: '20,000', male: '30,000', duration: '20 mins' },
  { area: 'Nostrils', female: '20,000', male: '20,000', duration: '20 mins' },
  { area: 'Half Face', female: '55,000', male: '65,000', duration: '30 mins' },
  { area: 'Full Face', female: '70,000', male: '70,000', duration: '45 mins' },
  { area: 'Full Arm', female: '100,000', male: '100,000', duration: '1 hr' },
  { area: 'Half Arm', female: '50,000', male: '60,000', duration: '45 mins' },
  { area: 'Under Arm', female: '40,000', male: '40,000', duration: '30 mins' },
  { area: 'Chest', female: '40,000', male: '50,000', duration: '30 mins' },
  { area: 'Nipples', female: '30,000', male: '40,000', duration: '30 mins' },
  { area: 'Full Back', female: '100,000', male: '120,000', duration: '45 mins' },
  { area: 'Half Back', female: '60,000', male: '70,000', duration: '45 mins' },
  { area: 'Belly', female: '30,000', male: '40,000', duration: '30 mins' },
  { area: 'Half Belly', female: '20,000', male: '30,000', duration: '30 mins' },
  { area: 'Bikini Line', female: '40,000', male: '60,000', duration: '30 mins' },
  { area: 'Brazilian', female: '80,000', male: '100,000', duration: '45 mins' },
  { area: 'Hollywood + Bell Line + Butt Hole', female: '100,000', male: '120,000', duration: '45 mins', promo: true },
  { area: 'Butt Cheeks', female: '60,000', male: '70,000', duration: '1 hr' },
  { area: 'Insep', female: '40,000', male: '50,000', duration: '45 mins' },
  { area: 'Full Leg', female: '150,000', male: '160,000', duration: '1hr 30mins' },
  { area: 'Half Leg', female: '70,000', male: '70,000', duration: '45 mins' },
]

const rejuvenation = [
  { area: 'Chin', female: '20,000', male: '30,000' },
  { area: 'Cheeks (Sideface)', female: '25,000', male: '30,000' },
  { area: 'Neck / Under Arm', female: '30,000', male: '30,000' },
  { area: 'Bikini Line', female: '25,000', male: '30,000' },
  { area: 'Brazilian / Hollywood', female: '30,000', male: '40,000' },
]

const carbonPeel = [
  { treatment: 'Full Face Carbon Peel', price: '200,000', isNew: true },
  { treatment: 'Half Face', price: '120,000', isNew: true },
  { treatment: 'Full Face Acne Laser', price: '60,000', isNew: true },
  { treatment: 'Half Back Acne Laser', price: '60,000', isNew: true },
  { treatment: 'Full Back Acne Laser', price: '100,000', isNew: true },
  { treatment: 'Elbow', price: '40,000', isNew: true },
  { treatment: 'Knee', price: '40,000', isNew: true },
  { treatment: 'Full Neck Carbon Peel', price: '60,000', isNew: true },
  { treatment: 'Half Neck', price: '30,000', isNew: true },
  { treatment: 'Carbon Laser Under Arm', price: '50,000', isNew: true },
]

const packageDeals = [
  { area: 'Full Body', female: '500,000', male: '600,000', duration: '2hr 30mins' },
  { area: 'Half Body', female: '300,000', male: '350,000', duration: '1hr 30mins' },
  { area: 'Chin + Neck', female: '50,000', male: '70,000', promo: true },
  { area: 'Full Leg + Bikini Line', female: '160,000', male: '170,000', promo: true },
  { area: 'Full Arm + Under Arm', female: '120,000', male: '120,000', promo: true },
  { area: 'Bikini Line + Belly Line', female: '50,000', male: '70,000', promo: true },
  { area: 'Underarm + Hollywood', female: '130,000', male: '140,000', promo: true },
]



export default function LaserTechPage() {
  return (
    <main>
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-16 md:py-20 bg-[#7B2D8E] overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-4">
            <span className="text-xs font-medium text-white uppercase tracking-widest">Advanced Technology</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-3">
            Laser <span className="text-white/90">Treatments</span>
          </h1>
          <p className="text-sm md:text-base text-white/80 max-w-md mx-auto">
            State-of-the-art laser technology for permanent results
          </p>
          
          <div className="flex items-center justify-center gap-2 mt-6">
            <div className="w-8 h-0.5 bg-white/30" />
            <div className="w-2 h-2 rounded-full bg-white/50" />
            <div className="w-8 h-0.5 bg-white/30" />
          </div>
        </div>
      </section>

      {/* Treatment Images */}
      <section className="py-8 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden group">
              <Image
                src="/images/laser-hair-removal-ng.jpg"
                alt="Laser Hair Removal"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <span className="absolute bottom-2 left-2 text-[10px] font-medium text-white bg-[#7B2D8E] px-2 py-0.5 rounded-full">Hair Removal</span>
            </div>
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden group">
              <Image
                src="/images/laser-rejuvenation-ng.jpg"
                alt="Skin Rejuvenation"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <span className="absolute bottom-2 left-2 text-[10px] font-medium text-white bg-[#7B2D8E] px-2 py-0.5 rounded-full">Rejuvenation</span>
            </div>
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden group">
              <Image
                src="/images/carbon-peel-ng.jpg"
                alt="Carbon Peel"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <span className="absolute bottom-2 left-2 text-[10px] font-medium text-white bg-[#7B2D8E] px-2 py-0.5 rounded-full">Carbon Peel</span>
            </div>
          </div>
        </div>
      </section>

      {/* Welcome Section */}
      <section className="py-8 bg-[#7B2D8E]/[0.03]">
        <div className="max-w-5xl mx-auto px-4">
          <div className="bg-white rounded-xl p-5 border border-[#7B2D8E]/10">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                <Heart className="w-5 h-5 text-[#7B2D8E]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900 mb-2">Welcome to Dermaspace Laser Tech</h2>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Tucked in a serene and private corner in Ikoyi and VI, our boutique space is created with the well-being of the contemporary individual in mind. We are delighted to welcome you as an old friend or a first timer offering a variety of services to help you feel relaxed, rejuvenated, pampered and promote your general well-being.
                </p>
                <p className="text-xs text-[#7B2D8E] font-medium mt-2">Truly we care...</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platinum Subscription */}
      <section className="py-8 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="bg-[#7B2D8E] rounded-xl p-5 text-white">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold mb-1">Platinum Subscription</h2>
                <p className="text-xs text-white/70">Valid for 1 Year | N500,000 & Above</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-white/80 mt-0.5 flex-shrink-0" />
                <span className="text-xs text-white/90">10% off all facial & body treatments</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-white/80 mt-0.5 flex-shrink-0" />
                <span className="text-xs text-white/90">5% off all waxing and mani-pedi</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-white/80 mt-0.5 flex-shrink-0" />
                <span className="text-xs text-white/90">Treatment can be transferred</span>
              </div>
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-white/80 mt-0.5 flex-shrink-0" />
                <span className="text-xs text-white/90">Priority booking access</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Laser Hair Removal */}
      <section className="py-8 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7B2D8E]/10 mb-3">
              <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Hair Removal</span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900">
              Laser Hair <span className="text-[#7B2D8E]">Removal</span>
            </h2>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-[#7B2D8E] px-4 py-2">
              <div className="grid grid-cols-4 gap-2 text-[10px] font-semibold text-white uppercase">
                <span>Treatment</span>
                <span className="text-center">Female</span>
                <span className="text-center">Male</span>
                <span className="text-center">Duration</span>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {laserHairRemoval.map((item, i) => (
                <div key={item.area} className={`px-4 py-2.5 grid grid-cols-4 gap-2 items-center ${i % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-900">{item.area}</span>
                    {item.promo && <span className="px-1.5 py-0.5 text-[8px] font-bold bg-[#7B2D8E]/10 text-[#7B2D8E] rounded">PROMO</span>}
                  </div>
                  <span className="text-xs text-gray-600 text-center">N{item.female}</span>
                  <span className="text-xs text-gray-600 text-center">N{item.male}</span>
                  <span className="text-[10px] text-gray-500 text-center flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3" />{item.duration}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Rejuvenation */}
      <section className="py-8 bg-[#7B2D8E]/[0.03]">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7B2D8E]/10 mb-3">
              <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Skin Care</span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900">
              Laser Rejuvenation / <span className="text-[#7B2D8E]">Brightening</span>
            </h2>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-[#7B2D8E] px-4 py-2">
              <div className="grid grid-cols-3 gap-2 text-[10px] font-semibold text-white uppercase">
                <span>Service</span>
                <span className="text-center">Female</span>
                <span className="text-center">Male</span>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {rejuvenation.map((item, i) => (
                <div key={item.area} className={`px-4 py-2.5 grid grid-cols-3 gap-2 items-center ${i % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}`}>
                  <span className="text-xs text-gray-900">{item.area}</span>
                  <span className="text-xs text-gray-600 text-center">N{item.female}</span>
                  <span className="text-xs text-gray-600 text-center">N{item.male}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Carbon Peel */}
      <section className="py-8 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7B2D8E]/10 mb-3">
              <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Hollywood Peel</span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900">
              Laser Carbon <span className="text-[#7B2D8E]">Peel</span>
            </h2>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-[#7B2D8E] px-4 py-2">
              <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-white uppercase">
                <span>Treatment</span>
                <span className="text-center">Price (NGN)</span>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {carbonPeel.map((item, i) => (
                <div key={item.treatment} className={`px-4 py-2.5 grid grid-cols-2 gap-2 items-center ${i % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-900">{item.treatment}</span>
                    {item.isNew && <span className="px-1.5 py-0.5 text-[8px] font-bold bg-[#7B2D8E]/10 text-[#7B2D8E] rounded">NEW</span>}
                  </div>
                  <span className="text-xs text-gray-600 text-center">N{item.price}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Electrolysis */}
      <section className="py-8 bg-[#7B2D8E]/[0.03]">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7B2D8E]/10 mb-3">
              <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Permanent Solution</span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900">
              Electrolysis <span className="text-[#7B2D8E]">Hair Removal</span>
            </h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['Chin', 'Under Arm', 'Brazilian', 'Full Face'].map((item) => (
              <div key={item} className="bg-white rounded-xl p-4 text-center border border-[#7B2D8E]/10 hover:border-[#7B2D8E]/20 transition-all">
                <span className="text-xs font-medium text-gray-900">{item}</span>
                <span className="block mt-1 px-2 py-0.5 text-[8px] font-bold bg-[#7B2D8E]/10 text-[#7B2D8E] rounded mx-auto w-fit">NEW</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-500 text-center mt-3">Contact us for pricing and consultation</p>
        </div>
      </section>

      {/* Package Deals */}
      <section className="py-8 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7B2D8E]/10 mb-3">
              <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Save More</span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900">
              Package <span className="text-[#7B2D8E]">Deals</span>
            </h2>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-[#7B2D8E] px-4 py-2">
              <div className="grid grid-cols-4 gap-2 text-[10px] font-semibold text-white uppercase">
                <span>Package</span>
                <span className="text-center">Female</span>
                <span className="text-center">Male</span>
                <span className="text-center">Duration</span>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {packageDeals.map((item, i) => (
                <div key={item.area} className={`px-4 py-2.5 grid grid-cols-4 gap-2 items-center ${i % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-900">{item.area}</span>
                    {item.promo && <span className="px-1.5 py-0.5 text-[8px] font-bold bg-[#7B2D8E]/10 text-[#7B2D8E] rounded">PROMO</span>}
                  </div>
                  <span className="text-xs text-gray-600 text-center">N{item.female}</span>
                  <span className="text-xs text-gray-600 text-center">N{item.male}</span>
                  <span className="text-[10px] text-gray-500 text-center">{item.duration || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Payment Details */}
      <section className="py-8 bg-[#7B2D8E]/[0.03]">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7B2D8E]/10 mb-3">
              <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Payment</span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900">
              Payment <span className="text-[#7B2D8E]">Details</span>
            </h2>
            <p className="text-xs text-gray-500 mt-2">Make payment to Dermaspace Esthetic and Wellness Center</p>
          </div>
          
          <BankAccountCards />
          
          <p className="text-[10px] text-gray-500 text-center mt-4">All prices are VAT inclusive. Prices are reviewed every 6 months.</p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-10 mb-8 mx-4 rounded-2xl bg-[#7B2D8E]">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-lg md:text-xl font-bold text-white mb-2">
            Ready to Start Your Treatment?
          </h2>
          <p className="text-sm text-white/70 mb-5 max-w-md mx-auto">
            Book a consultation with our laser specialists today
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              asChild
              className="bg-white text-[#7B2D8E] hover:bg-gray-100 rounded-full px-5 h-9 text-sm font-semibold"
            >
              <Link href="/booking" className="flex items-center gap-2">
                Book Now
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <a
              href="https://wa.me/2349017972919"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 h-9 rounded-full border border-white/30 text-white text-sm font-medium hover:bg-white/10 transition-colors"
            >
              <Phone className="w-4 h-4" />
              WhatsApp Us
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
