'use client'

/**
 * Admin survey detail page.
 *
 * Full page replacing the old centered modal. Shows the overall
 * rating, individual category answers, and any free-text comments.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, Loader2, AlertCircle, Star,
  Monitor, Smartphone, Globe, MapPin, UserCheck, UserX, Navigation,
} from 'lucide-react'

interface Survey {
  id: number
  user_id: string | null
  user_email: string | null
  aesthetics: string
  ambiance: string
  front_desk: string
  staff_professional: string
  appointment_delay: string
  overall_rating: number
  visit_again: string
  comments: string | null
  created_at: string
  first_name: string | null
  last_name: string | null
  is_anonymous: boolean | null
  respondent_user_agent: string | null
  respondent_browser: string | null
  respondent_os: string | null
  respondent_device: string | null
  respondent_ip: string | null
  respondent_city: string | null
  respondent_region: string | null
  respondent_country: string | null
  respondent_lat: number | null
  respondent_lng: number | null
  respondent_geo_source: string | null
}

const renderStars = (rating: number) => {
  return Array.from({ length: 5 }).map((_, i) => (
    <Star
      key={i}
      className={`w-5 h-5 ${i < rating ? 'fill-primary text-primary' : 'text-gray-300'}`}
    />
  ))
}

// Best-effort flag emoji from an ISO country code, purely cosmetic.
function flagEmoji(country: string | null) {
  if (!country || country.length !== 2) return ''
  const base = 0x1f1e6
  return String.fromCodePoint(
    ...country.toUpperCase().split('').map((c) => base + (c.charCodeAt(0) - 65)),
  )
}

// Respondent context captured at submit time: who (anonymous vs a
// signed-in client), what device/browser/OS they used, and where they
// were (precise GPS if they allowed it, otherwise approximate from IP).
function RespondentDetails({ survey }: { survey: Survey }) {
  const locationParts = [survey.respondent_city, survey.respondent_region]
    .filter(Boolean)
    .join(', ')
  const countryFlag = flagEmoji(survey.respondent_country)
  const locationLabel = [locationParts, survey.respondent_country]
    .filter(Boolean)
    .join(' · ')
  const isAnon = survey.is_anonymous !== false && !survey.first_name

  const rows: Array<{ icon: React.ReactNode; label: string; value: string | null }> = [
    {
      icon:
        survey.respondent_device === 'Mobile' || survey.respondent_device === 'Tablet' ? (
          <Smartphone className="w-4 h-4 text-gray-400" />
        ) : (
          <Monitor className="w-4 h-4 text-gray-400" />
        ),
      label: 'Device',
      value: [survey.respondent_device, survey.respondent_os].filter(Boolean).join(' · ') || null,
    },
    {
      icon: <Globe className="w-4 h-4 text-gray-400" />,
      label: 'Browser',
      value: survey.respondent_browser,
    },
    {
      icon:
        survey.respondent_geo_source === 'gps' ? (
          <Navigation className="w-4 h-4 text-gray-400" />
        ) : (
          <MapPin className="w-4 h-4 text-gray-400" />
        ),
      label: survey.respondent_geo_source === 'gps' ? 'Location (GPS)' : 'Location (approx.)',
      value:
        survey.respondent_geo_source === 'gps' && survey.respondent_lat != null
          ? `${survey.respondent_lat.toFixed(4)}, ${survey.respondent_lng?.toFixed(4)}`
          : locationLabel
            ? `${countryFlag ? countryFlag + ' ' : ''}${locationLabel}`
            : null,
    },
    {
      icon: <Globe className="w-4 h-4 text-gray-400" />,
      label: 'IP address',
      value: survey.respondent_ip,
    },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-medium text-gray-700">Respondent details</h2>
        <Badge
          variant="outline"
          className={
            isAnon
              ? 'bg-gray-100 text-gray-600 border-gray-200'
              : 'bg-[#7B2D8E]/10 text-[#7B2D8E] border-[#7B2D8E]/20'
          }
        >
          {isAnon ? (
            <><UserX className="w-3 h-3 mr-1" /> Anonymous</>
          ) : (
            <><UserCheck className="w-3 h-3 mr-1" /> Signed in</>
          )}
        </Badge>
      </div>

      {!isAnon && (
        <p className="text-sm text-gray-600 mb-2">
          {survey.first_name} {survey.last_name}
          {survey.user_email ? ` · ${survey.user_email}` : ''}
        </p>
      )}

      <div className="rounded-lg border border-gray-100 divide-y divide-gray-100">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3 px-3 py-2.5">
            {row.icon}
            <span className="text-xs text-gray-500 w-32 shrink-0">{row.label}</span>
            <span className="text-sm text-gray-700 truncate">{row.value || 'Unknown'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SurveyDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/surveys/${id}`, { cache: 'no-store' })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load')
        if (!cancelled) setSurvey(data.survey)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#7B2D8E]" />
      </div>
    )
  }

  if (error || !survey) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mx-auto">
            <AlertCircle className="w-5 h-5 text-[#7B2D8E]" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Unable to load survey</h2>
            <p className="text-sm text-gray-500 mt-1">{error || 'Not found'}</p>
          </div>
          <Link
            href="/admin/surveys"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#7B2D8E] text-white text-sm font-medium hover:bg-[#5A1D6A]"
          >
            <ArrowLeft className="w-4 h-4" /> Back to surveys
          </Link>
        </CardContent>
      </Card>
    )
  }

  const rows = [
    { label: 'Spa aesthetics', value: survey.aesthetics },
    { label: 'Ambiance', value: survey.ambiance },
    { label: 'Front desk', value: survey.front_desk },
    { label: 'Staff professionalism', value: survey.staff_professional },
    { label: 'Appointment delay', value: survey.appointment_delay },
    { label: 'Would visit again', value: survey.visit_again },
  ]

  return (
    <div className="space-y-4 max-w-2xl">
      <Link
        href="/admin/surveys"
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#7B2D8E]"
      >
        <ArrowLeft className="w-4 h-4" /> Back to surveys
      </Link>

      <Card>
        <CardContent className="p-5 sm:p-6 space-y-5">
          <div className="text-center py-2">
            <div className="flex items-center justify-center gap-1 mb-2">
              {renderStars(survey.overall_rating)}
            </div>
            <p className="text-2xl font-bold text-gray-900">{survey.overall_rating}/5</p>
            <p className="text-sm text-gray-500">Overall rating</p>
          </div>

          <div className="divide-y divide-gray-100 border-y border-gray-100">
            {rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-gray-600">{row.label}</span>
                <Badge
                  variant="outline"
                  className={
                    row.value?.includes('Agree') || row.value === 'Yes'
                      ? 'bg-[#7B2D8E]/10 text-[#7B2D8E] border-[#7B2D8E]/20'
                      : row.value?.includes('Disagree') || row.value === 'No'
                      ? 'bg-gray-100 text-gray-600'
                      : 'bg-gray-50 text-gray-600'
                  }
                >
                  {row.value || 'N/A'}
                </Badge>
              </div>
            ))}
          </div>

          {survey.comments && (
            <div>
              <h2 className="text-sm font-medium text-gray-700 mb-2">Comments</h2>
              <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg whitespace-pre-wrap">
                {survey.comments}
              </p>
            </div>
          )}

          <RespondentDetails survey={survey} />

          <p className="text-center text-xs text-gray-500 pt-2">
            Submitted {new Date(survey.created_at).toLocaleString()}
            {survey.first_name && ` by ${survey.first_name} ${survey.last_name}`}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
