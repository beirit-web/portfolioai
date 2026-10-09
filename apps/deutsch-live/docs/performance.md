# DeutschLive Performance-Basis

Stand: 2026-07-14

## Frontend

Code Splitting ist in `frontend/src/App.tsx` vorbereitet:

- Trainingsseiten, Dashboard, Account, Handbuch und rechtliche Seiten werden per `React.lazy` geladen.
- Die Landingpage bleibt im Initial-Bundle, weil sie die erste öffentliche Ansicht ist.
- Ein gemeinsamer Suspense-Fallback nutzt `SkeletonPanel`.

GET-Caching ist in `frontend/src/api.ts` vorbereitet:

- `/api/topics/`: 5 Minuten
- `/api/topics/<id>/`: 5 Minuten
- `/api/page/`: 10 Minuten

Nicht gecacht werden nutzerspezifische oder häufig veränderliche Daten:

- `/api/dashboard/`
- Account-/Session-Endpunkte
- Writing-Historie
- Mutationen per POST/PATCH

## Backend

Geprüfte Query-Grundlage:

- `learning_content.py` nutzt `prefetch_related` für Szenen, Dialogzeilen, Vokabeln und Quizantworten.
- `scene_cards_from_db()` nutzt `select_related("category")`.
- `dashboard_service.py` nutzt `select_related("category")` für Szenenabfragen, die nach Kategorie sortieren.
- Billing-Subscriptions werden in `views.py` mit `select_related("plan")` geladen.

## Pagination-Kandidaten

Später paginieren oder cursor-basiert laden:

- Writing-Historie (`/api/writing/exercises/`)
- Dashboard: `recentAttempts`, `botHistory`, `vocabulary`
- Datenexport bei sehr aktiven Nutzerkonten
- Admin-/Feedback-Listen
- zukünftige Content-Module mit vielen Szenen/Vokabeln

## Nächste Performance-Schritte

- Bundle-Größen im CI als Warnung prüfen.
- Dashboard-Queries mit Query-Count-Tests absichern.
- Server-seitige Pagination für Writing-Historie und Feedback einführen.
- Cache-Invalidation für Content-Editor-Flows ergänzen, sobald Admin-Content live gepflegt wird.
