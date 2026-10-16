# DeutschLive

Die aktive TypeScript-/React-Oberfläche für Sprachlernen, Quiz, Notenrechner und
lokale Audioaufnahmen liegt in diesem Ordner. Ihr einziges Backend ist die Django-App
[server/lessons/](../../server/lessons/) im gemeinsamen Portfolio-Server.

Installation, Builds und Start stehen in der [Hauptanleitung](../../README.md#lokal-starten),
der technische Aufbau und die Ausgabeordner in der
[Architektur](../../docs/architecture.md#vom-quellcode-zur-ausgelieferten-seite).

Einstieg: `http://127.0.0.1:8000/deutschlive/`. Eigene Audioaufnahmen bleiben im Browser;
der bisherige Download-Einstieg `/deutschlive/recordings-archiv` bleibt bestehen.
Die Vokabelbox liegt im Hauptserver unter `/vokabelbox/`.

Die [Prüfanleitung](../../docs/checks.md) beschreibt den gemeinsamen Workspace-Check
einschließlich der DeutschLive-TypeScript-Prüfung.
