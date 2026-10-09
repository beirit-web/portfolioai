import json
import subprocess

from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Check public DNS records required for DeutschLive mail delivery."

    def add_arguments(self, parser):
        parser.add_argument("--domain", default="portfolio.example.invalid", help="Mail domain to check.")
        parser.add_argument("--dkim-selector", default="", help="Optional DKIM selector, for example default or mail.")
        parser.add_argument("--json", action="store_true", dest="as_json", help="Print machine-readable JSON.")
        parser.add_argument("--timeout", type=int, default=5, help="Timeout per DNS query in seconds.")

    def handle(self, *args, **options):
        domain = str(options["domain"]).strip().strip(".").lower()
        dkim_selector = str(options["dkim_selector"]).strip().strip(".")
        timeout = max(1, int(options["timeout"]))
        if not domain or "." not in domain:
            raise CommandError("Provide a valid DNS domain, for example portfolio.example.invalid.")

        checks = build_mail_dns_checks(domain=domain, dkim_selector=dkim_selector, timeout=timeout)
        has_errors = any(item["level"] == "error" for item in checks)
        has_warnings = any(item["level"] == "warning" for item in checks)
        payload = {
            "ok": not has_errors,
            "domain": domain,
            "warningCount": sum(1 for item in checks if item["level"] == "warning"),
            "errorCount": sum(1 for item in checks if item["level"] == "error"),
            "checks": checks,
        }

        if options["as_json"]:
            self.stdout.write(json.dumps(payload, ensure_ascii=False, indent=2))
        else:
            for item in checks:
                marker = {"ok": "OK", "warning": "WARN", "error": "ERROR"}[item["level"]]
                self.stdout.write(f"[{marker}] {item['code']}: {item['message']}")

        if has_errors:
            raise SystemExit(1)
        if has_warnings and not options["as_json"]:
            self.stdout.write("[WARN] Mail DNS is not fully launch-ready yet.")


def build_mail_dns_checks(domain: str, dkim_selector: str = "", timeout: int = 5):
    checks = []

    def add(level, code, message, records=None):
        item = {"level": level, "code": code, "message": message}
        if records is not None:
            item["records"] = records
        checks.append(item)

    mx_records = _dig(domain, "MX", timeout)
    if mx_records["ok"] and mx_records["records"]:
        add("ok", "mx", "MX record is present.", mx_records["records"])
    else:
        add("error", "mx", mx_records["error"] or "MX record is missing.", mx_records["records"])

    txt_records = _dig(domain, "TXT", timeout)
    spf_records = [record for record in txt_records["records"] if "v=spf1" in record.lower()]
    if txt_records["ok"] and spf_records:
        add("ok", "spf", "SPF record is present.", spf_records)
    elif txt_records["ok"]:
        add("error", "spf", "SPF TXT record is missing.", txt_records["records"])
    else:
        add("error", "spf", txt_records["error"] or "SPF TXT lookup failed.", txt_records["records"])

    dmarc_domain = f"_dmarc.{domain}"
    dmarc_records = _dig(dmarc_domain, "TXT", timeout)
    dmarc_matches = [record for record in dmarc_records["records"] if "v=dmarc1" in record.lower()]
    if dmarc_records["ok"] and dmarc_matches:
        add("ok", "dmarc", "DMARC record is present.", dmarc_matches)
    elif dmarc_records["ok"]:
        add("error", "dmarc", "DMARC TXT record is missing.", dmarc_records["records"])
    else:
        add("error", "dmarc", dmarc_records["error"] or "DMARC TXT lookup failed.", dmarc_records["records"])

    if dkim_selector:
        dkim_domain = f"{dkim_selector}._domainkey.{domain}"
        dkim_records = _dig(dkim_domain, "TXT", timeout)
        dkim_matches = [record for record in dkim_records["records"] if "v=dkim1" in record.lower() or "p=" in record.lower()]
        if dkim_records["ok"] and dkim_matches:
            add("ok", "dkim", "DKIM record is present.", dkim_matches)
        elif dkim_records["ok"]:
            add("error", "dkim", "DKIM TXT record is missing.", dkim_records["records"])
        else:
            add("error", "dkim", dkim_records["error"] or "DKIM TXT lookup failed.", dkim_records["records"])
    else:
        add("warning", "dkim", "DKIM selector not provided; run again with --dkim-selector once the mail provider is known.")

    return checks


def _dig(name: str, record_type: str, timeout: int):
    try:
        result = subprocess.run(
            ["dig", "+short", record_type, name],
            capture_output=True,
            check=False,
            text=True,
            timeout=timeout,
        )
    except FileNotFoundError:
        return {"ok": False, "records": [], "error": "dig command is not installed."}
    except subprocess.TimeoutExpired:
        return {"ok": False, "records": [], "error": f"DNS lookup timed out for {record_type} {name}."}

    records = [line.strip().strip('"') for line in result.stdout.splitlines() if line.strip()]
    if result.returncode != 0:
        error = result.stderr.strip() or f"DNS lookup failed for {record_type} {name}."
        return {"ok": False, "records": records, "error": error}
    return {"ok": True, "records": records, "error": ""}
