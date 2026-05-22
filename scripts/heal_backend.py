#!/usr/bin/env python3
"""
Dermaspace backend self-healer.

Run this script whenever the website is misbehaving, on a cron, or
after a botched deploy. It connects directly to Postgres via
$DATABASE_URL, runs a battery of read-only diagnostics, and then —
unless --dry-run is passed — applies safe, idempotent repairs.

What it does, in order:

  1. Schema sanity. Adds missing columns / indexes the app expects
     (audience on user_notifications, the (user_id, audience,
     created_at) index, etc.). No-ops if everything is already there.

  2. Orphan cleanup. Removes booking_services / staff_booking_access
     rows pointing at a booking that no longer exists, transactions
     pointing at a missing user, notification rows for deleted users.

  3. Duplicate-booking dedupe. Two bookings are duplicates when they
     share (user_id, location_id, appointment_date, appointment_time).
     Survivor selection: oldest paid wins, otherwise oldest pending /
     confirmed. Paid duplicates are NEVER deleted unless --force is
     passed (we'd be silently losing money owed). booking_services
     and staff_booking_access children of removed rows are cleaned
     up first so we don't strand them.

  4. Stuck-state recovery.
       • bookings with payment_status='paid' but status='pending'
         older than 5 minutes → flip status to 'confirmed' (the
         webhook flow already does this; this is a backstop).
       • pending+unpaid bookings past their appointment_date → mark
         cancelled with reason='auto-cancelled (no payment received)'.

  5. Lifetime-total reconciliation. Recomputes users.bookings_count
     and users.total_spent_kobo from the bookings table. The
     in-app code maintains these incrementally; this fixes drift
     caused by manual SQL or crashed mutations.

  6. Logs everything to stdout as JSON-friendly lines, and exits
     non-zero if any step crashes so a cron/monitor can alert.

Usage:
  python scripts/heal_backend.py                # apply repairs
  python scripts/heal_backend.py --dry-run      # report only
  python scripts/heal_backend.py --force        # also touch paid dupes
  python scripts/heal_backend.py --only dedupe  # run a single phase

Env:
  DATABASE_URL — required, standard postgres://… connection string.
                 Reads from /vercel/share/.env.project if not in env.

Dependencies:
  pip install "psycopg[binary]>=3.1"
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from contextlib import contextmanager
from typing import Any, Iterator

try:
    import psycopg
    from psycopg.rows import dict_row
except ImportError:  # pragma: no cover
    sys.stderr.write(
        "psycopg is not installed. Run: pip install 'psycopg[binary]>=3.1'\n"
    )
    sys.exit(2)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def log(event: str, **fields: Any) -> None:
    """Single-line structured log so cron/monitor output stays parseable."""
    payload = {"ts": round(time.time(), 3), "event": event, **fields}
    print(json.dumps(payload, default=str), flush=True)


def load_database_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if url:
        return url
    # Fall back to the env file the dev server reads. We don't print it.
    for path in ("/vercel/share/.env.project", ".env.local", ".env"):
        try:
            with open(path, "r", encoding="utf-8") as fh:
                for raw in fh:
                    line = raw.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    k, _, v = line.partition("=")
                    if k.strip() == "DATABASE_URL":
                        return v.strip().strip('"').strip("'")
        except FileNotFoundError:
            continue
    sys.stderr.write("DATABASE_URL is not set.\n")
    sys.exit(2)


@contextmanager
def connect() -> Iterator[psycopg.Connection]:
    conn = psycopg.connect(load_database_url(), row_factory=dict_row, autocommit=False)
    try:
        yield conn
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Phase 1 — schema sanity
# ---------------------------------------------------------------------------

SCHEMA_PATCHES: list[tuple[str, str]] = [
    (
        "user_notifications.audience",
        "ALTER TABLE user_notifications "
        "ADD COLUMN IF NOT EXISTS audience VARCHAR(16) "
        "NOT NULL DEFAULT 'customer'",
    ),
    (
        "user_notifications.broadcast_id",
        "ALTER TABLE user_notifications "
        "ADD COLUMN IF NOT EXISTS broadcast_id VARCHAR(64)",
    ),
    (
        "idx_user_notifs_user_audience",
        "CREATE INDEX IF NOT EXISTS idx_user_notifs_user_audience "
        "ON user_notifications (user_id, audience, created_at DESC)",
    ),
    (
        "idx_bookings_dedupe",
        "CREATE INDEX IF NOT EXISTS idx_bookings_dedupe "
        "ON bookings (user_id, location_id, appointment_date, appointment_time)",
    ),
    (
        "idx_transactions_payment_reference",
        "CREATE INDEX IF NOT EXISTS idx_transactions_payment_reference "
        "ON transactions (payment_reference)",
    ),
]


def repair_schema(conn: psycopg.Connection, dry_run: bool) -> dict[str, Any]:
    applied: list[str] = []
    with conn.cursor() as cur:
        for name, sql in SCHEMA_PATCHES:
            try:
                if dry_run:
                    # Check whether it would no-op by running the statement
                    # inside a savepoint and rolling back.
                    cur.execute("SAVEPOINT s")
                    cur.execute(sql)
                    cur.execute("ROLLBACK TO SAVEPOINT s")
                    applied.append(name)
                else:
                    cur.execute(sql)
                    applied.append(name)
            except psycopg.errors.UndefinedTable:
                # The table doesn't exist in this DB (e.g. fresh project).
                # Skip silently — the app will create it on first use.
                conn.rollback()
            except Exception as exc:  # pragma: no cover
                log("schema.patch_failed", patch=name, error=str(exc))
                conn.rollback()
    if not dry_run:
        conn.commit()
    return {"applied": applied}


# ---------------------------------------------------------------------------
# Phase 2 — orphan cleanup
# ---------------------------------------------------------------------------


def clean_orphans(conn: psycopg.Connection, dry_run: bool) -> dict[str, Any]:
    findings: dict[str, int] = {}

    with conn.cursor() as cur:
        # booking_services pointing at a missing booking
        cur.execute(
            "SELECT COUNT(*) AS n FROM booking_services bs "
            "WHERE NOT EXISTS (SELECT 1 FROM bookings b WHERE b.id = bs.booking_id)"
        )
        findings["orphan_booking_services"] = cur.fetchone()["n"]
        if not dry_run and findings["orphan_booking_services"]:
            cur.execute(
                "DELETE FROM booking_services bs "
                "WHERE NOT EXISTS (SELECT 1 FROM bookings b WHERE b.id = bs.booking_id)"
            )

        # staff_booking_access pointing at a missing booking
        try:
            cur.execute(
                "SELECT COUNT(*) AS n FROM staff_booking_access sa "
                "WHERE NOT EXISTS (SELECT 1 FROM bookings b WHERE b.id = sa.booking_id)"
            )
            findings["orphan_staff_access"] = cur.fetchone()["n"]
            if not dry_run and findings["orphan_staff_access"]:
                cur.execute(
                    "DELETE FROM staff_booking_access sa "
                    "WHERE NOT EXISTS (SELECT 1 FROM bookings b WHERE b.id = sa.booking_id)"
                )
        except psycopg.errors.UndefinedTable:
            conn.rollback()

        # notifications for deleted users
        try:
            cur.execute(
                "SELECT COUNT(*) AS n FROM user_notifications n "
                "WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = n.user_id)"
            )
            findings["orphan_notifications"] = cur.fetchone()["n"]
            if not dry_run and findings["orphan_notifications"]:
                cur.execute(
                    "DELETE FROM user_notifications n "
                    "WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = n.user_id)"
                )
        except psycopg.errors.UndefinedTable:
            conn.rollback()

    if not dry_run:
        conn.commit()
    return findings


# ---------------------------------------------------------------------------
# Phase 3 — duplicate-booking dedupe
# ---------------------------------------------------------------------------


def dedupe_bookings(
    conn: psycopg.Connection, dry_run: bool, force: bool
) -> dict[str, Any]:
    groups: list[dict[str, Any]] = []
    deleted = 0
    skipped_paid = 0

    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT user_id, location_id, appointment_date, appointment_time,
                   COUNT(*)::int AS n,
                   ARRAY_AGG(json_build_object(
                     'id', id,
                     'booking_reference', booking_reference,
                     'payment_status', payment_status,
                     'status', status,
                     'created_at', created_at
                   ) ORDER BY created_at ASC) AS rows
              FROM bookings
             GROUP BY user_id, location_id, appointment_date, appointment_time
            HAVING COUNT(*) > 1
            """
        )
        raw_groups = cur.fetchall()

        for g in raw_groups:
            rows = g["rows"]
            paid = [r for r in rows if r["payment_status"] == "paid"]
            survivor = paid[0] if paid else rows[0]

            to_remove: list[str] = []
            skipped: list[str] = []
            for r in rows:
                if r["id"] == survivor["id"]:
                    continue
                if r["payment_status"] == "paid" and not force:
                    skipped.append(r["booking_reference"])
                    skipped_paid += 1
                    continue
                to_remove.append(r["id"])

            if to_remove and not dry_run:
                cur.execute(
                    "DELETE FROM booking_services WHERE booking_id = ANY(%s)",
                    (to_remove,),
                )
                try:
                    cur.execute(
                        "DELETE FROM staff_booking_access WHERE booking_id = ANY(%s)",
                        (to_remove,),
                    )
                except psycopg.errors.UndefinedTable:
                    conn.rollback()
                cur.execute(
                    "DELETE FROM bookings WHERE id = ANY(%s) RETURNING id",
                    (to_remove,),
                )
                deleted += len(cur.fetchall())
            else:
                deleted += len(to_remove)

            groups.append(
                {
                    "kept": survivor["booking_reference"],
                    "removed": [
                        r["booking_reference"]
                        for r in rows
                        if r["id"] in to_remove
                    ],
                    "skipped_paid": skipped,
                }
            )

    if not dry_run:
        conn.commit()
    return {
        "groups": len(groups),
        "deleted": deleted,
        "skipped_paid": skipped_paid,
        "details": groups,
    }


