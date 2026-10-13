CREATE TABLE accounts (
 id uuid PRIMARY KEY, issuer text NOT NULL, subject text NOT NULL,
 first_name varchar(80) NOT NULL DEFAULT '', last_name varchar(80) NOT NULL DEFAULT '',
 email varchar(254), is_admin boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz,
 UNIQUE(issuer,subject)
);
