# Weitere Bereinigung am 10. Oktober 2026

Die weitere Bereinigung ist abgeschlossen. **2.052 Dateien mit 530,71 MiB** liegen jetzt unter `~/Bilder/Bilder/Beirit-Digital-Bereinigung-2026-10-10`. Die Verzeichnisstruktur bleibt erhalten; `verschiebung.json` im Archiv enthält Größen und SHA-256-Prüfsummen. Alle Dateiinhalte wurden nach dem Transfer geprüft.

Die 28 bestätigten zusätzlichen ungenutzten Dateien, 15 alten Screenshots, 274 Berichtsdateien und 380 Python-Caches sind ausgelagert. Auch die beiden bisherigen statischen Ausgaben sind dort archiviert; im Projekt stehen frisch aufgebaute und geprüfte Ausgaben. Die 42 historischen Berichtslinks führen in das lokale Archiv.

## Erledigter Transfer

| Bereich | Umfang | Vorgehen |
| --- | ---: | --- |
| Veraltete Bilder/Videos in `server/staticfiles/images/` | 31 Dateien / 316,49 MiB | Mit den früheren Ausgaben archiviert; im neuen STATIC_ROOT fehlen diese Altdateien. |
| Python-Caches außerhalb `.venv` und `node_modules` | 45 Ordner / 2,71 MiB | 380 Cachedateien aus 45 Ordnern archiviert. |
| Alte lokale Screenshots | 15 Dateien / 12,68 MiB | Alle 15 Dateien archiviert. |
| Weitere bestätigte ungenutzte Dateien | 28 Dateien / 2,78 MiB | Alle 28 Dateien archiviert; aktive Gegenstücke und Originale sind erhalten. |
| Generierte Messberichte und Browserausgaben | 137,25 MiB | Alle 274 Dateien archiviert; 42 historische Links angepasst. |

Die archivierten Python-Caches und 15 lokalen Screenshots belegten **15,40 MiB**. Sie gehören nicht zu den aktiven Builds.

## Statische Ausgaben neu aufgebaut

Die bisherigen Ausgaben unter `server/staticfiles/` und `apps/portfolio-demos/sprachdienstleistungen/staticfiles/` wurden vor dem Austausch vollständig neu erzeugt und geprüft. Erst danach wurden die bisherigen Ausgabeordner in das Archiv verschoben. Beide neuen Ausgaben sind installiert.

| Aktiver Ausgabeordner | Dateien | Größe |
| --- | ---: | ---: |
| `server/staticfiles` | 444 | 19,76 MiB |
| `apps/portfolio-demos/sprachdienstleistungen/staticfiles` | 865 | 26,20 MiB |

Die 31 veralteten Bild-/Videokopien mit 316,49 MiB fehlen in der neuen Hauptserver-Ausgabe. Aktuelle Vite-Bundles, Logos, die gemeinsame Vokabelbox und sämtliche 226 Ziele des Sprachplattform-Manifests sind vorhanden. Die Vite-Manifeste und der Darstellungskatalog unter `server/assets/react-home-dist/.vite/` bleiben als aktive Quelldateien erhalten; versteckte Quellkataloge werden von collectstatic nicht als öffentliche Ausgabe kopiert.

## Archivierte bestätigte Einzeldateien

28 archivierte ungenutzte Dateien mit zusammen **2,78 MiB**. Die bisher vorgemerkten 22 Bilder sind vollständig eingeordnet: 15 ungenutzte Varianten/Dubletten sind ausgelagert; sieben eigenständige Originale bleiben erhalten. Zusätzlich wurden vier ungenutzte 960px-Ausgaben von bereits integrierten Modulen gefunden. Die dokumentierten 1254px-Coveroriginale bleiben erhalten.

