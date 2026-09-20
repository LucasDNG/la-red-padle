ALTER TABLE users
ADD COLUMN IF NOT EXISTS current_category_number SMALLINT
CHECK (
  current_category_number IS NULL
  OR current_category_number BETWEEN 1 AND 7
);

ALTER TABLE pairs
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

ALTER TABLE pairs
ADD COLUMN IF NOT EXISTS peak_elo INTEGER
NOT NULL
DEFAULT 1500;

ALTER TABLE pairs
ADD COLUMN IF NOT EXISTS peak_elo_at TIMESTAMPTZ
NOT NULL
DEFAULT now();

UPDATE pairs
SET peak_elo = GREATEST(peak_elo, elo);

CREATE TABLE IF NOT EXISTS elo_record_history (
  id BIGSERIAL PRIMARY KEY,
  pair_id BIGINT
    REFERENCES pairs(id)
    ON DELETE SET NULL,
  pair_name TEXT NOT NULL,
  elo INTEGER NOT NULL,
  achieved_at TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_elo_record_history_elo
ON elo_record_history(
  elo DESC,
  achieved_at ASC,
  id ASC
);

ALTER TABLE pairs
DROP CONSTRAINT IF EXISTS pairs_category_id_position_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pairs_active_category_position
ON pairs(
  category_id,
  position
)
WHERE status <> 'inactive';

CREATE OR REPLACE FUNCTION la_red_keep_peak_elo()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.elo > COALESCE(OLD.peak_elo, OLD.elo) THEN
    NEW.peak_elo := NEW.elo;
    NEW.peak_elo_at := now();
  ELSE
    NEW.peak_elo := GREATEST(
      COALESCE(OLD.peak_elo, OLD.elo),
      NEW.elo
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pairs_keep_peak_elo
ON pairs;

CREATE TRIGGER trg_pairs_keep_peak_elo
BEFORE UPDATE OF elo
ON pairs
FOR EACH ROW
EXECUTE FUNCTION la_red_keep_peak_elo();

CREATE OR REPLACE FUNCTION la_red_sync_member_category()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  category_number SMALLINT;
BEGIN
  SELECT c.number
  INTO category_number
  FROM pairs p
  JOIN categories c
    ON c.id = p.category_id
  WHERE p.id = NEW.pair_id;

  IF category_number IS NOT NULL THEN
    UPDATE users
    SET current_category_number = category_number
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pair_members_sync_category
ON pair_members;

CREATE TRIGGER trg_pair_members_sync_category
AFTER INSERT
ON pair_members
FOR EACH ROW
EXECUTE FUNCTION la_red_sync_member_category();

CREATE OR REPLACE FUNCTION la_red_sync_pair_category_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  category_number SMALLINT;
BEGIN
  IF NEW.status <> 'inactive' THEN
    SELECT c.number
    INTO category_number
    FROM categories c
    WHERE c.id = NEW.category_id;

    UPDATE users u
    SET current_category_number = category_number
    WHERE u.id IN (
      SELECT pm.user_id
      FROM pair_members pm
      WHERE pm.pair_id = NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pairs_sync_category_change
ON pairs;

CREATE TRIGGER trg_pairs_sync_category_change
AFTER UPDATE OF category_id
ON pairs
FOR EACH ROW
EXECUTE FUNCTION la_red_sync_pair_category_change();

UPDATE users u
SET current_category_number = (
  SELECT c.number
  FROM pair_members pm
  JOIN pairs p
    ON p.id = pm.pair_id
  JOIN categories c
    ON c.id = p.category_id
  WHERE pm.user_id = u.id
  ORDER BY
    CASE
      WHEN p.status <> 'inactive' THEN 0
      ELSE 1
    END,
    p.id DESC
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1
  FROM pair_members pm
  WHERE pm.user_id = u.id
);
