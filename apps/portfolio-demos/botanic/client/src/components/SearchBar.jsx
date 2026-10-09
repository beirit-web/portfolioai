import { useState } from 'react';

export default function SearchBar({ onSearch }) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className='search-bar'
    >
      <input
        type='text'
        placeholder='Pflanzenname eingeben'
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button type='submit'>Suchen</button>
    </form>
  );
}
