#!/usr/bin/env bash
# Start the FastAPI backend with uvicorn (hot-reload enabled).
# Usage: ./backend/start.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Activate virtualenv if present
if [ -f .venv/bin/activate ]; then
  source .venv/bin/activate
fi

exec uvicorn app.main:app --host 0.0.0.0 --port 35400 --reload
