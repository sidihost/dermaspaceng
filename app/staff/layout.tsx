import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { StaffSidebar } from "@/components/staff/sidebar"
import { StaffPolicyGate } from "@/components/staff/staff-policy-gate"
import { StaffMainShell } from "@/components/staff/staff-main-shell"
// The welcome gate (set new password / enter real email) is shared
// across both consoles — Itunu, Franca and any future seeded
// admin/staff invitee should see exactly the same first-sign-in
// flow whether they land on /admin or /staff.
import { AdminWelcomeGate } from "@/components/admin/admin-welcome-gate"
import { resolveStaffAvatar } from "@/lib/admin-avatars"

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  // Check if user is authenticated and is staff or admin
  if (!user) {
    redirect("/signin")
  }

  if (user.role !== "staff" && user.role !== "admin") {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-[#FBF9FC]">
      <StaffSidebar />
      <StaffMainShell
        firstName={user.first_name}
        lastName={user.last_name}
        role={user.role}
        avatarUrl={resolveStaffAvatar((user as { avatar_url?: string | null }).avatar_url)}
      >
        {children}
      </StaffMainShell>
      {/* Short, role-specific acknowledgement modal — separate from the
          customer legal pack which is already excluded on /staff. */}
      <StaffPolicyGate />
      {/* First-sign-in welcome flow for seeded operator accounts. */}
      <AdminWelcomeGate />
    </div>
  )
}
