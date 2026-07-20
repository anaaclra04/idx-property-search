import { useEffect, useState } from 'react';
import { fetchProperties } from '../api/client';
import PropertyCard from './PropertyCard';
import './ListingsPage.css';

export default function ListingsPage() {
  const [properties, setProperties] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('loading'); // 'loading' | 'error' | 'ready'
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus('loading');
      try {
        const data = await fetchProperties({ offset: 1, limit: 20 });
        if (cancelled) return;
        setProperties(data.properties ?? data.results ?? []);
        setTotal(data.total ?? 0);
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        setErrorMessage(err.message);
        setStatus('error');
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  if (status === 'loading') {
    return <div className="listings-status">Loading properties...</div>;
  }

  if (status === 'error') {
    return (
      <div className="listings-status listings-status--error">
        Couldn't load properties: {errorMessage}
      </div>
    );
  }

  return (
    <div>
      <p className="listings-count">
        Showing {properties.length} of {total} properties
      </p>
      <div className="listings-grid">
        {properties.map((p) => (
          <PropertyCard key={p.L_ListingID} property={p} />
        ))}
      </div>
    </div>
  );
}