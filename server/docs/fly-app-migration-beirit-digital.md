# App-Migration als Portfolio-Muster

Die ehemaligen App- und Kontenzuordnungen sind durch Musterdaten ersetzt.
Das Beispiel in `server/fly.toml` verwendet `portfolio-demo-example` und
`https://portfolio.example.invalid`. Es gibt kein aktives Hosting-Ziel.

## Beispielablauf mit synthetischen Daten

1. Build und Django-Checks lokal ausführen.
2. Die Zielkonfiguration getrennt von anderen Demo-Apps prüfen.
3. Eine leere lokale SQLite-Datenbank migrieren und Musterinhalte anlegen.
4. Statische Dateien erzeugen; Medien und Datenbanken bleiben unversioniert.
5. Anmeldung, Kontaktformular, Host-/CSRF-Verhalten und Reset-Mails mit
   synthetischen Daten und dem Console-Mail-Backend prüfen.
6. Den Quellcode nach
   `git@github.com:beiritdigital/angefangenes-portfolio.git` pushen.

Eine echte Migration würde zusätzlich eine geprüfte Sicherung, ein
Wartungsfenster, getrennte Zugangsdaten und einen Rückweg benötigen. Dieser
Portfolio-Stand enthält keine Zugangsdaten, realen DNS-Einträge oder
Export-Tokens. Automatische Deployments und Secret-/Deploy-Skripte sind
deaktiviert.

Siehe [Hosting-Architektur](fly-migration.md) und
[Domain-Muster](fly-domain-beirit-digital.md).
