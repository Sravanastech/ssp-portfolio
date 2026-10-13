#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
ui="$(cd ../profile-ui && pwd)"
export JAVA_HOME="${JAVA_HOME:?Set JAVA_HOME to JDK 25}"
./mvnw -B verify
(cd "$ui" && npm run lint && npm run test:run && VITE_CONTENT_MODE=api npm run build && npm run build:content-renderer)
rm -rf build/ui
mkdir -p build/ui
cp -R "$ui/dist/." build/ui/
docker build --tag profile-backend:local .
docker image inspect profile-backend:local --format '{{index .RepoDigests 0}}'
