import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { Clock, Check, ArrowRight, Phone, Shield, Timer, Heart, Droplets, Sparkles, Focus, Gem, Gift, Crown, CircleDot, Waves, Fingerprint } from 'lucide-react'
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
  { treatment: 'Chin', icon: Focus },
  { treatment: 'Under Arm', icon: Droplets },
  { treatment: 'Brazilian', icon: Heart },
  { treatment: 'Full Face', icon: Fingerprint },
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
  { icon: Droplets, title: 'Gentle Care', description: 'Minimal discomfort during treatment' },
  { icon: Sparkles, title: 'Long-lasting', description: 'Enjoy smooth skin for months' },
]

// Curved decorative SVG component
const CurvedDecoration = ({ className = "" }: { className?: string }) => (
  <svg 
    className={`absolute pointer-events-none ${className}`} 
    viewBox="0 0 200 200" 
    fill="none"
  >
    <path 
      d="M10,100 Q50,20 100,50 T190,100" 
      stroke="currentColor" 
      strokeWidth="1" 
      fill="none"
      strokeLinecap="round"
    />
    <path 
      d="M10,120 Q60,40 110,70 T190,120" 
      stroke="currentColor" 
      strokeWidth="0.5" 
      fill="none"
      strokeLinecap="round"
      opacity="0.5"
    />
  </svg>
)

