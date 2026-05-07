import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { StaffSidebar } from "@/components/staff/sidebar"
import { StaffPolicyGate } from "@/components/staff/staff-policy-gate"
import { StaffTopBar } from "@/components/staff/staff-top-bar"
// The welcome gate (set new password / enter real email) is shared
// across both consoles — Itunu, Franca and any future seeded
// admin/staff invitee should see exactly the same first-sign-in
// flow whether they land on /admin or /staff.
import { AdminWelcomeGate } from "@/components/admin/admin-welcome-gate"

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
        <div className="container mx-auto px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 max-w-7xl">
          {children}
        </div>
      </main>
      {/* Short, role-specific acknowledgement modal — separate from the
          customer legal pack which is already excluded on /staff. */}
      <StaffPolicyGate />
      {/* First-sign-in welcome flow for seeded operator accounts. */}
      <AdminWelcomeGate />
    </div>
  )
}
