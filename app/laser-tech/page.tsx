import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { ArrowRight, Clock, Gem, Sparkles, Phone, CheckCircle2, CreditCard, Gift } from 'lucide-react'
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
    <main className="bg-white">
      <Header />
      
      {/* Hero Section - Full Screen Impact */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/images/laser-hero-ng.jpg"
            alt="Laser Treatment"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
        </div>
        
        {/* Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8">
            <Sparkles className="w-4 h-4 text-white" />
            <span className="text-sm font-medium text-white tracking-wide">Advanced Laser Technology</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-6 tracking-tight">
            Laser<br />
            <span className="text-[#7B2D8E]">Treatments</span>
          </h1>
          
          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-10 leading-relaxed">
            State-of-the-art laser technology for permanent hair removal, 
            skin rejuvenation, and the famous Hollywood Carbon Peel
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="bg-[#7B2D8E] hover:bg-[#6B2D7E] text-white px-8 py-6 text-base rounded-full">
              <Link href="/booking">
                Book Consultation
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10 px-8 py-6 text-base rounded-full bg-transparent">
              <a href="tel:+2349160002410">
                <Phone className="w-5 h-5 mr-2" />
                Call Us Now
              </a>
            </Button>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-16 pt-10 border-t border-white/10">
            <div>
              <p className="text-3xl md:text-4xl font-bold text-white">22+</p>
              <p className="text-sm text-white/60 mt-1">Treatment Areas</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold text-white">10K+</p>
              <p className="text-sm text-white/60 mt-1">Happy Clients</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold text-white">5</p>
              <p className="text-sm text-white/60 mt-1">Years Experience</p>
            </div>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <span className="text-xs text-white/50 uppercase tracking-widest">Scroll</span>
          <div className="w-px h-12 bg-gradient-to-b from-white/50 to-transparent" />
        </div>
      </section>

      {/* Treatment Gallery */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-sm font-medium text-[#7B2D8E] uppercase tracking-widest">Our Expertise</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-3">
              Premium Laser Services
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: 'Hair Removal', image: '/images/laser-hair-removal-ng.jpg', desc: 'Permanent smooth skin' },
              { title: 'Skin Rejuvenation', image: '/images/laser-rejuvenation-ng.jpg', desc: 'Restore your glow' },
              { title: 'Carbon Peel', image: '/images/carbon-peel-ng.jpg', desc: 'Hollywood favorite' },
            ].map((service) => (
              <div key={service.title} className="group relative aspect-[3/4] rounded-3xl overflow-hidden cursor-pointer">
                <Image
                  src={service.image}
                  alt={service.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <h3 className="text-2xl font-bold text-white mb-2">{service.title}</h3>
                  <p className="text-white/70 text-sm">{service.desc}</p>
                  <div className="mt-4 flex items-center gap-2 text-[#7B2D8E]">
                    <span className="text-sm font-medium">View Prices</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Welcome Message */}
      <section className="py-20 bg-[#FDFAFF]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-8">
            <Gem className="w-8 h-8 text-[#7B2D8E]" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Welcome to Dermaspace
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed mb-6">
            Tucked in a serene and private corner in Ikoyi and VI, our boutique space is created 
            with the well-being of the contemporary individual in mind. We are delighted to welcome 
            you as an old friend or a first timer offering a variety of services to help you feel 
            relaxed, rejuvenated, pampered and promote your general well-being.
          </p>
          <p className="text-xl font-medium text-[#7B2D8E] italic">
            &ldquo;Truly we care...&rdquo;
          </p>
        </div>
      </section>

      {/* Platinum Subscription */}
      <section className="py-20 bg-[#7B2D8E]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 mb-6">
                <Gift className="w-4 h-4 text-white" />
                <span className="text-sm font-medium text-white">Exclusive Membership</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Platinum<br />Subscription
              </h2>
              <p className="text-xl text-white/70 mb-2">Valid for 1 Year</p>
              <p className="text-3xl font-bold text-white">N500,000 & Above</p>
            </div>
            
            <div className="space-y-4">
              {[
                '10% off all facial & body treatments',
                '5% off all waxing and mani-pedi treatments',
                'Treatment can be transferred to anyone',
                'Priority booking and exclusive access',
              ].map((benefit) => (
                <div key={benefit} className="flex items-center gap-4 bg-white/5 rounded-2xl p-5">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-white text-lg">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Laser Hair Removal */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-sm font-medium text-[#7B2D8E] uppercase tracking-widest">Service Menu</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-3">
              Laser Hair Removal
            </h2>
            <p className="text-gray-500 mt-3">All prices are VAT inclusive</p>
          </div>
          
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-[#7B2D8E] px-6 py-4">
              <div className="grid grid-cols-4 gap-4 text-sm font-semibold text-white">
                <span>Treatment Area</span>
                <span className="text-center">Female (NGN)</span>
                <span className="text-center">Male (NGN)</span>
                <span className="text-center">Duration</span>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {laserHairRemoval.map((item, i) => (
                <div key={item.area} className={`px-6 py-4 grid grid-cols-4 gap-4 items-center transition-colors hover:bg-[#7B2D8E]/5 ${i % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-900">{item.area}</span>
                    {item.promo && (
                      <span className="px-2 py-1 text-[10px] font-bold bg-[#7B2D8E] text-white rounded-full">PROMO</span>
                    )}
                  </div>
                  <span className="text-sm text-gray-600 text-center font-medium">N{item.female}</span>
                  <span className="text-sm text-gray-600 text-center font-medium">N{item.male}</span>
                  <span className="text-sm text-gray-500 text-center flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4 text-[#7B2D8E]" />
                    {item.duration}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Rejuvenation */}
      <section className="py-20 bg-[#FDFAFF]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-sm font-medium text-[#7B2D8E] uppercase tracking-widest">Glow Up</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-3">
              Laser Rejuvenation & Brightening
            </h2>
          </div>
          
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-[#7B2D8E] px-6 py-4">
              <div className="grid grid-cols-3 gap-4 text-sm font-semibold text-white">
                <span>Service</span>
                <span className="text-center">Female (NGN)</span>
                <span className="text-center">Male (NGN)</span>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {rejuvenation.map((item, i) => (
                <div key={item.area} className={`px-6 py-4 grid grid-cols-3 gap-4 items-center transition-colors hover:bg-[#7B2D8E]/5 ${i % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}`}>
                  <span className="text-sm font-medium text-gray-900">{item.area}</span>
                  <span className="text-sm text-gray-600 text-center font-medium">N{item.female}</span>
                  <span className="text-sm text-gray-600 text-center font-medium">N{item.male}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Carbon Peel */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-sm font-medium text-[#7B2D8E] uppercase tracking-widest">Celebrity Favorite</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-3">
              Laser Carbon Peel
            </h2>
            <p className="text-gray-500 mt-3">AKA Hollywood Peel</p>
          </div>
          
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-[#7B2D8E] px-6 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm font-semibold text-white">
                <span>Treatment</span>
                <span className="text-center">Price (NGN)</span>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {carbonPeel.map((item, i) => (
                <div key={item.treatment} className={`px-6 py-4 grid grid-cols-2 gap-4 items-center transition-colors hover:bg-[#7B2D8E]/5 ${i % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-900">{item.treatment}</span>
                    {item.isNew && (
                      <span className="px-2 py-1 text-[10px] font-bold bg-[#7B2D8E]/10 text-[#7B2D8E] rounded-full">NEW</span>
                    )}
                  </div>
                  <span className="text-sm text-gray-600 text-center font-medium">N{item.price}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Electrolysis */}
      <section className="py-20 bg-[#FDFAFF]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-sm font-medium text-[#7B2D8E] uppercase tracking-widest">Permanent Solution</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-3">
              Electrolysis Hair Removal
            </h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {['Chin', 'Under Arm', 'Brazilian', 'Full Face'].map((item) => (
              <div key={item} className="bg-white rounded-3xl p-8 text-center shadow-lg border border-gray-100 hover:shadow-xl transition-shadow hover:border-[#7B2D8E]/20">
                <div className="w-14 h-14 rounded-2xl bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-7 h-7 text-[#7B2D8E]" />
                </div>
                <span className="text-lg font-semibold text-gray-900">{item}</span>
                <span className="block mt-2 px-3 py-1 text-xs font-bold bg-[#7B2D8E] text-white rounded-full mx-auto w-fit">NEW</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500 text-center mt-8">Contact us for personalized pricing and consultation</p>
        </div>
      </section>

      {/* Package Deals */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-sm font-medium text-[#7B2D8E] uppercase tracking-widest">Best Value</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-3">
              Package Deals
            </h2>
            <p className="text-gray-500 mt-3">Save more with our combo packages</p>
          </div>
          
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-[#7B2D8E] px-6 py-4">
              <div className="grid grid-cols-4 gap-4 text-sm font-semibold text-white">
                <span>Package</span>
                <span className="text-center">Female (NGN)</span>
                <span className="text-center">Male (NGN)</span>
                <span className="text-center">Duration</span>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {packageDeals.map((item, i) => (
                <div key={item.area} className={`px-6 py-4 grid grid-cols-4 gap-4 items-center transition-colors hover:bg-[#7B2D8E]/5 ${i % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-900">{item.area}</span>
                    {item.promo && (
                      <span className="px-2 py-1 text-[10px] font-bold bg-[#7B2D8E] text-white rounded-full">PROMO</span>
                    )}
                  </div>
                  <span className="text-sm text-gray-600 text-center font-medium">N{item.female}</span>
                  <span className="text-sm text-gray-600 text-center font-medium">N{item.male}</span>
                  <span className="text-sm text-gray-500 text-center">{item.duration || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Payment Details */}
      <section className="py-20 bg-[#FDFAFF]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-sm font-medium text-[#7B2D8E] uppercase tracking-widest">Payment</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-3">
              Payment Details
            </h2>
            <p className="text-gray-500 mt-3">Make payment to Dermaspace Esthetic and Wellness Center</p>
          </div>
          
          <BankAccountCards />
          
          <div className="mt-12 text-center">
            <p className="text-sm text-gray-500 bg-white inline-block px-6 py-3 rounded-full border border-gray-200">
              All prices are reviewed every 6 months
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-[#7B2D8E]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Skin?
          </h2>
          <p className="text-lg text-white/70 mb-8">
            Book your consultation today and experience world-class laser treatments
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="bg-white text-[#7B2D8E] hover:bg-white/90 px-8 py-6 text-base rounded-full">
              <Link href="/booking">
                Book Appointment
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10 px-8 py-6 text-base rounded-full bg-transparent">
              <a href="https://wa.me/2349160002410">
                WhatsApp Us
              </a>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
