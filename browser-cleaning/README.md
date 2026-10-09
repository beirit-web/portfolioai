## Browser Cleaning – Anleitung zum Leeren von Cache, Cookies und Verlauf

Eine einfache, statische Webseite (deutsch) mit Schritt-für-Schritt‑Anleitungen zum Löschen von Cache, Cookies und Browserverlauf in Google Chrome und Mozilla Firefox – jeweils für Desktop und Android. Enthält Hinweise zu Tastenkürzeln, Menüpfaden, Sicherheitsaspekten sowie eine kleine Demo zum lokalen Speicher.

### Features
- **Anleitungen**: Chrome & Firefox (Desktop), Chrome & Firefox (Android)
- **Tastenkürzel & Menüpfade** für schnelles Arbeiten
- **Sicherheitshinweise** zu Cookies, Logins und gespeicherten Daten
- **Tipps** für hartnäckige Anzeigenfehler (z. B. Hard-Reload, Inkognito)
- **Mini‑Demo**: Interaktion mit localStorage, sessionStorage und Caches API
- **Barrierearm**: Skip-Link, sinnvolle Landmarken, verständliche Struktur

### Vorschau
Öffne die `index.html` direkt im Browser (Doppelklick oder Drag & Drop in ein Browserfenster). Es ist kein Build‑Schritt nötig.

### Lokale Nutzung
1. Repository/Ordner lokal öffnen
2. `index.html` im Browser öffnen
3. Optional: Mit einfachem Webserver starten, um die Caches‑API/Manifest besser zu testen
   - Node (http-server): `npx http-server -p 8080`
   - Python: `python -m http.server 8080`

### Verzeichnisstruktur
- `index.html` – Hauptseite mit allen Anleitungen und der Mini‑Demo
- `styles.css` – (optional) Stylesheet für Layout und Typografie
- `main.js` – (optional) Logik für Mini‑Demo‑Buttons und Ausgaben
- `icons/` – (optional) App‑Icons (z. B. `icon-192.svg`)
- `site.webmanifest` – (optional) Manifest für PWA‑Funktionen
- `README.md` – Dieses Dokument

Hinweis: Die Seite funktioniert auch ohne optionale Dateien, einige Funktionen (z. B. Manifest, Icons oder Demo‑Buttons) benötigen jedoch die entsprechenden Ressourcen.

### Inhalte (Auszug)
- Chrome (Desktop): `⋮ → Verlauf → Verlauf → Browserdaten löschen` oder `Strg/⌘ + Shift + Entf`
- Firefox (Desktop): `≡ → Verlauf → Neueste Chronik löschen…` oder `Strg/⌘ + Shift + Entf`
- Android (Chrome): `⋮ → Verlauf → Browserdaten löschen`
- Android (Firefox): `≡ → Einstellungen → Privatsphäre & Sicherheit → Browserdaten löschen`

### Datenschutz & Sicherheit
- **Cookies löschen** meldet dich auf den meisten Seiten ab und setzt Website‑Einstellungen zurück.
- **Passwörter** werden nur entfernt, wenn du diese Option explizit auswählst.
- Für reine Darstellungsfehler reicht oft das **Leeren des Caches**.

### Deployment
Die Seite ist vollständig statisch und kann auf jedem beliebigen Webserver, GitHub Pages, Netlify, Vercel o. Ä. gehostet werden. Lade einfach die Dateien hoch.

### Mitwirken
Verbesserungen (Texte, Accessibility, Ergänzungen für weitere Browser) sind willkommen. Erstelle gerne einen Pull Request oder issue.

### Lizenz
Falls nicht anders angegeben: MIT‑Lizenz.