export default function LaserTechPage() {
  return (
    <main>
      <Header />
      
      {/* Hero Section - matching services page exactly */}
      <section className="relative py-16 md:py-20 bg-[#7B2D8E] overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="absolute top-1/2 right-12 w-2 h-2 bg-white/30 rounded-full hidden md:block" />
        <div className="absolute top-1/4 left-12 w-3 h-3 bg-white/20 rounded-full hidden md:block" />
        
        {/* Elegant curved lines */}
        <svg className="absolute top-8 left-8 w-32 h-32 text-white/10 hidden md:block" viewBox="0 0 100 100" fill="none">
          <path d="M0,50 Q25,0 50,50 T100,50" stroke="currentColor" strokeWidth="1" fill="none"/>
          <path d="M0,60 Q25,10 50,60 T100,60" stroke="currentColor" strokeWidth="0.5" fill="none" opacity="0.5"/>
        </svg>
        <svg className="absolute bottom-8 right-8 w-32 h-32 text-white/10 hidden md:block rotate-180" viewBox="0 0 100 100" fill="none">
          <path d="M0,50 Q25,0 50,50 T100,50" stroke="currentColor" strokeWidth="1" fill="none"/>
          <path d="M0,60 Q25,10 50,60 T100,60" stroke="currentColor" strokeWidth="0.5" fill="none" opacity="0.5"/>
        </svg>
        
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-4">
            <span className="text-xs font-medium text-white uppercase tracking-widest">Laser Technology</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-3">
            Advanced <span className="text-white/90">Laser Treatments</span>
          </h1>
          <p className="text-sm md:text-base text-white/80 max-w-md mx-auto">
            State-of-the-art laser technology for smooth, radiant skin
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
      <section className="py-10 bg-white relative overflow-hidden">
        {/* Subtle curved accent */}
        <CurvedDecoration className="top-0 right-0 w-48 h-48 text-[#7B2D8E]/5 hidden lg:block" />
        
        <div className="max-w-5xl mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature) => (
              <div 
                key={feature.title} 
                className="bg-white rounded-2xl p-5 border border-[#7B2D8E]/10 group hover:border-[#7B2D8E]/30 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#7B2D8E]/10 to-[#7B2D8E]/5 flex items-center justify-center mb-3 group-hover:from-[#7B2D8E] group-hover:to-[#9B4DB0] transition-all duration-300">
                  <feature.icon className="w-6 h-6 text-[#7B2D8E] group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">{feature.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Image Gallery */}
      <section className="py-10 bg-[#7B2D8E]/[0.02] relative overflow-hidden">
        {/* Decorative curved line */}
        <svg className="absolute top-6 left-0 w-full h-16 text-[#7B2D8E]/5 hidden md:block" viewBox="0 0 1440 60" fill="none" preserveAspectRatio="none">
          <path d="M0,30 Q360,0 720,30 T1440,30" stroke="currentColor" strokeWidth="2" fill="none"/>
        </svg>
        
        <div className="max-w-5xl mx-auto px-4">
          {/* Section Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7B2D8E]/10 mb-3">
              <Sparkles className="w-3 h-3 text-[#7B2D8E]" />
              <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Our Treatments</span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900">Explore Our Services</h2>
          </div>
          
          {/* Bento Grid */}
          <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
            {/* Main Featured Card - Laser Hair Removal */}
            <div className="col-span-4 md:col-span-4 relative h-52 md:h-64 rounded-3xl overflow-hidden group">
              <Image
                src="/images/laser-hair-removal-ng.jpg"
                alt="Laser Hair Removal"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-[#7B2D8E]/95 via-[#7B2D8E]/40 to-transparent" />
              
              {/* Decorative curved lines */}
              <svg className="absolute top-0 right-0 w-32 h-32 text-white/10" viewBox="0 0 100 100" fill="none">
                <path d="M100,0 Q60,40 100,80" stroke="currentColor" strokeWidth="1" fill="none"/>
                <path d="M80,0 Q50,30 80,60" stroke="currentColor" strokeWidth="0.5" fill="none" opacity="0.5"/>
              </svg>
              
              <div className="absolute bottom-5 left-5 right-5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full mb-3">
                  <Crown className="w-3.5 h-3.5 text-white" />
                  <span className="text-[11px] font-semibold text-white">Most Popular</span>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-1">Laser Hair Removal</h3>
                <p className="text-white/70 text-xs hidden md:block">Permanent hair reduction with advanced technology</p>
              </div>
            </div>
            
            {/* Rejuvenation Card */}
            <div className="col-span-2 relative h-52 md:h-64 rounded-3xl overflow-hidden group">
              <Image
                src="/images/laser-rejuvenation-ng.jpg"
                alt="Skin Rejuvenation"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#7B2D8E]/90 via-[#7B2D8E]/30 to-transparent" />
              
              {/* Decorative element */}
              <div className="absolute top-4 right-4 w-8 h-8 rounded-full border border-white/20 flex items-center justify-center">
                <Waves className="w-4 h-4 text-white/70" />
              </div>
              
              <div className="absolute bottom-4 left-4 right-4">
                <h4 className="text-base md:text-lg font-bold text-white mb-0.5">Rejuvenation</h4>
                <p className="text-white/60 text-[10px] md:text-xs">Restore your natural glow</p>
              </div>
            </div>
            
            {/* Hollywood Peel Card */}
            <div className="col-span-2 md:col-span-3 relative h-40 md:h-48 rounded-3xl overflow-hidden group">
              <Image
                src="/images/carbon-peel-ng.jpg"
                alt="Carbon Peel"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#7B2D8E]/90 via-[#7B2D8E]/30 to-transparent" />
              
              <div className="absolute top-3 right-3">
                <span className="px-2.5 py-1 bg-white text-[#7B2D8E] rounded-full text-[10px] font-bold">NEW</span>
              </div>
              
              {/* Decorative dots */}
              <div className="absolute top-4 left-4 flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
              </div>
              
              <div className="absolute bottom-4 left-4">
                <div className="flex items-center gap-2 mb-1">
                  <Gem className="w-4 h-4 text-white/80" />
                  <h4 className="text-base md:text-lg font-bold text-white">Hollywood Peel</h4>
                </div>
                <p className="text-white/60 text-[10px] md:text-xs">Carbon laser facial treatment</p>
              </div>
            </div>
            
            {/* Electrolysis Card */}
            <div className="col-span-2 md:col-span-3 relative h-40 md:h-48 rounded-3xl overflow-hidden group">
              <Image
                src="/images/laser-treatment.jpg"
                alt="Electrolysis"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#7B2D8E]/90 via-[#7B2D8E]/30 to-transparent" />
              
              {/* Curved accent */}
              <svg className="absolute top-0 right-0 w-24 h-24 text-white/10" viewBox="0 0 100 100" fill="none">
                <path d="M50,0 Q80,50 50,100" stroke="currentColor" strokeWidth="1" fill="none"/>
              </svg>
              
              <div className="absolute bottom-4 left-4 right-4">
                <div className="flex items-center gap-2 mb-1">
                  <Focus className="w-4 h-4 text-white/80" />
                  <h4 className="text-base md:text-lg font-bold text-white">Electrolysis</h4>
                </div>
                <p className="text-white/60 text-[10px] md:text-xs">Permanent hair removal solution</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platinum Membership */}
      <section className="py-10 bg-white relative overflow-hidden">
        <CurvedDecoration className="bottom-0 left-0 w-40 h-40 text-[#7B2D8E]/5 rotate-180 hidden lg:block" />
        
        <div className="max-w-5xl mx-auto px-4 relative z-10">
          <div className="bg-gradient-to-br from-[#7B2D8E]/[0.03] to-white rounded-2xl border border-[#7B2D8E]/10 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-[#7B2D8E] via-[#9B4DB0] to-[#7B2D8E]" />
            <div className="p-5 md:p-6 relative">
              {/* Subtle curved accent */}
              <svg className="absolute top-4 right-4 w-24 h-24 text-[#7B2D8E]/5 hidden md:block" viewBox="0 0 100 100" fill="none">
                <path d="M20,50 Q50,20 80,50" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
                <path d="M30,60 Q50,40 70,60" stroke="currentColor" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.5"/>
              </svg>
              
              <div className="flex flex-col md:flex-row md:items-center gap-5">
                <div className="flex-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7B2D8E]/10 mb-3">
                    <Crown className="w-3 h-3 text-[#7B2D8E]" />
                    <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">VIP Membership</span>
                  </div>
                  <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-1">Platinum Subscription</h2>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-2xl font-bold text-[#7B2D8E]">&#8358;500,000</span>
                    <span className="text-gray-400 text-sm">& above / year</span>
                  </div>
                  <p className="text-xs text-gray-500">Enjoy exclusive benefits for 12 months</p>
                </div>
                
                <div className="flex flex-col gap-2">
                  {[
                    { icon: Gift, text: '10% off facial & body treatments' },
                    { icon: Heart, text: '5% off waxing & nail services' },
                    { icon: Check, text: 'Fully transferable benefits' },
                  ].map((benefit) => (
                    <div key={benefit.text} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                        <benefit.icon className="w-3 h-3 text-[#7B2D8E]" />
                      </div>
                      <span className="text-xs text-gray-600">{benefit.text}</span>
                    </div>
                  ))}
                </div>
                
                <Button asChild className="bg-[#7B2D8E] text-white hover:bg-[#6A2579] rounded-full h-10 px-6 text-sm font-semibold md:self-center">
                  <Link href="/booking">Subscribe</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VAT Notice */}
      <div className="py-3 bg-[#7B2D8E]">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-xs text-white/90 font-medium">All prices are VAT inclusive</p>
        </div>
      </div>

      {/* Laser Hair Removal Prices */}
      <section id="pricing" className="py-10 bg-white relative overflow-hidden">
        <CurvedDecoration className="top-8 right-0 w-32 h-32 text-[#7B2D8E]/5 hidden lg:block" />
        
        <div className="max-w-5xl mx-auto px-4 relative z-10">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7B2D8E]/10 mb-3">
              <CircleDot className="w-3 h-3 text-[#7B2D8E]" />
              <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Pricing</span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900">Laser Hair Removal</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {laserHairRemoval.map((item, index) => (
              <div key={item.treatment} className="bg-white rounded-2xl border border-[#7B2D8E]/10 p-5 hover:border-[#7B2D8E]/25 transition-all duration-300 group relative overflow-hidden">
                {/* Subtle top accent line */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#7B2D8E]/20 to-transparent" />
                
                {item.promo && (
                  <div className="absolute top-2 right-2">
                    <span className="bg-gradient-to-r from-[#7B2D8E] to-[#9B4DB0] text-white text-[8px] font-bold px-2 py-0.5 rounded-full">
                      PROMO
                    </span>
                  </div>
                )}
                
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#7B2D8E]/5 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-[#7B2D8E]/40">{String(index + 1).padStart(2, '0')}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900 pt-1">{item.treatment}</h4>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-0.5">Female</p>
                      <p className="text-sm font-bold text-[#7B2D8E]">&#8358;{item.female}</p>
                    </div>
                    <div className="w-px h-6 bg-[#7B2D8E]/10" />
                    <div>
                      <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-0.5">Male</p>
                      <p className="text-sm font-bold text-[#7B2D8E]">&#8358;{item.male}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#7B2D8E]/70 bg-[#7B2D8E]/5 px-2 py-1 rounded-lg">
                    <Clock className="w-3 h-3" />
                    <span className="text-[10px] font-medium">{item.duration}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Package Deals */}
      <section className="py-10 bg-[#7B2D8E]/[0.03] relative overflow-hidden">
        {/* Decorative wave */}
        <svg className="absolute top-0 left-0 right-0 w-full h-6 text-white" viewBox="0 0 1440 24" preserveAspectRatio="none">
          <path d="M0,24 L0,12 Q360,0 720,12 T1440,12 L1440,24 Z" fill="currentColor"/>
        </svg>
        
        <div className="max-w-5xl mx-auto px-4 pt-2 relative z-10">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7B2D8E]/10 mb-3">
              <Gift className="w-3 h-3 text-[#7B2D8E]" />
              <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Save More</span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900">Package Deals</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {packageDeals.map((item, index) => (
              <div key={item.service} className="bg-white rounded-2xl border border-[#7B2D8E]/10 p-5 hover:border-[#7B2D8E]/25 transition-all duration-300 group relative overflow-hidden">
                {/* Subtle top accent line */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#7B2D8E]/20 to-transparent" />
                
                {item.promo && (
                  <div className="absolute top-2 right-2">
                    <span className="bg-gradient-to-r from-[#7B2D8E] to-[#9B4DB0] text-white text-[8px] font-bold px-2 py-0.5 rounded-full">
                      DEAL
                    </span>
                  </div>
                )}
                
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#7B2D8E]/5 flex items-center justify-center flex-shrink-0">
                    <Gift className="w-4 h-4 text-[#7B2D8E]/40" />
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900 pt-1">{item.service}</h4>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-0.5">Female</p>
                      <p className="text-sm font-bold text-[#7B2D8E]">&#8358;{item.female}</p>
                    </div>
                    <div className="w-px h-6 bg-[#7B2D8E]/10" />
                    <div>
                      <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-0.5">Male</p>
                      <p className="text-sm font-bold text-[#7B2D8E]">&#8358;{item.male}</p>
                    </div>
                  </div>
                  {item.duration && (
                    <div className="flex items-center gap-1.5 text-[#7B2D8E]/70 bg-[#7B2D8E]/5 px-2 py-1 rounded-lg">
                      <Clock className="w-3 h-3" />
                      <span className="text-[10px] font-medium">{item.duration}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rejuvenation Prices */}
      <section className="py-10 bg-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 relative z-10">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7B2D8E]/10 mb-3">
              <Waves className="w-3 h-3 text-[#7B2D8E]" />
              <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Rejuvenation</span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900">Laser Skin Rejuvenation</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {laserRejuvenation.map((item, index) => (
              <div key={item.service} className="bg-white rounded-2xl border border-[#7B2D8E]/10 p-5 hover:border-[#7B2D8E]/25 transition-all duration-300 group relative overflow-hidden">
                {/* Subtle top accent line */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#7B2D8E]/20 to-transparent" />
                
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#7B2D8E]/5 flex items-center justify-center flex-shrink-0">
                    <Waves className="w-4 h-4 text-[#7B2D8E]/40" />
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900 pt-1">{item.service}</h4>
                </div>
                
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-0.5">Female</p>
                    <p className="text-sm font-bold text-[#7B2D8E]">&#8358;{item.female}</p>
                  </div>
                  <div className="w-px h-6 bg-[#7B2D8E]/10" />
                  <div>
                    <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-0.5">Male</p>
                    <p className="text-sm font-bold text-[#7B2D8E]">&#8358;{item.male}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Carbon Peel Prices */}
      <section className="py-10 bg-[#7B2D8E]/[0.03] relative overflow-hidden">
        <svg className="absolute top-0 left-0 right-0 w-full h-6 text-white" viewBox="0 0 1440 24" preserveAspectRatio="none">
          <path d="M0,24 L0,12 Q360,0 720,12 T1440,12 L1440,24 Z" fill="currentColor"/>
        </svg>
        
        <div className="max-w-5xl mx-auto px-4 pt-2 relative z-10">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7B2D8E]/10 mb-3">
              <Gem className="w-3 h-3 text-[#7B2D8E]" />
              <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Hollywood Peel</span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900">Carbon Laser Peel</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {carbonPeel.map((item, index) => (
              <div key={item.treatment} className="bg-white rounded-2xl border border-[#7B2D8E]/10 p-5 hover:border-[#7B2D8E]/25 transition-all duration-300 group relative overflow-hidden">
                {/* Subtle top accent line */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#7B2D8E]/20 to-transparent" />
                
                {item.isNew && (
                  <div className="absolute top-2 right-2">
                    <span className="bg-gradient-to-r from-[#7B2D8E] to-[#9B4DB0] text-white text-[8px] font-bold px-2 py-0.5 rounded-full">
                      NEW
                    </span>
                  </div>
                )}
                
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-[#7B2D8E]/5 flex items-center justify-center flex-shrink-0">
                    <Gem className="w-4 h-4 text-[#7B2D8E]/40" />
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900 pt-1 pr-8">{item.treatment}</h4>
                </div>
                
                <p className="text-lg font-bold text-[#7B2D8E]">&#8358;{item.price}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Electrolysis Section */}
      <section className="py-10 bg-white relative overflow-hidden">
        <CurvedDecoration className="bottom-4 right-0 w-36 h-36 text-[#7B2D8E]/5 hidden lg:block" />
        
        <div className="max-w-5xl mx-auto px-4 relative z-10">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7B2D8E]/10 mb-3">
              <Focus className="w-3 h-3 text-[#7B2D8E]" />
              <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Permanent Solution</span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900">Electrolysis Hair Removal</h2>
            <p className="text-sm text-gray-500 mt-1">Contact us for pricing and consultation</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {electrolysis.map((item) => (
              <div key={item.treatment} className="bg-white rounded-2xl border border-[#7B2D8E]/10 p-5 hover:border-[#7B2D8E]/25 transition-all duration-300 group relative overflow-hidden">
                {/* Subtle top accent line */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#7B2D8E]/20 to-transparent" />
                
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#7B2D8E]/10 to-[#7B2D8E]/5 flex items-center justify-center flex-shrink-0 group-hover:from-[#7B2D8E] group-hover:to-[#9B4DB0] transition-all duration-300">
                    <item.icon className="w-5 h-5 text-[#7B2D8E] group-hover:text-white transition-colors duration-300" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-900 block">{item.treatment}</span>
                    <span className="text-[10px] text-gray-400">Contact for pricing</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <div className="relative bg-gradient-to-br from-[#7B2D8E]/[0.04] to-white rounded-3xl border border-[#7B2D8E]/10 p-8 md:p-10 overflow-hidden">
            {/* Decorative curved lines */}
            <svg className="absolute top-0 left-0 w-32 h-32 text-[#7B2D8E]/10" viewBox="0 0 100 100" fill="none">
              <path d="M0,50 Q25,10 50,50 T100,50" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              <path d="M0,65 Q25,25 50,65 T100,65" stroke="currentColor" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.5"/>
            </svg>
            <svg className="absolute bottom-0 right-0 w-40 h-40 text-[#7B2D8E]/10 rotate-180" viewBox="0 0 100 100" fill="none">
              <path d="M0,50 Q25,10 50,50 T100,50" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              <path d="M0,65 Q25,25 50,65 T100,65" stroke="currentColor" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.5"/>
            </svg>
            
            {/* Small decorative dots */}
            <div className="absolute top-6 right-12 w-2 h-2 rounded-full bg-[#7B2D8E]/20 hidden md:block" />
            <div className="absolute top-12 right-6 w-1.5 h-1.5 rounded-full bg-[#7B2D8E]/15 hidden md:block" />
            <div className="absolute bottom-8 left-16 w-1.5 h-1.5 rounded-full bg-[#7B2D8E]/15 hidden md:block" />
            
            <div className="relative z-10 text-center">
              {/* Decorative line */}
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-8 h-px bg-[#7B2D8E]/20" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E]/40" />
                <div className="w-8 h-px bg-[#7B2D8E]/20" />
              </div>
              
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
                Ready to Experience Laser Technology?
              </h2>
              <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
                Book your consultation today and let our experts guide you to smoother, radiant skin
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  asChild
                  className="bg-[#7B2D8E] text-white hover:bg-[#6A2579] rounded-md px-8 h-11 text-sm font-semibold border border-[#7B2D8E] transition-all duration-300"
                >
                  <Link href="/booking" className="flex items-center gap-2">
                    Book Now
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
                <a 
                  href="tel:+2349017972919" 
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-[#7B2D8E] border border-[#7B2D8E]/30 rounded-md hover:border-[#7B2D8E] hover:bg-[#7B2D8E]/5 transition-all duration-300"
                >
                  <Phone className="w-4 h-4" />
                  +234 901 797 2919
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
