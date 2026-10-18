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

`/login/` and `/register/` provide the shared account forms. Login accepts the
account email, including accounts created by DeutschLive or housing; their API
logins also accept usernames. Email and username matching is case-insensitive;
ambiguous historical identities are rejected rather than assigned arbitrarily.
Every registration requires email confirmation before the account becomes active,
including DeutschLive and housing. Both API registration handlers return
`emailVerificationRequired: true` and `emailDelivery` (`console` or `email`), and
send the same native confirmation link. Until confirmation, correct credentials
receive `email_verification_required` without a token or authenticated session.
Mail delivery failures roll back the account and its profile.
An expired confirmation can be replaced at `/email-bestaetigung/`.
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

Account mail goes to the server console by default. The forms explain this; no
activation or reset token is shown in a page or returned by these form handlers.
Actual delivery requires the explicit process setting
`ACCOUNT_EMAIL_DELIVERY_ENABLED=true`, `EMAIL_BACKEND` set to
`django.core.mail.backends.smtp.EmailBackend`, and the SMTP host, port, login,
password and `DEFAULT_FROM_EMAIL`. Use trusted process configuration for real
values; every environment file in this public workspace must remain a fictional
sample. The committed examples keep delivery disabled. Old SMTP settings alone
cannot enable delivery, and payment/billing integrations remain disabled.
