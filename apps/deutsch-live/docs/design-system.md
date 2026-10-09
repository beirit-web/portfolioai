# DeutschLive Designsystem

Stand: 2026-07-14

DeutschLive ist eine Lernanwendung fuer russischsprachige Nutzer in Deutschland. Das UI soll ruhig, vertrauenswuerdig und wiederholt nutzbar wirken. Es ist kein Marketing-Layout als Hauptprodukt, sondern ein Arbeits- und Lernwerkzeug.

Die Markenidentitaet steht in `docs/brand-identity.md` und ist die Produktleitplanke fuer Tonalitaet, emotionale Richtung und visuelle Haltung.

Der Icon- und Illustrationsstil steht in `docs/icon-style.md`.

Die wiederholbare Design-QA steht in `docs/design-qa.md`.

## Dokumentationskarte

| Dokument | Zweck |
| --- | --- |
| `docs/design-system.md` | Tokens, Komponentenrollen, Motion, Mobile, Accessibility und UI-Regeln |
| `docs/brand-identity.md` | Produktkern, Zielgruppe, Tonalitaet und emotionale Richtung |
| `docs/icon-style.md` | Icon-System, Semantik, Groessen, Button-Regeln und Illustrationsgrenzen |
| `docs/design-qa.md` | Wiederholbare Pruefung fuer Mobile, Dark Mode, Accessibility und russische Texte |

Neue Designentscheidungen sollen zuerst einem dieser Dokumente zugeordnet werden. Nur wenn keine passende Stelle existiert, wird ein neues Designdokument angelegt.

## Prinzipien

- Mobile-first: Inhalte muessen auf Smartphones zuerst gut funktionieren.
- Ruhig vor dekorativ: wenig visuelle Ablenkung, klare Prioritaeten.
- Russisch lesbar: lange russische Texte brauchen genug Zeilenhoehe und Breite.
- Deutsch fokussiert: deutsche Saetze sind Lerninhalt und sollen visuell hervortreten.
- Keine Karten in Karten, ausser bei kleinen wiederholten Items oder Tool-Oberflaechen.
- Dark Mode ist gleichwertig, nicht nur invertiert.

## Design Tokens

Zentrale Tokens liegen in `frontend/src/styles/main.scss` als CSS-Variablen mit Prefix `--dl-*`.

Wichtige Gruppen:

- `--dl-color-*` fuer Page, Surface, Text, Border, Primary, Accent, Success, Warning und Danger.
- `--dl-radius-*` fuer Controls, Cards und Panels.
- `--dl-shadow-*` fuer Cards und Panels.
- `--dl-space-*` fuer Seiten- und Section-Abstaende.

Neue Komponenten sollen Tokens bevorzugen, wenn sie globale Farben, Abstaende oder Schatten brauchen.

## Farben

Farbrollen:

| Rolle | Token | Light | Dark | Einsatz |
| --- | --- | --- | --- | --- |
| Page | `--dl-color-page` | `#f8fafc` | `#020617` | Body und App-Hintergrund |
| Surface | `--dl-color-surface` | White glass | Slate glass | Panels, Karten, Navigation |
| Text | `--dl-color-text` | `#0f172a` | `#f8fafc` | Primaertext |
| Muted text | `--dl-color-text-muted` | `#475569` | `#cbd5e1` | Hilfetexte |
| Border | `--dl-color-border` | Slate-300 alpha | Slate-700 alpha | Trennung ohne harte Linien |
| Primary | `--dl-color-primary` | Indigo | Indigo-300 | Hauptaktionen, Fortschritt |
| Accent | `--dl-color-accent` | Cyan | Cyan-300 | Fokus, aktive kleine Controls |
| Success | `--dl-color-success` | Emerald | Emerald-300 | Erfolg, gespeicherte Aktionen |
| Warning | `--dl-color-warning` | Amber | Amber-300 | Hinweise, Limits, Wartezustaende |
| Danger | `--dl-color-danger` | Red | Red-300 | Fehler, Loeschen, Security |

