import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { Clock, Star, Check, ArrowRight, Phone, Copy } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Laser Tech - Advanced Laser Treatments | Dermaspace',
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

const bankAccounts = [
  { bank: 'Sterling Bank', number: '0072347862', color: 'from-[#7B2D8E] to-[#5A1D6A]' },
  { bank: 'Access Bank', number: '0819975304', color: 'from-[#7B2D8E] to-[#9B4DB0]' },
  { bank: 'Titan / Paystack', number: '9880301945', color: 'from-[#5A1D6A] to-[#7B2D8E]' },
]

export default function LaserTechPage() {
  return (
    <main className="bg-white">
      <Header />
      
      {/* Hero Section - Full Width Image with Overlay */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/images/laser-hero-ng.jpg"
            alt="Laser Treatment"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#7B2D8E]/90 via-[#7B2D8E]/70 to-transparent" />
        </div>
        
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-20 md:py-32">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
              <Star className="w-4 h-4 text-white fill-white" />
              <span className="text-sm font-medium text-white">Premium Laser Technology</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Advanced<br />
              <span className="text-white/90">Laser Treatments</span>
            </h1>
            
            <p className="text-lg text-white/80 leading-relaxed mb-8">
              Tucked in a serene and private corner in Ikoyi and VI, our boutique space is created with the well-being of the contemporary individual in mind.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <Link
                href="/booking"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#7B2D8E] font-semibold rounded-full hover:bg-white/90 transition-all shadow-lg"
              >
                Book Now
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="tel:+2348000000000"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-full border border-white/30 hover:bg-white/20 transition-all"
              >
                <Phone className="w-4 h-4" />
                Call Us
              </a>
            </div>
          </div>
        </div>
        
        {/* Floating Stats */}
        <div className="absolute bottom-8 right-8 hidden lg:flex gap-4">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
            <p className="text-3xl font-bold text-white">22+</p>
            <p className="text-sm text-white/70">Treatments</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
            <p className="text-3xl font-bold text-white">5k+</p>
            <p className="text-sm text-white/70">Happy Clients</p>
          </div>
        </div>
      </section>

      {/* Welcome Message */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-px bg-[#7B2D8E]/30" />
            <Star className="w-5 h-5 text-[#7B2D8E]" />
            <div className="w-12 h-px bg-[#7B2D8E]/30" />
          </div>
          
          <p className="text-lg md:text-xl text-gray-600 leading-relaxed mb-6">
            We are delighted to welcome you as an old friend or a first timer offering a variety of services to help you feel relaxed, rejuvenated, pampered and promote your general well-being.
          </p>
          <p className="text-gray-700 font-medium text-lg mb-3">
            Choose your desired experience and have a wonderful time at Dermaspace Esthetic and Wellness Centre
          </p>
          <p className="text-[#7B2D8E] font-semibold text-xl italic">Truly we care...</p>
        </div>
      </section>

      {/* Treatment Gallery - Bento Grid */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {/* Large Feature Image */}
            <div className="col-span-2 row-span-2 relative h-80 md:h-[420px] rounded-3xl overflow-hidden group">
              <Image
                src="/images/laser-hair-removal-ng.jpg"
                alt="Laser Hair Removal"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#7B2D8E]/80 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs text-white font-medium mb-2">Most Popular</span>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-1">Laser Hair Removal</h3>
                <p className="text-white/80 text-sm">Permanent hair reduction</p>
              </div>
            </div>
            
            {/* Smaller Images */}
            <div className="relative h-40 md:h-48 rounded-2xl overflow-hidden group">
              <Image
                src="/images/laser-rejuvenation-ng.jpg"
                alt="Skin Rejuvenation"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#7B2D8E]/70 to-transparent" />
              <div className="absolute bottom-4 left-4">
                <h4 className="text-white font-semibold text-sm">Rejuvenation</h4>
              </div>
            </div>
            
            <div className="relative h-40 md:h-48 rounded-2xl overflow-hidden group">
              <Image
                src="/images/carbon-peel-ng.jpg"
                alt="Carbon Peel"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#7B2D8E]/70 to-transparent" />
              <div className="absolute bottom-4 left-4">
                <span className="inline-block px-2 py-0.5 bg-white text-[#7B2D8E] rounded text-[10px] font-bold mb-1">NEW</span>
                <h4 className="text-white font-semibold text-sm">Hollywood Peel</h4>
              </div>
            </div>
            
            <div className="col-span-2 relative h-40 md:h-48 rounded-2xl overflow-hidden bg-[#7B2D8E] group">
              <div className="absolute inset-0 p-6 flex flex-col justify-between">
                <div>
                  <span className="text-white/70 text-xs uppercase tracking-wider">Special Offer</span>
                  <h4 className="text-white font-bold text-lg mt-1">Package Deals</h4>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-white/80 text-sm">Save up to 20%</p>
                  <ArrowRight className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platinum Subscription */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="relative bg-gradient-to-br from-[#7B2D8E] via-[#5A1D6A] to-[#7B2D8E] rounded-3xl overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
            </div>
            
            <div className="relative grid md:grid-cols-2 gap-8 p-8 md:p-12">
              {/* Left Content */}
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 mb-4">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-xs font-semibold text-white uppercase tracking-wider">VIP Membership</span>
                </div>
                
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">Platinum</h2>
                <h3 className="text-2xl md:text-3xl font-bold text-white/90 mb-4">Subscription</h3>
                
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-4xl md:text-5xl font-bold text-white">&#8358;500,000</span>
                  <span className="text-white/60">& above</span>
                </div>
                
                <p className="text-white/70 mb-6">Valid for 1 Year</p>
                
                <Link
                  href="/booking"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#7B2D8E] font-bold rounded-full hover:shadow-xl transition-all"
                >
                  Subscribe Now
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
              
              {/* Right Content - Benefits */}
              <div className="flex flex-col justify-center">
                <div className="space-y-4">
                  <div className="flex items-start gap-4 bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-1">10% Off Treatments</h4>
                      <p className="text-white/70 text-sm">All facial & body treatments</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-1">5% Off Waxing & Mani-Pedi</h4>
                      <p className="text-white/70 text-sm">All waxing and nail treatments</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-1">Transferable</h4>
                      <p className="text-white/70 text-sm">Share benefits with loved ones</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VAT Notice */}
      <section className="py-4 bg-[#7B2D8E]">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-sm text-white font-medium">All prices are VAT inclusive</p>
        </div>
      </section>

      {/* Laser Hair Removal Table */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#7B2D8E]/10 mb-4">
              <Star className="w-4 h-4 text-[#7B2D8E]" />
              <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Premium Service</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Laser Hair Removal</h2>
            <p className="text-gray-500 mt-2">Smooth, hair-free skin with lasting results</p>
          </div>
          
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#7B2D8E]">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wide">Treatment</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-white uppercase tracking-wide">Female (&#8358;)</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-white uppercase tracking-wide">Male (&#8358;)</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-white uppercase tracking-wide">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {laserHairRemoval.map((item, index) => (
                    <tr key={item.treatment} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-[#7B2D8E]/5 transition-colors`}>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        <span className="flex items-center gap-2">
                          {item.treatment}
                          {item.promo && (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-[#7B2D8E] text-white rounded-full">PROMO</span>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 text-center font-medium">{item.female}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 text-center font-medium">{item.male}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 text-center">
                        <span className="inline-flex items-center gap-1.5 text-[#7B2D8E]">
                          <Clock className="w-3.5 h-3.5" />
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
      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#7B2D8E]/10 mb-4">
              <Star className="w-4 h-4 text-[#7B2D8E]" />
              <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Skin Brightening</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Laser Rejuvenation</h2>
            <p className="text-gray-500 mt-2">Restore your natural glow</p>
          </div>
          
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#7B2D8E]">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wide">Service</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-white uppercase tracking-wide">Female (&#8358;)</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-white uppercase tracking-wide">Male (&#8358;)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {laserRejuvenation.map((item, index) => (
                    <tr key={item.service} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-[#7B2D8E]/5 transition-colors`}>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">{item.service}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 text-center font-medium">{item.female}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 text-center font-medium">{item.male}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Carbon Peel Table */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#7B2D8E]/10 mb-4">
              <Star className="w-4 h-4 text-[#7B2D8E]" />
              <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Celebrity Favourite</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Carbon Peel</h2>
            <p className="text-gray-500 mt-2">aka Hollywood Peel - The star treatment</p>
          </div>
          
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#7B2D8E]">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wide">Treatment</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-white uppercase tracking-wide">Price (&#8358;)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {carbonPeel.map((item, index) => (
                    <tr key={item.treatment} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-[#7B2D8E]/5 transition-colors`}>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        <span className="flex items-center gap-2">
                          {item.treatment}
                          {item.isNew && (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-[#7B2D8E] text-white rounded-full">NEW</span>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 text-center font-medium">{item.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Electrolysis Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#7B2D8E]/10 mb-4">
              <Star className="w-4 h-4 text-[#7B2D8E]" />
              <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Permanent Solution</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Electrolysis Hair Removal</h2>
            <p className="text-gray-500 mt-2">Contact us for pricing and consultation</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {electrolysis.map((item) => (
              <div key={item.treatment} className="bg-white rounded-2xl border border-gray-100 p-6 text-center hover:shadow-lg hover:border-[#7B2D8E]/30 transition-all group">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center group-hover:bg-[#7B2D8E]/20 transition-colors">
                  <Star className="w-5 h-5 text-[#7B2D8E]" />
                </div>
                <span className="text-sm font-semibold text-gray-900">{item.treatment}</span>
                {item.isNew && (
                  <span className="block mt-2 px-2 py-0.5 text-[10px] font-bold bg-[#7B2D8E] text-white rounded-full mx-auto w-fit">NEW</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Package Deals Table */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#7B2D8E]/10 mb-4">
              <Star className="w-4 h-4 text-[#7B2D8E]" />
              <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Best Value</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Package Deals</h2>
            <p className="text-gray-500 mt-2">Combine treatments and save more</p>
          </div>
          
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#7B2D8E]">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wide">Package</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-white uppercase tracking-wide">Female (&#8358;)</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-white uppercase tracking-wide">Male (&#8358;)</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-white uppercase tracking-wide">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {packageDeals.map((item, index) => (
                    <tr key={item.service} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-[#7B2D8E]/5 transition-colors`}>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        <span className="flex items-center gap-2">
                          {item.service}
                          {item.promo && (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-[#7B2D8E] text-white rounded-full">PROMO</span>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 text-center font-medium">{item.female}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 text-center font-medium">{item.male}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 text-center">
                        {item.duration && (
                          <span className="inline-flex items-center gap-1.5 text-[#7B2D8E]">
                            <Clock className="w-3.5 h-3.5" />
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

      {/* Payment Details - Stylish Cards */}
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#7B2D8E]/10 mb-4">
              <Star className="w-4 h-4 text-[#7B2D8E]" />
              <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Secure Payment</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Payment Details</h2>
            <p className="text-gray-500 mt-2">Make payment to Dermaspace Esthetic and Wellness Center</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {bankAccounts.map((account) => (
              <div 
                key={account.bank} 
                className={`relative bg-gradient-to-br ${account.color} rounded-3xl p-6 overflow-hidden group hover:shadow-2xl transition-all duration-300`}
              >
                {/* Card Pattern */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                
                <div className="relative">
                  <div className="flex items-center justify-between mb-8">
                    <Star className="w-8 h-8 text-white/30" />
                    <span className="text-xs text-white/60 uppercase tracking-wider">Bank Transfer</span>
                  </div>
                  
                  <div className="mb-6">
                    <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Account Number</p>
                    <p className="text-2xl md:text-3xl font-bold text-white tracking-wider font-mono">{account.number}</p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Bank Name</p>
                      <p className="text-white font-semibold">{account.bank}</p>
                    </div>
                    <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                      <Copy className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <p className="text-center text-sm text-gray-500 mt-8 italic">Dermaspace Experience (Package)</p>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="py-6 bg-[#7B2D8E]/5">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-600">All prices are reviewed every 6 months</p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 mx-4 mb-8 rounded-3xl bg-[#7B2D8E]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Ready to Transform Your Skin?
          </h2>
          <p className="text-white/80 mb-8 max-w-lg mx-auto">
            Book your laser treatment today and experience the Dermaspace difference
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="https://wa.me/2348000000000"
              target="_blank"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-[#7B2D8E] font-bold rounded-full hover:shadow-xl transition-all"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </Link>
            <a
              href="tel:+2348000000000"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 text-white font-bold rounded-full border border-white/30 hover:bg-white/20 transition-all"
            >
              <Phone className="w-5 h-5" />
              Call Us
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
