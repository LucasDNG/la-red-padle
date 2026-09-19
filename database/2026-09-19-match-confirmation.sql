BEGIN;

CREATE TABLE IF NOT EXISTS match_submissions (
  id BIGSERIAL PRIMARY KEY,

  challenge_id BIGINT NOT NULL
    REFERENCES challenges(id),

  league_id BIGINT NOT NULL
    REFERENCES leagues(id),

  pair_a_id BIGINT NOT NULL
    REFERENCES pairs(id),

  pair_b_id BIGINT NOT NULL
    REFERENCES pairs(id),

  submitted_by_pair_id BIGINT NOT NULL
    REFERENCES pairs(id),

  winner_pair_id BIGINT NOT NULL
    REFERENCES pairs(id),

  score JSONB,

  status VARCHAR(30) NOT NULL
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

  created_at TIMESTAMPTZ NOT NULL
    DEFAULT now(),

  updated_at TIMESTAMPTZ NOT NULL
    DEFAULT now(),

  CHECK (pair_a_id <> pair_b_id),

  CHECK (
    submitted_by_pair_id IN (
      pair_a_id,
      pair_b_id
    )
  ),

  CHECK (
    winner_pair_id IN (
      pair_a_id,
      pair_b_id
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS
  idx_match_submissions_active
ON match_submissions(challenge_id)
WHERE status IN (
  'pending',
  'disputed'
);

CREATE INDEX IF NOT EXISTS
  idx_match_submissions_pairs
ON match_submissions(
  pair_a_id,
  pair_b_id,
  status
);

COMMIT;