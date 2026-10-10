# SEO des Portfolios

Die öffentlichen Portfolioseiten haben eigene Titel und Beschreibungen für
Startseite, Kompetenzen, Projekte, Über mich, Kontakt und Projektberichte.
Django liefert diese Angaben einschließlich Open Graph, Twitter und Canonical
bereits im HTML. React übernimmt dieselben Werte aus `BEIRIT_HOME_CONFIG.pageMeta`,
damit der Seitenstart weder den konfigurierten Host noch die Projektbeschreibung
überschreibt.

`SITE_URL` ist die Grundlage für absolute Canonical- und Sitemap-URLs.
Die veröffentlichten `.env`-Dateien verwenden dafür eine Musterdomain.
Canonical-URLs haben nur bei der Startseite einen abschließenden Schrägstrich.
Alte Projektpfade unter `/referenzen/` verweisen auf die jeweilige Canonical-URL
unter `/projekte/`; Query-Parameter gehören nicht zur Canonical-URL.

Die strukturierten Daten beschreiben eine `WebSite` und die jeweilige Seite:
`ProfilePage` mit `Person` für Über mich, `ContactPage` für Kontakt,
`CollectionPage` mit einer Projektliste und `CreativeWork` für Projektberichte.
Sie enthalten keine Firmenadresse, Preise, Angebote oder Dienstleisterangaben.
Die Profilkennzeichnung folgt den
[Hinweisen von Google zu ProfilePage](https://developers.google.com/search/docs/appearance/structured-data/profile-page?hl=de).
Projektdaten werden für JSON-LD gegen HTML-Script-Trennzeichen abgesichert.

Die Sitemap enthält die fünf Hauptseiten und veröffentlichte Projektberichte.
In andere Projekte integrierte Module, Weiterleitungen und Muster-Rechtstexte
sind ausgenommen. Impressum, Datenschutz und Projektbedingungen tragen
`noindex, follow`; unveröffentlichte oder fehlende Projektberichte sowie
Demo-Handbuch und Grußseite ebenfalls. Die Spendenoberfläche ist ausgeblendet;
alte Spenden- und Zahlungsadressen leiten zur Projektübersicht weiter.

Die Sprachumschaltung verwendet bisher dieselben URLs. Deshalb werden keine
mehrfachen `hreflang`-Einträge auf eine identische URL ausgegeben. Eigene
Sprachversionen brauchen unterschiedliche URLs, wie in den
[Google-Hinweisen zu Sprachversionen](https://developers.google.com/search/docs/specialty/international/localized-versions?hl=de)
beschrieben.

Backendprüfungen stehen in `server/pages/tests/test_portfolio_seo.py`.
Die Browserprüfungen in `frontend/tests/browser/portfolio-seo.spec.cjs` vergleichen
die Metadaten vor und nach dem React-Start auf Desktop und Mobilgeräten.
