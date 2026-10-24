#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
# Auto-detect Homebrew OpenJDK 25 if JAVA_HOME is not set
if [ -z "${JAVA_HOME:-}" ]; then
  if [ -d "/opt/homebrew/opt/openjdk@25/libexec/openjdk.jdk/Contents/Home" ]; then
    export JAVA_HOME="/opt/homebrew/opt/openjdk@25/libexec/openjdk.jdk/Contents/Home"
    export PATH="/opt/homebrew/opt/openjdk@25/bin:$PATH"
  elif [ -d "/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home" ]; then
    export JAVA_HOME="/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home"
    export PATH="/opt/homebrew/opt/openjdk/bin:$PATH"
  fi
fi

if [ -f ./.env ]; then
  set -a
  . ./.env
  set +a
fi

export SPRING_PROFILES_ACTIVE=dev

# Ensure private resume PDF is available in local media root if present in profile-ui
if [ ! -f .local/media/private/resume.pdf ] && [ -f ../profile-ui/private/Sravana_Parimi.pdf ]; then
  mkdir -p .local/media/private
  cp ../profile-ui/private/Sravana_Parimi.pdf .local/media/private/resume.pdf
fi

# Check database availability
if ! nc -z 127.0.0.1 55432 2>/dev/null; then
  echo "==> PostgreSQL is not reachable on 127.0.0.1:55432."
  echo "    Checking Docker / Colima status..."
  if command -v colima >/dev/null 2>&1 && colima status 2>&1 | grep -qi "not running"; then
    echo "    [Action Needed] Start Colima: colima start"
    echo "    [Action Needed] Start Postgres/Redis: docker compose up -d"
  else
    docker compose up -d 2>/dev/null || echo "    [Action Needed] Run: docker compose up -d"
  fi
fi

exec ./mvnw spring-boot:run

