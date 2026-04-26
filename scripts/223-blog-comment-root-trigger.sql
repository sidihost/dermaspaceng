-- ---------------------------------------------------------------------------
-- 223-blog-comment-root-trigger.sql
--
-- Bug fix on top of 222: the `root_id` column on `blog_comments` was
-- declared NOT NULL, but the application's INSERT writes NULL and
-- relies on a same-statement CTE UPDATE to backfill the value to the
-- new row's own id. PostgreSQL evaluates NOT NULL during the INSERT,
-- before the dependent CTE runs, so every new comment errored with:
--
--   null value in column "root_id" of relation "blog_comments"
--   violates not-null constraint
--
-- Fix: a BEFORE INSERT trigger that fills `root_id` automatically:
--   * Top-level comment (no parent_id) → root_id := the row's own id.
--   * Reply (parent_id set)            → root_id := parent's root_id,
--                                        falling back to parent_id if
--                                        the parent row pre-dates the
--                                        222 migration.
--
-- BEFORE INSERT triggers run before NOT NULL is enforced, so we can
-- keep the constraint AND keep the application SQL untouched. Every
-- statement is idempotent (`CREATE OR REPLACE`, `DROP TRIGGER IF
-- EXISTS`) so re-running the file is a no-op.
-- ---------------------------------------------------------------------------

BEGIN;

CREATE OR REPLACE FUNCTION blog_comments_set_root_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Caller already supplied root_id (e.g. via a future bulk-import
  -- script) — respect it.
  IF NEW.root_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.parent_id IS NULL THEN
    -- Top-level comment: this row IS its own root.
    NEW.root_id := NEW.id;
  ELSE
    -- Reply: inherit the parent's root chain. We coalesce so a reply
    -- to a legacy comment whose `root_id` is unexpectedly null still
    -- gets a usable value (the parent's id) rather than failing.
    SELECT COALESCE(parent.root_id, parent.id)
      INTO NEW.root_id
      FROM blog_comments AS parent
     WHERE parent.id = NEW.parent_id;

    -- Defensive: if the SELECT found nothing (shouldn't happen — the
    -- FK on parent_id would have rejected the insert by now), pin
    -- root_id to parent_id so NOT NULL is satisfied.
    IF NEW.root_id IS NULL THEN
      NEW.root_id := NEW.parent_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS blog_comments_set_root_id_tg ON blog_comments;
CREATE TRIGGER blog_comments_set_root_id_tg
  BEFORE INSERT ON blog_comments
  FOR EACH ROW EXECUTE FUNCTION blog_comments_set_root_id();

COMMIT;
