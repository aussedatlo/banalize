#!/bin/bash
# Collect CORE (Rust) coverage from the Playwright e2e run.
#
# Flow: run the suite against an instrumented core (CORE_COVERAGE=1 layers in the
# coverage compose override). The core writes raw LLVM profiles to a mounted dir
# and flushes them on graceful shutdown — which happens when start-servers.sh
# tears the stack down *after* Playwright exits. We then merge the profiles and
# render lcov + html inside the same instrumented image (its source tree matches
# the binary's embedded paths, so no remapping is needed).
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
E2E_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$E2E_DIR/../.." && pwd)"

PROFRAW_DIR="$E2E_DIR/.tmp/core-coverage"
OUT_DIR="$E2E_DIR/coverage-core"
COVERAGE_IMAGE="banalize-core:e2e-coverage"

cd "$REPO_ROOT"

# Start clean: no stale stack (so Playwright starts the instrumented one), no
# stale profiles or reports.
docker compose -f docker-compose.e2e.yml -f docker-compose.e2e.coverage.yml down -v --remove-orphans >/dev/null 2>&1 || true
rm -rf "$PROFRAW_DIR" "$OUT_DIR"
mkdir -p "$PROFRAW_DIR" "$OUT_DIR"

# Run the suite. start-servers.sh sees CORE_COVERAGE and brings up the
# instrumented stack; on teardown the core flushes its .profraw files.
echo "Running e2e suite against the instrumented core..."
CORE_COVERAGE=1 pnpm --filter=@banalize/e2e exec playwright test "$@"

echo "Generating core coverage report..."
docker run --rm \
  --user "$(id -u):$(id -g)" \
  -v "$PROFRAW_DIR:/cov" \
  -v "$OUT_DIR:/out" \
  "$COVERAGE_IMAGE" bash -c '
    set -e
    shopt -s nullglob
    profs=(/cov/*.profraw)
    if [ ${#profs[@]} -eq 0 ]; then
      echo "No .profraw files found — did the core shut down gracefully?" >&2
      exit 1
    fi
    TOOLS=$(dirname "$(find /usr/local/rustup -name llvm-profdata -path "*/bin/*" | head -1)")
    IGNORE="(/usr/local/cargo|/rustc/|/root/\.cargo|registry/)"
    "$TOOLS/llvm-profdata" merge -sparse "${profs[@]}" -o /out/core.profdata
    "$TOOLS/llvm-cov" export --format=lcov \
      --instr-profile=/out/core.profdata \
      --ignore-filename-regex="$IGNORE" \
      /usr/local/bin/banalize-core > /out/core.lcov
    "$TOOLS/llvm-cov" show --format=html --output-dir=/out/html \
      --instr-profile=/out/core.profdata \
      --ignore-filename-regex="$IGNORE" \
      /usr/local/bin/banalize-core
    echo
    "$TOOLS/llvm-cov" report \
      --instr-profile=/out/core.profdata \
      --ignore-filename-regex="$IGNORE" \
      /usr/local/bin/banalize-core
  '

# Rewrite the container-absolute source paths to repo-relative so the lcov is
# portable (CI, codecov, merging with other reports).
sed -i "s#/usr/src/app/##g" "$OUT_DIR/core.lcov"

echo
echo "Core coverage report: apps/e2e/coverage-core/html/index.html (lcov: core.lcov)"
