-- Keep OTP/visitor emails away from Supabase's Data API roles (anon, authenticated).
-- The table owner bypasses RLS, so FORCE ROW LEVEL SECURITY is deliberately not used. The policies
-- also let a separate runtime role (dev compose migrates as profile_migrator and runs as
-- profile_runtime) keep working, while anon and authenticated can never match them, even if
-- privileges are granted to them again later.
ALTER TABLE resume_otp_challenge ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_visitor ENABLE ROW LEVEL SECURITY;

CREATE POLICY resume_otp_challenge_not_data_api ON resume_otp_challenge
  USING (current_user NOT IN ('anon', 'authenticated'))
  WITH CHECK (current_user NOT IN ('anon', 'authenticated'));
CREATE POLICY resume_visitor_not_data_api ON resume_visitor
  USING (current_user NOT IN ('anon', 'authenticated'))
  WITH CHECK (current_user NOT IN ('anon', 'authenticated'));

REVOKE ALL ON TABLE resume_otp_challenge, resume_visitor FROM PUBLIC;

-- Plain Postgres (dev/test) has no such roles, so only touch the ones that exist.
DO $$
DECLARE
  r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON TABLE resume_otp_challenge, resume_visitor FROM %I', r);
    END IF;
  END LOOP;
END
$$;
