BEGIN;

CREATE TABLE IF NOT EXISTS league_wheel_state(
  league_id bigint PRIMARY KEY REFERENCES leagues(id) ON DELETE CASCADE,
  formation_completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO league_wheel_state(league_id)
SELECT id FROM leagues
ON CONFLICT(league_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS pair_wheel_state(
  pair_id bigint PRIMARY KEY REFERENCES pairs(id) ON DELETE CASCADE,
  role varchar(8) CHECK(role IN('attack','defense')),
  role_streak int NOT NULL DEFAULT 0 CHECK(role_streak>=0),
  promotion_wins int NOT NULL DEFAULT 0 CHECK(promotion_wins>=0),
  awaiting_zone_first_match boolean NOT NULL DEFAULT false,
  inactive_since timestamptz,
  return_position_base int CHECK(return_position_base>0),
  inactive_reason varchar(20) CHECK(inactive_reason IN('voluntary','three_failures')),
  auto_reactivate_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK((role IS NULL AND role_streak=0) OR (role IS NOT NULL AND role_streak>=1)),
  CHECK(auto_reactivate_at IS NULL OR inactive_since IS NOT NULL),
  CHECK(inactive_since IS NOT NULL OR (return_position_base IS NULL AND inactive_reason IS NULL AND auto_reactivate_at IS NULL))
);

INSERT INTO pair_wheel_state(
  pair_id,
  inactive_since,
  return_position_base,
  inactive_reason
)
SELECT
  p.id,
  CASE
    WHEN p.competition_state='paused' THEN COALESCE(
      (
        SELECT max(COALESCE(pr.resolved_at,pr.created_at))
        FROM pair_pause_requests pr
        WHERE pr.pair_id=p.id
          AND pr.status IN('confirmed','applied')
      ),
      CURRENT_TIMESTAMP
    )
    ELSE NULL
  END,
  CASE WHEN p.competition_state='paused' THEN p.position ELSE NULL END,
  CASE WHEN p.competition_state='paused' THEN 'voluntary' ELSE NULL END
FROM pairs p
ON CONFLICT(pair_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS pair_duo_state(
  id bigserial PRIMARY KEY,
  league_id bigint NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  member_low_id bigint NOT NULL REFERENCES users(id),
  member_high_id bigint NOT NULL REFERENCES users(id),
  failure_streak int NOT NULL DEFAULT 0 CHECK(failure_streak>=0),
  penalty_until timestamptz,
  pending_relegation_category_id bigint,
  pending_relegation_losses int NOT NULL DEFAULT 0 CHECK(pending_relegation_losses>=0),
  pending_relegation_started_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK(member_low_id<member_high_id),
  CHECK(
    (pending_relegation_category_id IS NULL AND pending_relegation_losses=0 AND pending_relegation_started_at IS NULL)
    OR
    (pending_relegation_category_id IS NOT NULL AND pending_relegation_started_at IS NOT NULL)
  ),
  UNIQUE(league_id,member_low_id,member_high_id),
  FOREIGN KEY(pending_relegation_category_id,league_id) REFERENCES categories(id,league_id)
);

INSERT INTO pair_duo_state(league_id,member_low_id,member_high_id)
SELECT
  p.league_id,
  min(pm.user_id),
  max(pm.user_id)
FROM pairs p
JOIN pair_members pm ON pm.pair_id=p.id
GROUP BY p.id,p.league_id
HAVING count(*)=2
ON CONFLICT(league_id,member_low_id,member_high_id) DO NOTHING;


CREATE OR REPLACE FUNCTION ensure_pair_wheel_v3_state() RETURNS trigger LANGUAGE plpgsql AS $
BEGIN
  INSERT INTO pair_wheel_state(pair_id) VALUES(NEW.id)
  ON CONFLICT(pair_id) DO NOTHING;
  RETURN NEW;
END $;
DROP TRIGGER IF EXISTS trg_pair_wheel_v3_state ON pairs;
CREATE TRIGGER trg_pair_wheel_v3_state
AFTER INSERT ON pairs
FOR EACH ROW EXECUTE FUNCTION ensure_pair_wheel_v3_state();

CREATE OR REPLACE FUNCTION ensure_pair_duo_v3_state() RETURNS trigger LANGUAGE plpgsql AS $
DECLARE
  v_league_id bigint;
  v_low bigint;
  v_high bigint;
  v_count int;
BEGIN
  SELECT p.league_id,count(pm.user_id),min(pm.user_id),max(pm.user_id)
  INTO v_league_id,v_count,v_low,v_high
  FROM pairs p
  JOIN pair_members pm ON pm.pair_id=p.id
  WHERE p.id=NEW.pair_id
  GROUP BY p.league_id;
  IF v_count=2 THEN
    INSERT INTO pair_duo_state(league_id,member_low_id,member_high_id)
    VALUES(v_league_id,v_low,v_high)
    ON CONFLICT(league_id,member_low_id,member_high_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $;
DROP TRIGGER IF EXISTS trg_pair_duo_v3_state ON pair_members;
CREATE TRIGGER trg_pair_duo_v3_state
AFTER INSERT ON pair_members
FOR EACH ROW EXECUTE FUNCTION ensure_pair_duo_v3_state();

ALTER TABLE wheel_assignments
  ADD COLUMN IF NOT EXISTS attacker_pair_id bigint REFERENCES pairs(id),
  ADD COLUMN IF NOT EXISTS defender_pair_id bigint REFERENCES pairs(id),
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_result_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS(
    SELECT 1 FROM pg_constraint
    WHERE conname='wheel_assignments_v3_roles_consistency'
      AND conrelid='wheel_assignments'::regclass
  ) THEN
    ALTER TABLE wheel_assignments
      ADD CONSTRAINT wheel_assignments_v3_roles_consistency CHECK(
        (attacker_pair_id IS NULL AND defender_pair_id IS NULL)
        OR
        (
          attacker_pair_id IS NOT NULL
          AND defender_pair_id IS NOT NULL
          AND attacker_pair_id<>defender_pair_id
          AND attacker_pair_id IN(pair_a_id,pair_b_id)
          AND defender_pair_id IN(pair_a_id,pair_b_id)
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_assignments_v3_roles
  ON wheel_assignments(category_id,attacker_pair_id,defender_pair_id)
  WHERE status IN('open','result_pending','disputed');

CREATE TABLE IF NOT EXISTS first_place_reigns(
  id bigserial PRIMARY KEY,
  league_id bigint NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  pair_id bigint NOT NULL REFERENCES pairs(id),
  started_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at timestamptz,
  defenses int NOT NULL DEFAULT 0 CHECK(defenses>=0),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK(ended_at IS NULL OR ended_at>=started_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_first_place_open_reign
  ON first_place_reigns(league_id)
  WHERE ended_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_first_place_record
  ON first_place_reigns(league_id,defenses DESC,started_at);

COMMIT;
