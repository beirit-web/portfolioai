# DeutschLive Architektur-Audit

Stand: 2026-07-14

## Befund

Die MVP-Basis ist funktional, aber die Codebasis sollte vor weiteren großen Features in kleinere Zuständigkeitsbereiche getrennt werden.

Größte Dateien:

- `backend/lessons/views.py`: API-Endpoints, Auth-Helfer, Serialisierung, Dashboard-Aufbereitung und fachliche Schreib-/Quizlogik in einer Datei
- `backend/lessons/models.py`: viele Domänenmodelle in einem Modul, aktuell noch tragbar
- `frontend/src/components/Dashboard.tsx`: Dashboard-Daten, Darstellung und Zustände eng gekoppelt
- `frontend/src/components/QuizMode.tsx`: Quizlogik und UI eng gekoppelt
- `frontend/src/components/LandingPage.tsx`: öffentliche Startseite mit viel Präsentationslogik
- `frontend/src/api.ts`: zentraler Client ist sinnvoll, braucht aber langfristig klarere Response-Typen

Wiederkehrende Muster:

- Fehlerantworten werden direkt per `JsonResponse({"error": ...})` erstellt.
- Serialisierung liegt in privaten `_serialize_*`-Funktionen am Ende von `views.py`.
- Login-, Premium- und Staff-Prüfungen waren vor dem Audit auf `views.py` und `security.py` verteilt.
- Fachlogik für Dashboard, Empfehlungen, Writing und Billing sitzt teilweise direkt in Views.

## Refactoring-Reihenfolge

1. Permissions zentralisieren: API-Login, Premium und Staff-Zugriff in einem Modul bündeln.
2. API-Struktur säubern: einheitliche Fehlerantworten und Response-Konventionen einführen.
3. Services trennen: Dashboard-, Learning-, Writing- und Billing-Logik aus `views.py` herausziehen.
4. Serializer/DTO-Schicht vorbereiten: `_serialize_*`-Funktionen thematisch auslagern.
5. Settings lesbarer machen: ENV-Blöcke für Security, Mail, Monitoring, Billing, AI und Realtime trennen.
6. Frontend danach angehen: Dashboard und Quiz in kleinere State-, View- und Helper-Einheiten teilen.

## Sofortmaßnahme

Als erster verhaltensneutraler Schritt wurden Account-Token/Profile-Helfer und Permission-Decorators aus `views.py` ausgelagert:

- `backend/lessons/account_service.py`
- `backend/lessons/permissions.py`

Damit ist die Grundlage für `TICKET-091` gelegt, ohne API-Verhalten zu ändern.
