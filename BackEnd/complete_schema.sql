-- DevForgeSolutions Complete Schema for Supabase
-- Run this entire script in Supabase SQL Editor

-----------------------------
-- Extensions & helper schema
-----------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE SCHEMA IF NOT EXISTS app;

-- Tenant GUC: app must set per request/transaction
CREATE OR REPLACE FUNCTION app.current_school_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT current_setting('app.school_id', true)::uuid
$$;

CREATE OR REPLACE FUNCTION app.set_school(p_school uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('app.school_id', p_school::text, true);
END$$;

-- Optional symmetric encryption
CREATE OR REPLACE FUNCTION app.encrypt(p_text text)
RETURNS bytea LANGUAGE sql STABLE AS $$
  SELECT CASE
           WHEN current_setting('app.encryption_key', true) IS NULL THEN NULL
           ELSE pgp_sym_encrypt(p_text, current_setting('app.encryption_key', true))
         END
$$;

CREATE OR REPLACE FUNCTION app.decrypt(p_cipher bytea)
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT CASE
           WHEN current_setting('app.encryption_key', true) IS NULL THEN NULL
           ELSE pgp_sym_decrypt(p_cipher, current_setting('app.encryption_key', true))
         END
$$;

-- updated_at helper
CREATE OR REPLACE FUNCTION app.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END$$;

-- Basic email validator
CREATE OR REPLACE FUNCTION app.email_is_valid(p text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT p ~ '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$'
$$;

-- bcrypt helper
CREATE OR REPLACE FUNCTION app.bcrypt(p text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT crypt(p, gen_salt('bf'))
$$;