Light Mode:

- Page: helles Slate/Indigo-Fundament.
- Surface: fast weisse Flaechen mit klarer Border.
- Primary: Indigo fuer Hauptaktionen und Fortschritt.
- Accent: Cyan fuer Fokus, aktive kleine Controls und Lernhervorhebung.
- Success/Warning/Danger: semantisch, sparsam und kontraststark.

Dark Mode:

- Page: sehr dunkles Slate.
- Surface: Slate-900 mit sichtbarer Border.
- Text: hohe Lesbarkeit, keine rein grauen Primaertexte.
- Danger/Warning muessen auf dunklem Hintergrund sichtbar bleiben.

Statusfarben:

- Statusmeldungen nutzen `.status-message`.
- Varianten: `.status-message--success`, `.status-message--warning`, `.status-message--error`.
- Dark Mode nutzt dunkle Flaechen mit heller Schrift, nicht helle Pastellboxen.
- Fehlermeldungen muessen ohne Rot-allein-Erkennung lesbar bleiben.

## Typografie

- Font: Inter ueber Tailwind `font-sans`.
- Body: `text-sm` bis `text-base`, mit `leading-6` oder `leading-7`.
- Kompakte Panels: keine heroartigen Ueberschriften.
- Lernsaetze auf Deutsch duerfen fett oder groesser sein, aber nicht ueber mehrere UI-Elemente laufen.
- Russische Erklaerungen brauchen genug Zeilenhoehe und duerfen nicht in zu enge Pillen gezwungen werden.

Typografie-Tokens:

| Rolle | Token/Klasse | Einsatz |
| --- | --- | --- |
| Caption | `--dl-font-size-caption`, `.text-kicker` | Eyebrows, kleine Labels, Status-Meta |
| Body | `--dl-font-size-body`, `.text-body-copy` | Erklaerungen, Beschreibungen, russische Hilfetexte |
| Small body | `--dl-font-size-body-small` | kompakte Listen und Meta-Informationen |
| Title | `--dl-font-size-title` | Karten- und Paneltitel |
| Section | `--dl-font-size-section`, `.text-section-title` | Haupttitel innerhalb App-Views |
| Hero | `--dl-font-size-hero` | nur echte Hero-Flaechen |
| Learning sentence | `.text-learning-sentence` | deutsche Lernsaetze und wichtige Dialogzeilen |

Regeln:

- Keine negative Laufweite.
- Kicker nutzen positive Laufweite, aber kurze Texte.
- Hero-Groessen nur auf Landing-/Premium-Hero, nicht in Dashboard- oder Tool-Panels.
- Russische UI-Texte nutzen bevorzugt `leading-7` oder `.text-body-copy`.
- Deutsche Lernsaetze duerfen visuell staerker sein als Erklaerungen.
- Lange Woerter und deutsche Komposita duerfen umbrechen, aber keine Controls verbreitern.

## Spacing

- Mobile Seitenpadding startet bei `0.75rem`.
- Sections nutzen klare vertikale Abstaende, aber keine leeren Marketing-Flaechen.
- Dichte Lernoberflaechen bevorzugen Grid-Gaps von `0.75rem` bis `1rem`.
- Wiederholte Items sollen stabil bleiben und Hover-Zustaende duerfen kein Layout verschieben.

## Radius

- Controls: `--dl-radius-control` fuer Buttons, Inputs und kompakte Toggles.
- Cards: `--dl-radius-card` fuer einzelne wiederholte Items.
- Panels: `--dl-radius-panel` fuer groessere App-Flaechen.
- Neue Cards sollen maximal `1rem` Radius nutzen, ausser bestehende Premium-/Hero-Flaechen verlangen bewusst mehr.

## Schatten

- Schatten dienen zur Ebenentrennung, nicht als Dekoration.
- Cards nutzen `--dl-shadow-card`.
- Panels und Navigation nutzen `--dl-shadow-panel`.
- Dark Mode nutzt weniger helle Glow-Effekte und mehr Border-Kontrast.

