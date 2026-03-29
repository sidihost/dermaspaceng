import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { Clock, Check, ArrowRight, Phone, Shield, Timer, Heart, Feather, Sun, Target, Gem, Gift, Crown, Infinity } from 'lucide-react'
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
  { treatment: 'Chin', icon: Target },
  { treatment: 'Under Arm', icon: Feather },
  { treatment: 'Brazilian', icon: Heart },
  { treatment: 'Full Face', icon: Sun },
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
  { icon: Timer, title: 'Fast Results', description: 'Visible improvements after just a few sessions' },
  { icon: Shield, title: 'Safe Technology', description: 'FDA-approved lasers with proven safety' },
  { icon: Heart, title: 'Gentle Care', description: 'Gentle on skin while effective' },
  { icon: Feather, title: 'Comfort First', description: 'Minimal discomfort during treatment' },
]

// Curved SVG decorative element
const CurvedLine = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 200 50" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M0 25C50 25 50 5 100 5C150 5 150 45 200 45" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round"
      fill="none"
    />
  </svg>
)

const WavyLine = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 400 60" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M0 30C40 30 40 10 80 10C120 10 120 50 160 50C200 50 200 10 240 10C280 10 280 50 320 50C360 50 360 30 400 30" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round"
      fill="none"
    />
  </svg>
)