| Datei | Größe | Beleg |
| --- | ---: | --- |
| `apps/portfolio-demos/online-shop/assets/apfel-streusel-stueck.jpg` | 0,04 MiB | Bytegleich zu apps/portfolio-demos/online-shop/public/assets/apfel-streusel-stueck.jpg. Vite publicDir ist public; App.jsx nutzt /static/portfolio/online-shop/assets/<name>.jpg, kein Import aus diesem Ordner. |
| `apps/portfolio-demos/online-shop/assets/erdbeer-sahne-torte.jpg` | 0,05 MiB | Bytegleich zu apps/portfolio-demos/online-shop/public/assets/erdbeer-sahne-torte.jpg. Vite publicDir ist public; App.jsx nutzt /static/portfolio/online-shop/assets/<name>.jpg, kein Import aus diesem Ordner. |
| `apps/portfolio-demos/online-shop/assets/himbeer-cheesecake.jpg` | 0,05 MiB | Bytegleich zu apps/portfolio-demos/online-shop/public/assets/himbeer-cheesecake.jpg. Vite publicDir ist public; App.jsx nutzt /static/portfolio/online-shop/assets/<name>.jpg, kein Import aus diesem Ordner. |
| `apps/portfolio-demos/online-shop/assets/karotten-walnuss-kuchen.jpg` | 0,05 MiB | Bytegleich zu apps/portfolio-demos/online-shop/public/assets/karotten-walnuss-kuchen.jpg. Vite publicDir ist public; App.jsx nutzt /static/portfolio/online-shop/assets/<name>.jpg, kein Import aus diesem Ordner. |
| `apps/portfolio-demos/online-shop/assets/mini-toertchen-box.jpg` | 0,06 MiB | Bytegleich zu apps/portfolio-demos/online-shop/public/assets/mini-toertchen-box.jpg. Vite publicDir ist public; App.jsx nutzt /static/portfolio/online-shop/assets/<name>.jpg, kein Import aus diesem Ordner. |
| `apps/portfolio-demos/online-shop/assets/schoko-ganache-stueck.jpg` | 0,04 MiB | Bytegleich zu apps/portfolio-demos/online-shop/public/assets/schoko-ganache-stueck.jpg. Vite publicDir ist public; App.jsx nutzt /static/portfolio/online-shop/assets/<name>.jpg, kein Import aus diesem Ordner. |
| `apps/portfolio-demos/online-shop/assets/schwarzwaelder-torte.jpg` | 0,06 MiB | Bytegleich zu apps/portfolio-demos/online-shop/public/assets/schwarzwaelder-torte.jpg. Vite publicDir ist public; App.jsx nutzt /static/portfolio/online-shop/assets/<name>.jpg, kein Import aus diesem Ordner. |
| `apps/portfolio-demos/online-shop/assets/zitronen-tarte.jpg` | 0,04 MiB | Bytegleich zu apps/portfolio-demos/online-shop/public/assets/zitronen-tarte.jpg. Vite publicDir ist public; App.jsx nutzt /static/portfolio/online-shop/assets/<name>.jpg, kein Import aus diesem Ordner. |
| `apps/portfolio-demos/botanic/client/public/vite.svg` | 0,00 MiB | Kein Dateiverweis in HTML, React-Quellen, Dokumentation oder übriger Projektkonfiguration; Startergrafik ist nicht Bestandteil der Oberfläche. |
| `server/assets/images/enbt-blur-336.webp` | 0,00 MiB | Verkleinerte 336px-/463px-Ausgabe ohne Referenzen oder dynamische Namensbildung; bytegleiche Ausgabe im jeweils anderen Projekt. Eine ursprüngliche enbt-blur.png bleibt unter der Sprachplattform erhalten. |
| `server/assets/images/enbt-blur-463.webp` | 0,00 MiB | Verkleinerte 336px-/463px-Ausgabe ohne Referenzen oder dynamische Namensbildung; bytegleiche Ausgabe im jeweils anderen Projekt. Eine ursprüngliche enbt-blur.png bleibt unter der Sprachplattform erhalten. |
| `server/assets/images/enbt-retouched-336.webp` | 0,01 MiB | Verkleinerte 336px-/463px-Ausgabe ohne Referenzen oder dynamische Namensbildung; bytegleiche Ausgabe im jeweils anderen Projekt. Beide unterschiedlichen PNG-Originalversionen der Retusche werden behalten. |
| `server/assets/images/enbt-retouched-463.webp` | 0,02 MiB | Verkleinerte 336px-/463px-Ausgabe ohne Referenzen oder dynamische Namensbildung; bytegleiche Ausgabe im jeweils anderen Projekt. Beide unterschiedlichen PNG-Originalversionen der Retusche werden behalten. |
| `server/assets/images/logotype_dark-320.webp` | 0,03 MiB | Alte 320px-Logovariante ohne Referenz in Quellen, Templates, Builds, Umgebungsdateien oder lokalen Render-/Lighthouse-Berichten. Aktuelle Logos verwenden aktueles-logo-* sowie beirit-web-favicon-mini.svg; keine dynamische Auswahl des logotype_dark-Stamms gefunden. |
| `apps/portfolio-demos/sprachdienstleistungen/assets/images/digital-avatar-336.webp` | 0,02 MiB | Bytegleich mit aktiv verwendeter Datei apps/portfolio-demos/sprachdienstleistungen/assets/images/digital-avatar-hair-336.webp; diese Hair-Datei wird im Template index.html:271–272 über explizites src/srcset geladen. Der Name ohne -hair hat keine Nutzungsreferenz. |
| `apps/portfolio-demos/sprachdienstleistungen/assets/images/digital-avatar-463.webp` | 0,03 MiB | Bytegleich mit aktiv verwendeter Datei apps/portfolio-demos/sprachdienstleistungen/assets/images/digital-avatar-hair-463.webp; diese Hair-Datei wird im Template index.html:271–272 über explizites src/srcset geladen. Der Name ohne -hair hat keine Nutzungsreferenz. |
| `apps/portfolio-demos/sprachdienstleistungen/assets/images/digital-man-portrait-336.webp` | 0,02 MiB | Ungenutzte 336px-/463px-Ausgabe ohne Referenzen oder dynamische Namensbildung; die hochaufgelöste digital-man-portrait.png wird als ursprüngliche Gestaltungsversion behalten. |
| `apps/portfolio-demos/sprachdienstleistungen/assets/images/digital-man-portrait-463.webp` | 0,03 MiB | Ungenutzte 336px-/463px-Ausgabe ohne Referenzen oder dynamische Namensbildung; die hochaufgelöste digital-man-portrait.png wird als ursprüngliche Gestaltungsversion behalten. |
| `apps/portfolio-demos/sprachdienstleistungen/assets/images/enbt-blur-336.webp` | 0,00 MiB | Verkleinerte 336px-/463px-Ausgabe ohne Referenzen oder dynamische Namensbildung; bytegleiche Ausgabe im jeweils anderen Projekt. Eine ursprüngliche enbt-blur.png bleibt unter der Sprachplattform erhalten. |
| `apps/portfolio-demos/sprachdienstleistungen/assets/images/enbt-blur-463.webp` | 0,00 MiB | Verkleinerte 336px-/463px-Ausgabe ohne Referenzen oder dynamische Namensbildung; bytegleiche Ausgabe im jeweils anderen Projekt. Eine ursprüngliche enbt-blur.png bleibt unter der Sprachplattform erhalten. |
| `apps/portfolio-demos/sprachdienstleistungen/assets/images/enbt-retouched-336.webp` | 0,01 MiB | Verkleinerte 336px-/463px-Ausgabe ohne Referenzen oder dynamische Namensbildung; bytegleiche Ausgabe im jeweils anderen Projekt. Beide unterschiedlichen PNG-Originalversionen der Retusche werden behalten. |
| `apps/portfolio-demos/sprachdienstleistungen/assets/images/enbt-retouched-463.webp` | 0,02 MiB | Verkleinerte 336px-/463px-Ausgabe ohne Referenzen oder dynamische Namensbildung; bytegleiche Ausgabe im jeweils anderen Projekt. Beide unterschiedlichen PNG-Originalversionen der Retusche werden behalten. |
| `server/assets/images/enbt-blur.png` | 0,25 MiB | Bytegleiche PNG-Dublette der erhaltenen Sprachplattform-Quelle; keine Referenz in Quellen, Builds, Umgebungsdateien oder lokalen Render-/Lighthouse-Berichten. |
| `apps/portfolio-demos/sprachdienstleistungen/assets/images/digital-avatar.png` | 1,84 MiB | Bytegleiche PNG-Dublette der behaltenen Hair-Quelle. Der sichtbare Avatar verwendet ausdrücklich die Hair-WebP-Namen in templates/pages/index.html:271–272. |
| `server/assets/images/portfolio-covers/deutschlive-cover-v1-960.webp` | 0,04 MiB | 960px-Ausgabe eines integrierten Moduls. PROJECT_COVERS enthält nur die sechs veröffentlichten Hauptprojekt-Slugs; das Build-Katalog und Detail-srcset werden genau daraus erzeugt. Integrierte Module sind aus Portfolio-Karten und /api/projects/ ausgeschlossen bzw. alte Projektpfade leiten zum Hauptprojekt. Keine aktive srcset-/Build-Nutzung dieser Ausgabe gefunden; dokumentiertes 1254px-Original behalten. |
| `server/assets/images/portfolio-covers/musikplayer-cover-v1-960.webp` | 0,02 MiB | 960px-Ausgabe eines integrierten Moduls. PROJECT_COVERS enthält nur die sechs veröffentlichten Hauptprojekt-Slugs; das Build-Katalog und Detail-srcset werden genau daraus erzeugt. Integrierte Module sind aus Portfolio-Karten und /api/projects/ ausgeschlossen bzw. alte Projektpfade leiten zum Hauptprojekt. Keine aktive srcset-/Build-Nutzung dieser Ausgabe gefunden; dokumentiertes 1254px-Original behalten. |
| `server/assets/images/portfolio-covers/wetter-cover-v1-960.webp` | 0,02 MiB | 960px-Ausgabe eines integrierten Moduls. PROJECT_COVERS enthält nur die sechs veröffentlichten Hauptprojekt-Slugs; das Build-Katalog und Detail-srcset werden genau daraus erzeugt. Integrierte Module sind aus Portfolio-Karten und /api/projects/ ausgeschlossen bzw. alte Projektpfade leiten zum Hauptprojekt. Keine aktive srcset-/Build-Nutzung dieser Ausgabe gefunden; dokumentiertes 1254px-Original behalten. |
| `server/assets/images/portfolio-covers/vokabelbox-cover-v1-960.webp` | 0,02 MiB | 960px-Ausgabe eines integrierten Moduls. PROJECT_COVERS enthält nur die sechs veröffentlichten Hauptprojekt-Slugs; das Build-Katalog und Detail-srcset werden genau daraus erzeugt. Integrierte Module sind aus Portfolio-Karten und /api/projects/ ausgeschlossen bzw. alte Projektpfade leiten zum Hauptprojekt. Keine aktive srcset-/Build-Nutzung dieser Ausgabe gefunden; dokumentiertes 1254px-Original behalten. |

