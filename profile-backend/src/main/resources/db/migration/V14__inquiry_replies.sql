-- V14: owner/editor replies to inquiries from the admin inbox.
ALTER TABLE inquiries ADD COLUMN replied_at timestamptz NULL;

CREATE TABLE inquiry_replies (
  id uuid PRIMARY KEY,
  inquiry_id uuid NOT NULL REFERENCES inquiries(id),
  author_id uuid NOT NULL REFERENCES accounts(id),
  body varchar(5000) NOT NULL,
  status varchar(16) NOT NULL CHECK (status IN ('sending','sent','failed')),
  error varchar(128) NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX inquiry_replies_inquiry ON inquiry_replies(inquiry_id, created_at);
CREATE INDEX inquiry_replies_author_recent ON inquiry_replies(author_id, created_at);

-- Same lockdown as V13, now also for the inquiry tables.
ALTER TABLE inquiry_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY inquiry_replies_not_data_api ON inquiry_replies
  USING (current_user NOT IN ('anon', 'authenticated'))
  WITH CHECK (current_user NOT IN ('anon', 'authenticated'));
CREATE POLICY inquiries_not_data_api ON inquiries
  USING (current_user NOT IN ('anon', 'authenticated'))
  WITH CHECK (current_user NOT IN ('anon', 'authenticated'));
CREATE POLICY outbox_not_data_api ON outbox
  USING (current_user NOT IN ('anon', 'authenticated'))
  WITH CHECK (current_user NOT IN ('anon', 'authenticated'));
CREATE POLICY contact_limits_not_data_api ON contact_limits
  USING (current_user NOT IN ('anon', 'authenticated'))
  WITH CHECK (current_user NOT IN ('anon', 'authenticated'));

REVOKE ALL ON TABLE inquiry_replies, inquiries, outbox, contact_limits FROM PUBLIC;

-- Plain Postgres (dev/test) has no such roles, so only touch the ones that exist.
DO $$
DECLARE
  r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format(
        'REVOKE ALL ON TABLE inquiry_replies, inquiries, outbox, contact_limits FROM %I', r);
    END IF;
  END LOOP;
END
$$;
