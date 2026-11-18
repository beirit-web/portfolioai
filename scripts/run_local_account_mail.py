"""Start local account flows with IONOS SMTP; keep credentials out of files."""

import argparse
import getpass
import os
from pathlib import Path
import secrets
import subprocess
import sys


def prepare_database():
    """Back up an existing SQLite database before applying pending migrations."""
    import django
    django.setup()
    from django.core.management import call_command
    from django.db import connections
    from django.db.migrations.executor import MigrationExecutor

    connection = connections["default"]
    database = Path(connection.settings_dict["NAME"])
    exists = database.is_file() and database.stat().st_size > 0
    try:
        executor = MigrationExecutor(connection)
        pending = executor.migration_plan(executor.loader.graph.leaf_nodes())
        connections.close_all()
        if not pending:
            return
        if exists:
            call_command("backup_db", keep=0)
        call_command("migrate", interactive=False)
    finally:
        connections.close_all()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--check-only", action="store_true", help="Nur SMTP prüfen; Datenbank und Server nicht starten. Ohne --send-test wird keine Mail gesendet.")
    parser.add_argument("--send-test", action="store_true", help="Eine Testmail an das eingegebene IONOS-Postfach senden.")
    args = parser.parse_args()
    if not 1024 <= args.port <= 65535:
        parser.error("Choose a port between 1024 and 65535.")
    if not sys.stdin.isatty():
        parser.error("Run this command in your own terminal for secure password entry.")
    server = Path(__file__).resolve().parents[1] / "server"
    python = server / ".venv/bin/python"
    if not python.exists():
        python = Path(sys.executable)
    # Read credentials only from the user's terminal. Do not write an env file
    # or pass secrets as command-line arguments, where process listings show them.
    address = input("IONOS-Postfach (vollständige E-Mail-Adresse): ").strip()
    password = getpass.getpass("IONOS-Postfach-Passwort, kein Gmail-App-Passwort (Eingabe unsichtbar): ")
    if not address or not password or any(c in address for c in "\r\n"):
        parser.error("Postfach und Passwort sind erforderlich.")
    environment = {
        **os.environ,
        "DJANGO_SETTINGS_MODULE": "config.settings",
        "DJANGO_SECRET_KEY": os.environ.get("DJANGO_SECRET_KEY") or secrets.token_urlsafe(48),
        "ACCOUNT_EMAIL_DELIVERY_ENABLED": "true",
        "LOCAL_ACCOUNT_ACTIVATION_ENABLED": "false",
        "EMAIL_BACKEND": "django.core.mail.backends.smtp.EmailBackend",
        "EMAIL_HOST": "smtp.ionos.de", "EMAIL_PORT": "465",
        "EMAIL_USE_SSL": "true", "EMAIL_USE_TLS": "false",
        "EMAIL_SSL_SKIP_VERIFY": "false", "EMAIL_TIMEOUT": "10",
        "EMAIL_HOST_USER": address, "EMAIL_HOST_PASSWORD": password,
        "DEFAULT_FROM_EMAIL": address,
        "SITE_URL": f"http://localhost:{args.port}",
        "SITE_HOST": "localhost", "DJANGO_ALLOWED_HOSTS": "localhost,127.0.0.1",
        "CSRF_TRUSTED_ORIGINS": f"http://localhost:{args.port},http://127.0.0.1:{args.port}",
        "DJANGO_ENV": "local", "DJANGO_DEBUG": "true",
        "PASSWORD_RESET_DOMAIN": f"localhost:{args.port}",
        "RESET_LINK_DOMAIN": f"localhost:{args.port}",
        "PASSWORD_RESET_USE_HTTPS": "false", "RESET_LINK_USE_HTTPS": "false",
        "SECURE_SSL_REDIRECT": "false", "SESSION_COOKIE_SECURE": "false",
        "CSRF_COOKIE_SECURE": "false",
    }
    # Mail checks must not bootstrap admin accounts. Database preparation must
    # likewise take its backup before any account data could be changed.
    maintenance_environment = {
        **environment,
        "DJANGO_ADMIN_NAME": "", "ADMIN_NAME": "",
        "DJANGO_ADMIN_PASSWORD": "", "ADMIN_PASSWORD": "",
    }
    command = [str(python), str(server / "manage.py")]
    checked = subprocess.run(command + ["check_account_mail", "--connect"] + (["--send-test"] if args.send_test else []), cwd=server, env=maintenance_environment)
    if checked.returncode:
        return checked.returncode
    if args.check_only:
        return 0
    # Prepare in a separate process using the same runtime settings as runserver.
    # A failed backup or migration must prevent the server from starting.
    prepare = "import runpy; runpy.run_path(" + repr(str(Path(__file__).resolve())) + ")[\"prepare_database\"]()"
    prepared = subprocess.run([str(python), "-c", prepare], cwd=server, env=maintenance_environment)
    if prepared.returncode:
        return prepared.returncode
    print(f"Lokaler Test mit echtem Mailversand: http://localhost:{args.port}/register/", flush=True)
    print("Links in den E-Mails funktionieren nur auf diesem Computer. Keine Veröffentlichung.", flush=True)
    os.chdir(server)
    os.execve(python, command + ["runserver", f"127.0.0.1:{args.port}"], environment)


if __name__ == "__main__":
    raise SystemExit(main())
