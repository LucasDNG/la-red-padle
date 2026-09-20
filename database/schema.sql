BEGIN;

CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,

  first_name VARCHAR(80)
    NOT NULL,

  last_name VARCHAR(80)
    NOT NULL,

  email VARCHAR(255)
    NOT NULL
    UNIQUE,

  phone VARCHAR(40)
    NOT NULL,

  password_hash TEXT
    NOT NULL,

  gender VARCHAR(10)
    NOT NULL
    CHECK (
      gender IN (
        'male',
        'female'
      )
    ),

  role VARCHAR(20)
    NOT NULL
    DEFAULT 'player'
    CHECK (
      role IN (
        'player',
        'admin'
      )
    ),

  current_category_number SMALLINT
    CHECK (
      current_category_number IS NULL
      OR
      current_category_number
      BETWEEN 1 AND 7
    ),

  created_at TIMESTAMPTZ
    NOT NULL
    DEFAULT now()
);

CREATE TABLE leagues (
  id BIGSERIAL PRIMARY KEY,

  slug VARCHAR(30)
    NOT NULL
    UNIQUE,

  name VARCHAR(100)
    NOT NULL,

  gender VARCHAR(10)
    NOT NULL
    CHECK (
      gender IN (
        'male',
        'female'
      )
    ),

  active BOOLEAN
    NOT NULL
    DEFAULT TRUE
);

CREATE TABLE categories (
  id BIGSERIAL PRIMARY KEY,

  league_id BIGINT
    NOT NULL
    REFERENCES leagues(id)
    ON DELETE CASCADE,

  number SMALLINT
    NOT NULL
    CHECK (
      number
      BETWEEN 1 AND 7
    ),

  name VARCHAR(20)
    NOT NULL,

  capacity INTEGER
    CHECK (
      capacity IS NULL
      OR
      capacity > 0
    ),

  direct_registration_open BOOLEAN
    NOT NULL
    DEFAULT TRUE,

  UNIQUE(
    league_id,
    number
  )
);

CREATE TABLE pairs (
  id BIGSERIAL PRIMARY KEY,

  league_id BIGINT
    NOT NULL
    REFERENCES leagues(id),

  category_id BIGINT
    NOT NULL
    REFERENCES categories(id),

  position INTEGER
    NOT NULL
    CHECK (
      position > 0
    ),

  elo INTEGER
    NOT NULL
    DEFAULT 1500,

  peak_elo INTEGER
    NOT NULL
    DEFAULT 1500,

  peak_elo_at TIMESTAMPTZ
    NOT NULL
    DEFAULT now(),

  status VARCHAR(20)
    NOT NULL
    DEFAULT 'active'
    CHECK (
      status IN (
        'active',
        'observed',
        'review',
        'inactive'
      )
    ),

  consecutive_wins INTEGER
    NOT NULL
    DEFAULT 0,

  consecutive_losses INTEGER
    NOT NULL
    DEFAULT 0,

  archived_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ
    NOT NULL
    DEFAULT now()
);

CREATE UNIQUE INDEX
  idx_pairs_active_category_position
ON pairs(
  category_id,
  position
)
WHERE status <> 'inactive';

CREATE TABLE pair_members (
  pair_id BIGINT
    NOT NULL
    REFERENCES pairs(id)
    ON DELETE CASCADE,

  user_id BIGINT
    NOT NULL
    REFERENCES users(id),

  PRIMARY KEY(
    pair_id,
    user_id
  )
);

CREATE TABLE challenges (
  id BIGSERIAL PRIMARY KEY,

  league_id BIGINT
    NOT NULL
    REFERENCES leagues(id),

  challenger_pair_id BIGINT
    NOT NULL
    REFERENCES pairs(id),

  challenged_pair_id BIGINT
    NOT NULL
    REFERENCES pairs(id),

  status VARCHAR(20)
    NOT NULL
    DEFAULT 'pending'
    CHECK (
      status IN (
        'pending',
        'accepted',
        'played',
        'expired',
        'cancelled'
      )
    ),

  historical_meetings_at_creation INTEGER
    NOT NULL
    DEFAULT 0,

  created_at TIMESTAMPTZ
    NOT NULL
    DEFAULT now(),

  accepted_at TIMESTAMPTZ,

  play_deadline_at TIMESTAMPTZ,

  expiry_penalty_applied_at
    TIMESTAMPTZ,

  CHECK (
    challenger_pair_id <>
    challenged_pair_id
  )
);

CREATE INDEX
  idx_challenge_wheel
ON challenges(
  challenged_pair_id,
  status,
  historical_meetings_at_creation,
  created_at,
  id
);

CREATE TABLE match_submissions (
  id BIGSERIAL PRIMARY KEY,

  challenge_id BIGINT
    NOT NULL
    REFERENCES challenges(id),

  league_id BIGINT
    NOT NULL
    REFERENCES leagues(id),

  pair_a_id BIGINT
    NOT NULL
    REFERENCES pairs(id),

  pair_b_id BIGINT
    NOT NULL
    REFERENCES pairs(id),

  submitted_by_pair_id BIGINT
    NOT NULL
    REFERENCES pairs(id),

  winner_pair_id BIGINT
    NOT NULL
    REFERENCES pairs(id),

  score JSONB,

  status VARCHAR(30)
    NOT NULL
    DEFAULT 'pending'
    CHECK (
      status IN (
        'pending',
        'confirmed',
        'disputed',
        'rejected'
      )
    ),

  response_note TEXT,

  responded_by_pair_id BIGINT
    REFERENCES pairs(id),

  responded_at TIMESTAMPTZ,

  play_deadline_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ
    NOT NULL
    DEFAULT now(),

  updated_at TIMESTAMPTZ
    NOT NULL
    DEFAULT now(),

  CHECK (
    pair_a_id <>
    pair_b_id
  ),

  CHECK (
    submitted_by_pair_id
    IN (
      pair_a_id,
      pair_b_id
    )
  ),

  CHECK (
    winner_pair_id
    IN (
      pair_a_id,
      pair_b_id
    )
  )
);

