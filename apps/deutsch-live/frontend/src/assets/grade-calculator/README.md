# Notenrechner-Ergebnismedien

Diese unveränderten Dateien stammen aus dem Notenrechner von Beirit Digital
unter `apps/portfolio-demos/notenrechner/`: `img/success.webp`, `img/lost.webp`,
`gewonnen.mp3` und `lost-signal.mp3`. Die dortige README führt die MIT-Lizenz an;
bestehende Autoren- und Lizenzangaben bleiben bei der Quelle erhalten.

Die lokalen Kopien halten den DeutschLive-Frontendbuild unabhängig von
`server/assets/` und innerhalb des Docker-Buildkontexts `apps/deutsch-live/`.
Bei Änderungen an den ursprünglichen Medien diese Kopien ebenfalls abgleichen.
Vite erzeugt für alle Buildvarianten eigene Asset-URLs. Bilder und Audio werden
erst für das berechnete Ergebnis geladen.
