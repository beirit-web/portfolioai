# Public portfolio workspace

- This repository is a portfolio with demonstrative source code and sample configuration.
- The only Git push destination is `git@github.com:beiritdigital/angefangenes-portfolio.git`.
- Do not push unless the user explicitly requests a push for the current changes.
- Never deploy from this workspace to Fly, IONOS or a previous production environment.
- Keep payments and billing webhooks disabled. Real credentials must never enable transactions here.
- Use fictional client records and reserved example domains in code, fixtures, legal examples and deployment documentation.
- Preserve the owner's real public details in Kontakt and Über mich. Keep author and third-party license attribution intact.
- Plain `.env` files may be committed only as fictional public samples matching their `.env.example` templates. All environment files must contain sample data only, including contact email values.
- Keep local overrides such as `.env.local`, `.env.production` and `.env.original` ignored and uncommitted. Do not commit virtual environments, databases, client data, secret files or old repository history.
- Run `python3 scripts/check_portfolio_data.py` before committing or pushing, plus checks appropriate to the changes.
