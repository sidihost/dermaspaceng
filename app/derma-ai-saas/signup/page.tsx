"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useNotify } from "@/components/shared/notify"

export default function SaasSignupPage() {
  const router = useRouter()
  const notify = useNotify()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    email: "",
    password: "",
  })

  function update(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch("/api/saas/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        notify.error(data?.error || "Could not create your account.")
        return
      }
      notify.success("Account created. Welcome aboard.")
      router.push("/derma-ai-saas/dashboard")
    } catch {
      notify.error("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-[80vh] w-full max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-lg border border-border bg-card p-6">
        <h1 className="text-pretty text-2xl font-semibold text-card-foreground">
          Create your workspace
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Start using Derma AI on your own site. No AI keys required — you run on
          our credits.
        </p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="companyName" className="text-sm font-medium text-card-foreground">
              Company name
            </label>
            <input
              id="companyName"
              required
              value={form.companyName}
              onChange={update("companyName")}
              className="h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
              placeholder="Acme Skincare Ltd"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="contactName" className="text-sm font-medium text-card-foreground">
              Your name
            </label>
            <input
              id="contactName"
              required
              value={form.contactName}
              onChange={update("contactName")}
              className="h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
              placeholder="Jane Doe"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-medium text-card-foreground">
              Work email
            </label>
            <input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={update("email")}
              className="h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
              placeholder="jane@acme.com"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm font-medium text-card-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={update("password")}
              className="h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
              placeholder="At least 8 characters"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/derma-ai-saas/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