## Card-System

Zentrale Kartenrollen liegen in `frontend/src/styles/main.scss`:

| Klasse | Einsatz |
| --- | --- |
| `.app-panel` | Groessere App-Flaechen, Formulare, Dashboard-Abschnitte |
| `.surface-item` | Wiederholte Listeneintraege innerhalb von Panels |
| `.interactive-card` | Klickbare Auswahlkarten, Quizoptionen, Hover-Flächen |
| `.learning-card` | Dialoge, Vokabeln, Uebungen und Lernsaetze |

Regeln:

- `Panel`, `PanelForm` und `SurfaceItem` aus `UiPrimitives.tsx` nutzen diese Rollen.
- Neue Lern- und Quizkarten verwenden `.learning-card` oder `.interactive-card`, nicht neue freie Schatten-/Radiuskombinationen.
- Dashboard-Container verwenden `.app-panel`; einzelne Eintraege darin verwenden `.surface-item`.
- Glassmorphism bleibt auf Navigation, Hero-nahe Flaechen und bestehende `.glass`-Elemente begrenzt.
- Karten duerfen auf Hover ihre Ebene zeigen, aber keine Layoutgroesse veraendern.
- Mobile Padding startet kompakt; groessere Abstaende kommen erst ab `sm`.

## Section-Layouts

Zentrale Section-Rollen:

| Klasse | Einsatz |
| --- | --- |
| `.section-shell` | Hauptbereiche wie Dashboard, Lernbereich, Quiz oder kompakte Landing-Abschnitte |
| `.section-shell--compact` | dichtere Tool- und Formularbereiche |
| `.section-header` | Kopfbereich mit Titel/Copy und optionalem rechten Kontextblock |
| `.section-copy` | beschreibender Text unter Section-Titel |
| `.section-grid` | Basisgrid fuer Inhaltsbereiche |
| `.section-grid--dashboard` | zweispaltige Dashboard- und Analyseansichten |
| `.section-grid--split` | zweispaltige Lern-/Content-Splits |
| `.section-grid--stats` | stabile 3er-Statistikreihen |

Regeln:

- App-Views starten mit `.section-shell`, nicht mit frei erfundenen Margin/Padding-Kombinationen.
- Hero-Flaechen bleiben eigenstaendig, muessen aber den naechsten Abschnitt auf Mobile und Desktop sichtbar lassen.
- Lernbereiche nutzen `.section-grid--split`, wenn Aufgabe und Kontext nebeneinander stehen.
- Dashboardbereiche nutzen `.section-grid--dashboard`; Statistikzeilen nutzen `.section-grid--stats`.
- Content-Abstaende bleiben mobile-first kompakt und wachsen nur an klaren Breakpoints.

## Visuelle Hierarchie

Zentrale Klassen:

| Klasse | Einsatz |
| --- | --- |
| `.view-title` | Haupttitel einer App-Ansicht mit viel Raum |
| `.view-title--compact` | Haupttitel in kompakteren Lern-/Tool-Ansichten |
| `.panel-title` | Titel innerhalb eines Panels |
| `.panel-title--with-icon` | Paneltitel mit Icon |
| `.focus-panel` | primaerer Fokusbereich innerhalb einer View |
| `.scan-stack` | vertikale, gut scannbare Listen |
| `.scan-meta` | Meta-Informationen mit niedrigerer Prioritaet |

Regeln:

- Pro View gibt es genau einen dominanten Haupttitel.
- Deutsche Lernsaetze nutzen `.text-learning-sentence`, nicht generische grosse Headline-Klassen.
- Paneltitel bleiben kompakter als View-Titel.
- Fokusbereiche duerfen Schatten und Border nutzen; wiederholte Items bleiben ruhiger.
- Abstaende sollen Scannen ermoeglichen, aber keine leeren Marketing-Flaechen erzeugen.

