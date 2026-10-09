import json

from django.core.management.base import BaseCommand

from .check_mail_dns import build_mail_dns_checks
from .production_check import build_production_checks


MANUAL_CHECKS = [
    {
        "code": "smtp_inbox_delivery",
        "message": "Run send_test_email with production SMTP and confirm inbox delivery.",
    },
    {
        "code": "legal_pages_public",
        "message": "Open Impressum, Datenschutz, Nutzungsbedingungen and Kontakt on the deployed domain.",
    },
    {
        "code": "core_user_flows",
        "message": "Test registration, email confirmation, login, password reset, dashboard, quiz, writing and feedback on production.",
    },
    {
        "code": "backup_restore",
        "message": "Confirm current database backup and restore path in production or staging.",
    },
    {
        "code": "domain_https_headers",
        "message": "Verify HTTPS redirect, HSTS and browser security headers on the public domain.",
    },
]


class Command(BaseCommand):
    help = "Build a combined DeutschLive public launch readiness report."

    def add_arguments(self, parser):
        parser.add_argument("--domain", default="portfolio.example.invalid", help="Mail/public domain used for launch checks.")
        parser.add_argument("--dkim-selector", default="", help="Optional DKIM selector for mail DNS checks.")
        parser.add_argument("--skip-dns", action="store_true", help="Skip live DNS lookups.")
        parser.add_argument("--json", action="store_true", dest="as_json", help="Print machine-readable JSON.")
        parser.add_argument("--fail-on-warning", action="store_true", help="Return non-zero when warnings or manual checks remain.")

    def handle(self, *args, **options):
        payload = build_public_launch_report(
            domain=str(options["domain"]).strip().strip(".").lower(),
            dkim_selector=str(options["dkim_selector"]).strip().strip("."),
            include_dns=not options["skip_dns"],
        )

        if options["as_json"]:
            self.stdout.write(json.dumps(payload, ensure_ascii=False, indent=2))
        else:
            self.stdout.write(f"DeutschLive public launch report for {payload['domain']}")
            for section in payload["sections"]:
                self.stdout.write(f"\n[{section['name']}]")
                for item in section["checks"]:
                    marker = {"ok": "OK", "warning": "WARN", "error": "ERROR", "manual": "MANUAL"}[item["level"]]
                    self.stdout.write(f"[{marker}] {item['code']}: {item['message']}")

        if payload["errorCount"] or (options["fail_on_warning"] and not payload["launchReady"]):
            raise SystemExit(1)


def build_public_launch_report(domain: str = "portfolio.example.invalid", dkim_selector: str = "", include_dns: bool = True):
    production_checks = build_production_checks()
    sections = [{"name": "production", "checks": production_checks}]

    if include_dns:
        mail_dns_checks = build_mail_dns_checks(domain=domain, dkim_selector=dkim_selector)
    else:
        mail_dns_checks = [{"level": "warning", "code": "mail_dns_skipped", "message": "Mail DNS checks were skipped."}]
    sections.append({"name": "mailDns", "checks": mail_dns_checks})

    manual_checks = [{"level": "manual", **item} for item in MANUAL_CHECKS]
    sections.append({"name": "manualProduction", "checks": manual_checks})

    flat_checks = [item for section in sections for item in section["checks"]]
    error_count = sum(1 for item in flat_checks if item["level"] == "error")
    warning_count = sum(1 for item in flat_checks if item["level"] == "warning")
    manual_count = sum(1 for item in flat_checks if item["level"] == "manual")

    return {
        "ok": error_count == 0,
        "launchReady": error_count == 0 and warning_count == 0 and manual_count == 0,
        "domain": domain,
        "errorCount": error_count,
        "warningCount": warning_count,
        "manualCount": manual_count,
        "sections": sections,
    }
