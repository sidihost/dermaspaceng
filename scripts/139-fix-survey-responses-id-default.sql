-- Fix survey_responses.id missing default
--
-- The /api/surveys endpoint started failing on submit with:
--   null value in column "id" of relation "survey_responses"
--   violates not-null constraint
--
-- The original 027 migration declared the column as `id SERIAL`, but the
-- live `survey_responses` table on this environment was rebuilt at some
-- point with `id VARCHAR` (NOT NULL, no default). That mismatch means
-- every INSERT that doesn't explicitly supply an id fails the NOT NULL
-- check. We can't change the type back to SERIAL without breaking any
-- existing rows that already store text ids, so the right fix is to
-- give the column a sensible text default — a v4 UUID rendered as
-- text — and keep the rest of the schema untouched.
--
-- pgcrypto provides gen_random_uuid() on every modern Neon project; the
-- IF NOT EXISTS / DO blocks below keep this script idempotent.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_type text;
BEGIN
  SELECT data_type INTO v_type
  FROM information_schema.columns
  WHERE table_name = 'survey_responses' AND column_name = 'id';

  IF v_type IS NULL THEN
    RAISE NOTICE 'survey_responses.id not found, skipping';
  ELSIF v_type IN ('character varying', 'text', 'uuid') THEN
    -- Text-shaped id column: attach a UUID default so anonymous inserts
    -- through /api/surveys generate their own primary key.
    EXECUTE 'ALTER TABLE survey_responses
               ALTER COLUMN id SET DEFAULT gen_random_uuid()::text';
  ELSIF v_type IN ('integer', 'bigint', 'smallint') THEN
    -- Integer-shaped id column: re-attach the SERIAL sequence as a
    -- default. Handles environments that ran the original 027 migration
    -- and later had the default dropped without the sequence being torn
    -- down.
    EXECUTE 'CREATE SEQUENCE IF NOT EXISTS survey_responses_id_seq';
    EXECUTE 'ALTER SEQUENCE survey_responses_id_seq OWNED BY survey_responses.id';
    EXECUTE 'ALTER TABLE survey_responses
               ALTER COLUMN id SET DEFAULT nextval(''survey_responses_id_seq''::regclass)';
    PERFORM setval(
      'survey_responses_id_seq',
      GREATEST((SELECT COALESCE(MAX(id::bigint), 0) FROM survey_responses), 1),
      true
    );
  END IF;
END $$;
