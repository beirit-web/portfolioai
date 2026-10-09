#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

python_for() {
  local project_dir="$1"
  if [[ -x "$project_dir/.venv/bin/python" ]]; then
    printf '%s/.venv/bin/python' "$project_dir"
  elif [[ -x "$ROOT_DIR/.venv/bin/python" ]]; then
    printf '%s/.venv/bin/python' "$ROOT_DIR"
  else
    printf 'python'
  fi
}

run_step() {
  local label="$1"
  shift
  printf '\n==> %s\n' "$label"
  "$@"
}

cd "$ROOT_DIR"

run_step "Portfolio source data audit" python3 "$ROOT_DIR/scripts/check_portfolio_data.py"

run_step "Beirit regression, backend and browser checks" "$(python_for "$ROOT_DIR/server")" "$ROOT_DIR/server/bin/check_beirit.py"

run_step "Sprachdienstleistungen deploy isolation" bash -c 'cd "$0" && python3 bin/check_deploy_isolation.py' "$ROOT_DIR/sprachdienstleistungen"
run_step "Sprachdienstleistungen Django check" bash -c 'cd "$0" && DJANGO_ENV=local DJANGO_DEBUG=true DJANGO_SECRET_KEY=check-only "$1" manage.py check' "$ROOT_DIR/sprachdienstleistungen" "$(python_for "$ROOT_DIR/sprachdienstleistungen")"
run_step "Sprachdienstleistungen domain and learning-module tests" bash -c 'cd "$0" && "$1" manage.py test pages.tests_domain_isolation pages.tests_vokabelbox lessons.tests' "$ROOT_DIR/sprachdienstleistungen" "$(python_for "$ROOT_DIR/sprachdienstleistungen")"
run_step "DeutschLive platform frontend build" npm --prefix apps/deutsch-live/frontend run build:platform
run_step "Language-platform browser checks" npm --prefix frontend run test:vokabelbox

run_step "DeutschLive frontend build" npm --prefix apps/deutsch-live/frontend run build -- --outDir /tmp/deutschlive-build
run_step "DeutschLive backend tests" bash -c 'cd "$0" && "$1" manage.py test lessons.tests' "$ROOT_DIR/apps/deutsch-live/backend" "$(python_for "$ROOT_DIR/apps/deutsch-live/backend")"

run_step "Wohnungssuche Django check" bash -c 'cd "$0" && "$1" manage.py check' "$ROOT_DIR/wohnungssuche" "$(python_for "$ROOT_DIR/wohnungssuche")"
run_step "Wohnungssuche tests" bash -c 'cd "$0" && "$1" manage.py test --verbosity 1' "$ROOT_DIR/wohnungssuche" "$(python_for "$ROOT_DIR/wohnungssuche")"

printf '\nWorkspace checks passed.\n'
