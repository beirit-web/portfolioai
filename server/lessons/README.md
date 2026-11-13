# Learning API demo behavior

Every JSON write endpoint validates object shape, field types, allowed values and
lengths before using input. Invalid input returns HTTP 400. Quiz submissions retain
their own signed server-assessment contract.

`saveProgress: false` prevents persistence of quiz attempts, scene progress,
vocabulary and writing/bot history. Writing feedback remains available in memory:
the response contains `saved: false` and a null exercise ID. Existing history is
retained until the user explicitly clears it.

Progress requests identify a published scene by `topicId` and `sceneId` (the scene
slug returned by topic details). A static topic without database scenes uses
`fallback:<topicId>`. Older requests without `sceneId` refer to the first published
scene. The migration maps historical topic progress to only that first matching
scene, preserving its status and timestamp without completing the whole topic.
The learning plan skips individual completed scenes. A rollback to topic-only
uniqueness cannot represent several completed scenes without a data decision.

The export contains DeutschLive account settings, quiz results, scene progress,
vocabulary, writing history, bot exchanges, chat history, own feedback, own
subscriptions and achievement assignments. Local browser recordings are exported
from the recording library and are never held by this API. Clearing progress
removes the learning histories and achievements, preserving feedback and account
or subscription settings.

The account UI uses the shared Django password recovery form, which sends a
one-time link through the configured account mail backend. Its default console
delivery and explicit SMTP opt-in are described in [account forms](../pages/README.md#account-forms).

New accounts remain inactive until the shared account email confirmation link is
used, including with Django DEBUG enabled. Registration sends that native link
through the configured account mail backend, returns no confirmation token, and
rolls the account back if delivery fails. Existing active accounts keep access.

The legacy JSON password and email recovery endpoints remain local demonstrations only. Tokens are returned
only to direct loopback requests with Django DEBUG enabled. Other requests receive
HTTP 501 with `code: demo_recovery_disabled`. No recovery email is sent. Password
reset tokens use Django's password-bound one-time token generator and expire after
one hour. The AI service currently returns rule-based feedback and always reports
`source: fallback`, even if sample API configuration is present.
