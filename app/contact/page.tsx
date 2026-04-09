"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Header from "@/components/layout/header"
import { Loader2 } from "lucide-react"

export default function ContactPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function checkAuthAndRedirect() {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            // User is logged in, redirect to support page
            router.replace('/dashboard/support')
            return
          }
        }
        // User is not logged in, redirect to signin with redirect back to support
        router.replace('/signin?redirect=/dashboard/support')
      } catch {
        // On error, redirect to signin
        router.replace('/signin?redirect=/dashboard/support')
      }
    }

    checkAuthAndRedirect()
  }, [router])

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[#7B2D8E] animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-600">Redirecting to support...</p>
        </div>
      </main>
    </>
  )
}