## Navigation

- Navigation nutzt `.app-nav`, `.app-nav__bar`, `.app-nav__brand`, `.app-nav__actions` und `.app-nav__tabs`.
- Hauptlinks nutzen `.nav-tab` mit Icon und Text.
- Aktive Seiten setzen `aria-current="page"` und `.is-active`.
- Mobile Menu nutzt `.mobile-menu` mit `.is-visible` oder `.is-hidden`; der Backdrop nutzt `.mobile-menu-backdrop`.
- Logo/Brand und Header-Aktionen bleiben vertikal zentriert ueber `.app-nav__bar`.
- Hamburger und Schliessen-Button bleiben ausserhalb des Menus sichtbar und mindestens 44 px gross.

## Motion

Motion-Tokens:

| Token | Einsatz |
| --- | --- |
| `--dl-motion-fast` | kleine Feedback-Zustaende |
| `--dl-motion-base` | Hover, Antwortfeedback, Button-Zustaende |
| `--dl-motion-slow` | Panels, Mobile Menu, groessere Zustandswechsel |
| `--dl-motion-ease` | Standard-Easing fuer UI-Bewegung |

Utility-Klassen:

- `.motion-hover` fuer Hover-Bewegung, Border, Shadow und Background.
- `.motion-panel` fuer ein-/ausfahrende Panels und Menus.
- `.motion-feedback` fuer kurze Antwort- oder Statusanimationen.
- `.motion-loading` fuer dezente Ladehinweise.
- `.cinematic-frame` fuer begrenzte Lichtfilm-Effekte auf grossen visuellen Flaechen.
- `.cinematic-glow` fuer kontrollierte Tiefe ohne dekorative Farbblasen.
- `.cinematic-depth` und `.cinematic-parallax-layer` als technische Vorbereitung fuer optionale Tiefenstaffelung.

Regeln:

- Hover darf keine Layoutgroesse veraendern.
- Antwortfeedback darf kurz animieren, muss aber auch ohne Animation erkennbar sein.
- Ladeanimationen bleiben ruhig und duerfen keine wichtigen Inhalte verdecken.
- Cinematic-Effekte duerfen nur auf Hero-, Preview- oder grossen Lernflaechen eingesetzt werden, nicht auf Formularen oder Textkarten.
- Parallax bleibt optional und muss ueber `--dl-parallax-offset` gesteuert werden; keine Scroll-Logik ohne konkreten Nutzen.
- Glow bleibt begrenzt und darf Kontrast oder Lesbarkeit nicht reduzieren.
- `prefers-reduced-motion: reduce` deaktiviert relevante Bewegungen praktisch vollstaendig.
- Neue Animationen muessen eine klare UI-Funktion haben: Orientierung, Feedback oder Ladezustand.

## Mobile-First UX

Tokens und Regeln:

- `--dl-touch-target` definiert die Mindesthoehe fuer interaktive Standardziele.
- Buttons, Links, Inputs, Selects und Textareas nutzen `touch-action: manipulation`.
- Form-Controls und Buttons haben auf Mobile mindestens 44 px Hoehe.
- Grid- und Flex-Kinder bekommen `min-width: 0`, damit lange russische oder deutsche Texte keinen horizontalen Scroll erzeugen.
- Mobile Menu nutzt `100dvh` und Safe-Area-Padding.
- Unter 480 px werden Padding, Radius, Header-Abstaende und Hero-Hoehe reduziert.

Mobile Layout:

- Erst einspaltig, dann ab `sm`, `md` oder `lg` erweitern.
- Karten duennen Padding auf kleinen Screens aus, ohne Touch-Ziele zu verkleinern.
- Navigation bleibt sticky, aber Brand-Text und Abstaende werden kompakter.
- Horizontales Scrollen ist ein Fehlerzustand und muss durch Umbruch, `min-width: 0` oder kleinere Layoutrollen verhindert werden.

