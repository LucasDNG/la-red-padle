BEGIN;

CREATE TABLE app_settings(
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO app_settings(key,value) VALUES
 ('engine','"wheel-v2"'::jsonb),
 ('timezone','"America/Argentina/Buenos_Aires"'::jsonb),
 ('league_clock_paused','false'::jsonb),
 ('league_clock_pause_started_at','null'::jsonb);

CREATE TABLE users(
  id bigserial PRIMARY KEY,
  first_name varchar(80) NOT NULL,
  last_name varchar(80) NOT NULL,
  dni varchar(9) NOT NULL UNIQUE CHECK (dni ~ '^[0-9]{7,9}$'),
  phone varchar(30) NOT NULL,
  password_hash text NOT NULL,
  gender varchar(10) NOT NULL CHECK(gender IN('male','female')),
  role varchar(12) NOT NULL DEFAULT 'player' CHECK(role IN('player','admin')),
  verification_status varchar(20) NOT NULL DEFAULT 'pending' CHECK(verification_status IN('pending','verified','rejected')),
  verified_at timestamptz,
  identity_resubmit_reason text,
  identity_resubmit_requested_at timestamptz,
  current_category_number int CHECK(current_category_number BETWEEN 1 AND 7),
  discipline_state varchar(12) NOT NULL DEFAULT 'clear' CHECK(discipline_state IN('clear','observed','review')),
  discipline_resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_name ON users(lower(last_name),lower(first_name));

CREATE TABLE identity_documents(
  user_id bigint PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  front_mime varchar(40) NOT NULL CHECK(front_mime IN('image/jpeg','image/png','image/webp')),
  front_data bytea NOT NULL,
  back_mime varchar(40) NOT NULL CHECK(back_mime IN('image/jpeg','image/png','image/webp')),
  back_data bytea NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE legal_acceptances(
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type varchar(50) NOT NULL,
  document_version varchar(80) NOT NULL,
  ip_address inet,
  user_agent text,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,document_type,document_version)
);

CREATE TABLE password_recovery_codes(
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE phone_change_codes(
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  new_phone varchar(30) NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE security_events(
  id bigserial PRIMARY KEY,
  user_id bigint REFERENCES users(id),
  event_type varchar(60) NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE leagues(
  id bigserial PRIMARY KEY,
  slug varchar(20) NOT NULL UNIQUE,
  name varchar(80) NOT NULL,
  gender varchar(10) NOT NULL CHECK(gender IN('male','female')),
  active boolean NOT NULL DEFAULT true
);
INSERT INTO leagues(slug,name,gender) VALUES
 ('masculino','LA RED Masculina','male'),
 ('femenino','LA RED Femenina','female');

CREATE TABLE categories(
  id bigserial PRIMARY KEY,
  league_id bigint NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  number int NOT NULL CHECK(number BETWEEN 1 AND 7),
  name varchar(30) NOT NULL,
  UNIQUE(league_id,number),
  UNIQUE(id,league_id)
);
INSERT INTO categories(league_id,number,name)
SELECT l.id,n,n||'ª' FROM leagues l CROSS JOIN generate_series(1,7) n;

CREATE TABLE pairs(
  id bigserial PRIMARY KEY,
  league_id bigint NOT NULL REFERENCES leagues(id),
  category_id bigint NOT NULL REFERENCES categories(id),
  position int NOT NULL CHECK(position>0),
  competition_state varchar(12) NOT NULL DEFAULT 'active' CHECK(competition_state IN('active','paused','inactive')),
  discipline_state varchar(12) NOT NULL DEFAULT 'clear' CHECK(discipline_state IN('clear','observed','review')),
  discipline_resolved_at timestamptz,
  position_debt int NOT NULL DEFAULT 0 CHECK(position_debt>=0),
  consecutive_wins int NOT NULL DEFAULT 0 CHECK(consecutive_wins>=0),
  consecutive_losses int NOT NULL DEFAULT 0 CHECK(consecutive_losses>=0),
  monthly_miss_streak int NOT NULL DEFAULT 0 CHECK(monthly_miss_streak>=0),
  pause_after_current boolean NOT NULL DEFAULT false,
  waiting_since timestamptz,
  elo numeric(12,2) NOT NULL DEFAULT 0,
  peak_elo numeric(12,2) NOT NULL DEFAULT 0,
  peak_elo_at timestamptz,
  first_place_defenses int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(category_id,league_id) REFERENCES categories(id,league_id)
);
CREATE UNIQUE INDEX uq_pair_position_live ON pairs(category_id,position) WHERE competition_state<>'inactive';
CREATE INDEX idx_pairs_wheel ON pairs(category_id,competition_state,discipline_state,waiting_since);

CREATE TABLE pair_members(
  pair_id bigint NOT NULL REFERENCES pairs(id) ON DELETE CASCADE,
  user_id bigint NOT NULL REFERENCES users(id),
  PRIMARY KEY(pair_id,user_id)
);
CREATE TABLE active_pair_memberships(
  user_id bigint PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  pair_id bigint NOT NULL REFERENCES pairs(id) ON DELETE CASCADE
);

CREATE TABLE pair_invitations(
  id bigserial PRIMARY KEY,
  inviter_user_id bigint NOT NULL REFERENCES users(id),
  invitee_user_id bigint NOT NULL REFERENCES users(id),
  requested_category_number int CHECK(requested_category_number BETWEEN 1 AND 7),
  resulting_category_number int NOT NULL CHECK(resulting_category_number BETWEEN 1 AND 7),
  status varchar(14) NOT NULL DEFAULT 'pending' CHECK(status IN('pending','accepted','cancelled','expired','invalidated')),
  expires_at timestamptz NOT NULL DEFAULT (now()+interval '10 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CHECK(inviter_user_id<>invitee_user_id)
);
CREATE UNIQUE INDEX uq_pair_invitation_outgoing ON pair_invitations(inviter_user_id) WHERE status='pending';
CREATE INDEX idx_pair_invitation_incoming ON pair_invitations(invitee_user_id,status);

CREATE TABLE pair_pause_requests(
  id bigserial PRIMARY KEY,
  pair_id bigint NOT NULL REFERENCES pairs(id),
  requested_by_user_id bigint NOT NULL REFERENCES users(id),
  status varchar(12) NOT NULL DEFAULT 'pending' CHECK(status IN('pending','confirmed','cancelled','applied')),
  effective_after_current boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE UNIQUE INDEX uq_pause_pending ON pair_pause_requests(pair_id) WHERE status='pending';

CREATE TABLE pair_dissolution_requests(
  id bigserial PRIMARY KEY,
  pair_id bigint NOT NULL REFERENCES pairs(id),
  requested_by_user_id bigint NOT NULL REFERENCES users(id),
  status varchar(18) NOT NULL DEFAULT 'pending' CHECK(status IN('pending','confirmed','awaiting_result','cancelled','applied')),
  deadline_at timestamptz NOT NULL DEFAULT (now()+interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE UNIQUE INDEX uq_dissolution_live ON pair_dissolution_requests(pair_id) WHERE status IN('pending','confirmed','awaiting_result');

CREATE TABLE venues(
  id bigserial PRIMARY KEY,
  name varchar(120) NOT NULL,
  address text,
  active boolean NOT NULL DEFAULT true,
  associated boolean NOT NULL DEFAULT false,
  booking_enabled boolean NOT NULL DEFAULT false,
  booking_url text,
  instagram text,
  sort_order int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE wheel_assignments(
  id bigserial PRIMARY KEY,
  league_id bigint NOT NULL REFERENCES leagues(id),
  category_id bigint NOT NULL REFERENCES categories(id),
  pair_a_id bigint NOT NULL REFERENCES pairs(id),
  pair_b_id bigint NOT NULL REFERENCES pairs(id),
  status varchar(20) NOT NULL DEFAULT 'open' CHECK(status IN('open','result_pending','disputed','confirmed','void','expired','cancelled')),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  deadline_at timestamptz NOT NULL DEFAULT (now()+interval '30 days'),
  extraordinary_used boolean NOT NULL DEFAULT false,
  extraordinary_deadline_at timestamptz,
  scheduled_at timestamptz,
  location_text varchar(160),
  venue_id bigint REFERENCES venues(id),
  schedule_confirmed_at timestamptz,
  confirmation_deadline_at timestamptz,
  closed_at timestamptz,
  close_reason varchar(80),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(pair_a_id<>pair_b_id),
  CHECK(schedule_confirmed_at IS NULL OR (location_text IS NOT NULL AND length(trim(location_text)) BETWEEN 2 AND 160))
);
CREATE TABLE wheel_assignment_participants(
  assignment_id bigint NOT NULL REFERENCES wheel_assignments(id) ON DELETE CASCADE,
  pair_id bigint NOT NULL REFERENCES pairs(id),
  PRIMARY KEY(assignment_id,pair_id),
  UNIQUE(pair_id)
);
CREATE INDEX idx_assignments_open ON wheel_assignments(status,deadline_at);

CREATE TABLE wheel_schedule_proposals(
  id bigserial PRIMARY KEY,
  assignment_id bigint NOT NULL REFERENCES wheel_assignments(id) ON DELETE CASCADE,
  proposed_by_pair_id bigint NOT NULL REFERENCES pairs(id),
  scheduled_at timestamptz NOT NULL,
  location_text varchar(160) NOT NULL CHECK(length(trim(location_text)) BETWEEN 2 AND 160),
  venue_id bigint REFERENCES venues(id),
  status varchar(12) NOT NULL DEFAULT 'pending' CHECK(status IN('pending','accepted','replaced','expired','cancelled')),
  response_deadline_at timestamptz NOT NULL DEFAULT (now()+interval '48 hours'),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz
);
CREATE UNIQUE INDEX uq_schedule_pending ON wheel_schedule_proposals(assignment_id) WHERE status='pending';

CREATE TABLE wheel_extension_votes(
  assignment_id bigint NOT NULL REFERENCES wheel_assignments(id) ON DELETE CASCADE,
  pair_id bigint NOT NULL REFERENCES pairs(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(assignment_id,pair_id)
);

CREATE TABLE wheel_no_shows(
  id bigserial PRIMARY KEY,
  assignment_id bigint NOT NULL UNIQUE REFERENCES wheel_assignments(id) ON DELETE CASCADE,
  reported_by_pair_id bigint NOT NULL REFERENCES pairs(id),
  reported_pair_id bigint NOT NULL REFERENCES pairs(id),
  status varchar(12) NOT NULL DEFAULT 'pending' CHECK(status IN('pending','accepted','contested','resolved')),
  response_deadline_at timestamptz NOT NULL DEFAULT (now()+interval '48 hours'),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CHECK(reported_by_pair_id<>reported_pair_id)
);

CREATE TABLE wheel_result_versions(
  id bigserial PRIMARY KEY,
  assignment_id bigint NOT NULL REFERENCES wheel_assignments(id) ON DELETE CASCADE,
  pair_id bigint NOT NULL REFERENCES pairs(id),
  winner_pair_id bigint NOT NULL REFERENCES pairs(id),
  result_type varchar(30) NOT NULL CHECK(result_type IN('normal','injury_abandonment','dissolution_forfeit')),
  played_at timestamptz NOT NULL,
  score jsonb,
  abandoned_pair_id bigint REFERENCES pairs(id),
  version_no int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(assignment_id,pair_id)
);

CREATE TABLE matches(
  id bigserial PRIMARY KEY,
  assignment_id bigint UNIQUE REFERENCES wheel_assignments(id),
  league_id bigint NOT NULL REFERENCES leagues(id),
  category_number int NOT NULL CHECK(category_number BETWEEN 1 AND 7),
  pair_a_id bigint NOT NULL REFERENCES pairs(id),
  pair_b_id bigint NOT NULL REFERENCES pairs(id),
  winner_pair_id bigint NOT NULL REFERENCES pairs(id),
  result_type varchar(30) NOT NULL CHECK(result_type IN('normal','injury_abandonment','dissolution_forfeit')),
  score jsonb,
  abandoned_pair_id bigint REFERENCES pairs(id),
  pair_a_games int NOT NULL DEFAULT 0,
  pair_b_games int NOT NULL DEFAULT 0,
  played_at timestamptz NOT NULL,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  resolution_source varchar(40) NOT NULL,
  CHECK(pair_a_id<>pair_b_id),
  CHECK(winner_pair_id IN(pair_a_id,pair_b_id)),
  CONSTRAINT matches_abandonment_consistency CHECK(
    (result_type='injury_abandonment' AND abandoned_pair_id IS NOT NULL AND abandoned_pair_id IN(pair_a_id,pair_b_id) AND abandoned_pair_id<>winner_pair_id)
    OR
    (result_type<>'injury_abandonment' AND abandoned_pair_id IS NULL)
  )
);
CREATE INDEX idx_matches_pair_a ON matches(pair_a_id,played_at DESC);
CREATE INDEX idx_matches_pair_b ON matches(pair_b_id,played_at DESC);

CREATE TABLE elo_record_history(
  id bigserial PRIMARY KEY,
  league_id bigint NOT NULL REFERENCES leagues(id),
  pair_id bigint NOT NULL REFERENCES pairs(id),
  pair_name text NOT NULL,
  elo numeric(12,2) NOT NULL,
  defenses int NOT NULL,
  achieved_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_record_league ON elo_record_history(league_id,elo DESC,achieved_at);

CREATE TABLE discipline_reports(
  id bigserial PRIMARY KEY,
  assignment_id bigint NOT NULL REFERENCES wheel_assignments(id),
  reporter_pair_id bigint NOT NULL REFERENCES pairs(id),
  reported_pair_id bigint REFERENCES pairs(id),
  reported_user_id bigint REFERENCES users(id),
  reason varchar(30) NOT NULL CHECK(reason IN('misconduct','violence','threats','coordination_refusal','no_show','other')),
  details text,
  status varchar(12) NOT NULL DEFAULT 'open' CHECK(status IN('open','reviewed','dismissed','resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by_user_id bigint REFERENCES users(id),
  CHECK((reported_pair_id IS NOT NULL)::int+(reported_user_id IS NOT NULL)::int=1),
  CHECK(reason<>'other' OR (details IS NOT NULL AND length(trim(details))>0))
);
CREATE UNIQUE INDEX uq_report_pair_once ON discipline_reports(assignment_id,reporter_pair_id,reported_pair_id) WHERE reported_pair_id IS NOT NULL;
CREATE UNIQUE INDEX uq_report_user_once ON discipline_reports(assignment_id,reporter_pair_id,reported_user_id) WHERE reported_user_id IS NOT NULL;
CREATE INDEX idx_reports_pair ON discipline_reports(reported_pair_id,created_at DESC);
CREATE INDEX idx_reports_user ON discipline_reports(reported_user_id,created_at DESC);

CREATE TABLE competitive_events(
  id bigserial PRIMARY KEY,
  source_key text NOT NULL UNIQUE,
  event_type varchar(60) NOT NULL,
  pair_id bigint REFERENCES pairs(id),
  user_id bigint REFERENCES users(id),
  assignment_id bigint REFERENCES wheel_assignments(id),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_events_pair ON competitive_events(pair_id,created_at DESC);

CREATE TABLE notifications(
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type varchar(60) NOT NULL,
  title varchar(160) NOT NULL,
  body text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key text NOT NULL UNIQUE,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON notifications(user_id,created_at DESC);
CREATE TABLE notification_outbox(
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel varchar(20) NOT NULL CHECK(channel IN('whatsapp','push','email')),
  type varchar(60) NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key text NOT NULL UNIQUE,
  status varchar(12) NOT NULL DEFAULT 'pending' CHECK(status IN('pending','sent','failed')),
  attempts int NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION enforce_active_membership() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pair_members pm WHERE pm.pair_id=NEW.pair_id AND pm.user_id=NEW.user_id) THEN
    RAISE EXCEPTION 'active membership requires pair membership';
  END IF;
  IF EXISTS(SELECT 1 FROM pairs p WHERE p.id=NEW.pair_id AND p.competition_state='inactive') THEN
    RAISE EXCEPTION 'inactive pair cannot have active membership';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_active_membership BEFORE INSERT OR UPDATE ON active_pair_memberships FOR EACH ROW EXECUTE FUNCTION enforce_active_membership();

CREATE TABLE admin_audit_events(
  id bigserial PRIMARY KEY,
  admin_user_id bigint NOT NULL REFERENCES users(id),
  action varchar(80) NOT NULL,
  target_type varchar(40) NOT NULL,
  target_id bigint,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
