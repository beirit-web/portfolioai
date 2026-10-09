#!/usr/bin/env python3
from __future__ import annotations

import os
import sys
import tomllib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
EXPECTED_APP = "portfolio-demo-example"
CANONICAL_URL = "https://portfolio.example.invalid"
CANONICAL_HOST = "portfolio.example.invalid"
FORBIDDEN_HOSTS = {
    "languages-staging.example.invalid",
    "www.languages-staging.example.invalid",
    "languages-host.example.invalid",
    "languages-host.example.invalid",
}


def split_hosts(value: str) -> set[str]:
    return {item.strip().lower() for item in value.split(",") if item.strip()}


def check_values(label: str, values: dict[str, str]) -> list[str]:
    errors: list[str] = []
    allowed_hosts = split_hosts(values.get("DJANGO_ALLOWED_HOSTS", ""))
    csrf_origins = split_hosts(values.get("CSRF_TRUSTED_ORIGINS", ""))
    redirect_hosts = split_hosts(values.get("REDIRECT_OLD_HOSTS", ""))

    if values.get("SITE_URL") != CANONICAL_URL:
        errors.append(f"{label}: SITE_URL must be {CANONICAL_URL}")
    if allowed_hosts != {CANONICAL_HOST}:
        errors.append(f"{label}: DJANGO_ALLOWED_HOSTS must contain only {CANONICAL_HOST}")
    if csrf_origins != {CANONICAL_URL}:
        errors.append(f"{label}: CSRF_TRUSTED_ORIGINS must contain only {CANONICAL_URL}")
    if redirect_hosts & FORBIDDEN_HOSTS:
        errors.append(f"{label}: REDIRECT_OLD_HOSTS must not include another portfolio app host")

    reset_domain = values.get("RESET_LINK_DOMAIN") or values.get("PASSWORD_RESET_DOMAIN")
    if reset_domain and reset_domain != CANONICAL_HOST:
        errors.append(f"{label}: reset-link domain must be {CANONICAL_HOST}")

    return errors


def main() -> int:
    errors: list[str] = []
    fly_config = tomllib.loads((ROOT / "fly.toml").read_text(encoding="utf-8"))
    fly_env = fly_config.get("env", {})
    app_name = os.environ.get("FLY_APP_NAME") or fly_config.get("app")

    if app_name != EXPECTED_APP:
        errors.append(f"Fly app must be {EXPECTED_APP}, got {app_name!r}")
    errors.extend(check_values("fly.toml", fly_env))

    if errors:
        print("Portfolio configuration isolation check failed:", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        return 1

    print("Portfolio configuration isolation check passed for portfolio.example.invalid")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
