export default function PlantList({ plants }) {
  if (!plants || plants.length === 0) return <p>Keine Pflanzen gefunden.</p>;

  return (
    <div className='plant-list'>
      {plants.map((plant) => (
        <div
          key={plant.id}
          className='plant-card'
        >
          <h3>{plant.common_name || 'Kein Name'}</h3>
          <p>
            <i>{plant.scientific_name}</i>
          </p>
        </div>
      ))}
    </div>
  );
}
