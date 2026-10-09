import os
from pathlib import Path
from typing import Iterable


TRUE_VALUES = {"1", "true", "yes", "on"}
FALSE_VALUES = {"0", "false", "no", "off"}


def env(key: str, default: str | None = None) -> str | None:
    """Read a string environment variable."""
    return os.environ.get(key, default)


def env_int(key: str, default: int = 0) -> int:
    """Read an int environment variable."""
    raw = env(key)
    try:
        return int(raw) if raw not in (None, "") else int(default)
    except (TypeError, ValueError):
        return int(default)


def env_bool(key: str, default: bool = False) -> bool:
    """Read a boolean environment variable."""
    raw = env(key)
    if raw is None:
        return default

    normalized = str(raw).strip().lower()
    if normalized in TRUE_VALUES:
        return True
    if normalized in FALSE_VALUES:
        return False
    return default


def env_list(
    key: str, default: Iterable[str] | None = None, separator: str = ","
) -> list[str]:
    """
    Read a comma-separated list from the environment.
    Returns default (or []) if empty/undefined.
    """
    raw = env(key, "")
    if raw:
        return [item.strip() for item in raw.split(separator) if item.strip()]
    return list(default or [])


def env_path(key: str, default: Path) -> Path:
    """Read a filesystem path; falls back to a default Path."""
    raw = env(key)
    return Path(raw).expanduser() if raw else Path(default)


def env_first(keys: Iterable[str], default: str | None = None) -> str | None:
    """Return the first non-empty environment value for the given keys."""
    for key in keys:
        value = env(key)
        if value not in (None, ""):
            return value
    return default


def env_bool_first(keys: Iterable[str], default: bool = False) -> bool:
    """Read the first defined boolean value from multiple environment keys."""
    for key in keys:
        if env(key) not in (None, ""):
            return env_bool(key, default)
    return default


def env_list_first(
    keys: Iterable[str], default: Iterable[str] | None = None, separator: str = ","
) -> list[str]:
    """Read the first non-empty list value from multiple environment keys."""
    for key in keys:
        values = env_list(key, default=None, separator=separator)
        if values:
            return values
    return list(default or [])


def require_env(keys: Iterable[str]) -> str:
    """Return the first non-empty value or fail with a helpful error."""
    keys = tuple(keys)
    value = env_first(keys)
    if not value:
        raise RuntimeError(f"Set {' or '.join(keys)} in .env for production")
    return value


def require_env_list(keys: Iterable[str]) -> list[str]:
    """Return the first non-empty list value or fail with a helpful error."""
    keys = tuple(keys)
    values = env_list_first(keys, default=[])
    if not values:
        raise RuntimeError(f"Set {' or '.join(keys)} in .env for production")
    return values


def clean_path_fragment(raw_value: str, default: str) -> str:
    """
    Normalize URL path fragments coming from env.
    Strips leading slashes and ensures a single trailing slash.
    """
    value = (raw_value or default).lstrip("/")
    return value if value.endswith("/") else value + "/"


def env_path_fragment(
    keys: Iterable[str], default: str, require_present: bool = False
) -> str:
    """Load and normalize a path fragment from the first available env key."""
    keys = tuple(keys)
    value = env_first(keys, default) or default
    if require_present and value == default:
        raise RuntimeError(f"Set {' or '.join(keys)} in .env for production")
    return clean_path_fragment(value, default)
