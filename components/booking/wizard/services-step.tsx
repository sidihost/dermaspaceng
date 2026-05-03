'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, Clock, Plus, Check, Star } from 'lucide-react'
import { SERVICES_CATALOG } from '@/lib/services-catalog'
import type { WizardServiceChoice } from './types'

interface ServicesStepProps {
  selected: WizardServiceChoice[]
  onChange: (next: WizardServiceChoice[]) => void
}

const formatNaira = (kobo: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(kobo / 100)

export function ServicesStep({ selected, onChange }: ServicesStepProps) {
  // Track which categories are expanded. Default to "first category open"
  // to give the user something to act on without scrolling.
  const [openIds, setOpenIds] = useState<Record<string, boolean>>(() => ({
    [SERVICES_CATALOG[0]?.slug ?? '']: true,
  }))

  const selectedKey = useMemo(
    () => new Set(selected.map((s) => `${s.categoryId}::${s.treatmentId}`)),
    [selected],
  )

  const toggleService = (
    categoryId: string,
    categoryName: string,
    treatmentId: string,
    treatmentName: string,
    duration: number,
    priceKobo: number,
  ) => {
    const key = `${categoryId}::${treatmentId}`
    if (selectedKey.has(key)) {
      onChange(
        selected.filter(
          (s) => !(s.categoryId === categoryId && s.treatmentId === treatmentId),
        ),
      )
      return
    }
    onChange([
      ...selected,
      {
        categoryId,
        categoryName,
        treatmentId,
        treatmentName,
        duration,
        priceKobo,
      },
    ])
  }

  const totalDuration = selected.reduce((s, x) => s + x.duration, 0)
  const totalKobo = selected.reduce((s, x) => s + x.priceKobo, 0)

  const parseDuration = (label: string): number => {
    const m = label.match(/(\d+)/)
    return m ? parseInt(m[1], 10) : 60
  }

  return (
    <div className="space-y-3">
      <div className="space-y-3">
        {SERVICES_CATALOG.map((category) => {
          const isOpen = !!openIds[category.slug]
          const countSelected = selected.filter(
            (s) => s.categoryId === category.slug,
          ).length

          return (
            <section
              key={category.slug}
              className={[
                'overflow-hidden rounded-2xl border bg-white transition-colors',
                isOpen ? 'border-[#7B2D8E]/30' : 'border-gray-200',
              ].join(' ')}
            >
              <button
                type="button"
                onClick={() =>
                  setOpenIds((prev) => ({ ...prev, [category.slug]: !prev[category.slug] }))
                }
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {category.title}
                  </p>
                  <p className="mt-0.5 text-[12px] text-gray-500 line-clamp-1">
                    {category.tagline}
                  </p>
                </div>
                {countSelected > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#7B2D8E]/10 px-2 py-0.5 text-[11px] font-semibold text-[#7B2D8E]">
                    <Check className="h-3 w-3" />
                    {countSelected}
                  </span>
                ) : null}
                <ChevronDown
                  className={[
                    'h-5 w-5 shrink-0 text-gray-400 transition-transform',
                    isOpen ? 'rotate-180' : '',
                  ].join(' ')}
                />
              </button>

              {isOpen ? (
                <ul className="divide-y divide-gray-100 border-t border-gray-100">
                  {category.treatments.map((tr) => {
                    const duration = parseDuration(tr.duration)
                    const priceKobo = tr.priceFrom * 100
                    const key = `${category.slug}::${tr.id}`
                    const isSelected = selectedKey.has(key)
                    return (
                      <li key={tr.id}>
                        <button
                          type="button"
                          onClick={() =>
                            toggleService(
                              category.slug,
                              category.title,
                              tr.id,
                              tr.name,
                              duration,
                              priceKobo,
                            )
                          }
                          className={[
                            'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
                            isSelected ? 'bg-[#7B2D8E]/5' : 'hover:bg-gray-50',
                          ].join(' ')}
                        >
                          <span
                            className={[
                              'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                              isSelected
                                ? 'border-[#7B2D8E] bg-[#7B2D8E] text-white'
                                : 'border-gray-300 bg-white text-transparent',
                            ].join(' ')}
                            aria-hidden="true"
                          >
                            {isSelected ? (
                              <Check className="h-3 w-3" strokeWidth={3} />
                            ) : (
                              <Plus className="h-3 w-3 text-gray-400" strokeWidth={2.5} />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-semibold text-gray-900">
                                {tr.name}
                              </p>
                              {tr.popular ? (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                                  <Star className="h-2.5 w-2.5" />
                                  Popular
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-[12px] text-gray-500">
                              {tr.description}
                            </p>
                            <div className="mt-1.5 flex items-center gap-3 text-[11px]">
                              <span className="inline-flex items-center gap-1 text-gray-500">
                                <Clock className="h-3 w-3" />
                                {duration} min
                              </span>
                              <span className="font-semibold text-[#7B2D8E]">
                                {formatNaira(priceKobo)}
                              </span>
                            </div>
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              ) : null}
            </section>
          )
        })}
      </div>

      {/* Sticky bottom summary so the user always sees what they've
          picked when scrolling through long category lists. */}
      {selected.length > 0 ? (
        <div className="sticky bottom-2 z-10 rounded-2xl border border-[#7B2D8E]/20 bg-white p-3 shadow-md">
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-gray-500">
                {selected.length} {selected.length === 1 ? 'service' : 'services'} • {totalDuration} min
              </p>
              <p className="mt-0.5 text-base font-bold text-gray-900">
                {formatNaira(totalKobo)}
              </p>
            </div>
            <span className="rounded-full bg-[#7B2D8E]/10 px-3 py-1 text-[11px] font-semibold text-[#7B2D8E]">
              Continue when ready
            </span>
          </div>
        </div>
      ) : null}
    </div>
  )
}
