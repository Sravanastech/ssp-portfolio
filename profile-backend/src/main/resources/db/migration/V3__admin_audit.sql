CREATE TABLE audit_events (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, actor uuid REFERENCES accounts(id), action varchar(80) NOT NULL, resource varchar(128) NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX audit_created ON audit_events(created_at);
