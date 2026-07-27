import { useState } from 'react';
import './PropertyFilters.css';

const EMPTY_FILTERS = {
  city: '',
  zipcode: '',
  minPrice: '',
  maxPrice: '',
  beds: '',
  baths: '',
};

// Removes empty-string values so the API only receives filters the user actually set
function stripEmpty(filters) {
  const result = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value !== '' && value !== undefined && value !== null) {
      result[key] = value;
    }
  }
  return result;
}

export default function PropertyFilters({ onSearch, onClear }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  function handleChange(e) {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSearch(stripEmpty(filters));
  }

  function handleClear() {
    setFilters(EMPTY_FILTERS);
    onClear();
  }

  return (
    <form className="property-filters" onSubmit={handleSubmit}>
      <div className="property-filters__field">
        <label htmlFor="city">City</label>
        <input id="city" name="city" type="text" value={filters.city} onChange={handleChange} placeholder="e.g. Malibu" />
      </div>

      <div className="property-filters__field">
        <label htmlFor="zipcode">ZIP Code</label>
        <input id="zipcode" name="zipcode" type="text" value={filters.zipcode} onChange={handleChange} placeholder="e.g. 90265" />
      </div>

      <div className="property-filters__field">
        <label htmlFor="minPrice">Min Price</label>
        <input id="minPrice" name="minPrice" type="number" min="0" value={filters.minPrice} onChange={handleChange} placeholder="No min" />
      </div>

      <div className="property-filters__field">
        <label htmlFor="maxPrice">Max Price</label>
        <input id="maxPrice" name="maxPrice" type="number" min="0" value={filters.maxPrice} onChange={handleChange} placeholder="No max" />
      </div>

      <div className="property-filters__field">
        <label htmlFor="beds">Beds</label>
        <select id="beds" name="beds" value={filters.beds} onChange={handleChange}>
            <option value="">Any</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
            <option value="5">5+</option>
        </select>
      </div>

      <div className="property-filters__field">
        <label htmlFor="baths">Baths</label>
        <select id="baths" name="baths" value={filters.baths} onChange={handleChange}>
            <option value="">Any</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
            <option value="5">5+</option>
        </select>
      </div>

      <div className="property-filters__actions">
        <button type="submit" className="property-filters__search-btn">Search</button>
        <button type="button" className="property-filters__clear-btn" onClick={handleClear}>
          Clear Filters
        </button>
      </div>
    </form>
  );
}