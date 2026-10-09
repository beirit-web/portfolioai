import { useMemo, useState } from "react";
import "./App.css";

const PLANTS = [
  {
    id: "monstera",
    name: "Monstera Deliciosa",
    scientific: "Monstera deliciosa",
    family: "Araceae",
    light: "Hell, indirekt",
    water: "Mittel",
    difficulty: "Einfach",
    room: "Wohnzimmer",
    height: "bis 250 cm",
    color: "#0f766e",
    tags: ["Luftwurzeln", "Große Blätter", "Tropisch"],
    care: "Erde leicht antrocknen lassen und Staunässe vermeiden.",
  },
  {
    id: "pilea",
    name: "Ufopflanze",
    scientific: "Pilea peperomioides",
    family: "Urticaceae",
    light: "Hell",
    water: "Wenig",
    difficulty: "Einfach",
    room: "Arbeitsplatz",
    height: "bis 35 cm",
    color: "#65a30d",
    tags: ["Ableger", "Kompakt", "Fensterbank"],
    care: "Regelmäßig drehen, damit sie gleichmäßig wächst.",
  },
  {
    id: "calathea",
    name: "Korbmarante",
    scientific: "Calathea orbifolia",
    family: "Marantaceae",
    light: "Halbschatten",
    water: "Mittel",
    difficulty: "Anspruchsvoll",
    room: "Bad",
    height: "bis 90 cm",
    color: "#7c3aed",
    tags: ["Hohe Luftfeuchte", "Musterblätter", "Weiches Licht"],
    care: "Mit kalkarmem Wasser gießen und trockene Heizungsluft vermeiden.",
  },
  {
    id: "sansevieria",
    name: "Bogenhanf",
    scientific: "Dracaena trifasciata",
    family: "Asparagaceae",
    light: "Sonne bis Schatten",
    water: "Sehr wenig",
    difficulty: "Sehr einfach",
    room: "Flur",
    height: "bis 120 cm",
    color: "#166534",
    tags: ["Robust", "Trockenheit", "Aufrecht"],
    care: "Lieber zu wenig als zu viel gießen.",
  },
  {
    id: "ficus",
    name: "Geigenfeige",
    scientific: "Ficus lyrata",
    family: "Moraceae",
    light: "Sehr hell",
    water: "Mittel",
    difficulty: "Mittel",
    room: "Büro",
    height: "bis 300 cm",
    color: "#15803d",
    tags: ["Statement", "Große Blätter", "Warm"],
    care: "Standortwechsel vermeiden und Blätter regelmäßig entstauben.",
  },
  {
    id: "epipremnum",
    name: "Efeutute",
    scientific: "Epipremnum aureum",
    family: "Araceae",
    light: "Hell bis schattig",
    water: "Mittel",
    difficulty: "Einfach",
    room: "Regal",
    height: "rankend",
    color: "#0d9488",
    tags: ["Rankpflanze", "Schnittfest", "Schnellwachsend"],
    care: "Triebe kürzen, wenn die Pflanze dichter wachsen soll.",
  },
];

const FILTERS = ["Alle", "Einfach", "Mittel", "Anspruchsvoll", "Sehr einfach"];

function App() {
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState("Alle");
  const [selectedId, setSelectedId] = useState(PLANTS[0].id);
  const [savedIds, setSavedIds] = useState(new Set());

  const filteredPlants = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("de-DE");

    return PLANTS.filter((plant) => {
      const matchesDifficulty = difficulty === "Alle" || plant.difficulty === difficulty;
      const searchable = `${plant.name} ${plant.scientific} ${plant.family} ${plant.room} ${plant.tags.join(" ")}`.toLocaleLowerCase("de-DE");
      return matchesDifficulty && searchable.includes(normalizedQuery);
    });
  }, [difficulty, query]);

  const selectedPlant = PLANTS.find((plant) => plant.id === selectedId) ?? PLANTS[0];

  const toggleSaved = (plantId) => {
    setSavedIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (nextIds.has(plantId)) {
        nextIds.delete(plantId);
      } else {
        nextIds.add(plantId);
      }
      return nextIds;
    });
  };

  return (
    <main className="botanic-shell">
      <section className="hero" aria-labelledby="botanic-title">
        <p className="eyebrow">Portfolio-Demo</p>
        <h1 id="botanic-title">ENBT Botanic</h1>
        <p>
          Pflanzensuche als statische React-Demo: Katalog durchsuchen,
          Pflegelevel filtern und Lieblingspflanzen für später markieren.
        </p>
      </section>

      <section className="stats" aria-label="Botanic Kennzahlen">
        <article>
          <strong>{PLANTS.length}</strong>
          <span>Pflanzen</span>
        </article>
        <article>
          <strong>{filteredPlants.length}</strong>
          <span>Treffer</span>
        </article>
        <article>
          <strong>{savedIds.size}</strong>
          <span>Merkliste</span>
        </article>
      </section>

      <section className="workspace">
        <section className="catalog-panel" aria-labelledby="catalog-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Pflanzenkatalog</p>
              <h2 id="catalog-title">Suchen & filtern</h2>
            </div>
            <span>{filteredPlants.length} Treffer</span>
          </div>

          <div className="toolbar">
            <label>
              <span>Suche</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Monstera, Bad, robust ..."
              />
            </label>
            <label>
              <span>Pflegelevel</span>
              <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
                {FILTERS.map((filter) => (
                  <option key={filter} value={filter}>
                    {filter}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="plant-grid">
            {filteredPlants.map((plant) => (
              <button
                className={`plant-card ${plant.id === selectedPlant.id ? "is-selected" : ""}`}
                key={plant.id}
                type="button"
                style={{ "--plant-color": plant.color }}
                onClick={() => setSelectedId(plant.id)}
              >
                <span className="plant-mark" aria-hidden="true">
                  {plant.name.slice(0, 2)}
                </span>
                <span className="plant-card__body">
                  <strong>{plant.name}</strong>
                  <em>{plant.scientific}</em>
                  <span>{plant.difficulty} · {plant.light}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <aside className="detail-panel" aria-labelledby="detail-title">
          <div className="plant-visual" style={{ "--plant-color": selectedPlant.color }}>
            <span>{selectedPlant.name.slice(0, 2)}</span>
          </div>
          <p className="eyebrow">{selectedPlant.family}</p>
          <h2 id="detail-title">{selectedPlant.name}</h2>
          <p className="scientific">{selectedPlant.scientific}</p>

          <dl className="care-grid">
            <div>
              <dt>Licht</dt>
              <dd>{selectedPlant.light}</dd>
            </div>
            <div>
              <dt>Wasser</dt>
              <dd>{selectedPlant.water}</dd>
            </div>
            <div>
              <dt>Level</dt>
              <dd>{selectedPlant.difficulty}</dd>
            </div>
            <div>
              <dt>Größe</dt>
              <dd>{selectedPlant.height}</dd>
            </div>
          </dl>

          <p className="care-note">{selectedPlant.care}</p>

          <div className="tag-list">
            {selectedPlant.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>

          <button className="save-button" type="button" onClick={() => toggleSaved(selectedPlant.id)}>
            {savedIds.has(selectedPlant.id) ? "Aus Merkliste entfernen" : "Zur Merkliste hinzufügen"}
          </button>
        </aside>
      </section>
    </main>
  );
}

export default App;