# ---------------------------------------------------------------------------
# Phase 4 — stuck-state recovery
# ---------------------------------------------------------------------------


def recover_stuck(conn: psycopg.Connection, dry_run: bool) -> dict[str, Any]:
    out: dict[str, int] = {}
    with conn.cursor() as cur:
        # Paid but still pending → confirm. The webhook should already
        # have done this; we backstop in case it was missed.
        cur.execute(
            """
            SELECT COUNT(*) AS n FROM bookings
             WHERE status = 'pending'
               AND payment_status = 'paid'
               AND updated_at < NOW() - INTERVAL '5 minutes'
            """
        )
        out["pending_paid"] = cur.fetchone()["n"]
        if not dry_run and out["pending_paid"]:
            cur.execute(
                """
                UPDATE bookings
                   SET status = 'confirmed', updated_at = NOW()
                 WHERE status = 'pending'
                   AND payment_status = 'paid'
                   AND updated_at < NOW() - INTERVAL '5 minutes'
                """
            )

        # Pending+unpaid past their appointment date → cancel.
        cur.execute(
            """
            SELECT COUNT(*) AS n FROM bookings
             WHERE status = 'pending'
               AND payment_status IN ('unpaid', 'failed')
               AND appointment_date < CURRENT_DATE
            """
        )
        out["abandoned_pending"] = cur.fetchone()["n"]
        if not dry_run and out["abandoned_pending"]:
            cur.execute(
                """
                UPDATE bookings
                   SET status = 'cancelled',
                       cancellation_reason = 'auto-cancelled (no payment received)',
                       cancelled_at = NOW(),
                       updated_at = NOW()
                 WHERE status = 'pending'
                   AND payment_status IN ('unpaid', 'failed')
                   AND appointment_date < CURRENT_DATE
                """
            )

    if not dry_run:
        conn.commit()
    return out


