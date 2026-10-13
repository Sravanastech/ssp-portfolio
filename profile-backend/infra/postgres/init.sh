#!/bin/sh
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set runtime_password="$DB_RUNTIME_PASSWORD" --set migration_password="$DB_MIGRATION_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE profile_migrator LOGIN PASSWORD %L', :'migration_password') \gexec
SELECT format('CREATE ROLE profile_runtime LOGIN PASSWORD %L', :'runtime_password') \gexec
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
ALTER SCHEMA public OWNER TO profile_migrator;
GRANT USAGE ON SCHEMA public TO profile_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE profile_migrator IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO profile_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE profile_migrator IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO profile_runtime;
SQL
