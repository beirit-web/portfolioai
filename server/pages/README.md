# Portfolio data boundaries

The active `pages` models are `Project`, `Profile`, `ChatMessage`, `WeatherSearch`,
the three housing models, and the short-lived `LoginAttemptBucket` login budget.
Authentication attempts share an atomic database counter across portfolio,
DeutschLive, housing, Django's built-in login and the local admin login. Keys hash
the direct peer address and account identity; forwarded headers do not change the
budget. Successful authentication resets the budget. Expired buckets are removed
on subsequent login requests.

The following models are retained solely for compatibility with existing local
databases and historical migrations: `AnonymousClient`, `InterpreterApplication`,
`ServicePrice`, `PaymentRequest`, `PayPalPayment`, `ChatReply`, `AccountDocument`,
`AccountNotice`, `CallbackRequest`, `Appointment`, and `UnavailableDay`. They have
no active portfolio routes or admin registrations. Some regression tests keep
fictional historical rows to verify that retired features stay unavailable.

Do not remove their tables or migration history as routine cleanup. Removing them
requires an explicit data migration/export decision for existing local databases.
Payments and billing webhooks remain disabled independently of those old tables.

Housing tokens and DeutschLive's supplementary authentication cookie contain a
password-bound authentication hash. A password change invalidates earlier tokens.
Existing tokens created before this change require a fresh login. The supplementary
DeutschLive cookie always requires an authenticated Django session as well.

## Account forms

The portfolio navigation has no login, registration or profile entry. Account
entry points belong to the cake shop, ENBT Botanic, housing, the standalone grade
calculator and DeutschLive. They use the same user database; existing credentials
remain valid across projects. The grade calculator still works without signing in
and does not store calculations in the account.

`account_projects.py` derives project branding and return links from validated
local project paths. Shared login, registration and profile pages retain that
context. Password recovery accepts only known login destinations, including a
shared login with a local project return path. Its emailed link also retains the
destination when opened in another browser. External return URLs remain rejected.

`/login/` and `/register/` provide the shared account forms. Login accepts the
account email, including accounts created by DeutschLive or housing; their API
logins also accept usernames. Email and username matching is case-insensitive;
ambiguous historical identities are rejected rather than assigned arbitrarily.
Every registration requires activation before the account becomes active,
including DeutschLive and housing. Both API registration handlers return
`emailVerificationRequired: true` and `emailDelivery` (`local`, `console` or `email`).
Outside the local activation mode they send the same native confirmation link.
Until confirmation, correct credentials
receive `email_verification_required` without a token or authenticated session.
Mail delivery failures roll back the account and its profile.
An expired confirmation can be replaced at `/email-bestaetigung/`.
Invalid or expired confirmation links lead directly to that form. Login,
registration and replacement confirmation preserve a validated `next` target,
including query parameters and fragments, so confirmation returns to the
original application. External targets and HTTPS downgrades are rejected.
Only registrations explicitly marked as awaiting their first confirmation
can request or use activation links. Confirmation clears that marker; disabling
a confirmed account does not let its owner reactivate it through this form.
Existing inactive accounts are not automatically classified as pending by the
migration, because their reason for being disabled cannot be inferred safely.

The login page links to the shared password recovery form (`/password-reset/`
by default). DeutschLive and housing link to its `/auth/password_reset/` alias.
Both paths use the same validation, one-time token and password rules. Form errors
remain visible, and unknown email addresses receive the same neutral response.
The `PASSWORD_RESET_*` settings control the canonical routes, email templates,
link domain, HTTPS and expiry. SPA builds with different paths can set
`VITE_PASSWORD_RESET_URL` to the corresponding local absolute path.

## Account page assets and contrast

Account forms, profile editing and confirmation pages share
`registration/account_shell.html` and `assets/css/account-pages.css`. Their text,
controls, placeholders, errors and disabled states use paired opaque colors;
the dark palette follows `prefers-color-scheme`. Other project pages retain their
own styles.

