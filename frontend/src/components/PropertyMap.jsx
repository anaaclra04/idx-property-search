import './PropertyMap.css';

// Iframe-based Google Maps Embed API -- no npm package needed. Requires
// REACT_APP_GOOGLE_MAPS_API_KEY in frontend/.env (see README Week 8 setup).
export default function PropertyMap({ lat, lng, address }) {
  if (!lat || !lng) return null;

  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  const embedSrc = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${lat},${lng}&zoom=15`;
  const directionsHref = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  return(
    <div className='property-map'>
        <iframe
            title={`Map showing ${address || 'property location'}`}
            className="property-map__frame"
            src={embedSrc}
            loading="lazy"
            allowFullScreen
            referrerPolicy='no-referrer-when-downgrade'
    />
        <a
        href={directionsHref}
        target="_blank"
        rel="noopener noreferrer"
        className="property-map__directions"
    >
        Get Directions
        </a>
    </div>
  );
}