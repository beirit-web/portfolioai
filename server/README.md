# Gemeinsamer Portfolio-Server

Django stellt Portfolio, Konten, Kontaktformular und die Demos bereit. Es gibt
keine zusätzlich zu startenden Projekt-Backends.

Installation, Frontend-Builds und gemeinsamer Serverstart stehen in der
[Hauptanleitung](../README.md#lokal-starten). Die
[Architektur](../docs/architecture.md) beschreibt Anwendungen, Routen und
Datenhaltung; die [Prüfanleitung](../docs/checks.md) erklärt die Backendtests.

Die lokale Konfiguration liest zuerst die optionale, ignorierte Datei
`server/.env.local` und danach die öffentlichen Vorgaben aus `server/.env`.
Die [Beispielvorlage](.env.example) dokumentiert die Variablen. Bereits gesetzte
Prozessvariablen haben bei demselben Variablennamen Vorrang vor beiden Dateien,
auch für Datenpfade. Lokale Overrides verwenden dieselben Variablennamen wie
die Beispielvorlage.
`ALLOWED_HOSTS` gilt ebenfalls bei `DEBUG=True`; zusätzliche lokale Hostnamen
oder LAN-Adressen werden in `server/.env.local` ausdrücklich zu `ALLOWED_HOSTS`
hinzugefügt. Für Zugriffe aus dem lokalen Netzwerk muss der Entwicklungsserver
auf `0.0.0.0:8000` lauschen. Nach Änderungen an Umgebungsdateien den Server
vollständig beenden und neu starten, damit der Autoreloader keine alten Werte
weiterverwendet.

Für Musterdaten und
deaktivierte Integrationen gelten die
[Portfolio-Grenzen](../README.md#musterdaten-und-grenzen).

Die Lizenz des Servers steht in [LICENSE](LICENSE).
