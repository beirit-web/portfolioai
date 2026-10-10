# Weitere Bereinigung am 10. Oktober 2026

Erneute Prüfung nach dem Verschieben der 43 bestätigten ungenutzten Dateien. Bei dieser Prüfung wurden keine weiteren Projektdateien entfernt oder verschoben. Die nachfolgenden Größen beschreiben vorhandene Dateiinhalte, ohne virtuelle Umgebungen oder Abhängigkeiten als ungenutzt einzustufen.

## Größter weiterer Nutzen

| Bereich | Umfang | Vorgehen |
| --- | ---: | --- |
| Veraltete Bilder/Videos in `server/staticfiles/images/` | 31 Dateien / 316,49 MiB | Ausgabe mit `collectstatic --clear` neu aufbauen; WhiteNoise verwendet diesen Ordner. |
| Python-Caches außerhalb `.venv` und `node_modules` | 45 Ordner / 2,71 MiB | Neu erzeugbare Bytecode-Caches bereinigen. |
| Alte lokale Screenshots | 15 Dateien / 12,68 MiB | Ohne Quell- oder Dokumentationsverweise; außerhalb des Projekts archivieren. |
| Weitere bestätigte ungenutzte Dateien | 28 Dateien / 2,78 MiB | Varianten, exakte Dubletten und Startergrafik auslagern; aktive Gegenstücke und Originale bleiben erhalten. |
| Historische Bilder zur Archivprüfung | 10 Dateien / 9,32 MiB | Originale und Projektarchiv prüfen, dann außerhalb des Projekts aufbewahren. |
| Generierte Messberichte und Browserausgaben | 137,25 MiB | Dokumentationslinks erhalten oder mit der Archivierung anpassen. |

Python-Caches und die 15 lokalen Screenshots zusammen belegen **15,40 MiB**. Sie gehören nicht zu den aktiven Builds.

## Collectstatic-Ausgaben gezielt neu aufbauen

`server/staticfiles/` enthält insgesamt **344,07 MiB**; davon liegen **316,49 MiB** in 31 Bild- und Videokopien, deren Quellpfade nicht mehr existieren. Darunter sind alle acht früheren Videos, 19 alte Logos/Icons und vier alte Mobile-Vorschauen. Auch nach dem Entfernen oder Auslagern der Quellen liegen diese Kopien noch im Ausgabeordner.

Zusätzlich enthält `apps/portfolio-demos/sprachdienstleistungen/staticfiles/` **31,22 MiB** generierte Ausgabe. Beide Pfade sind als `STATIC_ROOT` konfiguriert und werden von WhiteNoise verwendet. Sie deshalb zusammen mit einem sauberen `collectstatic --clear` behandeln und die neu aufgebaute Ausgabe prüfen. Die aktiven Quellassets und Manifeste unter `server/assets/` bleiben erhalten.

Die exakten 31 veralteten Kopien und ihre fehlenden Quellpfade stehen im JSON unter `generated_files.stale_static_image_copies`.

## Weitere bestätigte Einzeldateien

28 weitere Kandidaten mit zusammen **2,78 MiB**. Die bisher vorgemerkten 22 Bilder sind vollständig eingeordnet: 15 ungenutzte Varianten/Dubletten können ausgelagert werden; sieben eigenständige Originale bleiben erhalten. Zusätzlich wurden vier ungenutzte 960px-Ausgaben von bereits integrierten Modulen gefunden. Die dokumentierten 1254px-Coveroriginale bleiben erhalten.

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

## Alte lokale Screenshots

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
| `runtime/lighthouse` | 74,44 MiB | Generierte Auswertung; vorhandene Dokumentationslinks beachten. |
| `runtime/performance` | 36,64 MiB | Generierte Auswertung; vorhandene Dokumentationslinks beachten. |
| `runtime/browser-checks` | 25,64 MiB | Generierte Auswertung; vorhandene Dokumentationslinks beachten. |
| `runtime/vokabelbox-checks` | 0,00 MiB | Generierte Auswertung; vorhandene Dokumentationslinks beachten. |
| `runtime/vokabelbox-preview` | 0,54 MiB | Generierte Auswertung; vorhandene Dokumentationslinks beachten. |
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

## Prüfbelege

Die Kandidaten wurden über Quell-/Template-/Build-Verweise, den Frontend-Importgraphen, konfigurierte statische Verzeichnisse und SHA-256-Vergleiche geprüft. Die bestätigten doppelten Shopbilder stimmen mit den erhaltenen Dateien in `public/assets/` überein. Alle 28 weiteren Kandidaten wurden anhand ihrer Größen und SHA-256-Prüfsummen geprüft; die jeweils zu behaltenden Gegenstücke sind vorhanden. Bei der Bildprüfung wurden 242 Bilddateien im Repository verglichen und dynamische Cover-/srcset-Pfade berücksichtigt. Die gemeldeten Einzeldateien sind vorhanden und haben die erfassten Größen; alle 31 alten Static-Quellpfade fehlen tatsächlich.

Da diese Prüfung nur einen Bericht erstellt, wurden keine Builds, Browser- oder Datenbanktests erneut ausgeführt.

[Maschinenlesbare Liste einschließlich aller Cacheordner und Static-Kopien](further-cleanup-2026-10-10.json).
