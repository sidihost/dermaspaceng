"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useNotify } from "@/components/shared/notify"

export default function SaasLoginPage() {
  const router = useRouter()
  const notify = useNotify()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: "", password: "" })

  function update(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch("/api/saas/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        notify.error(data?.error || "Invalid email or password.")
        return
      }
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
          Welcome back
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Sign in to manage your assistant, branding, and knowledge base.
        </p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
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
              value={form.password}
              onChange={update("password")}
              className="h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
              placeholder="Your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link href="/derma-ai-saas/signup" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  )
}
