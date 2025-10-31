CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL CHECK (token_hash LIKE '$2%' AND length(token_hash) >= 20),
  expires_at timestamptz NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_art_user_exp ON auth_refresh_tokens(user_id, expires_at);