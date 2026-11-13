from django.core.management.base import BaseCommand, CommandError

from shop.submissions import cleanup_demo_data, retention_days


class Command(BaseCommand):
    help = "Remove expired anonymous shop demo requests and expired submission counters."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=retention_days(), help="Retention of anonymous demo requests in days (default: 30).")
        parser.add_argument("--dry-run", action="store_true", help="Report counts without deleting anything.")

    def handle(self, *args, **options):
        if not 1 <= options["days"] <= 3650:
            raise CommandError("--days must be between 1 and 3650.")
        counts = cleanup_demo_data(days=options["days"], dry_run=options["dry_run"])
        mode = "Would remove" if options["dry_run"] else "Removed"
        self.stdout.write(f"{mode} {counts['orders']} anonymous demo requests and {counts['budgets']} expired counters.")
