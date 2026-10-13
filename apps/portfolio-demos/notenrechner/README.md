# Notenrechner

Statische Demo für eine Durchschnittsnote mit bis zu 20 Fächern, optionalem Namen,
Komma-/Punktwerten und Ergebnisbild samt Ton. Fachzahlen müssen ganzzahlig sein.
Die Aufrundung verwendet ganze Hundertstel; ein Durchschnitt von `4,0` gilt als
nicht bestanden. Neue Noten und Neustart verwerfen das Ergebnis und stoppen Audio.

Die gepflegten Quellen liegen in `apps/portfolio-demos/notenrechner/`, die
Auslieferungskopie in `server/assets/portfolio/notenrechner/`.
Einstieg: `/static/portfolio/notenrechner/index.html`.
Die React-Variante gehört zu DeutschLive und wird mit dessen Frontend gebaut.

## Prüfen

```bash
npm --prefix frontend run test:browser -- grade-responsive.spec.cjs
npm --prefix frontend run test:browser -- learning-performance.spec.cjs
```

Die Prüfungen decken schmale und breite Bildschirme, vergrößerte Schrift,
Validierung, Rundung, Ergebnisbilder und Audiosteuerung ab.
Die ursprünglichen PNGs und Audiodateien bleiben als Medienquellen erhalten;
kleine WebP-Ausgaben und das 32px-Favicon werden im Browser verwendet.

Die ursprüngliche Projektbeschreibung nennt die MIT-Lizenz; eine separate
LICENSE-Datei liegt in diesem Demo-Ordner nicht vor. Medienherkunft des Moduls:
`apps/deutsch-live/frontend/src/assets/grade-calculator/README.md`.
