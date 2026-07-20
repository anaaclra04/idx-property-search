const PLACEHOLDER_IMAGE = '/placeholder-property.png';

export function getFirstPhotoUrl(lPhotos) {
  if (!lPhotos) return PLACEHOLDER_IMAGE;

  let photos;
  try {
    photos = typeof lPhotos === 'string' ? JSON.parse(lPhotos) : lPhotos;
  } catch {
    return PLACEHOLDER_IMAGE; // malformed JSON
  }

  if (!Array.isArray(photos) || photos.length === 0) {
    return PLACEHOLDER_IMAGE; // empty array or wrong shape
  }

  const first = photos[0];
  if (typeof first === 'string' && first.trim()) return first;
  if (first && typeof first === 'object' && first.url) return first.url; // some MLS feeds nest {url: ...}

  return PLACEHOLDER_IMAGE;
}