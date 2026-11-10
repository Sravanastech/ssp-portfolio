CREATE TABLE resume_visitor (
  id uuid PRIMARY KEY,
  email varchar(254) NOT NULL UNIQUE,
  first_verified_at timestamptz NOT NULL DEFAULT now(),
  last_verified_at timestamptz NOT NULL DEFAULT now(),
  verify_count int NOT NULL DEFAULT 1,
  last_ip_hash bytea
);
CREATE INDEX resume_visitor_last ON resume_visitor(last_verified_at DESC);