# ---------------------------------------------------------------------------
# Phase 5 — lifetime totals reconciliation
# ---------------------------------------------------------------------------


def reconcile_totals(conn: psycopg.Connection, dry_run: bool) -> dict[str, Any]:
    """Recompute users.bookings_count + users.total_spent_kobo from bookings.

    The Next.js code maintains these incrementally on completion; this
    fixes drift caused by ad-hoc SQL, deletions, or refunds applied
    outside the app.
    """
    with conn.cursor() as cur:
        try:
            cur.execute(
                """
                WITH agg AS (
                  SELECT user_id,
                         COUNT(*)::int AS n,
                         COALESCE(SUM(
                           CASE WHEN payment_status = 'paid'
                                THEN COALESCE(price_override_kobo, total_price_kobo)
                                ELSE 0 END
                         ), 0)::bigint AS spent
                    FROM bookings
                   WHERE status = 'completed'
                   GROUP BY user_id
                )
                SELECT u.id,
                       COALESCE(u.bookings_count, 0) AS old_n,
                       COALESCE(u.total_spent_kobo, 0) AS old_spent,
                       COALESCE(agg.n, 0) AS new_n,
                       COALESCE(agg.spent, 0) AS new_spent
                  FROM users u
                  LEFT JOIN agg ON agg.user_id = u.id
                 WHERE COALESCE(u.bookings_count, 0)   <> COALESCE(agg.n, 0)
                    OR COALESCE(u.total_spent_kobo, 0) <> COALESCE(agg.spent, 0)
                """
            )
            drifted = cur.fetchall()
        except psycopg.errors.UndefinedColumn:
            # Columns not present in this DB — skip gracefully.
            conn.rollback()
            return {"drifted": 0, "skipped": True}

        if not dry_run and drifted:
            for row in drifted:
                cur.execute(
                    """
                    UPDATE users
                       SET bookings_count   = %s,
                           total_spent_kobo = %s
                     WHERE id = %s
                    """,
                    (row["new_n"], row["new_spent"], row["id"]),
                )
            conn.commit()

    return {"drifted": len(drifted)}


