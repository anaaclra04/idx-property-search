import { useState } from 'react';
import './PropertyImageCarousel.css';

const PLACEHOLDER_IMAGE = '/placeholder-property.png';

// Lives inside a clickable PropertyCard (a <Link>), so every arrow click
// must stopPropagation + preventDefault or it'll also navigate to the
// detail page.
export default function PropertyImageCarousel({ photos = [], alt = 'Property' }) {
  const [index, setIndex] = useState(0);
  const hasPhotos = photos.length > 0;
  const showControls = photos.length > 1;
  const src = hasPhotos ? photos[index] : PLACEHOLDER_IMAGE;

  function goPrev(e) {
    e.preventDefault();
    e.stopPropagation();
    setIndex((i) => (i === 0 ? photos.length - 1 : i - 1));
  }

  function goNext(e) {
    e.preventDefault();
    e.stopPropagation();
    setIndex((i) => (i === photos.length - 1 ? 0 : i + 1));
  }

  return (
    <div className="property-carousel">
      <img
        src={src}
        alt={alt}
        className="property-carousel__image"
        referrerPolicy="no-referrer"
        onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }}
      />
      {showControls && (
        <>
          <button
            type="button"
            className="property-carousel__arrow property-carousel__arrow--prev"
            onClick={goPrev}
            aria-label="Previous photo"
          >
            ‹
          </button>
          <button
            type="button"
            className="property-carousel__arrow property-carousel__arrow--next"
            onClick={goNext}
            aria-label="Next photo"
          >
            ›
          </button>
          <span className="property-carousel__counter">
            {index + 1} / {photos.length}
          </span>
        </>
      )}
    </div>
  );
}