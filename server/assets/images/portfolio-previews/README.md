# Actual demo screenshots

Captured locally on 2026-10-09 from the public applications with a disposable,
migration-seeded database. Desktop images are 1440 × 1000 pixels; mobile images
are 390 × 844 pixels. All originals are viewport screenshots encoded as WebP. Responsive desktop
variants have widths of 480, 640, 768 and 960 pixels; mobile variants are 256 and 320
pixels wide. Gallery links still open the original image.

| File prefix | Actual demo route | Captured state |
| --- | --- | --- |
| `online-shop` | `/shop/` | Seeded cake catalog; mobile view scrolled to the first product. |
| `vertragsgenerator` | `/vertragsgenerator/` | Initial rental-contract editor with fictional sample parties and addresses. |
| `enbt-botanic` | `/botanic/` | Public search interface with its real offline message; no plant results were fabricated. |
| `wohnungssuche-bodensee` | `/static/portfolio/wohnungssuche/index.html` | Desktop dashboard; mobile offers and filters. The application's own local demo listings are used. |
| `notenrechner` | `/static/portfolio/notenrechner/index.html` | Real anonymous calculation: desktop grades 1, 2, 3; mobile grade 2. |
| `sprachdienstleistungen` | `/deutschlive/learn` | Public bakery lesson opened from `/deutschlive/`, with German interface and the existing bilingual learning content. |

Browser requests to external HTTP(S) origins were blocked. The server's external
API requests were also blocked through a loopback proxy, so Botanic intentionally
shows its unavailable-source state. Local images and fonts finished loading
before capture. No login, payment or live customer data was used. Existing
software content, branding and attribution were preserved.

## Reproduce

Start the disposable server in one terminal:

```sh
HTTP_PROXY=http://127.0.0.1:9 HTTPS_PROXY=http://127.0.0.1:9 ALL_PROXY=http://127.0.0.1:9 NO_PROXY=127.0.0.1,localhost server/.venv/bin/python scripts/run_browser_checks.py
```

Run the capture from the repository root in another terminal, then stop the
server with Ctrl+C:

```sh
node scripts/capture_portfolio_previews.cjs
```

Optional project slugs limit the capture, for example:

```sh
node scripts/capture_portfolio_previews.cjs online-shop
```

The script uses the installed frontend Playwright browser and Pillow in the
server virtual environment. Temporary PNG intermediates are removed.

Regenerate responsive candidates from existing original files without recapturing:

```sh
server/.venv/bin/python scripts/build_responsive_image_variants.py server/assets/images/portfolio-previews/*-desktop.webp --widths 480 640 768 960
server/.venv/bin/python scripts/build_responsive_image_variants.py server/assets/images/portfolio-previews/*-mobile.webp --widths 256 320
server/.venv/bin/python scripts/build_responsive_image_variants.py server/assets/images/portfolio-covers/*-cover-v1.webp --widths 480 640 768 960
```

Add `--missing-only` to retain existing variants. Originals remain unchanged.
