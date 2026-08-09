import { useEffect, useRef, useState } from 'react';
import './PropertyImageGallery.css';

const PLACEHOLDER_IMAGE = '/placeholder-property.png';

export default function PropertyImageGallery({ photos = [], alt = 'Property' }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const lightboxRef = useRef(null);

  const hasPhotos = photos.length > 0;
  const showThumbs = photos.length > 1;
  const mainSrc = hasPhotos ? photos[activeIndex] : PLACEHOLDER_IMAGE;

  // Debug Challenge: Escape/arrow keys never fired here at first. A plain
  // <div onKeyDown={...}> can't receive keyboard events unless it's
  // focusable -- it needs tabIndex, AND something has to actually move
  // focus onto it. Adding tabIndex={-1} makes it focusable without adding
  // it to normal Tab order; calling .focus() when it mounts is what
  // actually gets keydown events flowing to the handler below.
  useEffect(() => {
    if (lightboxOpen && lightboxRef.current) {
      lightboxRef.current.focus();
    }
  }, [lightboxOpen]);

  function openLightbox() {
    if (hasPhotos) setLightboxOpen(true);
  }

  function closeLightbox() {
    setLightboxOpen(false);
  }

  function showPrev(e) {
    e?.stopPropagation();
    setActiveIndex((i) => (i === 0 ? photos.length - 1 : i - 1));
  }

  function showNext(e) {
    e?.stopPropagation();
    setActiveIndex((i) => (i === photos.length - 1 ? 0 : i + 1));
  }

  function handleLightboxKeyDown(e) {
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') showPrev();
    else if (e.key === 'ArrowRight') showNext();
  }

  // Close on click-outside: only when the click lands on the overlay
  // itself, not on the image or the arrow/close buttons inside it.
  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) closeLightbox();
  }

  return (
    <div className="property-gallery">
      <img
        src={mainSrc}
        alt={alt}
        className="property-gallery__main"
        referrerPolicy="no-referrer"
        onClick={openLightbox}
        onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }}
      />

      {showThumbs && (
        <div className="property-gallery__thumbs">
          {photos.map((url, i) => (
            <img
              key={`${url}-${i}`}
              src={url}
              alt={`${alt} thumbnail ${i + 1}`}
              referrerPolicy="no-referrer"
              className={
                i === activeIndex
                  ? 'property-gallery__thumb property-gallery__thumb--active'
                  : 'property-gallery__thumb'
              }
              onClick={() => setActiveIndex(i)}
              onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }}
            />
          ))}
        </div>
      )}

      {lightboxOpen && (
        <div
          className="property-gallery__lightbox"
          onClick={handleOverlayClick}
          onKeyDown={handleLightboxKeyDown}
          ref={lightboxRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label={`${alt} photo viewer`}
        >
          <button
            type="button"
            className="property-gallery__lightbox-close"
            onClick={closeLightbox}
            aria-label="Close"
          >
            ×
          </button>

          {photos.length > 1 && (
            <button
              type="button"
              className="property-gallery__lightbox-arrow property-gallery__lightbox-arrow--prev"
              onClick={showPrev}
              aria-label="Previous photo"
            >
              ‹
            </button>
          )}

          <img
            src={photos[activeIndex]}
            alt={alt}
            className="property-gallery__lightbox-image"
            referrerPolicy="no-referrer"
          />

          {photos.length > 1 && (
            <button
              type="button"
              className="property-gallery__lightbox-arrow property-gallery__lightbox-arrow--next"
              onClick={showNext}
              aria-label="Next photo"
            >
              ›
            </button>
          )}
        </div>
      )}
    </div>
  );
}