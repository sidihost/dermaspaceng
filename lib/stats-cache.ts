// ---------------------------------------------------------------------------
// Stats cache invalidation layer
// ---------------------------------------------------------------------------
// Purpose
// -------
// Every dashboard in the app (admin, staff, user, public home) reads
// aggregate counts that are expensive in Postgres and cheap in Redis.
// We already cache those reads through `cached(KEYS.adminStats, ...)` and
// `cached(KEYS.staffDashboard, ...)`. The missing half was: when a write
// happens that should change those numbers (a new signup, a booking
// status change, a gift card approval) the cached read keeps serving
// the old aggregate until its TTL expires.
//
// This module is the single, named place where every write path should
// announce "this kind of thing just changed", and it fans out the
// matching cache invalidations on Upstash so the next dashboard load
// recomputes against fresh data instantly. It deliberately mirrors the
// Next 16 `revalidateTag` mental model — each scope here is a tag —
// so we have one consistent invalidation vocabulary across the codebase.
//
// All helpers fail-soft: a Redis hiccup must never break the user
// request that triggered the write.
// ---------------------------------------------------------------------------

import { delKey, KEYS } from "@/lib/redis"

// Per-user / per-staff cache key helpers. Centralised so every read site
// and every write site pull from the same template — easy to grep, easy
// to change.
export const homeStatsKey = "home:stats:public"
export const userStatsKey = (userId: string) => `user:stats:${userId}`
export const staffTrendKey = (userId: string) => `staff:trend:${userId}`
export const adminTrendKey = "admin:stats:trend"

/**
 * Wipe the admin dashboard aggregate. Call after any write that changes
 * counts visible on /admin: signups, bookings, gift cards, surveys,
 * complaints, consultations, support tickets, newsletter subs, etc.
 */
export async function invalidateAdminStats(): Promise<void> {
  await Promise.all([delKey(KEYS.adminStats), delKey(adminTrendKey)])
}

/**
 * Wipe the staff triage aggregate. Call after any write that lands in
 * the staff queue (gift card request created, complaint filed,
 * consultation booked, survey submitted, booking assigned/handled).
 */
export async function invalidateStaffDashboard(): Promise<void> {
  await delKey(KEYS.staffDashboard)
}

/**
 * Wipe a specific staff member's per-week trend. Their assigned-bookings
 * chart is keyed by user id so two staff browsing /staff at the same
 * time don't share each other's numbers.
 */
export async function invalidateStaffTrend(staffUserId: string): Promise<void> {
  await delKey(staffTrendKey(staffUserId))
}

/**
 * Wipe one user's personal stats blob (bookings/spend by month, points,
 * loyalty tier). Call from the user-facing endpoints that mutate any of
 * those — booking POST, points redemption, profile completion bonus.
 */
export async function invalidateUserStats(userId: string): Promise<void> {
  await delKey(userStatsKey(userId))
}

/**
 * Wipe the public home-page aggregate (clients on books, treatments
 * done, average rating). Call after any write that bumps one of those
 * three numbers — new signup, completed booking, new survey response.
 */
export async function invalidateHomeStats(): Promise<void> {
  await delKey(homeStatsKey)
}

// ---------------------------------------------------------------------------
// Coarse fan-outs for the common write shapes
// ---------------------------------------------------------------------------
// Most write paths affect more than one dashboard. Rather than make
// every endpoint remember which scopes to invalidate, we name the write
// shape and fan out from here. Easier to grep ("after a booking, what
// gets invalidated?") and easier to keep correct as the app grows.

/**
 * After a booking is created, status-changed, or completed.
 * Affects the admin dashboard (pending/upcoming counters, user trend),
 * the assigned staff member (their per-staff queue), the booking
 * customer (their per-month spend chart), and the public home counts
 * (treatments done climbs on completion).
 */
export async function invalidateAfterBookingChange(opts: {
  customerUserId?: string | null
  staffUserId?: string | null
}): Promise<void> {
  const { customerUserId, staffUserId } = opts
  await Promise.all([
    invalidateAdminStats(),
    invalidateStaffDashboard(),
    invalidateHomeStats(),
    customerUserId ? invalidateUserStats(customerUserId) : Promise.resolve(),
    staffUserId ? invalidateStaffTrend(staffUserId) : Promise.resolve(),
  ])
}

/**
 * After a new user signs up. Affects the admin dashboard (total users,
 * today-new badge, growth %, user trend chart) and the home page
 * client count.
 */
export async function invalidateAfterSignup(): Promise<void> {
  await Promise.all([invalidateAdminStats(), invalidateHomeStats()])
}

/**
 * After any item lands in the admin/staff queue (gift card request,
 * complaint, consultation, survey, contact message, support ticket).
 */
export async function invalidateAfterQueueWrite(): Promise<void> {
  await Promise.all([invalidateAdminStats(), invalidateStaffDashboard()])
}
