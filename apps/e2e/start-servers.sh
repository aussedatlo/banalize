#!/bin/bash
# Bring up the isolated e2e stack (core on 6042, UI on 6043) and keep it running
# in the foreground. Playwright's webServer waits for the UI to answer, then runs
# the specs; when it kills this process the trap tears the stack down.
#
# CORE_COVERAGE=1 layers in docker-compose.e2e.coverage.yml, swapping the core
# for an instrumented build that writes LLVM profiles to apps/e2e/.tmp/core-coverage.
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/docker-compose.e2e.yml"

# The watched-log directory must exist before the core bind-mounts it.
mkdir -p "$SCRIPT_DIR/.tmp/logs"

COMPOSE_ARGS=(-f "$COMPOSE_FILE")
if [ "${CORE_COVERAGE:-}" = "1" ]; then
  COMPOSE_ARGS+=(-f "$REPO_ROOT/docker-compose.e2e.coverage.yml")
  mkdir -p "$SCRIPT_DIR/.tmp/core-coverage"
fi

cleanup() {
  echo "Tearing down e2e stack..."
  docker compose "${COMPOSE_ARGS[@]}" down -v --remove-orphans
}
trap cleanup EXIT INT TERM

echo "Starting e2e stack (core:6042, ui:6043)${CORE_COVERAGE:+ [core coverage]}..."
docker compose "${COMPOSE_ARGS[@]}" up --build
