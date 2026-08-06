#!/usr/bin/env bash
# Stops everything ./serve-all.sh started (by PID file), and as a fallback
# also frees the 6 known ports directly in case a PID already died/changed.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$ROOT_DIR/.serve-all.pids"

if [ -f "$PID_FILE" ]; then
  while read -r pid; do
    [ -n "$pid" ] && kill "$pid" 2>/dev/null && echo "stopped PID $pid"
  done < "$PID_FILE"
  rm -f "$PID_FILE"
fi

for port in 9000 3000 4200 5173 3001 3002; do
  pid=$(lsof -nP -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)
  if [ -n "$pid" ]; then
    kill "$pid" 2>/dev/null && echo "port $port -> stopped PID $pid"
  fi
done

echo "All production-preview servers stopped."