CREATE UNIQUE INDEX
  idx_match_submissions_active
ON match_submissions(
  challenge_id
)
WHERE
  status IN (
    'pending',
    'disputed'
  );

CREATE INDEX
  idx_match_submissions_pairs
ON match_submissions(
  pair_a_id,
  pair_b_id,
  status
);

CREATE TABLE matches (
  id BIGSERIAL PRIMARY KEY,

  challenge_id BIGINT
    NOT NULL
    UNIQUE
    REFERENCES challenges(id),

  league_id BIGINT
    NOT NULL
    REFERENCES leagues(id),

  pair_a_id BIGINT
    NOT NULL
    REFERENCES pairs(id),

  pair_b_id BIGINT
    NOT NULL
    REFERENCES pairs(id),

  winner_pair_id BIGINT
    NOT NULL
    REFERENCES pairs(id),

  score JSONB,

  status VARCHAR(20)
    NOT NULL
    DEFAULT 'confirmed'
    CHECK (
      status IN (
        'confirmed',
        'walkover'
      )
    ),

  played_at TIMESTAMPTZ
    NOT NULL
    DEFAULT now(),

  created_at TIMESTAMPTZ
    NOT NULL
    DEFAULT now(),

  CHECK (
    pair_a_id <>
    pair_b_id
  )
);

CREATE TABLE reports (
  id BIGSERIAL PRIMARY KEY,

  challenge_id BIGINT
    NOT NULL
    REFERENCES challenges(id),

  reporter_pair_id BIGINT
    NOT NULL
    REFERENCES pairs(id),

  reported_pair_id BIGINT
    NOT NULL
    REFERENCES pairs(id),

  reason VARCHAR(30)
    NOT NULL
    CHECK (
      reason IN (
        'coordination_refusal',
        'no_show',
        'other'
      )
    ),

  details TEXT,

  status VARCHAR(20)
    NOT NULL
    DEFAULT 'open'
    CHECK (
      status IN (
        'open',
        'reviewed',
        'dismissed'
      )
    ),

  created_at TIMESTAMPTZ
    NOT NULL
    DEFAULT now(),

  reviewed_at TIMESTAMPTZ,

  reviewed_by BIGINT
    REFERENCES users(id),

  CHECK (
    reporter_pair_id <>
    reported_pair_id
  ),

  CHECK (
    reason <> 'other'
    OR
    length(
      trim(details)
    ) > 0
  )
);

CREATE INDEX
  idx_reports_reported
ON reports(
  reported_pair_id,
  created_at DESC
);

CREATE TABLE elo_events (
  id BIGSERIAL PRIMARY KEY,

  pair_id BIGINT
    NOT NULL
    REFERENCES pairs(id),

  delta INTEGER
    NOT NULL,

  elo_before INTEGER
    NOT NULL,

  elo_after INTEGER
    NOT NULL,

  reason VARCHAR(40)
    NOT NULL,

  source_type VARCHAR(20)
    NOT NULL,

  source_id BIGINT
    NOT NULL,

  created_at TIMESTAMPTZ
    NOT NULL
    DEFAULT now(),

  UNIQUE(
    pair_id,
    source_type,
    source_id,
    reason
  )
);

CREATE TABLE category_movements (
  id BIGSERIAL PRIMARY KEY,

  pair_id BIGINT
    NOT NULL
    REFERENCES pairs(id),

  from_category_id BIGINT
    REFERENCES categories(id),

  to_category_id BIGINT
    NOT NULL
    REFERENCES categories(id),

  reason VARCHAR(30)
    NOT NULL,

  created_at TIMESTAMPTZ
    NOT NULL
    DEFAULT now()
);

CREATE TABLE elo_record_history (
  id BIGSERIAL PRIMARY KEY,

  pair_id BIGINT
    REFERENCES pairs(id)
    ON DELETE SET NULL,

  pair_name TEXT
    NOT NULL,

  elo INTEGER
    NOT NULL,

  achieved_at TIMESTAMPTZ
    NOT NULL,

  recorded_at TIMESTAMPTZ
    NOT NULL
    DEFAULT now()
);

CREATE INDEX
  idx_elo_record_history_elo
ON elo_record_history(
  elo DESC,
  achieved_at ASC,
  id ASC
);

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

CREATE TRIGGER trg_pairs_sync_category_change
AFTER UPDATE OF category_id
ON pairs
FOR EACH ROW
EXECUTE FUNCTION la_red_sync_pair_category_change();

INSERT INTO leagues(
  slug,
  name,
  gender
)
VALUES
  (
    'masculino',
    'LA RED Pádel Masculino',
    'male'
  ),
  (
    'femenino',
    'LA RED Pádel Femenino',
    'female'
  );

INSERT INTO categories(
  league_id,
  number,
  name,
  capacity,
  direct_registration_open
)
SELECT
  l.id,

  n,

  n || 'ª',

  CASE
    WHEN
      n <= 3
    THEN
      10

    WHEN
      n <= 6
    THEN
      30

    ELSE
      NULL
  END,

  TRUE

FROM leagues l

CROSS JOIN
  generate_series(
    1,
    7
  ) n;

COMMIT;
