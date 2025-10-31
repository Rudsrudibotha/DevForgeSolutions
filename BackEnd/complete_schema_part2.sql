-----------------------------
-- Core Tenancy & Users
-----------------------------
CREATE TABLE IF NOT EXISTS schools (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text UNIQUE NOT NULL,
  name            text NOT NULL,
  logo_url        text,
  contact_email   text,
  contact_phone   text,
  address         text,
  active          boolean NOT NULL DEFAULT true,
  suspended_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schools_created_at ON schools(created_at DESC);

CREATE TABLE IF NOT EXISTS school_subscriptions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id            uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  plan                 text NOT NULL,
  status               text NOT NULL CHECK (status IN ('active','past_due','suspended','canceled')),
  current_period_start date NOT NULL,
  current_period_end   date NOT NULL,
  grace_until          date,
  last_invoice_id      text,
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_school_subscriptions_created_at ON school_subscriptions(school_id, created_at DESC);

CREATE TABLE IF NOT EXISTS users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email          citext UNIQUE NOT NULL,
  password_hash  text NOT NULL,
  full_name      text NOT NULL,
  phone          text,
  email_verified boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_valid CHECK (app.email_is_valid(email)),
  CONSTRAINT users_password_bcrypt CHECK (password_hash LIKE '$2%' AND length(password_hash) >= 20)
);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role') THEN
    CREATE TYPE role AS ENUM ('vendor_admin','school_admin','staff','parent','student');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS user_school_memberships (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id    uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  role         role NOT NULL,
  status       text NOT NULL CHECK (status IN ('pending','approved','rejected','revoked')),
  invited_by   uuid REFERENCES users(id),
  approved_by  uuid REFERENCES users(id),
  approved_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, school_id)
);
CREATE INDEX IF NOT EXISTS idx_usm_user_school_status ON user_school_memberships(user_id, school_id, status);
CREATE INDEX IF NOT EXISTS idx_usm_created_at ON user_school_memberships(school_id, created_at DESC);

-- Authentication attempts
CREATE TABLE IF NOT EXISTS auth_attempts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       citext NOT NULL,
  ip          inet,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  succeeded   boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_auth_attempts_email_time ON auth_attempts(email, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_attempts_ip_time    ON auth_attempts(ip, occurred_at DESC);

-- Refresh tokens
CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL CHECK (token_hash LIKE '$2%' AND length(token_hash) >= 20),
  expires_at timestamptz NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_art_user_exp ON auth_refresh_tokens(user_id, expires_at);

DROP TRIGGER IF EXISTS trg_schools_touch ON schools;
CREATE TRIGGER trg_schools_touch
BEFORE UPDATE ON schools
FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();