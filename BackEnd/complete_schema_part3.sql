--------------------------------
-- Academics / Preschool Core
--------------------------------
CREATE TABLE IF NOT EXISTS students (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_no   text NOT NULL,
  first_name   text NOT NULL,
  last_name    text NOT NULL,
  grade        text,
  class_group  text,
  status       text NOT NULL DEFAULT 'active',
  deleted_at   timestamptz,
  CONSTRAINT students_student_no_nonempty CHECK (length(student_no) > 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS u_students_school_studentno_active
  ON students(school_id, student_no) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id);

CREATE TABLE IF NOT EXISTS guardians (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relationship text,
  UNIQUE (school_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_guardians_user ON guardians(user_id);

CREATE TABLE IF NOT EXISTS student_guardians (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id  uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  guardian_id uuid NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
  UNIQUE (school_id, student_id, guardian_id)
);

CREATE TABLE IF NOT EXISTS staff (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      text,
  deleted_at timestamptz,
  UNIQUE (school_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_staff_user ON staff(user_id);

CREATE TABLE IF NOT EXISTS classes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  code       text NOT NULL,
  name       text NOT NULL,
  term       text,
  deleted_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS u_classes_school_code_active
  ON classes(school_id, code) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS class_staff (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id  uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  staff_id  uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  role      text NOT NULL DEFAULT 'teacher',
  UNIQUE (school_id, class_id, staff_id)
);

CREATE TABLE IF NOT EXISTS enrollments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id   uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  UNIQUE (school_id, class_id, student_id)
);

-- Attendance & daily ops
CREATE TABLE IF NOT EXISTS student_attendance (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id   uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id     uuid REFERENCES classes(id) ON DELETE SET NULL,
  date         date NOT NULL,
  check_in     timestamptz,
  check_out    timestamptz,
  method       text,
  late_minutes int DEFAULT 0,
  notes        text,
  UNIQUE (school_id, student_id, date),
  CONSTRAINT attn_time_valid CHECK (check_in IS NULL OR check_out IS NULL OR check_out > check_in)
);
CREATE INDEX IF NOT EXISTS idx_attendance_school_date ON student_attendance(school_id, date);