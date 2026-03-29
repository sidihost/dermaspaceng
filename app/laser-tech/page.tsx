import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { Clock, Star, Check, ArrowRight, Phone } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Laser Tech - Advanced Laser Treatments',
  description: 'Experience advanced laser treatments at Dermaspace including laser hair removal, skin rejuvenation, carbon peel, and electrolysis. Professional results with state-of-the-art technology.',
}

const laserHairRemoval = [
  { treatment: 'Chin / Cheeks', female: '40,000', male: '50,000', duration: '30MINS' },
  { treatment: 'Neck', female: '30,000', male: '40,000', duration: '30MINS' },
  { treatment: 'Upper Lip', female: '20,000', male: '30,000', duration: '20MINS' },
  { treatment: 'Nostrils', female: '20,000', male: '20,000', duration: '20MINS' },
  { treatment: 'Half Face', female: '55,000', male: '65,000', duration: '30MINS' },
  { treatment: 'Full Face', female: '70,000', male: '70,000', duration: '45MINS' },
  { treatment: 'Full Arm', female: '100,000', male: '100,000', duration: '1HR' },
  { treatment: 'Half Arm', female: '50,000', male: '60,000', duration: '45MINS' },
  { treatment: 'Under Arm', female: '40,000', male: '40,000', duration: '30MINS' },
  { treatment: 'Chest', female: '40,000', male: '50,000', duration: '30MINS' },
  { treatment: 'Nipples', female: '30,000', male: '40,000', duration: '30MINS' },
  { treatment: 'Full Back', female: '100,000', male: '120,000', duration: '45MINS' },
  { treatment: 'Half Back', female: '60,000', male: '70,000', duration: '45MINS' },
  { treatment: 'Belly', female: '30,000', male: '40,000', duration: '30MINS' },
  { treatment: 'Half Belly', female: '20,000', male: '30,000', duration: '30MINS' },
  { treatment: 'Bikini Line', female: '40,000', male: '60,000', duration: '30MINS' },
  { treatment: 'Brazilian', female: '80,000', male: '100,000', duration: '45MINS' },
  { treatment: 'Hollywood + Bell Line + Butt Hole', female: '100,000', male: '120,000', duration: '45MINS', promo: true },
  { treatment: 'Butt Cheeks', female: '60,000', male: '70,000', duration: '1HR' },
  { treatment: 'Insep', female: '40,000', male: '50,000', duration: '45MINS' },
  { treatment: 'Full Leg', female: '150,000', male: '160,000', duration: '1HR 30MINS' },
  { treatment: 'Half Leg', female: '70,000', male: '70,000', duration: '45MINS' },
]

const laserRejuvenation = [
  { service: 'Chin', female: '20,000', male: '30,000' },
  { service: 'Cheeks (Sideface)', female: '25,000', male: '30,000' },
  { service: 'Neck / Under Arm', female: '30,000', male: '30,000' },
  { service: 'Bikini Line', female: '25,000', male: '30,000' },
  { service: 'Brazilian / Hollywood', female: '30,000', male: '40,000' },
]

const carbonPeel = [
  { treatment: 'Full Face Carbon Peel', price: '200,000', isNew: true },
  { treatment: 'Half Face', price: '120,000', isNew: true },
  { treatment: 'Full Face Acne Laser Treatment', price: '60,000', isNew: true },
  { treatment: 'Half Back Acne Laser', price: '60,000', isNew: true },
  { treatment: 'Full Back Acne Laser', price: '100,000', isNew: true },
  { treatment: 'Elbow', price: '40,000', isNew: true },
  { treatment: 'Knee', price: '40,000', isNew: true },
  { treatment: 'Full Neck Carbon Peel', price: '60,000', isNew: true },
  { treatment: 'Half Neck', price: '30,000', isNew: true },
  { treatment: 'Carbon Laser Under Arm', price: '50,000', isNew: true },
]

const electrolysis = [
  { treatment: 'Chin', isNew: true },
  { treatment: 'Under Arm', isNew: true },
  { treatment: 'Brazilian', isNew: true },
  { treatment: 'Full Face', isNew: true },
]

const packageDeals = [
  { service: 'Full Body', female: '500,000', male: '600,000', duration: '2HR 30MINS' },
  { service: 'Half Body', female: '300,000', male: '350,000', duration: '1HR 30MINS' },
  { service: 'Chin + Neck', female: '50,000', male: '70,000', promo: true },
  { service: 'Full Leg + Bikini Line', female: '160,000', male: '170,000', promo: true },
  { service: 'Full Arm + Under Arm', female: '120,000', male: '120,000', promo: true },
  { service: 'Bikini Line + Belly Line', female: '50,000', male: '70,000', promo: true },
  { service: 'Underarm + Hollywood', female: '130,000', male: '140,000', promo: true },
]