`npm --prefix frontend run build:accounts` minifies this stylesheet and the shared
`assets/js/main.js` runtime. The normal frontend build includes this step. Account
pages do not load the large portfolio stylesheet or the full site translation
bundle and do not fetch portfolio locale overlays.

`pages/account_translations.json` contains the Russian and Ukrainian translations
of account copy; German is the source text. Templates, field help, placeholders,
console mails and status messages use that same dictionary. Account middleware
selects the browser language and also activates Django's translations for built-in
validation and password rules. The source-completeness and request-flow tests live
in `test_account_translations.py`; browser checks also cover translated validation,
activation, password visibility controls and contact submission states.

The browser suite checks text contrast numerically in light and dark mode,
including field help, validation errors, disabled login and activation codes.
Direct visits to contact and DeutschLive account pages load their form modules
before the first app render, so loading placeholders do not move the footer or
account content. `form-loading.spec.cjs` checks both routes with an intentionally
delayed module response.

## Local browser activation

The public sample enables `LOCAL_ACCOUNT_ACTIVATION_ENABLED=true`. This mode also
requires `DEBUG=true`, disabled real mail delivery, the console mail backend, a
loopback peer, and a `localhost`/loopback Host. Forwarded headers do not enable it.
`/examplemail` returns 404 outside these conditions.

Registration saves the inactive account, hashed password, consent and optional
profile image in the local database. `/login/` then shows a separate six-digit
activation input and disables the login fields. `/examplemail` displays only the
current browser session's code. The code expires exactly 60 seconds after creation,
is consumed once with an atomic conditional database update, and is replaced by
a new code when requested. Concurrent activations also work with SQLite. Five wrong codes
invalidate the challenge. Reloading the mailbox does not extend its lifetime.
The database-backed session stores this short-lived example message; the mailbox
has `no-store` and `noindex` headers. No schema migration or separate mail service
is needed for this mode.

Entering the code activates the account and enables the email/password fields;
it does not sign in. Subsequent logins need only email and password. Registration
through housing or DeutschLive leads to the same activation form and then back
to that application's dashboard/account. Housing obtains its password-bound token
from the authenticated session at `/wohnungssuche-api/account-session/`; logging
out there also clears that shared session. Native local login without a `next`
target opens `/profil/`. `/login` redirects to `/login/`.

Existing unconfirmed accounts can enter this flow by submitting their correct
email and password on `/login/`. The activation input then appears. A separate
browser cannot view or use another browser's example code. Disabled accounts
that were already confirmed cannot be reactivated with this flow.

Password recovery uses the same explicit local-mode gate. The normal reset form
creates a ten-minute, browser-bound message on the existing reset-done page.
It sends no mail, including console mail. A CSRF-protected button transfers the
token into Django's confirmation form; the generated URL contains only the
`set-password` placeholder. The token uses Django's password-bound algorithm in a
separate local namespace, preventing use in the normal emailed reset flow.
Changing the password consumes it. Expiry, account deactivation or leaving the
local mode prevents use, including when the password form was already open.
Unknown, inactive and unusable accounts receive a neutral message. A housing
recovery returns to `/wohnungssuche/login`, DeutschLive to `/deutschlive/account`,
and the other projects to `/login/` with their preserved project return path.

Housing login and registration obtain these mode-specific explanations and
configured account URLs from `/wohnungssuche-api/auth/config/`. That response is
private, uncached and contains no activation or reset code. Correct pending
housing credentials can open the same local activation flow as `/login/`.

Outside the local activation mode, account mail goes to the console by default;
tokens are not included in those page responses or API registration responses.
Actual delivery requires the explicit process setting
`ACCOUNT_EMAIL_DELIVERY_ENABLED=true`, `EMAIL_BACKEND` set to
`django.core.mail.backends.smtp.EmailBackend`, and the SMTP host, port, login,
password and `DEFAULT_FROM_EMAIL`. Use trusted process configuration for real
values; every environment file in this public workspace must remain a fictional
sample. The committed examples keep delivery disabled. Old SMTP settings alone
cannot enable delivery, and payment/billing integrations remain disabled.
