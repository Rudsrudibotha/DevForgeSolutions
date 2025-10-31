-- COMPLETE DEVFORGESOLUTIONS SCHEMA FOR SUPABASE
-- Copy and paste this entire script into Supabase SQL Editor

-- Extensions & helper schema
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE SCHEMA IF NOT EXISTS app;

-- Helper functions
CREATE OR REPLACE FUNCTION app.current_school_id() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT current_setting('app.school_id', true)::uuid $$;
CREATE OR REPLACE FUNCTION app.set_school(p_school uuid) RETURNS void LANGUAGE plpgsql AS $$ BEGIN PERFORM set_config('app.school_id', p_school::text, true); END$$;
CREATE OR REPLACE FUNCTION app.touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at := now(); RETURN NEW; END$$;
CREATE OR REPLACE FUNCTION app.email_is_valid(p text) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$ SELECT p ~ '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$' $$;
CREATE OR REPLACE FUNCTION app.bcrypt(p text) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT crypt(p, gen_salt('bf')) $$;

-- Core tables
CREATE TABLE IF NOT EXISTS schools (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text UNIQUE NOT NULL, name text NOT NULL, logo_url text, contact_email text, contact_phone text, address text, active boolean NOT NULL DEFAULT true, suspended_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email citext UNIQUE NOT NULL, password_hash text NOT NULL, full_name text NOT NULL, phone text, email_verified boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT users_email_valid CHECK (app.email_is_valid(email)), CONSTRAINT users_password_bcrypt CHECK (password_hash LIKE '$2%' AND length(password_hash) >= 20));

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role') THEN CREATE TYPE role AS ENUM ('vendor_admin','school_admin','staff','parent','student'); END IF; END$$;

CREATE TABLE IF NOT EXISTS user_school_memberships (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE, role role NOT NULL, status text NOT NULL CHECK (status IN ('pending','approved','rejected','revoked')), invited_by uuid REFERENCES users(id), approved_by uuid REFERENCES users(id), approved_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (user_id, school_id));

CREATE TABLE IF NOT EXISTS auth_refresh_tokens (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, token_hash text NOT NULL CHECK (token_hash LIKE '$2%' AND length(token_hash) >= 20), expires_at timestamptz NOT NULL, meta jsonb NOT NULL DEFAULT '{}');

CREATE TABLE IF NOT EXISTS students (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE, student_no text NOT NULL, first_name text NOT NULL, last_name text NOT NULL, grade text, class_group text, status text NOT NULL DEFAULT 'active', deleted_at timestamptz, CONSTRAINT students_student_no_nonempty CHECK (length(student_no) > 0));

CREATE TABLE IF NOT EXISTS guardians (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, relationship text, UNIQUE (school_id, user_id));

CREATE TABLE IF NOT EXISTS student_guardians (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE, student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE, guardian_id uuid NOT NULL REFERENCES guardians(id) ON DELETE CASCADE, UNIQUE (school_id, student_id, guardian_id));

CREATE TABLE IF NOT EXISTS staff (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, title text, deleted_at timestamptz, UNIQUE (school_id, user_id));

CREATE TABLE IF NOT EXISTS classes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE, code text NOT NULL, name text NOT NULL, term text, deleted_at timestamptz);

CREATE TABLE IF NOT EXISTS student_attendance (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE, student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE, class_id uuid REFERENCES classes(id) ON DELETE SET NULL, date date NOT NULL, check_in timestamptz, check_out timestamptz, method text, late_minutes int DEFAULT 0, notes text, UNIQUE (school_id, student_id, date), CONSTRAINT attn_time_valid CHECK (check_in IS NULL OR check_out IS NULL OR check_out > check_in));

CREATE TABLE IF NOT EXISTS invoices (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE, student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE, issue_date date NOT NULL, due_date date NOT NULL, status text NOT NULL CHECK (status IN ('open','partial','paid','void')), total_cents int NOT NULL DEFAULT 0 CHECK (total_cents >= 0), balance_cents int NOT NULL DEFAULT 0 CHECK (balance_cents >= 0), CONSTRAINT inv_date_range CHECK (due_date >= issue_date));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_attendance_school_date ON student_attendance(school_id, date);
CREATE UNIQUE INDEX IF NOT EXISTS u_students_school_studentno_active ON students(school_id, student_no) WHERE deleted_at IS NULL;

-- Triggers
DROP TRIGGER IF EXISTS trg_schools_touch ON schools;
CREATE TRIGGER trg_schools_touch BEFORE UPDATE ON schools FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

-- Views
CREATE OR REPLACE VIEW vw_attendance_month AS SELECT s.school_id, date_trunc('month', a.date)::date AS month, count(*) FILTER (WHERE a.check_in IS NOT NULL) AS present_days, count(*) AS total_days, round(100.0 * count(*) FILTER (WHERE a.check_in IS NOT NULL) / NULLIF(count(*),0), 2) AS attendance_pct FROM student_attendance a JOIN students s ON s.id=a.student_id GROUP BY 1,2;

-- RLS Policies
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_school_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (customize as needed)
CREATE POLICY p_schools ON schools USING (id = app.current_school_id());
CREATE POLICY p_students ON students USING (school_id = app.current_school_id() AND deleted_at IS NULL);
CREATE POLICY p_attendance ON student_attendance USING (school_id = app.current_school_id());
CREATE POLICY p_invoices ON invoices USING (school_id = app.current_school_id());