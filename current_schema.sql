-- Current Database Schema

-- auth_attempts
CREATE TABLE auth_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip inet NULL,
  occurred_at timestamp with time zone NOT NULL DEFAULT now(),
  succeeded boolean NOT NULL DEFAULT false
);

-- auth_refresh_tokens
CREATE TABLE auth_refresh_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token_hash text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- class_staff
CREATE TABLE class_staff (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  class_id uuid NOT NULL,
  staff_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'teacher'::text
);

-- classes
CREATE TABLE classes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  term text NULL,
  deleted_at timestamp with time zone NULL
);

-- enrollments
CREATE TABLE enrollments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  class_id uuid NOT NULL,
  student_id uuid NOT NULL
);

-- guardians
CREATE TABLE guardians (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  user_id uuid NOT NULL,
  relationship text NULL
);

-- invoices
CREATE TABLE invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  student_id uuid NOT NULL,
  issue_date date NOT NULL,
  due_date date NOT NULL,
  status text NOT NULL,
  total_cents integer NOT NULL DEFAULT 0,
  balance_cents integer NOT NULL DEFAULT 0
);

-- school_subscriptions
CREATE TABLE school_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  plan text NOT NULL,
  status text NOT NULL,
  current_period_start date NOT NULL,
  current_period_end date NOT NULL,
  grace_until date NULL,
  last_invoice_id text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- schools
CREATE TABLE schools (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  name text NOT NULL,
  logo_url text NULL,
  contact_email text NULL,
  contact_phone text NULL,
  address text NULL,
  active boolean NOT NULL DEFAULT true,
  suspended_at timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- staff
CREATE TABLE staff (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  user_id uuid NOT NULL,
  title text NULL,
  deleted_at timestamp with time zone NULL
);

-- student_attendance
CREATE TABLE student_attendance (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  student_id uuid NOT NULL,
  class_id uuid NULL,
  date date NOT NULL,
  check_in timestamp with time zone NULL,
  check_out timestamp with time zone NULL,
  method text NULL,
  late_minutes integer NULL DEFAULT 0,
  notes text NULL
);

-- student_guardians
CREATE TABLE student_guardians (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  student_id uuid NOT NULL,
  guardian_id uuid NOT NULL
);

-- students
CREATE TABLE students (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  student_no text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  grade text NULL,
  class_group text NULL,
  status text NOT NULL DEFAULT 'active'::text,
  deleted_at timestamp with time zone NULL
);

-- user_school_memberships
CREATE TABLE user_school_memberships (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  school_id uuid NOT NULL,
  role text NOT NULL,
  status text NOT NULL,
  invited_by uuid NULL,
  approved_by uuid NULL,
  approved_at timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- users
CREATE TABLE users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  phone text NULL,
  email_verified boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Views
-- vw_attendance_month
-- vw_ar_aging