### Originale aus der früheren Prüfliste behalten

| Originaldatei | Grund |
| --- | --- |
| `server/assets/images/portfolio-deutschlive-mobile.webp` | Kein aktueller Render-/Build-Verweis, aber eigenständiger historischer Original-Screenshot (390×844), keine SHA256-Dublette. docs/design/project-covers.md:5 hält ursprüngliche Screenshots ausdrücklich als Quelldateien fest; kein automatischer Löschkandidat. |
| `server/assets/images/portfolio-deutschlive-tablet.webp` | Kein aktueller Render-/Build-Verweis, aber eigenständiger historischer Original-Screenshot (768×1000), keine SHA256-Dublette. docs/design/project-covers.md:5 hält ursprüngliche Screenshots ausdrücklich als Quelldateien fest; kein automatischer Löschkandidat. |
| `apps/portfolio-demos/sprachdienstleistungen/assets/images/digital-avatar-hair.png` | Hochaufgelöste PNG-Quelle (1162×1353) der aktiv im Sprachplattform-Template verwendeten digital-avatar-hair-336.webp/-463.webp. Mindestens diese Ursprungsdatei behalten; digital-avatar.png ist bytegleich. |
| `apps/portfolio-demos/sprachdienstleistungen/assets/images/digital-man-portrait.png` | Eigenständige hochaufgelöste PNG-Gestaltungsversion (1162×1353), im gesamten Repository ohne identische Kopie. Zwei verkleinerte ungenutzte WebP-Varianten vorhanden; die Originalquelle behalten. |
| `apps/portfolio-demos/sprachdienstleistungen/assets/images/enbt-blur.png` | Eine erhaltene RGBA-PNG-Originalquelle (463×539) der alten Blur-Gestaltung. Bytegleiche Serverkopie ist redundant; diese Originalquelle behalten. |
| `apps/portfolio-demos/sprachdienstleistungen/assets/images/enbt-retouched-balanced.png` | Eigenständige PNG-Gestaltungsversion mit anderen Pixeln als enbt-retouched.png. Originale Retusche und diese balancierte Variante erhalten. |
| `apps/portfolio-demos/sprachdienstleistungen/assets/images/enbt-retouched.png` | Eigenständige PNG-Originalquelle der Retusche. SHA256 und dekodierte Pixel unterscheiden sich von enbt-retouched-balanced.png; keine Dublette und kein Ersatz durch verkleinerte WebP-Versionen. |

