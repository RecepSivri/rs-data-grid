#!/usr/bin/env bash
# Runs every project's unit test suite with coverage and generates one
# consolidated HTML dashboard (.test-reports/index.html) summarizing test
# counts + coverage % side by side. Unlike build-all.sh, this does NOT stop
# on the first failure -- it runs every project regardless, so the report
# always reflects the full picture; the script's own exit code still
# reflects whether everything passed.
#
# Usage:
#   ./test-all.sh
#   open .test-reports/index.html   # after it finishes
#
# Angular's suite runs in a real headless Chrome (via Karma), so this needs
# Google Chrome installed. Override the binary path with CHROME_BIN if it's
# not at the default macOS location.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

REPORT_DIR="$ROOT_DIR/.test-reports"
mkdir -p "$REPORT_DIR"
rm -f "$REPORT_DIR"/*.log "$REPORT_DIR"/*.coverage-summary.json

step() { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }

ensure_deps() {
  if [ ! -d "$1/node_modules" ]; then
    echo "  installing dependencies in $1..."
    (cd "$1" && npm ci)
  fi
}

overall_status=0

run_vitest_project() {
  local key="$1" dir="$2"
  step "$key -- npm run test:coverage"
  ensure_deps "$dir"
  # --coverage.reporter is passed twice deliberately: 'text' keeps the
  # human-readable per-file table in the .log (useful when a project fails
  # and you want to see why), 'json-summary' writes coverage/coverage-
  # summary.json, which generate-test-report.js actually parses. The text
  # block's own aggregate footer is NOT used for parsing -- Vitest can lose
  # it when stdout is redirected to a plain file (process.exit() doesn't
  # always wait for the last buffered chunk to flush), so the report reads
  # the JSON file instead, which is a real synchronous fs write.
  if (cd "$dir" && npm run test:coverage -- --coverage.reporter=text --coverage.reporter=json-summary) > "$REPORT_DIR/$key.log" 2>&1; then
    echo "  ok"
  else
    echo "  FAILED (see $REPORT_DIR/$key.log)"
    overall_status=1
  fi
  if [ -f "$dir/coverage/coverage-summary.json" ]; then
    cp "$dir/coverage/coverage-summary.json" "$REPORT_DIR/$key.coverage-summary.json"
  fi
}

run_vitest_project vanilla rs-data-grid-vanilla
run_vitest_project jquery rs-data-grid-jquery
run_vitest_project vue rs-data-grid-vue
run_vitest_project react rs-data-grid-react
run_vitest_project root-config rs-data-grid-root-config

step "angular -- ng test rs-grid-angular --code-coverage"
ensure_deps rs-data-grid-angular
CHROME_BIN="${CHROME_BIN:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
if [ ! -x "$CHROME_BIN" ]; then
  echo "  Chrome not found at '$CHROME_BIN' -- set CHROME_BIN to override. Skipping Angular."
  overall_status=1
else
  if (cd rs-data-grid-angular && CHROME_BIN="$CHROME_BIN" npx ng test rs-grid-angular --watch=false --code-coverage --browsers=ChromeHeadless) > "$REPORT_DIR/angular.log" 2>&1; then
    echo "  ok"
  else
    echo "  FAILED (see $REPORT_DIR/angular.log)"
    overall_status=1
  fi
fi

step "Generating consolidated report"
node "$ROOT_DIR/generate-test-report.js" "$REPORT_DIR" || overall_status=1

printf '\nReport: %s\n' "$REPORT_DIR/index.html"
if [ "$overall_status" -ne 0 ]; then
  printf '\033[1;31mOne or more projects failed or is missing coverage -- see logs above.\033[0m\n'
else
  printf '\033[1;32mAll projects passed with full coverage.\033[0m\n'
fi

open "$REPORT_DIR/index.html" 2>/dev/null || true

exit $overall_status
