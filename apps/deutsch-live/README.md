# DeutschLive

Die aktive TypeScript-/React-Oberfläche für Sprachlernen, Quiz, Notenrechner und
lokale Audioaufnahmen liegt in diesem Ordner. Ihr einziges Backend ist die Django-App
[server/lessons/](../../server/lessons/) im gemeinsamen Portfolio-Server.

Die React-API wird wie im Portfolio über `preact/compat` ausgeführt. Die Aliase
stehen in `vite.config.ts`; die Pakettypen bleiben mit React kompatibel. Die
Startseite gehört zum Einstiegsmodul, während Lern-, Quiz-, Dashboard-, Schreib-
und Notenrechner-Stile mit ihren jeweiligen Seiten geladen werden. Gemeinsame
Tokens und Basisstile liegen in `src/styles/main.css`.

Die eigenen Motive unter `src/assets/illustrations/` bleiben SVGs und werden mit
festen Abmessungen als dekorative Bilder eingebunden. Die Startseitenabschnitte
isolieren Layout und Stile, ohne Inhalte außerhalb des sichtbaren Bereichs zu
überspringen. Überschriften und Bedienelemente bleiben dadurch von Anfang an im
Zugänglichkeitsbaum. Die Browserprüfungen decken Scrollen, Tastaturbedienung und
200 Prozent Textgröße auf Deutsch und Russisch ab.

Die unveränderte [Preact-Lizenz](public/preact-LICENSE.txt) wird mit ausgeliefert.

Installation, Builds und Start stehen in der [Hauptanleitung](../../README.md#lokal-starten),
der technische Aufbau und die Ausgabeordner in der
[Architektur](../../docs/architecture.md#vom-quellcode-zur-ausgelieferten-seite).

Einstieg: `http://127.0.0.1:8000/deutschlive/`. Eigene Audioaufnahmen bleiben im Browser;
der bisherige Download-Einstieg `/deutschlive/recordings-archiv` bleibt bestehen.
Die Vokabelbox liegt im Hauptserver unter `/vokabelbox/`.

Neue Konten werden erst nach Bestätigung der E-Mail-Adresse freigeschaltet, auch
im Entwicklungsmodus. Bestätigungslinks und Passwortwiederherstellung verwenden
die gemeinsamen [Kontoformulare](../../server/pages/README.md#account-forms).
In der lokalen Demo stehen die E-Mails in der Serverkonsole.

Die [Prüfanleitung](../../docs/checks.md) beschreibt den gemeinsamen Workspace-Check
einschließlich der DeutschLive-TypeScript-Prüfung.