Die vier Originalcover `deutschlive-cover-v1.webp`, `musikplayer-cover-v1.webp`, `wetter-cover-v1.webp` und `vokabelbox-cover-v1.webp` unter `server/assets/images/portfolio-covers/` bleiben ebenfalls erhalten. Aktive öffentliche Porträts, das Avatar-srcset mit `digital-avatar-hair-*`, Kontaktgrafiken, Favicons und verwendete Shopfotos stehen nicht in der Bereinigungsliste.

## Historische Bilder und weitere Varianten

Die folgenden Dateien haben keine aktuellen Dateiverweise. Bei den Musikplayer-Bildern verweisen auch die historischen `app.js` und `style.css` nicht auf die Dateien; `index.html` leitet zum neuen DeutschLive-Modul. Sie sind dennoch als historisches Bildmaterial und nicht als jederzeit wiederherstellbarer Cache eingestuft. Das von den READMEs verwendete `assets/reference-image.png` bleibt erhalten.

| Datei | Größe |
| --- | ---: |
| `apps/portfolio-demos/online-shop/assets/apfel-streusel-stueck.webp` | 0,04 MiB |
| `apps/portfolio-demos/online-shop/assets/erdbeer-sahne-torte.webp` | 0,04 MiB |
| `apps/portfolio-demos/online-shop/assets/himbeer-cheesecake.webp` | 0,04 MiB |
| `apps/portfolio-demos/online-shop/assets/karotten-walnuss-kuchen.webp` | 0,04 MiB |
| `apps/portfolio-demos/online-shop/assets/mini-toertchen-box.webp` | 0,05 MiB |
| `apps/portfolio-demos/online-shop/assets/schoko-ganache-stueck.webp` | 0,03 MiB |
| `apps/portfolio-demos/online-shop/assets/schwarzwaelder-torte.webp` | 0,06 MiB |
| `apps/portfolio-demos/online-shop/assets/zitronen-tarte.webp` | 0,03 MiB |
| `apps/portfolio-demos/musikplayer/assets/track-image.jpeg` | 8,71 MiB |
| `apps/portfolio-demos/musikplayer/assets/track-image.webp` | 0,27 MiB |

