UPDATE categories
SET capacity = NULL,
    direct_registration_open = TRUE;

ALTER TABLE pairs
ALTER COLUMN elo TYPE NUMERIC(14,6)
  USING elo::NUMERIC(14,6),
ALTER COLUMN peak_elo TYPE NUMERIC(14,6)
  USING peak_elo::NUMERIC(14,6),
ALTER COLUMN elo SET DEFAULT 0,
ALTER COLUMN peak_elo SET DEFAULT 0,
ADD COLUMN IF NOT EXISTS first_place_defenses INTEGER
  NOT NULL DEFAULT 0
  CHECK (first_place_defenses >= 0),
ADD COLUMN IF NOT EXISTS position_penalty_debt INTEGER
  NOT NULL DEFAULT 0
  CHECK (position_penalty_debt >= 0);

ALTER TABLE elo_events
ALTER COLUMN delta TYPE NUMERIC(14,6)
  USING delta::NUMERIC(14,6),
ALTER COLUMN elo_before TYPE NUMERIC(14,6)
  USING elo_before::NUMERIC(14,6),
ALTER COLUMN elo_after TYPE NUMERIC(14,6)
  USING elo_after::NUMERIC(14,6);

ALTER TABLE elo_record_history
ALTER COLUMN elo TYPE NUMERIC(14,6)
  USING elo::NUMERIC(14,6),
ADD COLUMN IF NOT EXISTS category_number SMALLINT,
ADD COLUMN IF NOT EXISTS league_slug VARCHAR(30),
ADD COLUMN IF NOT EXISTS defenses INTEGER
  NOT NULL DEFAULT 0;

ALTER TABLE challenges
ADD COLUMN IF NOT EXISTS response_deadline_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS response_penalty_applied_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS resolution_penalty_applied_at TIMESTAMPTZ;

UPDATE challenges
SET response_deadline_at = now() + interval '30 days'
WHERE status = 'pending'
  AND response_deadline_at IS NULL;

UPDATE challenges
SET play_deadline_at = now() + interval '90 days',
    expiry_penalty_applied_at = COALESCE(
      expiry_penalty_applied_at,
      now()
    )
WHERE status = 'accepted'
  AND accepted_at IS NOT NULL;

UPDATE match_submissions
SET play_deadline_at = now() + interval '90 days'
WHERE status IN ('pending', 'disputed');

UPDATE pairs p
SET elo = 0
WHERE p.status <> 'inactive'
  AND NOT EXISTS (
    SELECT 1
    FROM matches m
    WHERE m.pair_a_id = p.id
       OR m.pair_b_id = p.id
  );

UPDATE pairs p
SET peak_elo = 0,
    peak_elo_at = p.created_at
WHERE p.status <> 'inactive'
  AND p.peak_elo <= 1500
  AND NOT EXISTS (
    SELECT 1
    FROM matches m
    WHERE m.pair_a_id = p.id
       OR m.pair_b_id = p.id
  );

UPDATE elo_record_history erh
SET category_number = c.number,
    league_slug = l.slug
FROM pairs p
JOIN categories c
  ON c.id = p.category_id
JOIN leagues l
  ON l.id = p.league_id
WHERE erh.pair_id = p.id
  AND (
    erh.category_number IS NULL
    OR erh.league_slug IS NULL
  );

CREATE INDEX IF NOT EXISTS idx_challenges_response_deadline
ON challenges(status, response_deadline_at)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_challenges_play_deadline
ON challenges(status, play_deadline_at)
WHERE status = 'accepted';

CREATE INDEX IF NOT EXISTS idx_elo_record_history_first
ON elo_record_history(
  category_number,
  elo DESC,
  achieved_at ASC,
  id ASC
);

CREATE OR REPLACE FUNCTION la_red_fill_record_context()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.pair_id IS NOT NULL THEN
    SELECT
      COALESCE(NEW.category_number, c.number),
      COALESCE(NEW.league_slug, l.slug),
      CASE
        WHEN NEW.defenses IS NULL OR NEW.defenses = 0
        THEN p.first_place_defenses
        ELSE NEW.defenses
      END
    INTO
      NEW.category_number,
      NEW.league_slug,
      NEW.defenses
    FROM pairs p
    JOIN categories c
      ON c.id = p.category_id
    JOIN leagues l
      ON l.id = p.league_id
    WHERE p.id = NEW.pair_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_elo_record_context
ON elo_record_history;

CREATE TRIGGER trg_elo_record_context
BEFORE INSERT
ON elo_record_history
FOR EACH ROW
EXECUTE FUNCTION la_red_fill_record_context();