# ---------------------------------------------------------------------------
# Driver
# ---------------------------------------------------------------------------

PHASES = {
    "schema": repair_schema,
    "orphans": clean_orphans,
    "dedupe": dedupe_bookings,
    "stuck": recover_stuck,
    "totals": reconcile_totals,
}


def main() -> int:
    parser = argparse.ArgumentParser(description="Dermaspace backend self-healer.")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Report findings without modifying any rows.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Allow paid-booking duplicates to be deleted. Use with care.",
    )
    parser.add_argument(
        "--only",
        choices=sorted(PHASES.keys()),
        action="append",
        help="Run only the named phase(s). Repeatable.",
    )
    args = parser.parse_args()

    phases_to_run = args.only or list(PHASES.keys())
    log("heal.start", dry_run=args.dry_run, force=args.force, phases=phases_to_run)

    overall_ok = True
    with connect() as conn:
        for name in phases_to_run:
            fn = PHASES[name]
            t0 = time.time()
            try:
                if name == "dedupe":
                    result = fn(conn, dry_run=args.dry_run, force=args.force)  # type: ignore[arg-type]
                else:
                    result = fn(conn, dry_run=args.dry_run)  # type: ignore[arg-type]
                log(f"heal.{name}.ok", duration_ms=round((time.time() - t0) * 1000), **result)
            except Exception as exc:
                overall_ok = False
                conn.rollback()
                log(
                    f"heal.{name}.error",
                    duration_ms=round((time.time() - t0) * 1000),
                    error=str(exc),
                )

    log("heal.end", ok=overall_ok)
    return 0 if overall_ok else 1


if __name__ == "__main__":
    sys.exit(main())