## Archivierte lokale Screenshots

Keine aktuellen Referenzen in Quellcode oder Dokumentation gefunden. Alle Dateien sind bereits von Git ignoriert.

| Datei | Größe |
| --- | ---: |
| `screenshots/deutschlive-4k-optimized.png` | 2,22 MiB |
| `screenshots/deutschlive-4k.png` | 1,57 MiB |
| `screenshots/deutschlive-desktop-optimized.png` | 1,00 MiB |
| `screenshots/deutschlive-desktop-select.png` | 1,00 MiB |
| `screenshots/deutschlive-desktop.png` | 0,99 MiB |
| `screenshots/deutschlive-language-flag-filled.png` | 0,99 MiB |
| `screenshots/deutschlive-language-flag.png` | 0,99 MiB |
| `screenshots/deutschlive-language-globe.png` | 0,99 MiB |
| `screenshots/deutschlive-language-icons-open-desktop.png` | 1,00 MiB |
| `screenshots/deutschlive-language-icons-separated.png` | 1,00 MiB |
| `screenshots/deutschlive-mobile-optimized.png` | 0,25 MiB |
| `screenshots/deutschlive-mobile.png` | 0,24 MiB |
| `screenshots/weather-desktop-after.png` | 0,19 MiB |
| `screenshots/weather-desktop-final.png` | 0,14 MiB |
| `frontend/screenshots/weather-desktop-before.png` | 0,10 MiB |

## Messberichte und Werkzeuge

