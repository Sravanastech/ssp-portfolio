-- V15: Site Studio block store. Additive: content_revision/site_state stay until the M4 cutover.
CREATE TABLE content_block (
  id             uuid PRIMARY KEY,
  type           varchar(64)  NOT NULL,
  collection     varchar(64)  NULL,
  slug           varchar(120) NOT NULL,
  position       int          NOT NULL DEFAULT 0,
  draft_position int          NULL,
  draft          jsonb        NULL,
  published      jsonb        NULL,
  draft_deleted  boolean      NOT NULL DEFAULT false,
  version        bigint       NOT NULL DEFAULT 1,
  updated_by     uuid         NULL REFERENCES accounts(id),
  updated_at     timestamptz  NOT NULL DEFAULT now(),
  published_at   timestamptz  NULL,
  UNIQUE (type, slug)
);
CREATE INDEX content_block_pending ON content_block(id)
  WHERE draft IS NOT NULL OR draft_deleted OR draft_position IS NOT NULL;
CREATE INDEX content_block_collection ON content_block(collection, position);

CREATE TABLE content_block_revision (
  block_id   uuid        NOT NULL REFERENCES content_block(id) ON DELETE CASCADE,
  rev        int         NOT NULL,
  data       jsonb       NOT NULL,
  created_by uuid        NULL REFERENCES accounts(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (block_id, rev)
);

CREATE TABLE site_release (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  snapshot    jsonb       NOT NULL,
  status      varchar(16) NOT NULL CHECK (status IN ('queued','building','live','failed','superseded')),
  note        varchar(200) NULL,
  created_by  uuid        NULL REFERENCES accounts(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz NULL,
  run_url     varchar(300) NULL
);

-- Same lockdown as V13: the table owner bypasses RLS; policies keep a separate runtime role working
-- while anon/authenticated can never match them.
ALTER TABLE content_block ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_block_revision ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_release ENABLE ROW LEVEL SECURITY;

CREATE POLICY content_block_not_data_api ON content_block
  USING (current_user NOT IN ('anon', 'authenticated'))
  WITH CHECK (current_user NOT IN ('anon', 'authenticated'));
CREATE POLICY content_block_revision_not_data_api ON content_block_revision
  USING (current_user NOT IN ('anon', 'authenticated'))
  WITH CHECK (current_user NOT IN ('anon', 'authenticated'));
CREATE POLICY site_release_not_data_api ON site_release
  USING (current_user NOT IN ('anon', 'authenticated'))
  WITH CHECK (current_user NOT IN ('anon', 'authenticated'));

REVOKE ALL ON TABLE content_block, content_block_revision, site_release FROM PUBLIC;

-- Plain Postgres (dev/test) has no such roles, so only touch the ones that exist.
DO $$
DECLARE
  r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format(
        'REVOKE ALL ON TABLE content_block, content_block_revision, site_release FROM %I', r);
    END IF;
  END LOOP;
END
$$;
