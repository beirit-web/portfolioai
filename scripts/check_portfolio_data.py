#!/usr/bin/env python3
"""Check the public source tree without printing secret or personal values."""

import ast
import json
from pathlib import Path
import re
import subprocess
import sys


ROOT = Path(__file__).resolve().parent.parent
CONTACT_COMPONENT = "frontend/src/components/contact/ContactDetails.jsx"
EMAIL_PATTERN = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
RULES = {
    "private key": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    "access token": re.compile(r"(?:ghp_|github_pat_|AKIA|sk_live_|sk-proj-)[A-Za-z0-9_-]{12,}"),
    "former hosting domain": re.compile(r"(?:[a-z0-9-]+\.fly\.dev|(?:beirit|eugensdigivision)\.(?:digital|de))", re.I),
    "former local path": re.compile(r"/home/(?:enbt\w*|eugen)(?:/|\b)", re.I),
    "infrastructure identifier": re.compile(r"\bvol_(?!example)[a-z0-9]{8,}\b|\bdeployment-(?!EXAMPLE)[A-Z0-9]{15,}\b"),
}
PRIVATE_SUFFIXES = {".sqlite", ".sqlite3", ".pem", ".key", ".p12", ".pfx", ".bundle"}


def source_files():
    output = subprocess.check_output(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"], cwd=ROOT
    )
    return sorted(set(name for name in output.decode().split("\0") if name))


def main():
    failures = []
    inspected = 0
    for name in source_files():
        path = ROOT / name
        if not path.is_file():
            continue
        if path.suffix.lower() in PRIVATE_SUFFIXES or (path.name.startswith(".env") and path.name != ".env.example"):
            failures.append((name, "private runtime file"))
            continue
        data = path.read_bytes()
        if b"\0" in data:
            continue
        try:
            text = data.decode("utf-8")
        except UnicodeDecodeError:
            continue
        inspected += 1
        if name.endswith("pages/migrations/0006_load_january2026_appointments.py"):
            allowed = {
                "username": {"Erika Beispiel", "Max Mustermann"},
                "location": {"Musterstadt", "Beispielstadt"},
                "note": {"Fiktiver Termin, Musterstraße 1.", "Fiktive Besprechung für die Portfolio-Demo."},
            }
            for node in ast.walk(ast.parse(text)):
                if not isinstance(node, ast.Dict):
                    continue
                for key, value in zip(node.keys, node.values):
                    if isinstance(key, ast.Constant) and key.value in allowed:
                        if not isinstance(value, ast.Constant) or value.value not in allowed[key.value]:
                            failures.append((name, "nonfictional appointment fixture"))
        # Real owner details are allowed only in the dedicated contact UI and
        # contact translations. The bundled UI also contains those public details.
        public_contact_source = (
            name == CONTACT_COMPONENT
            or name.startswith("server/assets/react-home-dist/")
            or name.endswith("templates/pages/kontakt.html")
            or name.endswith("templates/pages/email_contact.html")
        )
        checked = EMAIL_PATTERN.sub("email@example.invalid", text)
        if name.endswith(".json") and "/locales/" in name:
            document = json.loads(text)
            document.pop("contact", None)
            document.pop("about", None)
            checked = EMAIL_PATTERN.sub("email@example.invalid", json.dumps(document, ensure_ascii=False))
        for label, pattern in RULES.items():
            if label == "former hosting domain" and public_contact_source:
                # Contact URLs are public by request; Fly hosts never are.
                found = re.search(r"[a-z0-9-]+\.fly\.dev", checked, re.I)
            else:
                found = pattern.search(checked)
            if found:
                failures.append((name, label))
    for name, label in failures:
        print(f"FAIL {name}: {label}", file=sys.stderr)
    if failures:
        return 1
    print(f"Portfolio data check passed ({inspected} text files; runtime files excluded).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
