-- Multi-tenant Preschool SaaS Database Schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable Row Level Security
ALTER DATABASE postgres SET row_security = on;

-- Platform-level tables (no RLS)
CREATE TABLE platform_owners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  address TEXT,
  logo_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'trial', 'active', 'past_due', 'suspended', 'cancelled')),
  plan_type TEXT DEFAULT 'basic',
  max_students INTEGER DEFAULT 50,
  max_staff INTEGER DEFAULT 10,
  billing_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  suspended_at TIMESTAMPTZ,
  suspension_reason TEXT
);

-- Tenant context function
CREATE OR REPLACE FUNCTION app.set_school(school_uuid UUID) RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_school_id', school_uuid::TEXT, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Additional tables for compliance and features
CREATE TABLE bank_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id),
  transaction_id TEXT NOT NULL,
  date DATE NOT NULL,
  amount_cents INTEGER NOT NULL,
  description TEXT,
  reference TEXT,
  file_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, transaction_id)
);

CREATE TABLE data_subject_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  request_type TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending',
  response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

CREATE TABLE data_breaches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id),
  description TEXT NOT NULL,
  affected_records INTEGER,
  severity TEXT NOT NULL,
  containment_actions TEXT,
  reported_by UUID REFERENCES users(id),
  status TEXT DEFAULT 'investigating',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Multi-tenant tables (with RLS)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id),
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('school_admin', 'staff', 'parent', 'auditor')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended')),
  phone TEXT,
  mfa_secret TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, email)
);

CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id),
  student_no TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  class_id UUID,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated')),
  enrollment_date DATE DEFAULT CURRENT_DATE,
  medical_notes TEXT,
  pickup_pin_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(school_id, student_no)
);

CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id),
  name TEXT NOT NULL,
  capacity INTEGER DEFAULT 20,
  age_group TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE guardians (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id),
  user_id UUID REFERENCES users(id),
  relationship TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  can_pickup BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE student_guardians (
  student_id UUID REFERENCES students(id),
  guardian_id UUID REFERENCES guardians(id),
  PRIMARY KEY (student_id, guardian_id)
);

CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id),
  student_id UUID REFERENCES students(id),
  class_id UUID REFERENCES classes(id),
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  check_in_time TIME,
  check_out_time TIME,
  notes TEXT,
  recorded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, student_id, date)
);

CREATE TABLE fee_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id),
  name TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'annual', 'once_off')),
  applies_to TEXT NOT NULL CHECK (applies_to IN ('all_students', 'class', 'individual')),
  class_id UUID REFERENCES classes(id),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id),
  student_id UUID REFERENCES students(id),
  invoice_no TEXT NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  total_cents INTEGER NOT NULL,
  paid_cents INTEGER DEFAULT 0,
  status TEXT DEFAULT 'open' CHECK (status IN ('draft', 'open', 'partial', 'paid', 'overdue', 'void')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, invoice_no)
);

CREATE TABLE invoice_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id),
  invoice_id UUID REFERENCES invoices(id),
  fee_schedule_id UUID REFERENCES fee_schedules(id),
  description TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id),
  student_id UUID REFERENCES students(id),
  amount_cents INTEGER NOT NULL,
  payment_date DATE NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('cash', 'eft', 'card', 'cheque')),
  reference TEXT,
  notes TEXT,
  recorded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payment_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id),
  payment_id UUID REFERENCES payments(id),
  invoice_id UUID REFERENCES invoices(id),
  amount_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE contract_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id),
  name TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE contract_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id),
  template_id UUID REFERENCES contract_templates(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_mandatory BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE student_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id),
  student_id UUID REFERENCES students(id),
  template_id UUID REFERENCES contract_templates(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'completed', 'expired')),
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE contract_signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id),
  contract_id UUID REFERENCES student_contracts(id),
  section_id UUID REFERENCES contract_sections(id),
  guardian_id UUID REFERENCES guardians(id),
  signed_at TIMESTAMPTZ NOT NULL,
  ip_address INET,
  user_agent TEXT,
  signature_data TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_tenant_isolation ON users 
  USING (school_id = current_setting('app.current_school_id')::UUID);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY students_tenant_isolation ON students 
  USING (school_id = current_setting('app.current_school_id')::UUID);

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY classes_tenant_isolation ON classes 
  USING (school_id = current_setting('app.current_school_id')::UUID);

