import { getFirstPhotoUrl } from '../utils/parsePhotos';
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

  const photoUrl = getFirstPhotoUrl(L_Photos);

  return (
    <div className="property-card">
      <img
        src={photoUrl}
        alt={L_Address || 'Property'}
        className="property-card__image"
        onError={(e) => { e.target.src = '/placeholder-property.png'; }}
      />
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
    </div>
  );
}