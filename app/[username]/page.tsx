'use client'

import { useEffect, useState } from 'react'
import { useParams, notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Calendar, MapPin, Star, Heart, Clock, Award, Sparkles } from 'lucide-react'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'

interface UserProfile {
  id: string
  firstName: string
  lastName: string
  username: string
  createdAt: string
  avatarUrl?: string
  bio?: string
  preferredLocation?: string
  memberSince: string
  totalBookings?: number
  favoriteServices?: string[]
}

export default function PublicProfilePage() {
  const params = useParams()
  const username = params.username as string
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFoundError, setNotFoundError] = useState(false)

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch(`/api/user/profile/${username}`)
        if (res.status === 404) {
          setNotFoundError(true)
          return
        }
        if (!res.ok) throw new Error('Failed to fetch profile')
        const data = await res.json()
        setProfile(data)
      } catch (error) {
        console.error('Error fetching profile:', error)
        setNotFoundError(true)
      } finally {
        setLoading(false)
      }
    }

    if (username) {
      fetchProfile()
    }
  }, [username])

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gray-50 pt-24 pb-12">
          <div className="max-w-2xl mx-auto px-4">
            <div className="bg-white rounded-2xl shadow-sm p-8 animate-pulse">
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-gray-200" />
                <div className="h-6 w-40 bg-gray-200 rounded mt-4" />
                <div className="h-4 w-24 bg-gray-200 rounded mt-2" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  if (notFoundError || !profile) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gray-50 pt-24 pb-12">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <div className="bg-white rounded-2xl shadow-sm p-12">
              <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <Sparkles className="w-10 h-10 text-gray-400" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h1>
              <p className="text-gray-600 mb-6">
                The user @{username} doesn&apos;t exist or hasn&apos;t set up their profile yet.
              </p>
              <Link 
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white rounded-xl hover:bg-[#6B2278] transition-colors"
              >
                Go to Homepage
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  const initials = `${profile.firstName?.charAt(0) || ''}${profile.lastName?.charAt(0) || ''}`.toUpperCase()

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 pt-24 pb-12">
        <div className="max-w-2xl mx-auto px-4">
          {/* Profile Card */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* Cover gradient */}
            <div className="h-32 bg-gradient-to-r from-[#7B2D8E] to-[#9B4DB0]" />
            
            {/* Profile content */}
            <div className="px-6 pb-8 -mt-12">
              {/* Avatar */}
              <div className="flex justify-center">
                {profile.avatarUrl ? (
                  <Image
                    src={profile.avatarUrl}
                    alt={`${profile.firstName}'s avatar`}
                    width={96}
                    height={96}
                    className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-[#7B2D8E] flex items-center justify-center text-white text-2xl font-bold">
                    {initials}
                  </div>
                )}
              </div>

              {/* Name and username */}
              <div className="text-center mt-4">
                <h1 className="text-2xl font-bold text-gray-900">
                  {profile.firstName} {profile.lastName}
                </h1>
                <p className="text-[#7B2D8E] font-medium">@{profile.username}</p>
              </div>

              {/* Bio */}
              {profile.bio && (
                <p className="text-center text-gray-600 mt-4 max-w-md mx-auto">
                  {profile.bio}
                </p>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mt-8">
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-center mb-2">
                    <Calendar className="w-5 h-5 text-[#7B2D8E]" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{profile.totalBookings || 0}</p>
                  <p className="text-xs text-gray-500">Bookings</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-center mb-2">
                    <Award className="w-5 h-5 text-[#7B2D8E]" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">Member</p>
                  <p className="text-xs text-gray-500">Status</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-center mb-2">
                    <Clock className="w-5 h-5 text-[#7B2D8E]" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {new Date(profile.memberSince).getFullYear()}
                  </p>
                  <p className="text-xs text-gray-500">Since</p>
                </div>
              </div>

              {/* Preferred Location */}
              {profile.preferredLocation && (
                <div className="mt-6 flex items-center justify-center gap-2 text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>Prefers {profile.preferredLocation}</span>
                </div>
              )}

              {/* Favorite Services */}
              {profile.favoriteServices && profile.favoriteServices.length > 0 && (
                <div className="mt-6">
                  <p className="text-sm text-gray-500 text-center mb-3">Favorite Services</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {profile.favoriteServices.map((service, index) => (
                      <span 
                        key={index}
                        className="px-3 py-1.5 bg-[#7B2D8E]/10 text-[#7B2D8E] rounded-full text-sm font-medium"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA */}
              <div className="mt-8 text-center">
                <Link
                  href="/booking"
                  className="inline-flex items-center gap-2 px-8 py-3 bg-[#7B2D8E] text-white rounded-xl hover:bg-[#6B2278] transition-colors font-medium"
                >
                  <Sparkles className="w-5 h-5" />
                  Book an Appointment
                </Link>
              </div>
            </div>
          </div>

          {/* Dermaspace branding */}
          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-gray-500 hover:text-[#7B2D8E] transition-colors">
              Powered by <span className="font-semibold">Dermaspace</span>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
