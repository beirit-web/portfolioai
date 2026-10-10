# Portfolio-Darstellung

Die Startseite stellt Eugen Beirit und seine technischen Schwerpunkte vor.
Direkte Links zu Projekten und Kontakt stehen im Einstieg; die Projektübersicht
ist auch über die Hauptnavigation erreichbar. Die Würfelanimation berücksichtigt
weiterhin reduzierte Bewegung und den Datensparmodus.

Projektberichte zeigen Ausgangssituation, Umsetzung, Ergebnis und eine konkrete
technische Entscheidung. Die Projektübersicht und Berichte führen direkt zu den
Anwendungen und Demos.

Die illustrierten Cover bleiben in Übersicht und Einstieg erhalten. Eine
zusätzliche Galerie zeigt pro Anwendung eine echte Desktop- und Mobilansicht.
Die Bilder wurden mit einer temporären Datenbank und fiktiven Beispieldaten
erstellt. Botanic zeigt dabei seinen tatsächlichen Zustand bei ausgefallener
externer Pflanzensuche. Aufnahmezustände, Routen und der reproduzierbare Ablauf
stehen in [der Vorschau-Dokumentation](../../server/assets/images/portfolio-previews/README.md).

Die Wohnungssuche unterscheidet die vereinfachte Portfolio-Demo vom separaten
Django-Quellprojekt. Der Vertragsgenerator wird als Django-Anwendung mit
serverseitiger Prüfung beschrieben. Die Sprachplattform ist eine technische
Fallstudie mit Lernmodulen; Sprachdienstleistungen werden darüber nicht gebucht.

Die deutschen, russischen und ukrainischen Texte stehen in den Frontend-Locales.
Der API-Abgleich ergänzt technische Entscheidungen und verwendet für bekannte
Projekte die übersetzten Inhalte bei russischer oder ukrainischer Browsersprache.
Individuell gepflegte deutsche API-Beschreibungen bleiben erhalten.

Migration `0050_refresh_portfolio_case_studies` berichtigt alte Beispieltexte und
den früheren Live-Status der Sprachplattform. Sie wird über den normalen lokalen
Einrichtungsschritt `python server/manage.py migrate` angewendet und überschreibt
keine abweichenden individuellen Beschreibungstexte.

Die Browserprüfungen kontrollieren direkte Navigation auch bei 320 Pixel Breite,
geladene Galerien, die Ersatzdarstellung bei API-Ausfall und die
Bedienung mit ukrainischer Browsersprache. Der gemeinsame Prüfablauf ist in
[Beirit Web prüfen](beirit-checks.md) dokumentiert.