ALTER TABLE guardians ENABLE ROW LEVEL SECURITY;
CREATE POLICY guardians_tenant_isolation ON guardians 
  USING (school_id = current_setting('app.current_school_id')::UUID);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY attendance_tenant_isolation ON attendance 
  USING (school_id = current_setting('app.current_school_id')::UUID);

ALTER TABLE fee_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY fee_schedules_tenant_isolation ON fee_schedules 
  USING (school_id = current_setting('app.current_school_id')::UUID);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY invoices_tenant_isolation ON invoices 
  USING (school_id = current_setting('app.current_school_id')::UUID);

ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY invoice_lines_tenant_isolation ON invoice_lines 
  USING (school_id = current_setting('app.current_school_id')::UUID);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY payments_tenant_isolation ON payments 
  USING (school_id = current_setting('app.current_school_id')::UUID);

ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY payment_allocations_tenant_isolation ON payment_allocations 
  USING (school_id = current_setting('app.current_school_id')::UUID);

ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY contract_templates_tenant_isolation ON contract_templates 
  USING (school_id = current_setting('app.current_school_id')::UUID);

ALTER TABLE contract_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY contract_sections_tenant_isolation ON contract_sections 
  USING (school_id = current_setting('app.current_school_id')::UUID);

ALTER TABLE student_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY student_contracts_tenant_isolation ON student_contracts 
  USING (school_id = current_setting('app.current_school_id')::UUID);

ALTER TABLE contract_signatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY contract_signatures_tenant_isolation ON contract_signatures 
  USING (school_id = current_setting('app.current_school_id')::UUID);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_logs_tenant_isolation ON audit_logs 
  USING (school_id = current_setting('app.current_school_id')::UUID);

ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY bank_transactions_tenant_isolation ON bank_transactions 
  USING (school_id = current_setting('app.current_school_id')::UUID);

ALTER TABLE data_breaches ENABLE ROW LEVEL SECURITY;
CREATE POLICY data_breaches_tenant_isolation ON data_breaches 
  USING (school_id = current_setting('app.current_school_id')::UUID);

-- Helper functions
CREATE OR REPLACE FUNCTION app.bcrypt(password TEXT) RETURNS TEXT AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf'));
END;
$$ LANGUAGE plpgsql;

-- Indexes for performance
CREATE INDEX idx_users_school_email ON users(school_id, email);
CREATE INDEX idx_students_school_active ON students(school_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_attendance_school_date ON attendance(school_id, date);
CREATE INDEX idx_invoices_school_status ON invoices(school_id, status);
CREATE INDEX idx_audit_logs_school_created ON audit_logs(school_id, created_at);
CREATE INDEX idx_bank_transactions_school_date ON bank_transactions(school_id, date);
CREATE INDEX idx_contract_signatures_contract ON contract_signatures(contract_id, section_id);
CREATE INDEX idx_payment_allocations_payment ON payment_allocations(payment_id);

-- Partitioning for audit logs (monthly)
CREATE TABLE audit_logs_y2024m01 PARTITION OF audit_logs 
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE audit_logs_y2024m02 PARTITION OF audit_logs 
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Sample data
INSERT INTO platform_owners (email, password_hash, full_name) 
VALUES ('admin@devforgesolutions.com', app.bcrypt('admin123'), 'DevForge Admin');

INSERT INTO schools (name, slug, contact_email, status) 
VALUES ('Demo Preschool', 'demo-preschool', 'admin@demo.school', 'active');

-- Create demo school admin
INSERT INTO users (school_id, email, password_hash, full_name, role, status)
SELECT id, 'admin@demo.school', app.bcrypt('demo123'), 'Demo Admin', 'school_admin', 'approved'
FROM schools WHERE slug = 'demo-preschool';