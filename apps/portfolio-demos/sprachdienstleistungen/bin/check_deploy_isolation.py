#!/usr/bin/env python3
from __future__ import annotations

import os
import sys
import tomllib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ALLOWED_APPS = {"language-demo-example"}
STAGING_URL = "https://languages-staging.example.invalid"
STAGING_HOST = "languages-staging.example.invalid"
PRODUCTION_URL = "https://languages.example.invalid"
PRODUCTION_HOST = "languages.example.invalid"
FORBIDDEN_HOSTS = {"portfolio.example.invalid"}


def split_hosts(value: str) -> set[str]:
    return {item.strip().lower() for item in value.split(",") if item.strip()}


def check_values(label: str, values: dict[str, str], canonical_url: str, canonical_host: str) -> list[str]:
    errors: list[str] = []
    allowed_hosts = split_hosts(values.get("DJANGO_ALLOWED_HOSTS", ""))
    csrf_origins = split_hosts(values.get("CSRF_TRUSTED_ORIGINS", ""))
    redirect_hosts = split_hosts(values.get("REDIRECT_OLD_HOSTS", ""))

    if values.get("SITE_URL") != canonical_url:
        errors.append(f"{label}: SITE_URL must be {canonical_url}")
    if canonical_host not in allowed_hosts:
        errors.append(f"{label}: DJANGO_ALLOWED_HOSTS must include {canonical_host}")
    if canonical_url not in csrf_origins:
        errors.append(f"{label}: CSRF_TRUSTED_ORIGINS must include {canonical_url}")
    if allowed_hosts & FORBIDDEN_HOSTS:
        errors.append(f"{label}: DJANGO_ALLOWED_HOSTS must not include portfolio.example.invalid")
    if csrf_origins & {f"https://{host}" for host in FORBIDDEN_HOSTS}:
        errors.append(f"{label}: CSRF_TRUSTED_ORIGINS must not include portfolio.example.invalid")
    if redirect_hosts & FORBIDDEN_HOSTS:
        errors.append(f"{label}: REDIRECT_OLD_HOSTS must not include portfolio.example.invalid")

    return errors


def load_fly_config(path: Path) -> dict:
    return tomllib.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    errors: list[str] = []
    fly_path = ROOT / "fly.toml"
    fly_config = load_fly_config(fly_path)
    app_name = os.environ.get("FLY_APP_NAME") or fly_config.get("app")

    if app_name not in ALLOWED_APPS:
        errors.append(f"Fly app must be one of {sorted(ALLOWED_APPS)}, got {app_name!r}")
    errors.extend(check_values("fly.toml", fly_config.get("env", {}), STAGING_URL, STAGING_HOST))

    production_path = ROOT / "fly.coachingservice.toml"
    if production_path.exists():
        production_config = load_fly_config(production_path)
        if production_config.get("app") != "language-demo-example":
            errors.append("fly.coachingservice.toml: app must be language-demo-example")
        errors.extend(
            check_values(
                "fly.coachingservice.toml",
                production_config.get("env", {}),
                PRODUCTION_URL,
                PRODUCTION_HOST,
            )
        )

    if errors:
        print("Portfolio configuration isolation check failed:", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        return 1

    print("Portfolio configuration isolation check passed for languages-staging.example.invalid staging and languages.example.invalid production")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
