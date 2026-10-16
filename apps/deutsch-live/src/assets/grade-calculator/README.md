# Notenrechner-Ergebnismedien

Die Ergebnismedien stammen aus dem Notenrechner von Beirit Digital.
`GradeCalculator.tsx` importiert `img/success.webp`, `gewonnen.mp3` und
`lost-signal.mp3` direkt aus `server/assets/portfolio/notenrechner/`.
Die dortige README führt die MIT-Lizenz an; bestehende Autoren- und
Lizenzangaben bleiben bei der Quelle erhalten.

`lost.webp` und die zugehörige PNG-Quelle `lost.png` bleiben hier als eigene
DeutschLive-Variante erhalten, weil sie sich von dem ausgelieferten Bild der
statischen Demo unterscheiden. Vite erzeugt
für die importierten Medien eigene Asset-URLs. Bilder und Audio werden erst
für das berechnete Ergebnis geladen.