## Dark Mode

Regeln:

- Dark Mode nutzt dunkle Slate-Flaechen mit klarer Border, nicht helle Pastellboxen.
- Body-Glows bleiben reduziert, damit Lerninhalte und Formulare im Vordergrund stehen.
- Formulare werden global abgesichert: Inputs, Textareas und Selects haben dunkle Flaeche, helle Schrift und sichtbaren Fokus.
- Haupt-Panels (`.glass`, `.app-panel`, `.section-shell`) nutzen etwas hellere dunkle Surfaces als einzelne Items.
- Wiederholte Items (`.surface-item`, `.learning-card`, `.interactive-card`, `.stat-card`) nutzen dunklere Surfaces und sichtbare Borders.
- Statusmeldungen bleiben semantisch farbig, aber mit dunklem Hintergrund und heller Schrift.

## Glassmorphism

Glassmorphism ist optional und begrenzt. Es soll Tiefe zeigen, aber nie Lesbarkeit ersetzen.

Tokens:

| Token | Einsatz |
| --- | --- |
| `--dl-glass-bg` | leichte transparente Flaechen |
| `--dl-glass-bg-strong` | lesbare Hauptflaechen mit Blur |
| `--dl-glass-border` | sichtbare Trennung auf hell/dunkel |
| `--dl-glass-overlay` | Backdrops und Overlays |

Klassen:

- `.glass` bleibt die bestehende starke Standardflaeche.
- `.glass-subtle` fuer dekorative oder kleine Preview-Flaechen.
- `.glass-strong` fuer Menus, Navigation und wichtige Floating Panels.
- `.glass-readable` fuer Inhalte, bei denen Textkontrast wichtiger als Transparenz ist.
- `.glass-overlay` fuer Backdrops.
- `.glass-depth-1` und `.glass-depth-2` steuern Ebenentiefe ohne neue Farben.

Regeln:

- Keine verschachtelten Glass-Panels fuer normale Inhaltsbereiche.
- Transparente Flaechen muessen immer Border und ausreichenden Textkontrast haben.
- Blur wird auf Navigation, Menus, Hero-nahe Previews und Overlays begrenzt.
- Dark Mode nutzt weniger helle Reflexe und staerkere Borders.

## Loading Und Skeletons

Primitive:

- `SkeletonBlock` ist der kleinste Ladebaustein und nutzt `.skeleton-block`.
- `SkeletonPanel` ist fuer Formular-, Karten- und Textbereiche gedacht.
- `SkeletonStatGrid` bildet Statistikreihen ab.
- `PageSkeleton` ist der Suspense-/Routen-Fallback.

Regeln:

- Skeletons muessen die spaetere Layoutstruktur grob abbilden, damit nichts springt.
- Ladezustaende nutzen `.motion-loading` und respektieren Reduced Motion.
- Dark Mode Skeletons nutzen dunkle Slate-Flaechen mit dezenter Schimmerwirkung.
- API-abhaengige Hauptbereiche zeigen Skeletons statt leere Panels.
- Skeletons enthalten keine erklaerenden Texte; sie sind reine Platzhalter.

## Empty States

Primitive:

- `EmptyState` kann Icon, Titel, Beschreibung und optionale Aktion aufnehmen.
- Empty States nutzen gestrichelte Border und ruhige Surface-Flaeche.
- Titel benennt den Zustand, Body erklaert den naechsten sinnvollen Schritt.

Regeln:

- Neue Nutzer sollen verstehen, dass nichts kaputt ist.
- Russische Texte muessen motivierend, aber nicht werblich sein.
- Empty States stehen direkt an der Stelle, an der spaeter Inhalte erscheinen.
- Keine verschachtelten Empty-State-Boxen.
- Wenn sinnvoll, zeigt die Aktion auf die naechste Lernhandlung.

## Icons Und Illustrationen

