import json
import re
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


TICKET_HEADER_RE = re.compile(r"^\[TICKET-(\d{3})\]\s+(.+)$")
DEPENDENCY_RE = re.compile(r"TICKET-\d{3}")
VALID_STATUSES = {"TODO", "IN PROGRESS", "REVIEW", "DONE", "BLOCKED"}


class Command(BaseCommand):
    help = "Validate DeutschLive ticket plan structure."

    def add_arguments(self, parser):
        default_plan = Path(settings.BASE_DIR).parent / "ticket_plan.txt"
        parser.add_argument("--path", default=str(default_plan), help="Path to ticket_plan.txt.")
        parser.add_argument("--json", action="store_true", dest="as_json", help="Print machine-readable JSON.")

    def handle(self, *args, **options):
        path = Path(options["path"])
        if not path.exists():
            raise CommandError(f"Ticket plan not found: {path}")

        report = validate_ticket_plan(path)
        if options["as_json"]:
            self.stdout.write(json.dumps(report, ensure_ascii=False, indent=2))
        else:
            marker = "OK" if report["ok"] else "ERROR"
            self.stdout.write(f"[{marker}] {report['ticketCount']} tickets checked in {path}")
            for issue in report["issues"]:
                self.stdout.write(f"[ERROR] {issue['code']}: {issue['message']}")

        if not report["ok"]:
            raise SystemExit(1)


def validate_ticket_plan(path: Path):
    tickets = []
    current = None

    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        header = TICKET_HEADER_RE.match(line)
        if header:
            current = {
                "id": f"TICKET-{header.group(1)}",
                "number": int(header.group(1)),
                "title": header.group(2).strip(),
                "line": line_number,
                "status": None,
                "dependsOn": [],
            }
            tickets.append(current)
            continue

        if not current:
            continue

        if line.startswith("Status:"):
            current["status"] = line.split(":", 1)[1].strip()
        elif line.startswith("Depends on:"):
            raw_dependencies = line.split(":", 1)[1].strip()
            if raw_dependencies.lower() != "keine":
                current["dependsOn"] = DEPENDENCY_RE.findall(raw_dependencies)

    issues = []
    seen_ids = set()
    ticket_ids = {ticket["id"] for ticket in tickets}

    for ticket in tickets:
        if ticket["id"] in seen_ids:
            _add_issue(issues, "duplicate_ticket", f"{ticket['id']} is duplicated.", ticket)
        seen_ids.add(ticket["id"])

        if ticket["status"] not in VALID_STATUSES:
            _add_issue(issues, "invalid_status", f"{ticket['id']} has invalid or missing status '{ticket['status']}'.", ticket)

        for dependency in ticket["dependsOn"]:
            if dependency == ticket["id"]:
                _add_issue(issues, "self_dependency", f"{ticket['id']} depends on itself.", ticket)
            elif dependency not in ticket_ids:
                _add_issue(issues, "missing_dependency", f"{ticket['id']} depends on unknown {dependency}.", ticket)

    graph = {ticket["id"]: ticket["dependsOn"] for ticket in tickets}
    for cycle in _find_cycles(graph):
        issues.append({"code": "dependency_cycle", "message": " -> ".join(cycle), "ticket": cycle[0], "line": None})

    return {
        "ok": not issues,
        "ticketCount": len(tickets),
        "issueCount": len(issues),
        "issues": issues,
    }


def _add_issue(issues, code, message, ticket):
    issues.append({"code": code, "message": message, "ticket": ticket["id"], "line": ticket["line"]})


def _find_cycles(graph):
    visited = set()
    active = []
    cycles = []

    def visit(node):
        if node in active:
            cycle = active[active.index(node):] + [node]
            if cycle not in cycles:
                cycles.append(cycle)
            return
        if node in visited:
            return
        active.append(node)
        for dependency in graph.get(node, []):
            if dependency in graph:
                visit(dependency)
        active.pop()
        visited.add(node)

    for node in graph:
        visit(node)
    return cycles
