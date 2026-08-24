import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import PropertyImageCarousel from './PropertyImageCarousel';
import { getAllPhotoUrls } from '../utils/parsePhotos';
import { useFavorites } from '../hooks/useFavorites';
import './PropertyCard.css';

//first photo (parsed from L_Photos JSON array), price, address, city/state, beds, baths, and sqft
export default function PropertyCard({ property }) {
  const {
    L_ListingID,
    L_SystemPrice,
    L_Address,
    L_City,
    L_State,
    L_Keyword2: beds,
    LM_Dec_3: baths,
    LM_Int2_3: sqft,
    L_Photos,
  } = property;

  const photos = getAllPhotoUrls(L_Photos);
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(L_ListingID);

  function handleHeartClick(e) {
    e.preventDefault();   // heart sits inside a <Link> — don't follow it
    e.stopPropagation();  // and don't let the click bubble up to the card either
    toggleFavorite(L_ListingID);
  }

  return (
    <Link to={`/property/${L_ListingID}`} className="property-card">
      <div className="property-card__media">
        <PropertyImageCarousel photos={photos} alt={L_Address || 'Property'} />
        <button
          type="button"
          className={`property-card__favorite-btn${favorited ? ' property-card__favorite-btn--active' : ''}`}
          onClick={handleHeartClick}
          aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
          aria-pressed={favorited}
        >
          {favorited ? '♥' : '♡'}
        </button>
      </div>
      <div className="property-card__body">
        <p className="property-card__price">
          {L_SystemPrice ? `$${Number(L_SystemPrice).toLocaleString()}` : 'Price unavailable'}
        </p>
        <p className="property-card__address">{L_Address}</p>
        <p className="property-card__city">{L_City}, {L_State}</p>
        <div className="property-card__stats">
          <span>{beds ?? '–'} bd</span>
          <span>{baths ?? '–'} ba</span>
          <span>{sqft ? `${Number(sqft).toLocaleString()} sqft` : '– sqft'}</span>
        </div>
      </div>
    </Link>
  );
}

PropertyCard.propTypes = {
  property: PropTypes.shape({
    L_ListingID: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    L_SystemPrice: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    L_Address: PropTypes.string,
    L_City: PropTypes.string,
    L_State: PropTypes.string,
    L_Keyword2: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    LM_Dec_3: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    LM_Int2_3: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    L_Photos: PropTypes.string,
  }).isRequired,
};