- UI-Icons nutzen `lucide-react`.
- Topic-Emoji aus Lerninhalten sind Inhaltsmarker, keine Action-Icons.
- `.ui-icon`, `.ui-icon--small` und `.ui-icon-badge` sind die Basisrollen fuer neue Icon-Nutzung.
- Buttons mit Text setzen Icons als `aria-hidden`, Icon-only Buttons brauchen ein `aria-label`.
- Illustrationen bleiben konkret und alltagsnah; abstrakte dekorative SVGs gehoeren nicht in Lernflaechen.

## Komponentenregeln

- Buttons nutzen Icons, wenn die Aktion etabliert ist und ein passendes Icon existiert.
- Primaeraktionen sind eindeutig, maximal eine pro kompakter Ansicht.
- Inputs haben Label, Fehlertext und sichtbaren Fokuszustand.
- Statusmeldungen muessen in Light und Dark Mode lesbar sein.
- Empty States sind kurz, handlungsorientiert und nicht erklaerend lang.
- Skeletons behalten feste Hoehen, damit Layouts nicht springen.

## Primitives

`frontend/src/components/UiPrimitives.tsx` enthaelt erste gemeinsame Bausteine:

- `Panel`
- `PanelForm`
- `SurfaceItem`
- `AppButton`
- `TextInput`
- `TextArea`
- `SelectInput`
- `EmptyState`
- `SkeletonBlock`
- `SkeletonPanel`
- `SkeletonStatGrid`
- `PageSkeleton`
- `ModalShell`
- `TabsShell`
- `AccordionShell`
- `ToastMessage`

Neue wiederholte UI-Muster sollen zuerst dort oder in einer gezielten Erweiterung entstehen, statt Klassen in jeder Feature-Komponente neu zu erfinden.

## Komponentenbibliothek

- Buttons verwenden `AppButton` oder die Klassen `.app-button`, `.app-button--primary`, `.app-button--secondary`, `.app-button--danger`, `.app-button--ghost`.
- Formularfelder verwenden `TextInput`, `TextArea` oder `SelectInput`; Abstand zwischen Feldern laeuft ueber `fieldClassName`, Control-Styling ueber `className`.
- Cards verwenden `Panel`, `PanelForm`, `SurfaceItem`, `.interactive-card` oder `.learning-card`.
- Modals starten mit `ModalShell`; Tabs, Accordions und Toasts sind als strukturelle Primitive vorbereitet.
- Feature-Komponenten sollen keine neuen freien Button-/Input-Klassen einfuehren, wenn ein Primitive oder eine bestehende Rollenklasse ausreicht.

## Accessibility

- Fokuszustaende bleiben sichtbar und werden zentral ueber `:focus-visible` in `.app-shell` gesteuert. Neue Komponenten duerfen diesen Fokus nicht lokal entfernen.
- Interaktive Elemente brauchen mindestens 44 px Zielhoehe auf Mobile. Das Token `--dl-touch-target` ist die Untergrenze fuer Buttons, Inputs, Selects und Textareas.
- Tastaturfokus muss auf Buttons, Links, Formularfeldern und Elementen mit `role="button"` gleichwertig funktionieren.
- Farbunterschiede duerfen nicht die einzige Statusinformation sein. Statusmeldungen nutzen immer `.status-message` plus Modifikator.
- Lange deutsche und russische Texte muessen ohne horizontales Scrollen lesbar bleiben. Fuer Fliesstext stehen `.text-readable`, `.text-readable-muted` und `.content-measure` bereit.
- Dark Mode muss Fehlermeldungen, Erfolgsmeldungen, Fokuszustaende und deaktivierte States klar unterscheiden.
- Bei `prefers-contrast: more` werden Fokusrahmen und wichtige Flaechenkontraste sichtbar verstaerkt.

## Nichtziele

- Kein vollstaendiges Rebranding in einem Ticket.
- Kein pauschales Refactoring aller existierenden Komponenten.
- Keine neuen visuellen Effekte ohne konkreten Nutzwert im Lernfluss.