export default function LaserTechPage() {
  return (
    <main className="bg-[#FDFBF9]">
      <Header />
      
      {/* Hero Section with elegant curves */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#7B2D8E]/5 via-transparent to-[#7B2D8E]/10" />
        
        {/* Decorative curved lines */}
        <CurvedLine className="absolute top-12 left-0 w-48 md:w-72 text-[#7B2D8E]/20" />
        <CurvedLine className="absolute top-24 right-0 w-56 md:w-80 text-[#7B2D8E]/15 rotate-180" />
        <WavyLine className="absolute bottom-0 left-0 right-0 w-full text-[#7B2D8E]/10" />
        
        {/* Floating decorative circles */}
        <div className="absolute top-16 right-[15%] w-3 h-3 rounded-full bg-[#7B2D8E]/20 animate-pulse" />
        <div className="absolute top-32 left-[20%] w-2 h-2 rounded-full bg-[#7B2D8E]/30" />
        <div className="absolute bottom-20 right-[25%] w-4 h-4 rounded-full border-2 border-[#7B2D8E]/20" />
        
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#7B2D8E]/10 border border-[#7B2D8E]/20 mb-6">
            <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-[0.2em]">Advanced Technology</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-[1.1] text-balance">
            Precision meets
            <span className="block text-[#7B2D8E]">radiant skin</span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-600 max-w-xl mx-auto mb-8 text-pretty">
            Experience the future of skincare with our state-of-the-art laser treatments designed for lasting results
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild className="bg-[#7B2D8E] text-white hover:bg-[#6A2579] rounded-full px-8 h-12 text-base font-semibold shadow-lg shadow-[#7B2D8E]/25">
              <Link href="/booking" className="flex items-center gap-2">
                Book Consultation
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-[#7B2D8E]/30 text-[#7B2D8E] hover:bg-[#7B2D8E]/5 rounded-full px-8 h-12 text-base font-semibold">
              <Link href="#pricing">View Pricing</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white relative overflow-hidden">
        <CurvedLine className="absolute -top-4 right-0 w-40 text-[#7B2D8E]/10 rotate-12" />
        
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div 
                key={feature.title} 
                className="group relative bg-gradient-to-br from-white to-[#7B2D8E]/[0.02] rounded-2xl p-6 border border-[#7B2D8E]/10 hover:border-[#7B2D8E]/30 hover:shadow-xl hover:shadow-[#7B2D8E]/5 transition-all duration-300"
              >
                <div className="absolute top-4 right-4 text-[#7B2D8E]/10 text-5xl font-bold">
                  0{index + 1}
                </div>
                <div className="w-14 h-14 rounded-2xl bg-[#7B2D8E]/10 flex items-center justify-center mb-4 group-hover:bg-[#7B2D8E] transition-colors duration-300">
                  <feature.icon className="w-7 h-7 text-[#7B2D8E] group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Treatment Gallery with curved overlays */}
      <section className="py-16 bg-[#FDFBF9] relative">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10">
            <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-[0.2em]">Our Treatments</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2">Explore our services</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Main large card */}
            <div className="md:col-span-2 md:row-span-2 relative h-80 md:h-full rounded-3xl overflow-hidden group">
              <Image
                src="/images/laser-hair-removal-ng.jpg"
                alt="Laser Hair Removal"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#7B2D8E] via-[#7B2D8E]/40 to-transparent" />
              
              {/* Curved decorative overlay */}
              <svg className="absolute bottom-0 left-0 right-0 text-white/10" viewBox="0 0 400 100" preserveAspectRatio="none">
                <path d="M0 100 C100 100 100 50 200 50 C300 50 300 100 400 100 L400 100 L0 100 Z" fill="currentColor"/>
              </svg>
              
              <div className="absolute bottom-6 left-6 right-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm mb-3">
                  <Crown className="w-3 h-3 text-white" />
                  <span className="text-[10px] font-semibold text-white uppercase tracking-wider">Most Popular</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">Laser Hair Removal</h3>
                <p className="text-white/80 text-sm">Smooth, hair-free skin that lasts</p>
              </div>
            </div>
            
            {/* Smaller cards */}
            <div className="relative h-52 md:h-auto rounded-3xl overflow-hidden group">
              <Image
                src="/images/laser-rejuvenation-ng.jpg"
                alt="Skin Rejuvenation"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#7B2D8E]/90 via-[#7B2D8E]/30 to-transparent" />
              <div className="absolute bottom-5 left-5">
                <Sun className="w-5 h-5 text-white/80 mb-2" />
                <h4 className="text-white font-bold">Rejuvenation</h4>
                <p className="text-white/70 text-xs">Restore natural glow</p>
              </div>
            </div>
            
            <div className="relative h-52 md:h-auto rounded-3xl overflow-hidden group">
              <Image
                src="/images/carbon-peel-ng.jpg"
                alt="Carbon Peel"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#7B2D8E]/90 via-[#7B2D8E]/30 to-transparent" />
              <div className="absolute top-4 right-4">
                <span className="px-2 py-1 bg-white text-[#7B2D8E] rounded-full text-[10px] font-bold">NEW</span>
              </div>
              <div className="absolute bottom-5 left-5">
                <Gem className="w-5 h-5 text-white/80 mb-2" />
                <h4 className="text-white font-bold">Hollywood Peel</h4>
                <p className="text-white/70 text-xs">Celebrity favourite</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platinum Membership */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="relative bg-gray-900 rounded-[2rem] overflow-hidden">
            {/* Decorative curved lines */}
            <svg className="absolute top-0 right-0 w-96 h-96 text-[#7B2D8E]/20" viewBox="0 0 400 400">
              <path d="M400 0 C300 100 200 100 100 200 C0 300 100 400 200 400" stroke="currentColor" strokeWidth="2" fill="none"/>
              <path d="M400 50 C300 150 250 150 150 250 C50 350 150 400 250 400" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.5"/>
            </svg>
            
            <div className="relative grid md:grid-cols-2 gap-8 p-8 md:p-12">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#7B2D8E]/30 border border-[#7B2D8E]/40 mb-4">
                  <Infinity className="w-4 h-4 text-[#7B2D8E]" />
                  <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-wider">VIP Membership</span>
                </div>
                
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">Platinum</h2>
                <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">Subscription</h3>
                
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl md:text-5xl font-bold text-white">&#8358;500,000</span>
                  <span className="text-white/50 text-lg">& above</span>
                </div>
                
                <p className="text-white/60 mb-6">Valid for 1 Year - Unlimited access to exclusive benefits</p>
                
                <Button asChild className="bg-[#7B2D8E] text-white hover:bg-[#6A2579] rounded-full px-8 h-12 text-base font-semibold">
                  <Link href="/booking" className="flex items-center gap-2">
                    Subscribe Now
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
              
              <div className="flex flex-col justify-center space-y-4">
                {[
                  { icon: Gift, title: '10% Off Treatments', desc: 'All facial & body treatments' },
                  { icon: Heart, title: '5% Off Waxing & Nails', desc: 'All waxing and mani-pedi services' },
                  { icon: Crown, title: 'Fully Transferable', desc: 'Share benefits with loved ones' },
                ].map((benefit) => (
                  <div key={benefit.title} className="flex items-start gap-4 bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                    <div className="w-12 h-12 rounded-xl bg-[#7B2D8E]/30 flex items-center justify-center flex-shrink-0">
                      <benefit.icon className="w-6 h-6 text-[#7B2D8E]" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold">{benefit.title}</h4>
                      <p className="text-white/60 text-sm">{benefit.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VAT Notice with curved design */}
      <div className="py-4 bg-[#7B2D8E] relative overflow-hidden">
        <WavyLine className="absolute inset-0 w-full text-white/10" />
        <div className="max-w-6xl mx-auto px-4 text-center relative z-10">
          <p className="text-sm text-white font-medium">All prices are VAT inclusive</p>
        </div>
      </div>

      {/* Pricing Tables */}
      <section id="pricing" className="py-16 bg-[#FDFBF9] relative">
        <CurvedLine className="absolute top-20 left-0 w-32 text-[#7B2D8E]/10" />
        
        <div className="max-w-6xl mx-auto px-4">
          {/* Section Header */}
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-[0.2em]">Transparent Pricing</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2">Laser Hair Removal</h2>
            <p className="text-gray-500 mt-2">Smooth, hair-free skin with lasting results</p>
          </div>
          
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#7B2D8E]">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Treatment</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">Female (&#8358;)</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">Male (&#8358;)</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {laserHairRemoval.map((item, index) => (
                    <tr key={item.treatment} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'} hover:bg-[#7B2D8E]/5 transition-colors`}>
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
                        <span className="inline-flex items-center gap-1.5 text-[#7B2D8E] bg-[#7B2D8E]/10 px-2 py-1 rounded-full text-xs">
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
      <section className="py-16 bg-white relative overflow-hidden">
        <CurvedLine className="absolute bottom-10 right-0 w-40 text-[#7B2D8E]/10 rotate-180" />
        
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-[0.2em]">Skin Brightening</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2">Laser Rejuvenation</h2>
            <p className="text-gray-500 mt-2">Restore your natural glow</p>
          </div>
          
          <div className="bg-[#FDFBF9] rounded-3xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#7B2D8E]">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Service</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">Female (&#8358;)</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">Male (&#8358;)</th>
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
      <section className="py-16 bg-[#FDFBF9]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-[0.2em]">Celebrity Favourite</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2">Carbon Peel</h2>
            <p className="text-gray-500 mt-2">aka Hollywood Peel - The star treatment</p>
          </div>
          
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#7B2D8E]">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Treatment</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">Price (&#8358;)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {carbonPeel.map((item, index) => (
                    <tr key={item.treatment} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'} hover:bg-[#7B2D8E]/5 transition-colors`}>
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
      <section className="py-16 bg-white relative overflow-hidden">
        <WavyLine className="absolute top-0 left-0 right-0 w-full text-[#7B2D8E]/5" />
        
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-[0.2em]">Permanent Solution</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2">Electrolysis Hair Removal</h2>
            <p className="text-gray-500 mt-2">Contact us for pricing and consultation</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {electrolysis.map((item, index) => (
              <div 
                key={item.treatment} 
                className="group relative bg-gradient-to-br from-[#7B2D8E]/5 to-[#7B2D8E]/10 rounded-2xl p-6 border border-[#7B2D8E]/10 hover:border-[#7B2D8E]/30 hover:shadow-lg transition-all duration-300"
              >
                <div className="absolute top-3 right-3 text-[#7B2D8E]/10 text-4xl font-bold">
                  0{index + 1}
                </div>
                <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center mb-4 shadow-sm group-hover:shadow-md transition-shadow">
                  <item.icon className="w-7 h-7 text-[#7B2D8E]" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">{item.treatment}</h3>
                <span className="inline-block mt-2 px-2 py-0.5 text-[10px] font-bold bg-[#7B2D8E] text-white rounded-full">NEW</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Package Deals Table */}
      <section className="py-16 bg-[#FDFBF9]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-[0.2em]">Best Value</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2">Package Deals</h2>
            <p className="text-gray-500 mt-2">Combine treatments and save more</p>
          </div>
          
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#7B2D8E]">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Package</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">Female (&#8358;)</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">Male (&#8358;)</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {packageDeals.map((item, index) => (
                    <tr key={item.service} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'} hover:bg-[#7B2D8E]/5 transition-colors`}>
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
                          <span className="inline-flex items-center gap-1.5 text-[#7B2D8E] bg-[#7B2D8E]/10 px-2 py-1 rounded-full text-xs">
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
      <div className="py-4 bg-[#7B2D8E]/5">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-600">All prices are reviewed every 6 months</p>
        </div>
      </div>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[#7B2D8E]" />
        
        {/* Curved decorative elements */}
        <svg className="absolute top-0 left-0 right-0 text-white/5" viewBox="0 0 1200 100" preserveAspectRatio="none">
          <path d="M0 0 C300 100 900 100 1200 0 L1200 0 L0 0 Z" fill="currentColor"/>
        </svg>
        <svg className="absolute bottom-0 left-0 right-0 text-[#FDFBF9]" viewBox="0 0 1200 100" preserveAspectRatio="none">
          <path d="M0 100 C300 0 900 0 1200 100 L1200 100 L0 100 Z" fill="currentColor"/>
        </svg>
        <CurvedLine className="absolute top-20 left-10 w-32 text-white/10" />
        <CurvedLine className="absolute bottom-20 right-10 w-40 text-white/10 rotate-180" />
        
        <div className="max-w-3xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Skin?
          </h2>
          <p className="text-lg text-white/70 mb-8 max-w-md mx-auto">
            Book your laser treatment today and experience the Dermaspace difference
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild className="bg-white text-[#7B2D8E] hover:bg-gray-100 rounded-full px-8 h-12 text-base font-semibold shadow-lg w-full sm:w-auto">
              <Link href="https://wa.me/2349017972919" target="_blank" className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp Us
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-white/30 text-white hover:bg-white/10 rounded-full px-8 h-12 text-base font-semibold w-full sm:w-auto">
              <a href="tel:+2349017972919" className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Call Us Now
              </a>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
