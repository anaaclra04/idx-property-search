import { useEffect, useRef, useState } from 'react';
import { fetchProperties } from '../api/client';
import PropertyCard from './PropertyCard';
import PropertyFilters from './PropertyFilters';
import './ListingsPage.css';

export default function ListingsPage() {
  const [filters, setFilters] = useState({});
  const [properties, setProperties] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('loading'); // 'loading' | 'error' | 'ready'
  const [errorMessage, setErrorMessage] = useState('');

  // Tracks the most recently issued request so a slow, stale response
  // can never overwrite results from a newer one (see Debug Challenge below)
  const latestRequestId = useRef(0);

  useEffect(() => {
    const requestId = ++latestRequestId.current;

    async function load() {
      setStatus('loading');
      try {
        const data = await fetchProperties({ ...filters, offset: 0, limit: 20 });
        if (requestId !== latestRequestId.current) return; // a newer search superseded this one
        setProperties(data.properties ?? data.results ?? []);
        setTotal(data.total ?? 0);
        setStatus('ready');
      } catch (err) {
        if (requestId !== latestRequestId.current) return;
        setErrorMessage(err.message);
        setStatus('error');
      }
    }

    load();
  }, [filters]);

  function handleSearch(newFilters) {
    setFilters(newFilters);
  }

  function handleClear() {
    setFilters({});
  }

  return (
    <div>
      <PropertyFilters onSearch={handleSearch} onClear={handleClear} />

      {status === 'loading' && (
        <div className="listings-status">Loading properties...</div>
      )}

      {status === 'error' && (
        <div className="listings-status listings-status--error">
          Couldn't load properties: {errorMessage}
        </div>
      )}

      {status === 'ready' && total === 0 && (
        <div className="listings-status">
          No properties found. Try adjusting or clearing your filters.
        </div>
      )}

      {status === 'ready' && total > 0 && (
        <>
          <p className="listings-count">
            Showing {properties.length} of {total} properties
          </p>
          <div className="listings-grid">
            {properties.map((p) => (
              <PropertyCard key={p.L_ListingID} property={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}