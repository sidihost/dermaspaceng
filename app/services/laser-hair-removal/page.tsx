import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { ServiceHero } from '@/components/services/service-hero'
import {
  Clock,
  ArrowRight,
  Shield,
  CheckCircle2,
  Package,
  Crown,
  Droplets,
  Timer,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Laser Hair Removal',
  description:
    'Permanent laser hair removal in Lagos for women and men at Dermaspace. FDA-cleared technology safe for melanin-rich skin tones across 22 treatment zones.',
}

interface LaserZone {
  name: string
  female: string
  male: string
  duration: string
  description: string
  popular?: boolean
  promo?: boolean
}

const faceAndNeckZones: LaserZone[] = [
  {
    name: 'Chin / Cheeks Laser',
    female: '₦45,000',
    male: '₦55,000',
    duration: '30 mins',
    description: 'Targeted facial hair reduction for smooth chin and cheek contours.',
  },
  {
    name: 'Neck Laser',
    female: '₦20,000',
    male: '₦40,000',
    duration: '30 mins',
    description: 'Front or back neck laser hair removal to reduce ingrown hairs and razor bumps.',
  },
  {
    name: 'Upper Lip Laser',
    female: '₦20,000',
    male: '₦30,000',
    duration: '20 mins',
    description: 'Quick, comfortable upper-lip hair reduction with cooling glide protection.',
  },
  {
    name: 'Nostrils Laser',
    female: '₦10,000',
    male: '₦20,000',
    duration: '20 mins',
    description: 'Gentle precision laser shaping around the nostrils.',
  },
  {
    name: 'Half Face / Full Face Laser',
    female: '₦20,000',
    male: '₦70,000',
    duration: '30 mins',
    description: 'Even-toned facial hair reduction tailored for sensitive facial skin.',
  },
  {
    name: 'Uni Brow Laser',
    female: '₦10,000',
    male: '₦90,000',
    duration: '20 mins',
    description: 'Clean precision shaping between the eyebrows with lasting definition.',
  },
]

const upperBodyZones: LaserZone[] = [
  {
    name: 'Full Arm Laser',
    female: '₦80,000',
    male: '₦120,000',
    duration: '60 mins',
    description: 'Complete upper and lower arm hair removal for silky, even skin.',
    popular: true,
  },
  {
    name: 'Half Arm Laser',
    female: '₦45,000',
    male: '₦60,000',
    duration: '20 mins',
    description: 'Targeted forearm or upper-arm session performed by certified therapists.',
  },
  {
    name: 'Underarm Laser',
    female: '₦30,000',
    male: '₦120,000',
    duration: '30 mins',
    description: 'Reduces dark shadow, razor irritation, and ingrown hairs under the arms.',
    popular: true,
  },
  {
    name: 'Chest Laser',
    female: '₦100,000',
    male: '₦120,000',
    duration: '30 mins',
    description: 'Smooth chest grooming and permanent hair density reduction.',
  },
  {
    name: 'Nipples Laser',
    female: '₦45,000',
    male: '₦50,000',
    duration: '30 mins',
    description: 'Delicate precision treatment around the areola with calming aftercare.',
  },
  {
    name: 'Full Back Laser',
    female: '₦100,000',
    male: '₦120,000',
    duration: '45 mins',
    description: 'Comprehensive upper and lower back coverage for smooth, bump-free skin.',
  },
  {
    name: 'Half Back Laser',
    female: '₦60,000',
    male: '₦45,000',
    duration: '45 mins',
    description: 'Focused upper or lower back laser hair removal session.',
  },
  {
    name: 'Belly Laser',
    female: '₦60,000',
    male: '₦70,000',
    duration: '45 mins',
    description: 'Full abdomen hair reduction with gentle sapphire-tip skin cooling.',
  },
  {
    name: 'Half Belly Laser',
    female: '₦40,000',
    male: '₦50,000',
    duration: '30 mins',
    description: 'Targeted navel-line and lower-belly hair removal.',
  },
]

const intimateAndLegZones: LaserZone[] = [
  {
    name: 'Bikini Line Laser',
    female: '₦30,000',
    male: '₦40,000',
    duration: '30 mins',
    description: 'Neat perimeter grooming with minimal discomfort and zero razor bumps.',
  },
  {
    name: 'Brazilian Laser',
    female: '₦40,000',
    male: '₦40,000',
    duration: '30 mins',
    description: 'Thorough intimate hair reduction calibrated safely for deeper skin tones.',
    popular: true,
  },
  {
    name: 'Hollywood + Bell Line + Butt Hole Laser',
    female: '₦85,000',
    male: '₦120,000',
    duration: '40 mins',
    description: 'Our most complete intimate laser protocol at a bundled promotional rate.',
    promo: true,
  },
  {
    name: 'Butt Cheeks Laser',
    female: '₦105,000',
    male: '₦125,000',
    duration: '45 mins',
    description: 'Full glute area laser reduction leaving skin smooth and refined.',
  },
  {
    name: 'Insep Laser',
    female: '₦60,000',
    male: '₦70,000',
    duration: '45 mins',
    description: 'Inner-thigh laser treatment reducing chafing and dark ingrown marks.',
  },
  {
    name: 'Full Leg Laser',
    female: '₦150,000',
    male: '₦160,000',
    duration: '45 mins',
    description: 'Thigh-to-ankle permanent hair reduction for effortlessly smooth legs.',
  },
  {
    name: 'Half Leg Laser',
    female: '₦70,000',
    male: '₦70,000',
    duration: '30 mins',
    description: 'Lower-leg or upper-thigh coverage tailored to your hair growth cycle.',
  },
]

