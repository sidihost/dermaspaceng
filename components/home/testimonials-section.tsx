'use client'

import Image from 'next/image'
import { Star, Quote, BadgeCheck } from 'lucide-react'
import SectionHeader from '@/components/shared/section-header'

const testimonials = [
  {
    name: 'Oni Oluwadunni',
    source: 'Google Review',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/85157438_9aab_3.jpg-F2ovn0deXBWOG0oRSoxuNe3GdHIfZn.webp',
    review: "Had a full body massage here, and it was worth every penny. My attendant was really warm.",
  },
  {
    name: 'Jekein Lato-Unah',
    source: 'Google Review',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/jekein-lato-unah-150x150.jpeg-Am611knEiHci6H0y3MYuTaVQ0D9dZE.webp',
    review: "Really nice services. Music playlist is awesome. I had a good time.",
  },
  {
    name: 'Onyinyechi Ibelegbu',
    source: 'Google Review',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/review1-150x150.jpg-wXmVZaQRMC8rwj0jIxzbSlfHHONxRD.webp',
    review: "Had a great Experience. The SPA therapists are professionals.",
  },
]

export default function TestimonialsSection() {
  return (
    // Standard home-section rhythm: 48px mobile, 64px desktop.
    <section className="py-12 md:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <SectionHeader
          badge="Reviews"
          title="What clients"
          highlight="say"
          description="Real Google reviews from our clients. We don't edit these."
        />

        {/* Verified-source strip. We deliberately don't publish an
            aggregate score or review count here — Dermaspace has no
            verified public rating we can stand behind, so we let the
            real, unedited reviews below speak for themselves. */}
        <div className="mb-10 flex items-center justify-center gap-2 border-b border-gray-100 pb-10 text-sm font-medium text-gray-600">
          <BadgeCheck className="h-5 w-5 text-[#7B2D8E]" />
          <span>Verified Google reviews</span>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {testimonials.map((t, i) => {
            // The first card is a solid-purple "hero" review to give the
            // wall a strong anchor. The rest stay clean white cards with
            // a purple border on hover. Brand palette only.
            const featured = i === 0
            return (
              <article
                key={t.name}
                className={`flex flex-col rounded-2xl border p-6 transition-colors ${
                  featured
                    ? 'border-transparent bg-[#7B2D8E] text-white'
                    : 'border-gray-200 bg-white hover:border-[#7B2D8E]'
                }`}
              >
                <Quote
                  className={`h-8 w-8 ${featured ? 'text-white/80' : 'text-[#7B2D8E]'}`}
                  aria-hidden="true"
                />

                <div className="mt-4 flex gap-0.5" aria-hidden="true">
                  {[...Array(5)].map((_, s) => (
                    <Star
                      key={s}
                      className={`h-4 w-4 ${
                        featured
                          ? 'fill-white text-white'
                          : 'fill-[#7B2D8E] text-[#7B2D8E]'
                      }`}
                    />
                  ))}
                </div>

                <p
                  className={`mt-4 flex-1 text-lg leading-relaxed text-pretty ${
                    featured ? 'text-white' : 'text-gray-700'
                  }`}
                >
                  &ldquo;{t.review}&rdquo;
                </p>

                <div
                  className={`mt-6 flex items-center gap-3 border-t pt-5 ${
                    featured ? 'border-white/20' : 'border-gray-100'
                  }`}
                >
                  <div className="relative h-11 w-11 overflow-hidden rounded-full">
                    <Image src={t.image} alt={t.name} fill className="object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`flex items-center gap-1 text-base font-semibold ${
                        featured ? 'text-white' : 'text-gray-900'
                      }`}
                    >
                      <span className="truncate">{t.name}</span>
                      <BadgeCheck
                        className={`h-4 w-4 shrink-0 ${
                          featured ? 'text-white' : 'text-[#7B2D8E]'
                        }`}
                        aria-label="Verified reviewer"
                      />
                    </p>
                    <p
                      className={`text-xs ${featured ? 'text-white/70' : 'text-gray-500'}`}
                    >
                      {t.source}
                    </p>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