export default function LaserTechPage() {
  return (
    <main className="bg-white">
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-16 md:py-24 bg-[#7B2D8E] overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/images/laser-hero.jpg"
            alt="Laser Treatment"
            fill
            className="object-cover opacity-20"
            priority
          />
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-4">
            <Star className="w-3.5 h-3.5 text-white" />
            <span className="text-xs font-medium text-white uppercase tracking-widest">Advanced Technology</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Laser Tech <span className="text-white/90">Treatments</span>
          </h1>
          <p className="text-sm md:text-base text-white/80 max-w-2xl mx-auto leading-relaxed mb-6">
            Tucked in a serene and private corner in Ikoyi and VI, our boutique space is created with the well-being of the contemporary individual in mind.
          </p>
          
          <div className="flex items-center justify-center gap-2 mt-6">
            <div className="w-8 h-0.5 bg-white/30" />
            <div className="w-2 h-2 rounded-full bg-white/50" />
            <div className="w-8 h-0.5 bg-white/30" />
          </div>
        </div>
      </section>

      {/* Welcome Section */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-gray-600 leading-relaxed mb-6">
            We are delighted to welcome you as an old friend or a first timer offering a variety of services to help you feel relaxed, rejuvenated, pampered and promote your general well-being.
          </p>
          <p className="text-gray-700 font-medium mb-2">
            Choose your desired experience and have a wonderful time at Dermaspace Esthetic and Wellness Centre
          </p>
          <p className="text-[#7B2D8E] font-semibold italic">Truly we care...</p>
        </div>
      </section>

      {/* Treatment Images */}
      <section className="py-8 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="relative h-48 md:h-64 rounded-2xl overflow-hidden">
              <Image
                src="/images/laser-hero.jpg"
                alt="Laser Hair Removal"
                fill
                className="object-cover hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4">
                <span className="text-white text-sm font-semibold">Hair Removal</span>
              </div>
            </div>
            <div className="relative h-48 md:h-64 rounded-2xl overflow-hidden">
              <Image
                src="/images/laser-treatment.jpg"
                alt="Laser Equipment"
                fill
                className="object-cover hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4">
                <span className="text-white text-sm font-semibold">Rejuvenation</span>
              </div>
            </div>
            <div className="relative h-48 md:h-64 rounded-2xl overflow-hidden col-span-2 md:col-span-1">
              <Image
                src="/images/carbon-peel.jpg"
                alt="Carbon Peel"
                fill
                className="object-cover hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4">
                <span className="text-white text-sm font-semibold">Carbon Peel</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platinum Subscription */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <div className="relative bg-gradient-to-br from-[#7B2D8E] to-[#5A1D6A] rounded-3xl p-8 md:p-12 overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-5 h-5 text-yellow-400 fill-current" />
                <span className="text-xs font-semibold text-white/80 uppercase tracking-widest">Premium Membership</span>
              </div>
              
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Platinum Subscription</h2>
              <p className="text-white/70 text-sm mb-6">Valid for 1 Year | Starting from &#8358;500,000</p>
              
              <div className="space-y-3 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-white/90 text-sm">10% off all facial & body treatment</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-white/90 text-sm">5% off all waxing and mani-pedi treatment</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-white/90 text-sm">Treatment can be transferred</span>
                </div>
              </div>
              
              <Link
                href="/booking"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#7B2D8E] text-sm font-semibold rounded-full hover:bg-white/90 transition-colors"
              >
                Subscribe Now
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* VAT Notice */}
      <section className="py-4 bg-[#7B2D8E]/5">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-sm text-[#7B2D8E] font-medium">All prices are VAT inclusive</p>
        </div>
      </section>

      {/* Laser Hair Removal Table */}
      <section className="py-12 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#7B2D8E]/10 mb-3">
              <Star className="w-3.5 h-3.5 text-[#7B2D8E]" />
              <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Hair Removal</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">Laser Hair Removal</h2>
          </div>
          
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#7B2D8E] text-white">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Treatment</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">Female (&#8358;)</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">Male (&#8358;)</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {laserHairRemoval.map((item, index) => (
                    <tr key={item.treatment} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                        {item.treatment}
                        {item.promo && (
                          <span className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-[#7B2D8E]/10 text-[#7B2D8E] rounded-full">PROMO</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-center">{item.female}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-center">{item.male}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-center">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.duration}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Laser Rejuvenation Table */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#7B2D8E]/10 mb-3">
              <Star className="w-3.5 h-3.5 text-[#7B2D8E]" />
              <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Skin Care</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">Laser Rejuvenation / Brightening</h2>
          </div>
          
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#7B2D8E] text-white">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Service</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">Female (&#8358;)</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">Male (&#8358;)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {laserRejuvenation.map((item, index) => (
                    <tr key={item.service} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.service}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-center">{item.female}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-center">{item.male}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Carbon Peel Table */}
      <section className="py-12 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#7B2D8E]/10 mb-3">
              <Star className="w-3.5 h-3.5 text-[#7B2D8E]" />
              <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Hollywood Peel</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">Laser Carbon Peel</h2>
            <p className="text-sm text-gray-500 mt-1">aka Hollywood Peel</p>
          </div>
          
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#7B2D8E] text-white">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Treatment</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">Price (&#8358;)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {carbonPeel.map((item, index) => (
                    <tr key={item.treatment} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                        {item.treatment}
                        {item.isNew && (
                          <span className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-[#7B2D8E]/10 text-[#7B2D8E] rounded-full">NEW</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-center">{item.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Electrolysis Section */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#7B2D8E]/10 mb-3">
              <Star className="w-3.5 h-3.5 text-[#7B2D8E]" />
              <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Permanent Solution</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">Electrolysis Hair Removal</h2>
            <p className="text-sm text-gray-500 mt-1">Contact us for pricing and consultation</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {electrolysis.map((item) => (
              <div key={item.treatment} className="bg-white rounded-xl border border-gray-200 p-4 text-center hover:border-[#7B2D8E]/30 transition-colors">
                <span className="text-sm font-medium text-gray-900">{item.treatment}</span>
                {item.isNew && (
                  <span className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-[#7B2D8E]/10 text-[#7B2D8E] rounded-full">NEW</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Package Deals Table */}
      <section className="py-12 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#7B2D8E]/10 mb-3">
              <BadgePercent className="w-3.5 h-3.5 text-[#7B2D8E]" />
              <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Save More</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">Laser Hair Removal Package Deals</h2>
          </div>
          
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#7B2D8E] text-white">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Service</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">Female (&#8358;)</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">Male (&#8358;)</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {packageDeals.map((item, index) => (
                    <tr key={item.service} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                        {item.service}
                        {item.promo && (
                          <span className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-[#7B2D8E]/10 text-[#7B2D8E] rounded-full">PROMO</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-center">{item.female}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-center">{item.male}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-center">
                        {item.duration && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {item.duration}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Payment Details */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#7B2D8E]/10 mb-3">
              <CreditCard className="w-3.5 h-3.5 text-[#7B2D8E]" />
              <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Payment</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">Payment Details</h2>
            <p className="text-sm text-gray-500 mt-1">Please make payment to Dermaspace Esthetic and Wellness Center</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 text-center hover:border-[#7B2D8E]/30 transition-colors">
              <div className="w-12 h-12 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-3">
                <CreditCard className="w-5 h-5 text-[#7B2D8E]" />
              </div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Sterling Bank</p>
              <p className="text-lg font-bold text-gray-900">0072347862</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 text-center hover:border-[#7B2D8E]/30 transition-colors">
              <div className="w-12 h-12 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-3">
                <CreditCard className="w-5 h-5 text-[#7B2D8E]" />
              </div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Access Bank</p>
              <p className="text-lg font-bold text-gray-900">0819975304</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 text-center hover:border-[#7B2D8E]/30 transition-colors">
              <div className="w-12 h-12 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-3">
                <CreditCard className="w-5 h-5 text-[#7B2D8E]" />
              </div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Titan / Paystack</p>
              <p className="text-lg font-bold text-gray-900">9880301945</p>
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Dermaspace Experience (Package)</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-10 mb-8 mx-4 rounded-2xl bg-[#7B2D8E]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-3">
            Ready to Start Your Treatment?
          </h2>
          <p className="text-white/80 text-sm mb-6">
            Book a consultation to discuss your laser treatment options
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="https://wa.me/+2349013134945"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-3 bg-white text-[#7B2D8E] text-sm font-semibold rounded-full hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </a>
            <a
              href="tel:+2349013134945"
              className="w-full sm:w-auto px-8 py-3 bg-transparent border-2 border-white/50 text-white text-sm font-semibold rounded-full hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
            >
              <Phone className="w-4 h-4" />
              Call Us
            </a>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="py-6 bg-gray-100">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            All prices are reviewed every 6 months
          </p>
        </div>
      </section>

      <Footer />
    </main>
  )
}
