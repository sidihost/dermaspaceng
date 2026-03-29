import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { StaffSidebar } from "@/components/staff/sidebar"

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  // Check if user is authenticated and is staff or admin
  if (!user) {
    redirect("/login")
  }

  if (user.role !== "staff" && user.role !== "admin") {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-background">
      <StaffSidebar />
      <main className="min-h-screen pl-0 lg:pl-72">
        <div className="container mx-auto p-4 pt-20 lg:p-8 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  )
}