| Ordner | Größe | Einordnung |
| --- | ---: | --- |
| `runtime/lighthouse` | 74,44 MiB | Archiviert; künftige Messläufe können den ursprünglichen Ausgabeordner neu anlegen. |
| `runtime/performance` | 36,64 MiB | Archiviert; künftige Messläufe können den ursprünglichen Ausgabeordner neu anlegen. |
| `runtime/browser-checks` | 25,64 MiB | Archiviert; künftige Messläufe können den ursprünglichen Ausgabeordner neu anlegen. |
| `runtime/vokabelbox-checks` | 0,00 MiB | Archiviert; künftige Messläufe können den ursprünglichen Ausgabeordner neu anlegen. |
| `runtime/vokabelbox-preview` | 0,54 MiB | Archiviert; künftige Messläufe können den ursprünglichen Ausgabeordner neu anlegen. |
| `frontend/node_modules` | 302,76 MiB | Aktives Entwicklungswerkzeug oder Fallback; keine bestätigte ungenutzte Datei. |
| `apps/deutsch-live/frontend/node_modules` | 124,64 MiB | Aktives Entwicklungswerkzeug oder Fallback; keine bestätigte ungenutzte Datei. |
| `apps/portfolio-demos/botanic/client/node_modules` | 39,98 MiB | Aktives Entwicklungswerkzeug oder Fallback; keine bestätigte ungenutzte Datei. |
| `.venv` | 107,24 MiB | Aktives Entwicklungswerkzeug oder Fallback; keine bestätigte ungenutzte Datei. |
| `server/.venv` | 109,39 MiB | Aktives Entwicklungswerkzeug oder Fallback; keine bestätigte ungenutzte Datei. |
| `apps/deutsch-live/backend/.venv` | 91,67 MiB | Aktives Entwicklungswerkzeug oder Fallback; keine bestätigte ungenutzte Datei. |
| `apps/portfolio-demos/sprachdienstleistungen/.venv` | 61,55 MiB | Aktives Entwicklungswerkzeug oder Fallback; keine bestätigte ungenutzte Datei. |

`runtime/backups/` enthält eine Backup-Datei und gehört nicht zur Cachebereinigung. Auch Datenbanken, Medien und lokale Umgebungsdateien werden nicht pauschal entfernt.

## Abhängigkeiten und aktive Quellen

- `nodemon` ist in `frontend/package.json` und `apps/portfolio-demos/sprachdienstleistungen/package.json` ungenutzt. Bei einer Bereinigung jeweils die Abhängigkeit und das Lockfile gemeinsam aktualisieren. `apps/portfolio-demos/botanic/server/package.json` nutzt seine eigene `nodemon`-Abhängigkeit im `dev`-Skript und behält sie.
- Alle 86 Dateien unter `frontend/src` sind aus 23 Vite-Einstiegen oder sechs Tests erreichbar. Keine weiteren unverbundenen Frontend-Quellen oder fehlenden relativen Imports gefunden.
- Die verbleibenden Hauptserver- und Sprachplattform-Templates haben Aufrufer oder werden als Django-Fehler-/Auth-/Admin-Templates automatisch erkannt.
- Die aktiven DeutschLive-Builds, Sprachplattform-Shop-Builds, gemeinsamen Vokabelbox-Quellen und deren Lizenzen bleiben erhalten.
- Die Fly-Musterkonfigurationen werden von den Isolationstests gelesen. Das Hint.css-Paket ist im Template eingebunden und als statische Quelle eingetragen; deshalb nicht als ungenutzten Ordner entfernen.
- Öffentliche Eigentümerdetails, Originalbilder und Urheber-/Lizenzhinweise bleiben erhalten.

## Prüfung nach dem Transfer

- Alle 2.052 Archivdateien mit Größen und SHA-256-Prüfsummen geprüft; unabhängige Nachprüfung bestanden.
- Alle 62 geschützten Originale, aktiven Moduldateien und erhaltenen Bildkopien sind unverändert.
- Beide statischen Ausgaben vollständig neu aufgebaut und auf benötigte Assets beziehungsweise Manifestziele geprüft.
- Auf localhost:8000 liefern 44 aktive statische Assets HTTP 200; drei geprüfte entfernte Altdateien liefern HTTP 404.
- Frontendtests sowie 86 Django-Tests und 28 Browserprüfungen auf Handy/Desktop bestanden. Testdaten und neue Testausgaben lagen ausschließlich in temporären Verzeichnissen.
- Alle 42 archivierten Dokumentationsziele vorhanden; Links führen in das lokale Archiv.
- Datenbanken, Medien, Backups, virtuelle Umgebungen, aktive Abhängigkeiten und Lizenzoriginale sind erhalten.

[Maschinenlesbare Übersicht mit Archivstatus, Dateipfaden und Prüfsummen](further-cleanup-2026-10-10.json).
