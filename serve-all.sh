#!/usr/bin/env bash
# Serves the single consolidated production package -- just
# rs-data-grid-root-config/dist/ -- on ONE port, exactly like a real static
# host would. All 5 micro-frontend bundles already live inside that folder
# (under dist/mfe/<name>/, put there by build-all.sh) and are requested
# same-origin, so this one static server is the whole app.
#
# Run ./build-all.sh first. Stop it with ./stop-all.sh.

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

PKG_DIR="rs-data-grid-root-config/dist"
PORT=9000
PID_FILE="$ROOT_DIR/.serve-all.pids"
LOG_DIR="$ROOT_DIR/.serve-all-logs"
mkdir -p "$LOG_DIR"
: > "$PID_FILE"

check_file() {
  if [ ! -f "$1" ]; then
    echo "Missing build output: $1"
    echo "Run ./build-all.sh first."
    exit 1
  fi
}

check_file "$PKG_DIR/index.html"
check_file "$PKG_DIR/mfe/react/rs-data-grid-react.js"
check_file "$PKG_DIR/mfe/angular/main.js"
check_file "$PKG_DIR/mfe/vue/rs-data-grid-vue.js"
check_file "$PKG_DIR/mfe/vanilla/rs-data-grid-vanilla.js"
check_file "$PKG_DIR/mfe/jquery/rs-data-grid-jquery.js"

existing=$(lsof -nP -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)
if [ -n "$existing" ]; then
  echo "Port $PORT already in use (PID $existing). Free it first (e.g. kill $existing) for a fresh production preview."
  exit 1
fi

nohup npx --yes serve -p "$PORT" "$PKG_DIR" > "$LOG_DIR/package.log" 2>&1 &
pid=$!
disown
echo "$pid" >> "$PID_FILE"
echo "Serving the deploy package -> http://localhost:$PORT  (PID $pid)"

echo ""
echo "Waiting for the app and every bundle to respond..."
wait_for() {
  local url="$1"
  for _ in $(seq 1 40); do
    curl -sf "$url" -o /dev/null 2>&1 && return 0
    sleep 0.5
  done
  echo "  WARNING: $url did not respond in time -- check $LOG_DIR/package.log."
}
wait_for "http://localhost:$PORT/"
wait_for "http://localhost:$PORT/mfe/react/rs-data-grid-react.js"
wait_for "http://localhost:$PORT/mfe/angular/main.js"
wait_for "http://localhost:$PORT/mfe/vue/rs-data-grid-vue.js"
wait_for "http://localhost:$PORT/mfe/vanilla/rs-data-grid-vanilla.js"
wait_for "http://localhost:$PORT/mfe/jquery/rs-data-grid-jquery.js"

echo ""
echo "Production package is live locally: http://localhost:$PORT"
echo "Stop it with: ./stop-all.sh"
