#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
python3 scripts/test_portfolio_data.py
python3 scripts/check_portfolio_data.py
npm --prefix apps/deutsch-live/frontend run build
"$ROOT_DIR/server/.venv/bin/python" "$ROOT_DIR/server/bin/check_beirit.py"
