# Upload Validation Middleware

`UploadValidationMiddleware` validiert Multipart-Uploads fuer API-Requests, bevor View-Logik Dateien verarbeitet.

## Einstellungen

```env
SECURE_UPLOAD_MAX_SIZE_MB=5
SECURE_UPLOAD_ALLOWED_CONTENT_TYPES=image/jpeg,image/png,image/webp,application/pdf
UPLOAD_VALIDATION_ENABLED=true
UPLOAD_VALIDATION_PATH_PREFIXES=/api/
```

## Verhalten

- Geprueft werden `POST`, `PUT` und `PATCH` mit `multipart/form-data`.
- Der Request-Pfad muss mit einem Eintrag aus `UPLOAD_VALIDATION_PATH_PREFIXES` beginnen.
- `CONTENT_LENGTH` wird vor dem Multipart-Parsing gegen `SECURE_UPLOAD_MAX_SIZE_MB` geprueft.
- Jede Datei in `request.FILES` wird ueber `validate_private_upload()` validiert.

## Fehlercodes

| Status | Code | Bedeutung |
| --- | --- | --- |
| `400` | `invalid_multipart_upload` | Multipart-Body konnte nicht gelesen werden |
| `413` | `upload_too_large` | Datei oder Request ist groesser als erlaubt |
| `415` | `unsupported_upload_type` | MIME-Type ist nicht erlaubt |

Abgelehnte Uploads schreiben ein Security Event `upload_rejected` mit Pfad, Code, Content-Type, Groesse und Request-ID.
