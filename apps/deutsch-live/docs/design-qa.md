# DeutschLive Design QA

Stand: 2026-07-14

Diese Checkliste dokumentiert die Design-Qualitaetskontrolle fuer MVP-UI, Mobile, Dark Mode und russische Zielgruppe.

## Gepruefte Bereiche

- Navigation: Logo, Mobile Menu, Sprach-/Theme-Wechsel, Account-Zugang.
- Landingpage: Hero, CTA, Szenenkarten, Dashboard-Preview, FAQ.
- Lernbereiche: Szene, Quiz, Schreibtraining, Dashboard.
- Systemzustaende: Loading, Empty States, Statusmeldungen, Formularfelder.
- Designsystem: Farben, Typografie, Motion, Glassmorphism, Accessibility, Komponentenbibliothek.

## Mobile

- Interaktive Elemente nutzen mindestens `--dl-touch-target` als Zielhoehe.
- Mobile Navigation ist fixed/sticky priorisiert und hat einen sichtbaren Fokuszustand.
- Hero-, Karten-, Formular- und Dashboard-Layouts verwenden Grid/Flex mit `min-width: 0`.
- Lange deutsche und russische Texte koennen umbrechen und vermeiden horizontales Scrollen.
- CTA-Buttons und Statuschips sind auf kleinen Screens mehrzeilig und begrenzt.

## Dark Mode

- Statusmeldungen nutzen `.status-message--success`, `.status-message--warning` und `.status-message--error` mit eigenen Dark-Mode-Kontrasten.
- Formularfelder erhalten dunkle Hintergruende, helle Texte und sichtbare Fokuszustaende.
- Glass-, Panel- und Card-Flächen nutzen dunkle Surface- und Border-Tokens.
- Skeletons, Empty States und Toasts haben eigene Dark-Mode-Regeln.

## Accessibility

- Tastaturfokus ist zentral ueber `.app-shell :focus-visible` sichtbar.
- `prefers-reduced-motion: reduce` reduziert Hover-, Loading- und cinematic Animationen.
- Statusinformationen werden nicht nur ueber Farbe transportiert.
- Fliesstext kann ueber `.text-readable`, `.text-readable-muted` und `.content-measure` begrenzt werden.
- `prefers-contrast: more` verstaerkt Fokus und Flaechenkontraste.

## Russische Zielgruppe

- Landingpage, Lernfluss, Feedback und Dashboard bleiben russisch gefuehrt.
- Deutsche Begriffe erscheinen dort, wo sie Lerninhalt oder realen Kontext bilden.
- Alltagsszenen fokussieren konkrete Situationen in Deutschland: Pekaerei, Arzt, Jobcenter, Behoerden, Wohnung, Arbeit, Schule, Verkehr und DHL.
- Texte vermeiden abstrakte Lernversprechen und beschreiben konkrete Handlungen.

## Aktueller Check

- `npm run build` im Frontend ist gruen.
- Neue UI-Primitives sind dokumentiert und im Feedback-Formular aktiv genutzt.
- Landingpage-Hero und Abschluss-CTA wurden auf mobile Umbrueche und Produktklarheit geprueft.
- Dark-Mode-Statusmeldungen, Fokuszustaende und Formularfelder sind zentral abgesichert.

## Wiederholbarer Ablauf

1. Frontend bauen: `npm run build` in `apps/deutsch-live/frontend`.
2. Landingpage in Mobile- und Desktopbreite pruefen.
3. Theme auf Dark Mode wechseln und Statusmeldungen/Formulare pruefen.
4. Navigation per Tastatur durch Header, Menus, Formulare und CTA-Buttons pruefen.
5. Russische Texte auf Zeilenumbrueche und Verstaendlichkeit pruefen.
6. Bei neuen Komponenten zuerst `docs/design-system.md` und `UiPrimitives.tsx` abgleichen.
