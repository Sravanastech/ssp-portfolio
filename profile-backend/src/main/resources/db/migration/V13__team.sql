-- V13: two admin roles, editor invites, richer audit events. Additive: is_admin stays for one release.
ALTER TABLE accounts
  ADD COLUMN role text NULL CHECK (role IN ('owner', 'editor')),
  ADD COLUMN can_publish boolean NOT NULL DEFAULT false,
  ADD COLUMN role_granted_at timestamptz NULL;

UPDATE accounts SET role = 'owner', role_granted_at = now() WHERE is_admin AND deleted_at IS NULL;

CREATE TABLE invites (
  id          uuid PRIMARY KEY,
  email       varchar(254) NOT NULL CHECK (email = lower(email)),
  token_hash  bytea NOT NULL UNIQUE,
  can_publish boolean NOT NULL DEFAULT false,
  created_by  uuid NOT NULL REFERENCES accounts(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  accepted_by uuid NULL REFERENCES accounts(id),
  accepted_at timestamptz NULL,
  revoked_at  timestamptz NULL
);
CREATE UNIQUE INDEX invites_one_open_per_email ON invites(email)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;
CREATE INDEX invites_created ON invites(created_by, created_at DESC);

ALTER TABLE audit_events
  ADD COLUMN details jsonb NULL,
  ADD COLUMN outcome varchar(16) NOT NULL DEFAULT 'ok' CHECK (outcome IN ('ok', 'denied'));

-- Same lockdown as V12, now also for accounts (role is a privilege column) and audit_events.
-- The table owner bypasses RLS; the policies let a separate runtime role (dev compose / prod
-- DB_MIGRATION_USERNAME split) keep working, while anon/authenticated can never match them.
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY invites_not_data_api ON invites
  USING (current_user NOT IN ('anon', 'authenticated'))
  WITH CHECK (current_user NOT IN ('anon', 'authenticated'));
CREATE POLICY accounts_not_data_api ON accounts
  USING (current_user NOT IN ('anon', 'authenticated'))
  WITH CHECK (current_user NOT IN ('anon', 'authenticated'));
CREATE POLICY audit_events_not_data_api ON audit_events
  USING (current_user NOT IN ('anon', 'authenticated'))
  WITH CHECK (current_user NOT IN ('anon', 'authenticated'));

REVOKE ALL ON TABLE invites, accounts, audit_events FROM PUBLIC;

-- Plain Postgres (dev/test) has no such roles, so only touch the ones that exist.
DO $$
DECLARE
  r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON TABLE invites, accounts, audit_events FROM %I', r);
    END IF;
  END LOOP;
END
$$;
