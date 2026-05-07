import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { StaffSidebar } from "@/components/staff/sidebar"
import { StaffPolicyGate } from "@/components/staff/staff-policy-gate"
import { StaffTopBar } from "@/components/staff/staff-top-bar"

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
    <div className="min-h-screen bg-[#FBF9FC]">
      <StaffSidebar />
      <main className="min-h-screen pl-0 lg:pl-72">
        {/* Personalised top bar — greeting, search, notification bell.
            Sits inside the layout so every staff page inherits it
            without each route re-implementing the chrome. */}
        <StaffTopBar
          firstName={user.first_name}
          lastName={user.last_name}
          role={user.role}
        />
        <div className="container mx-auto p-4 pt-4 lg:p-8 lg:pt-6 max-w-7xl">
          {children}
        </div>
      </main>
      {/* Short, role-specific acknowledgement modal — separate from the
          customer legal pack which is already excluded on /staff. */}
      <StaffPolicyGate />
    </div>
  )
}
