import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { Clock, Star, Check, ArrowRight, Phone, Zap, Sparkles, Target, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'

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

const features = [
  { icon: Zap, title: 'Fast Results', description: 'See visible improvements after just a few sessions' },
  { icon: Shield, title: 'Safe Technology', description: 'FDA-approved lasers with proven safety record' },
  { icon: Target, title: 'Precision', description: 'Targets hair follicles without damaging skin' },
  { icon: Sparkles, title: 'Long-lasting', description: 'Enjoy smooth skin for months to come' },
]

export default function LaserTechPage() {
  return (
    <main>
      <Header />
      
      {/* Hero Section - Matching other pages */}
      <section className="relative py-16 md:py-20 bg-[#7B2D8E] overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="absolute top-1/2 right-12 w-2 h-2 bg-white/30 rounded-full hidden md:block" />
        <div className="absolute top-1/4 left-12 w-3 h-3 bg-white/20 rounded-full hidden md:block" />
        
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-4">
            <Zap className="w-3 h-3 text-white" />
            <span className="text-xs font-medium text-white uppercase tracking-widest">Laser Technology</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-3">
            Advanced <span className="text-white/90">Laser Treatments</span>
          </h1>
          <p className="text-sm md:text-base text-white/80 max-w-md mx-auto">
            State-of-the-art laser technology for permanent hair removal and skin rejuvenation
          </p>
          
          {/* Decorative line */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <div className="w-8 h-0.5 bg-white/30" />
            <div className="w-2 h-2 rounded-full bg-white/50" />
            <div className="w-8 h-0.5 bg-white/30" />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-8 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {features.map((feature) => (
              <div 
                key={feature.title} 
                className="bg-white rounded-xl p-4 text-center border border-[#7B2D8E]/10 group hover:border-[#7B2D8E]/20 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-2 group-hover:bg-[#7B2D8E] transition-colors">
                  <feature.icon className="w-5 h-5 text-[#7B2D8E] group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-0.5">{feature.title}</h3>
                <p className="text-xs text-gray-500">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Treatment Gallery */}
      <section className="py-8 bg-[#7B2D8E]/[0.03]">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="col-span-2 md:col-span-1 md:row-span-2 relative h-48 md:h-full rounded-xl overflow-hidden group">
              <Image
                src="/images/laser-hair-removal-ng.jpg"
                alt="Laser Hair Removal"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#7B2D8E]/80 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <span className="inline-block px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded text-[10px] text-white font-medium mb-1">Most Popular</span>
                <h3 className="text-sm font-bold text-white">Hair Removal</h3>
              </div>
            </div>
            
            <div className="relative h-32 md:h-36 rounded-xl overflow-hidden group">
              <Image
                src="/images/laser-rejuvenation-ng.jpg"
                alt="Skin Rejuvenation"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#7B2D8E]/70 to-transparent" />
              <div className="absolute bottom-3 left-3">
                <h4 className="text-white font-semibold text-xs">Rejuvenation</h4>
              </div>
            </div>
            
            <div className="relative h-32 md:h-36 rounded-xl overflow-hidden group">
              <Image
                src="/images/carbon-peel-ng.jpg"
                alt="Carbon Peel"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#7B2D8E]/70 to-transparent" />
              <div className="absolute bottom-3 left-3">
                <span className="inline-block px-1.5 py-0.5 bg-white text-[#7B2D8E] rounded text-[8px] font-bold mb-0.5">NEW</span>
                <h4 className="text-white font-semibold text-xs">Hollywood Peel</h4>
              </div>
            </div>
            
            <div className="col-span-2 relative h-32 md:h-36 rounded-xl overflow-hidden bg-[#7B2D8E] group">
              <div className="absolute inset-0 p-4 flex flex-col justify-between">
                <div>
                  <span className="text-white/60 text-[10px] uppercase tracking-wider">Special Offer</span>
                  <h4 className="text-white font-bold text-sm mt-0.5">Package Deals - Save up to 20%</h4>
                </div>
                <div className="flex items-center gap-1 text-white/70 text-xs">
                  <span>View packages below</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platinum Subscription */}
      <section className="py-10 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="relative bg-gradient-to-br from-[#7B2D8E] via-[#5A1D6A] to-[#7B2D8E] rounded-2xl overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
            </div>
            
            <div className="relative grid md:grid-cols-2 gap-6 p-6 md:p-8">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 mb-3">
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  <span className="text-[10px] font-semibold text-white uppercase tracking-wider">VIP Membership</span>
                </div>
                
                <h2 className="text-xl md:text-2xl font-bold text-white mb-1">Platinum Subscription</h2>
                
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-2xl md:text-3xl font-bold text-white">&#8358;500,000</span>
                  <span className="text-white/60 text-sm">& above</span>
                </div>
                
                <p className="text-white/70 text-sm mb-4">Valid for 1 Year</p>
                
                <Button asChild className="bg-white text-[#7B2D8E] hover:bg-gray-100 rounded-full px-5 h-9 text-sm font-semibold">
                  <Link href="/booking" className="flex items-center gap-2">
                    Subscribe Now
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
              
              <div className="flex flex-col justify-center space-y-2">
                {[
                  { title: '10% Off Treatments', desc: 'All facial & body treatments' },
                  { title: '5% Off Waxing & Mani-Pedi', desc: 'All waxing and nail treatments' },
                  { title: 'Transferable', desc: 'Share benefits with loved ones' },
                ].map((benefit) => (
                  <div key={benefit.title} className="flex items-start gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold text-sm">{benefit.title}</h4>
                      <p className="text-white/70 text-xs">{benefit.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VAT Notice */}
      <div className="py-2 bg-[#7B2D8E]">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-xs text-white font-medium">All prices are VAT inclusive</p>
        </div>
      </div>

      {/* Laser Hair Removal Table */}
      <section className="py-10 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7B2D8E]/10 mb-3">
              <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Premium Service</span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900">Laser Hair Removal</h2>
            <p className="text-sm text-gray-500 mt-1">Smooth, hair-free skin with lasting results</p>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#7B2D8E]">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">Treatment</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wide">Female (&#8358;)</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wide">Male (&#8358;)</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wide">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {laserHairRemoval.map((item, index) => (
                    <tr key={item.treatment} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-[#7B2D8E]/5 transition-colors`}>
                      <td className="px-4 py-3 text-xs text-gray-900 font-medium">
                        <span className="flex items-center gap-2">
                          {item.treatment}
                          {item.promo && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-[#7B2D8E] text-white rounded">PROMO</span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 text-center font-medium">{item.female}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 text-center font-medium">{item.male}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 text-center">
                        <span className="inline-flex items-center gap-1 text-[#7B2D8E]">
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
      <section className="py-10 bg-[#7B2D8E]/[0.03]">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7B2D8E]/10 mb-3">
              <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Skin Brightening</span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900">Laser Rejuvenation</h2>
            <p className="text-sm text-gray-500 mt-1">Restore your natural glow</p>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#7B2D8E]">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">Service</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wide">Female (&#8358;)</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wide">Male (&#8358;)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {laserRejuvenation.map((item, index) => (
                    <tr key={item.service} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-[#7B2D8E]/5 transition-colors`}>
                      <td className="px-4 py-3 text-xs text-gray-900 font-medium">{item.service}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 text-center font-medium">{item.female}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 text-center font-medium">{item.male}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Carbon Peel Table */}
      <section className="py-10 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7B2D8E]/10 mb-3">
              <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Celebrity Favourite</span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900">Carbon Peel</h2>
            <p className="text-sm text-gray-500 mt-1">aka Hollywood Peel - The star treatment</p>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#7B2D8E]">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">Treatment</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wide">Price (&#8358;)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {carbonPeel.map((item, index) => (
                    <tr key={item.treatment} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-[#7B2D8E]/5 transition-colors`}>
                      <td className="px-4 py-3 text-xs text-gray-900 font-medium">
                        <span className="flex items-center gap-2">
                          {item.treatment}
                          {item.isNew && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-[#7B2D8E] text-white rounded">NEW</span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 text-center font-medium">{item.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Electrolysis Section */}
      <section className="py-10 bg-[#7B2D8E]/[0.03]">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7B2D8E]/10 mb-3">
              <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Permanent Solution</span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900">Electrolysis Hair Removal</h2>
            <p className="text-sm text-gray-500 mt-1">Contact us for pricing and consultation</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {electrolysis.map((item) => (
              <div key={item.treatment} className="bg-white rounded-xl border border-[#7B2D8E]/10 p-4 text-center hover:border-[#7B2D8E]/20 transition-all group">
                <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center group-hover:bg-[#7B2D8E] transition-colors">
                  <Zap className="w-5 h-5 text-[#7B2D8E] group-hover:text-white transition-colors" />
                </div>
                <span className="text-sm font-semibold text-gray-900">{item.treatment}</span>
                {item.isNew && (
                  <span className="block mt-2 px-2 py-0.5 text-[9px] font-bold bg-[#7B2D8E] text-white rounded mx-auto w-fit">NEW</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Package Deals Table */}
      <section className="py-10 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7B2D8E]/10 mb-3">
              <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Best Value</span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900">Package Deals</h2>
            <p className="text-sm text-gray-500 mt-1">Combine treatments and save more</p>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#7B2D8E]">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">Package</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wide">Female (&#8358;)</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wide">Male (&#8358;)</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wide">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {packageDeals.map((item, index) => (
                    <tr key={item.service} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-[#7B2D8E]/5 transition-colors`}>
                      <td className="px-4 py-3 text-xs text-gray-900 font-medium">
                        <span className="flex items-center gap-2">
                          {item.service}
                          {item.promo && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-[#7B2D8E] text-white rounded">PROMO</span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 text-center font-medium">{item.female}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 text-center font-medium">{item.male}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 text-center">
                        {item.duration && (
                          <span className="inline-flex items-center gap-1 text-[#7B2D8E]">
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

      {/* Disclaimer */}
      <div className="py-3 bg-[#7B2D8E]/5">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-xs text-gray-600">All prices are reviewed every 6 months</p>
        </div>
      </div>

      {/* CTA Section */}
      <section className="py-10 mx-4 mb-8 rounded-2xl bg-[#7B2D8E]">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-lg md:text-xl font-bold text-white mb-2">
            Ready to Transform Your Skin?
          </h2>
          <p className="text-sm text-white/70 mb-5 max-w-md mx-auto">
            Book your laser treatment today and experience the Dermaspace difference
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild className="bg-white text-[#7B2D8E] hover:bg-gray-100 rounded-full px-5 h-9 text-sm font-semibold w-full sm:w-auto">
              <Link href="https://wa.me/2349017972919" target="_blank" className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-white/30 text-white hover:bg-white/10 rounded-full px-5 h-9 text-sm font-semibold w-full sm:w-auto">
              <a href="tel:+2349017972919" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Call Us
              </a>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
