import { useEffect, useRef, useState } from 'react';
import { fetchProperties } from '../api/client';
import PropertyCard from './PropertyCard';
import PropertyFilters from './PropertyFilters';
import Pagination from './Pagination';
import './ListingsPage.css';

export default function ListingsPage() {
  const [filters, setFilters] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20); // no page-size selector yet
  const [properties, setProperties] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('loading'); // 'loading' | 'error' | 'ready'
  const [errorMessage, setErrorMessage] = useState('');

  // Tracks the most recently issued request so a slow, stale response
  // can never overwrite results from a newer one (see Debug Challenge below)
  const latestRequestId = useRef(0);

  useEffect(() => {
    const requestId = ++latestRequestId.current;
    const offset = (currentPage - 1) * itemsPerPage;

    async function load() {
      setStatus('loading');
      try {
        const data = await fetchProperties({ ...filters, offset, limit: itemsPerPage });
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
  }, [filters, currentPage, itemsPerPage]);

  function handleSearch(newFilters) {
    setFilters(newFilters);
    setCurrentPage(1); //new filters always start back at page 1
  }

  function handleClear() {
    setFilters({});
    setCurrentPage(1);
  }

  function handlePageChange(page) {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  }

  const totalPages = Math.max(Math.ceil(total / itemsPerPage), 1);
  const rangeStart = total == 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const rangeEnd = Math.min(currentPage * itemsPerPage, total);

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
            Showing {rangeStart}-{rangeEnd} of {total} properties
          </p>
          <div className="listings-grid">
            {properties.map((p) => (
              <PropertyCard key={p.L_ListingID} property={p} />
            ))}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
}