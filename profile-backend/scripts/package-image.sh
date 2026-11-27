#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
export JAVA_HOME="${JAVA_HOME:?Set JAVA_HOME to JDK 25}"
./mvnw -B verify
docker build --tag profile-backend:local --file Dockerfile ..
docker image inspect profile-backend:local --format '{{index .RepoDigests 0}}'
