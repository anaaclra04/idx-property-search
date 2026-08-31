import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchProperties } from '../api/client';
import PropertyCard from '../components/PropertyCard';
import PropertyFilters from '../components/PropertyFilters';
import Pagination from '../components/Pagination';
import SortControl from '../components/SortControl';
import './ListingsPage.css';

const FILTER_KEYS = ['city', 'zipcode', 'minPrice', 'maxPrice', 'beds', 'baths'];

// Reads filters/sort/page out of the URL so a fresh mount (e.g. after
// clicking browser back from a property) starts from the same search state
// instead of the defaults.
function parseFiltersFromParams(params) {
  const filters = {};
  for (const key of FILTER_KEYS) {
    const value = params.get(key);
    if (value !== null && value !== '') filters[key] = value;
  }
  return filters;
}

// Builds the same query-string shape for both the address bar and the
// sessionStorage scroll key, so the two always agree on "which search" this is.
function buildParamsString(filters, sortBy, sortOrder, currentPage) {
  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    if (filters[key] !== undefined && filters[key] !== '') params.set(key, filters[key]);
  }
  if (sortBy) params.set('sortBy', sortBy);
  if (sortOrder) params.set('sortOrder', sortOrder);
  if (currentPage > 1) params.set('page', String(currentPage));
  return params.toString();
}

export default function ListingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState(() => parseFiltersFromParams(searchParams));
  const [sortBy, setSortBy] = useState(() => searchParams.get('sortBy') || undefined);
  const [sortOrder, setSortOrder] = useState(() => searchParams.get('sortOrder') || undefined);
  const [currentPage, setCurrentPage] = useState(() => Number(searchParams.get('page')) || 1);
  const [itemsPerPage] = useState(20); // no page-size selector yet
  const [properties, setProperties] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('loading'); // 'loading' | 'error' | 'ready'
  const [errorMessage, setErrorMessage] = useState('');

  // Tracks the most recently issued request so a slow, stale response
  // can never overwrite results from a newer one (see Debug Challenge below)
  const latestRequestId = useRef(0);

  // Always holds the query string for the CURRENT search state, updated every
  // render. Read (not written) inside the unmount cleanup below, so the scroll
  // position gets saved under the right key even though that effect only runs once.
  const paramsStringRef = useRef('');
  paramsStringRef.current = buildParamsString(filters, sortBy, sortOrder, currentPage);

  const hasAttemptedRestore = useRef(false);

  // Keep the address bar in sync with filters/sort/page. This is what lets
  // browser back land on the exact same search instead of a blank listings page.
  useEffect(() => {
    setSearchParams(paramsStringRef.current, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sortBy, sortOrder, currentPage]);

  useEffect(() => {
    const requestId = ++latestRequestId.current;
    const offset = (currentPage - 1) * itemsPerPage;

    async function load() {
      setStatus('loading');
      try {
        const params = { ...filters, offset, limit: itemsPerPage };
        if (sortBy) {
          params.sortBy = sortBy;
          params.sortOrder = sortOrder || 'asc';
        }
        const data = await fetchProperties(params);
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
  }, [filters, sortBy, sortOrder, currentPage, itemsPerPage]);

  // Restore scroll position the first time results come back after mount
  // (e.g. returning via browser back). Only fires once per mount, and only
  // finds a saved value when the key (filters+sort+page) matches exactly.
  useEffect(() => {
    if (status !== 'ready' || hasAttemptedRestore.current) return;
    hasAttemptedRestore.current = true;
    const key = `listings-scroll:${paramsStringRef.current}`;
    const saved = sessionStorage.getItem(key);
    if (saved !== null) {
      sessionStorage.removeItem(key);
      requestAnimationFrame(() => window.scrollTo(0, Number(saved)));
    }
  }, [status]);

  // Save scroll position at the moment this page unmounts (e.g. clicking into
  // a property card), keyed to the search state the user was viewing.
  useEffect(() => {
    return () => {
      sessionStorage.setItem(`listings-scroll:${paramsStringRef.current}`, String(window.scrollY));
    };
  }, []);

  function handleSearch(newFilters) {
    setFilters(newFilters);
    setSortBy(undefined);   // sort resets when filters change
    setSortOrder(undefined);
    setCurrentPage(1);      // new filters always start back at page 1
  }

  function handleClear() {
    setFilters({});
    setSortBy(undefined);
    setSortOrder(undefined);
    setCurrentPage(1);
  }

  function handleSortChange(newSortBy, newSortOrder) {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setCurrentPage(1); // changing sort re-orders the whole result set, so start over at page 1
  }

  function handlePageChange(page) {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  }

  const totalPages = Math.max(Math.ceil(total / itemsPerPage), 1);
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const rangeEnd = Math.min(currentPage * itemsPerPage, total);

  return (
    <div>
      <PropertyFilters onSearch={handleSearch} onClear={handleClear} initialFilters={filters} />

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
          <div className="listings-toolbar">
            <p className="listings-count">
              Showing {rangeStart}-{rangeEnd} of {total} properties
            </p>
            <SortControl sortBy={sortBy} sortOrder={sortOrder} onSortChange={handleSortChange} />
          </div>
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