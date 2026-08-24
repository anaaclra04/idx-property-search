import { useEffect, useState } from 'react';
import { fetchPropertyDetail } from '../api/client';
import { useFavorites } from '../hooks/useFavorites';
import PropertyCard from '../components/PropertyCard';
import './FavoritesPage.css';

export default function FavoritesPage() {
  const { favorites } = useFavorites();
  const [properties, setProperties] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready'

  useEffect(() => {
    if (favorites.length === 0) {
      setProperties([]);
      setStatus('ready');
      return;
    }

    let cancelled = false;
    setStatus('loading');

    Promise.allSettled(favorites.map((id) => fetchPropertyDetail(id))).then((results) => {
      if (cancelled) return;
      const loaded = results
        .filter((r) => r.status === 'fulfilled')
        .map((r) => r.value);
      setProperties(loaded);
      setStatus('ready');
    });

    return () => { cancelled = true; };
  }, [favorites]);

  return (
    <div>
      <h2 className="favorites-page__heading">
        Your Favorites {favorites.length > 0 && `(${favorites.length})`}
      </h2>

      {status === 'loading' && (
        <div className="listings-status">Loading favorites...</div>
      )}

      {status === 'ready' && properties.length === 0 && (
        <div className="listings-status">
          No favorites yet. Browse listings and tap the heart on any property to save it here.
        </div>
      )}

      {status === 'ready' && properties.length > 0 && (
        <div className="listings-grid">
          {properties.map((p) => (
            <PropertyCard key={p.L_ListingID} property={p} />
          ))}
        </div>
      )}
    </div>
  );
}