# Public portfolio workspace

- This repository is a portfolio with demonstrative source code and sample configuration.
- The only Git push destination is `git@github.com:beiritdigital/angefangenes-portfolio.git`.
- Never deploy from this workspace to Fly, IONOS or a previous production environment.
- Keep payments and billing webhooks disabled. Real credentials must never enable transactions here.
- Use fictional client records and reserved example domains in code, fixtures, legal examples and deployment documentation.
- Preserve the owner's real public details in Kontakt and Über mich. Keep author and third-party license attribution intact.
- Do not commit local environments, databases, client data, secret files or old repository history.
- Run `python3 scripts/check_portfolio_data.py` before committing or pushing, plus checks appropriate to the changes.
