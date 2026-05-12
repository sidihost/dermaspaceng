import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdminOrStaff } from "@/lib/auth"

/**
 * GET /api/staff/loyalty
 *
 * Drives the Loyalty & Promos screen — entirely off real DB rows:
 *
 *   * `loyalty_programs`        — admin-configurable programme.
 *   * `users` × `bookings`      — spend roll-up → points issued.
 *   * `loyalty_redemptions`     — actual redemptions (donut numerator).
 *   * `booking_services`        — "top service" by booking count.
 *
 * `bookings.total_price_kobo` is stored in *kobo*; we divide by 100
 * once at the SQL boundary so this API speaks naira to the client.
 * (Older revisions referenced `total_price` which doesn't exist in
 * the live schema — same root cause that broke /staff/clients.)
 *
 * Points formula is data-driven (`points_per_naira`) instead of a
 * hard-coded 1pt-per-₦1000 — a non-engineer can tune the programme
 * via PATCH without redeploying.
 */
export async function GET() {
  try {
    await requireAdminOrStaff()

    const programRows = (await sql`
      SELECT id, name, active, reward_label, reward_percent,
             reward_threshold, points_per_naira, card_title, brand_subtitle
      FROM loyalty_programs
      ORDER BY active DESC, updated_at DESC
      LIMIT 1
    `) as any[]
    const programRow = programRows[0]
    if (!programRow) {
      return NextResponse.json(
        { success: false, error: "No loyalty programme configured" },
        { status: 404 }
      )
    }

    const program = {
      id: programRow.id,
      name: programRow.name,
      active: !!programRow.active,
      rewardLabel: programRow.reward_label,
      rewardPercent: Number(programRow.reward_percent),
      rewardThreshold: Number(programRow.reward_threshold),
      pointsPerNaira: Number(programRow.points_per_naira),
      cardTitle: programRow.card_title,
      brandSubtitle: programRow.brand_subtitle,
    }

    // Top members by lifetime spend (naira).
    const memberRows = (await sql`
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.avatar_url,
        COALESCE(SUM(b.total_price_kobo), 0) / 100.0 AS total_spent_naira
      FROM users u
      LEFT JOIN bookings b
        ON b.user_id = u.id
       AND b.status IN ('confirmed','completed')
      WHERE (u.role IS NULL OR u.role NOT IN ('admin','staff'))
      GROUP BY u.id, u.first_name, u.last_name, u.email, u.avatar_url
      HAVING COALESCE(SUM(b.total_price_kobo), 0) > 0
      ORDER BY total_spent_naira DESC
      LIMIT 25
    `) as any[]

    const members = memberRows.map((r) => {
      const spend = Number(r.total_spent_naira ?? 0)
      const points = Math.floor(spend * program.pointsPerNaira)
      // Discount earned scales linearly with spend up to the reward.
      const discountValue = Math.min(
        program.rewardPercent,
        program.rewardThreshold > 0
          ? Math.floor((spend / program.rewardThreshold) * program.rewardPercent)
          : 0
      )
      return {
        id: r.id,
        name: [r.first_name, r.last_name].filter(Boolean).join(" ").trim() || r.email,
        email: r.email,
        avatarUrl: r.avatar_url,
        spendValue: spend,
        pointsEarned: points,
        discountValue,
      }
    })

    // Issued = sum of points across *all* customers (not just top 25).
    const issuedRows = (await sql`
      SELECT COALESCE(SUM(b.total_price_kobo), 0) / 100.0 AS spend_total
      FROM bookings b
      JOIN users u ON u.id = b.user_id
      WHERE b.status IN ('confirmed','completed')
        AND (u.role IS NULL OR u.role NOT IN ('admin','staff'))
    `) as any[]
    const totalIssued = Math.floor(
      Number(issuedRows[0]?.spend_total ?? 0) * program.pointsPerNaira
    )

    const redeemedRows = (await sql`
      SELECT COALESCE(SUM(points_redeemed), 0)::int AS total
      FROM loyalty_redemptions
      WHERE program_id = ${program.id}
    `) as any[]
    const totalRedeemed = Number(redeemedRows[0]?.total ?? 0)
    const redemptionRate =
      totalIssued > 0 ? Math.round((totalRedeemed / totalIssued) * 100) : 0

    // Top service from booking_services. The try/catch keeps preview
    // DBs without the table from breaking the page.
    let topService: string | null = null
    try {
      const r = (await sql`
        SELECT bs.treatment_name AS name, COUNT(*) AS n
        FROM booking_services bs
        JOIN bookings b ON b.id = bs.booking_id
        WHERE b.status IN ('confirmed','completed')
        GROUP BY bs.treatment_name
        ORDER BY n DESC
        LIMIT 1
      `) as any[]
      if (r[0]?.name) topService = String(r[0].name)
    } catch {
      /* booking_services may not exist on every preview DB. */
    }

    return NextResponse.json({
      success: true,
      program,
      stats: {
        totalIssued,
        totalRedeemed,
        redemptionRate,
        topService,
      },
      members,
    })
  } catch (error) {
    console.error("Staff loyalty error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to load loyalty data" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/staff/loyalty
 *
 * Admin updates the programme config. Body accepts any subset of:
 *   { active, rewardLabel, rewardPercent, rewardThreshold,
 *     pointsPerNaira, cardTitle, brandSubtitle }
 */
export async function PATCH(req: Request) {
  try {
    await requireAdminOrStaff()
    const body = await req.json().catch(() => ({}))

    const programRows = (await sql`
      SELECT id FROM loyalty_programs ORDER BY updated_at DESC LIMIT 1
    `) as any[]
    const programId = programRows[0]?.id
    if (!programId) {
      return NextResponse.json(
        { success: false, error: "No loyalty programme to update" },
        { status: 404 }
      )
    }

    // We update each provided field separately to keep the Neon
    // tagged-template typing happy (no dynamic SET-list construction).
    if (typeof body.active === "boolean") {
      await sql`UPDATE loyalty_programs SET active = ${body.active}, updated_at = NOW() WHERE id = ${programId}`
    }
    if (typeof body.rewardLabel === "string") {
      await sql`UPDATE loyalty_programs SET reward_label = ${body.rewardLabel}, updated_at = NOW() WHERE id = ${programId}`
    }
    if (typeof body.rewardPercent === "number") {
      await sql`UPDATE loyalty_programs SET reward_percent = ${body.rewardPercent}, updated_at = NOW() WHERE id = ${programId}`
    }
    if (typeof body.rewardThreshold === "number") {
      await sql`UPDATE loyalty_programs SET reward_threshold = ${body.rewardThreshold}, updated_at = NOW() WHERE id = ${programId}`
    }
    if (typeof body.pointsPerNaira === "number") {
      await sql`UPDATE loyalty_programs SET points_per_naira = ${body.pointsPerNaira}, updated_at = NOW() WHERE id = ${programId}`
    }
    if (typeof body.cardTitle === "string") {
      await sql`UPDATE loyalty_programs SET card_title = ${body.cardTitle}, updated_at = NOW() WHERE id = ${programId}`
    }
    if (typeof body.brandSubtitle === "string") {
      await sql`UPDATE loyalty_programs SET brand_subtitle = ${body.brandSubtitle}, updated_at = NOW() WHERE id = ${programId}`
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Loyalty PATCH error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update loyalty programme" },
      { status: 500 }
    )
  }
}
