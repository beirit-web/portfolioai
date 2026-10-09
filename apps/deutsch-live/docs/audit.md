# DeutschLive Audit Events

Stand: 2026-07-14

Audit Events dokumentieren sicherheits- und abrechnungsrelevante Aktionen, ohne Payloads oder Secrets zu speichern.

## Ziel

- Admin- und Rollenänderungen nachvollziehbar machen.
- Premium-, Plan- und Subscription-Änderungen protokollieren.
- Permission- und Billing-Ereignisse als stabile Audit-Kategorien vorbereiten.
- Datenschutz durch Datenminimierung und Maskierung sicherstellen.

## Modell

`lessons.models.AuditEvent`

Gespeicherte Felder:

- `actor`: angemeldeter Nutzer oder leer
- `action`: stabile Aktion, z. B. `role_changed`
- `target_type`: betroffener Modelltyp
- `target_id`: betroffene Objekt-ID
- `path`: Request-Pfad ohne Querystring
- `request_id`: Korrelation mit Request-Logs
- `ip_address`: Client-IP, wenn vorhanden
- `metadata`: kleine, maskierte Zusatzdaten
- `created_at`

Nicht gespeichert werden:

- Passwörter
- Tokens
- Secrets
- Cookies
- Authorization-Header
- komplette Request-Bodies
- vollständige Billing-Webhooks

## Aktuelle Aktionen

- `admin_model_created`
- `admin_model_updated`
- `admin_model_deleted`
- `role_changed`
- `premium_status_changed`
- `subscription_changed`
- `plan_changed`
- `permission_denied`
- `billing_webhook_processed`

## Admin-Integration

Der Django-Admin nutzt `AuditAdminMixin` für:

- `UserProfile`
- `Plan`
- `Subscription`

Änderungen an `UserProfile.role` erzeugen `role_changed`.

Änderungen an `UserProfile.premium_status` erzeugen `premium_status_changed`.

Subscription-Änderungen erzeugen `subscription_changed`.

Plan-Änderungen erzeugen `plan_changed`.

## Middleware-Kontext

`AuditContextMiddleware` hängt unveränderliche Request-Metadaten an `request.audit_context`:

- Request-ID
- Pfad
- IP
- Methode

Audit-Schreiber nutzen zusätzlich `log_audit_event()` aus `lessons.audit`, damit Maskierung und Datenminimierung zentral bleiben.

## Datenschutz

`log_audit_event()` maskiert sensible Metadaten über `mask_sensitive_context()`.

Audit-Events sind im Admin read-only. Korrekturen erfolgen über fachliche Folgevorgänge, nicht durch Überschreiben historischer Audit-Einträge.
