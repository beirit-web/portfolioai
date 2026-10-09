# DeutschLive Icon- Und Illustrationsstil

Stand: 2026-07-14

DeutschLive nutzt Icons zur Orientierung, nicht als Dekoration. Icons sollen Handlungen und Lernbereiche schneller erfassbar machen, ohne die ruhige Lernatmosphaere zu stoeren.

## Grundsystem

Primaeres Icon-System:

- `lucide-react`
- Outline-Stil
- einfarbig oder semantisch getoent
- gleiche optische Groesse innerhalb gleicher Komponenten

Topic-Icons:

- Emoji- oder einfache Symbolmarker duerfen aus Topic-Daten kommen
- sie markieren Alltagssituationen wie Baeckerei, Apotheke oder Bus
- sie ersetzen keine UI-Icons fuer Aktionen

Illustrationen:

- keine generischen SVG-Illustrationen fuer Lernflaechen
- reale oder konkrete Alltagssituationen sind besser als abstrakte Dekoration
- illustrative Elemente muessen den Kontext erklaeren, nicht nur fuellen

## Icon-Groessen

| Einsatz | Groesse |
| --- | --- |
| Inline in Buttons | `h-4 w-4` bis `h-5 w-5` |
| Section-Titel | `h-6 w-6` bis `h-8 w-8` |
| Dashboard-Statistik | `h-5 w-5` im Icon-Badge |
| Empty State | `h-5 w-5` im 40px Badge |
| Navigation | `h-4 w-4` |

Icons bleiben `shrink-0`, wenn daneben Text steht.

## Semantik

Navigation:

- Home: `Home`
- Lernen: `BookOpen`
- Quiz: `ClipboardCheck`
- Schreiben: `PenLine` oder `MessageSquareText`
- Dashboard: `LayoutDashboard` oder `BarChart3`
- Handbuch: `FileText`
- Einstellungen: `Settings`

Lernbereiche:

- Szenen: `BookOpen`, `MessageCircle`, `FileText`
- Aussprache/Audio: `Volume2`, `Play`, `Mic2`
- Uebungen: `ListChecks`, `ClipboardCheck`
- Schreiben: `PenLine`, `MessageSquareText`, `Bot`, `UserRound`

Dashboard:

- Punkte/Erfolg: `Trophy`
- Fortschritt/Statistik: `BarChart3`, `Target`
- Szenen: `BookOpenCheck`
- gespeicherte Woerter: `Sparkles`
- Zeit/Streak: `Flame`
- Empfehlungen: `Lightbulb`

Account und Sicherheit:

- Login/Logout: `LogIn`, `LogOut`
- Passwort: `KeyRound`
- Loeschen: `Trash2`
- Kopieren: `Copy`

## Button-Regeln

- Etablierte Aktionen bekommen Icon und Text.
- Kompakte Icon-only Buttons brauchen `aria-label`.
- Icon-only Buttons sind nur fuer klare Standardaktionen erlaubt: Menu, Schliessen, Theme, Sprache wenn kompakt.
- Icons duerfen Buttontexte nicht ersetzen, wenn die Aktion fachlich wichtig ist.
- Alle Buttonicons verwenden `aria-hidden="true"`, wenn daneben Text steht.

## Farbe

- Icons erben standardmaessig die Textfarbe.
- Aktive oder fokussierte UI-Icons duerfen Cyan nutzen.
- Produkt- und Fortschrittsicons duerfen Indigo nutzen.
- Warnung/Fehler/Erfolg nutzen semantische Farben nur bei echtem Status.
- Keine bunten Icon-Sets innerhalb einer kompakten Ansicht.

## Nicht-Ziele

- kein gemischtes Iconset neben Lucide
- keine dekorativen Iconwolken
- keine 3D-Icons in der App-Oberflaeche
- keine Maskottchen-Illustration im MVP
- keine Icons als alleinige Statusinformation
