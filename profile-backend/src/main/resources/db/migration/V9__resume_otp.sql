CREATE TABLE resume_otp_challenge (
  id uuid PRIMARY KEY,
  email varchar(254) NOT NULL,
  code_hmac bytea NOT NULL,
  ip_hash bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  attempts smallint NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  invalidated_at timestamptz
);
CREATE INDEX resume_otp_email_created ON resume_otp_challenge(email, created_at);
CREATE INDEX resume_otp_ip_created ON resume_otp_challenge(ip_hash, created_at);
CREATE INDEX resume_otp_created ON resume_otp_challenge(created_at);