const zoneGroups = [
  {
    title: 'Face & Neck',
    subtitle: 'Precision protocols for delicate facial contours and razor-bump relief',
    zones: faceAndNeckZones,
  },
  {
    title: 'Arms, Chest & Back',
    subtitle: 'Fast, comfortable body sessions with sapphire-tip cooling',
    zones: upperBodyZones,
  },
  {
    title: 'Bikini, Intimate & Legs',
    subtitle: 'Safe, hygienic grooming calibrated for melanin-rich skin',
    zones: intimateAndLegZones,
  },
]

export default function LaserHairRemovalServicePage() {
  return (
    <main>
      <Header />

      <ServiceHero
        category="Laser Tech"
        title="Laser Hair Removal"
        subtitle="Permanent hair reduction calibrated for deeper skin tones across 22 treatment zones"
      />

      {/* Editorial Feature Overview */}
      <section className="py-12 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center rounded-2xl border border-gray-100 bg-gray-50 p-5 md:p-7">
            <div className="lg:col-span-5 relative aspect-[4/3] rounded-xl overflow-hidden border border-gray-100">
              <Image
                src="/images/laser-hair-removal-ng.jpg"
                alt="Laser Hair Removal treatment at Dermaspace Lagos"
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                referrerPolicy="no-referrer"
                className="object-cover"
                priority
              />
            </div>

            <div className="lg:col-span-7">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] text-[11px] font-semibold uppercase tracking-wider mb-3">
                <Shield className="w-3.5 h-3.5" />
                Safe on Darker Skin Tones
              </span>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                Smooth skin without ingrown hairs or irritation
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-5">
                Every session uses FDA-cleared medical diode and Nd:YAG wavelengths selected for Nigerian and melanin-rich skin, delivered by certified therapists at our Victoria Island and Ikoyi clinics.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                {[
                  { icon: CheckCircle2, label: 'Melanin-safe settings' },
                  { icon: Droplets, label: 'Cooling tip comfort' },
                  { icon: Timer, label: '20 to 60 min sessions' },
                ].map((item) => {
                  const Icon = item.icon
                  return (
                    <div
                      key={item.label}
                      className="flex items-center gap-2 rounded-xl bg-white border border-gray-100 px-3 py-2.5"
                    >
                      <Icon className="w-4 h-4 text-[#7B2D8E] shrink-0" />
                      <span className="text-xs font-medium text-gray-700">{item.label}</span>
                    </div>
                  )
                })}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/booking"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7B2D8E] text-white text-xs sm:text-sm font-medium rounded-xl hover:bg-[#6A2579] transition-colors"
                >
                  Book a Session
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/services/laser-package-deals"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-[#7B2D8E] text-xs sm:text-sm font-medium rounded-xl border border-[#7B2D8E]/25 hover:border-[#7B2D8E] transition-colors"
                >
                  <Package className="w-4 h-4" />
                  Save with Laser Package Deals
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Treatment Zones */}
      {zoneGroups.map((group, groupIdx) => (
        <section
          key={group.title}
          className={`py-14 ${groupIdx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
        >
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 inline-block relative">
                {group.title}
                <svg
                  className="absolute -bottom-2 left-0 right-0 mx-auto"
                  width="100"
                  height="6"
                  viewBox="0 0 100 6"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M2 4C25 2 75 2 98 4"
                    stroke="#7B2D8E"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeOpacity="0.3"
                  />
                </svg>
              </h2>
              <p className="text-sm text-gray-500 mt-3">{group.subtitle}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.zones.map((zone) => (
                <div
                  key={zone.name}
                  className="group bg-white rounded-xl border border-gray-100 p-5 hover:border-[#7B2D8E]/30 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center group-hover:bg-[#7B2D8E]/15 transition-colors">
                        <Shield className="w-5 h-5 text-[#7B2D8E]" />
                      </div>
                      {(zone.popular || zone.promo) && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#7B2D8E] text-white text-[10px] font-semibold uppercase tracking-wider">
                          <Crown className="w-3 h-3" />
                          {zone.promo ? 'Promo' : 'Popular'}
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-semibold text-gray-900 mb-1.5 group-hover:text-[#7B2D8E] transition-colors">
                      {zone.name}
                    </h3>

                    <p className="text-xs text-gray-500 leading-relaxed mb-4">
                      {zone.description}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-xs">
                      <span className="font-semibold text-[#7B2D8E]">F: {zone.female}</span>
                      <span className="text-gray-300" aria-hidden="true">·</span>
                      <span className="font-semibold text-gray-700">M: {zone.male}</span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="inline-flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>{zone.duration}</span>
                      </div>
                      <Link
                        href="/booking"
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#7B2D8E] hover:gap-2 transition-all"
                      >
                        Book Now
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* CTA Section */}
      <section className="py-16 bg-white border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4" aria-hidden="true">
            <div className="w-8 h-0.5 bg-[#7B2D8E]/30" />
            <div className="w-2 h-2 rounded-full bg-[#7B2D8E]/40" />
            <div className="w-8 h-0.5 bg-[#7B2D8E]/30" />
          </div>

          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
            Ready to start your laser sessions?
          </h2>

          <svg className="mx-auto mb-4" width="160" height="8" viewBox="0 0 160 8" fill="none" aria-hidden="true">
            <path d="M2 6C40 2 120 2 158 6" stroke="#7B2D8E" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.25" />
          </svg>

          <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
            Book a single zone or bundle multiple areas at discounted rates in Victoria Island or Ikoyi.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/booking"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white text-sm font-medium rounded-xl hover:bg-[#6A2579] transition-colors group"
            >
              Book Appointment
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/laser-tech"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#7B2D8E] text-sm font-medium rounded-xl border border-[#7B2D8E]/25 hover:border-[#7B2D8E] transition-colors"
            >
              Full Laser Tech Guide
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
