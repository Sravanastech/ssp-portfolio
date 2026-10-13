#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
[ "$#" -eq 2 ] || { echo "Usage: scripts/bootstrap-owner.sh AUTH0_ISSUER AUTH0_SUBJECT" >&2; exit 2; }
[ -f .env ] || { echo "Create the local ignored .env first" >&2; exit 2; }
set -a
. ./.env
set +a
psql "host=127.0.0.1 port=55432 dbname=profile_dev user=profile_migrator" -v ON_ERROR_STOP=1 -v issuer="$1" -v subject="$2" -c "UPDATE accounts SET is_admin=true WHERE issuer=:'issuer' AND subject=:'subject' AND deleted_at IS NULL;"
