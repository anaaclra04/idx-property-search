import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchPropertyDetail, fetchOpenHouses } from '../api/client';
import { getAllPhotoUrls } from '../utils/parsePhotos';
import PropertyImageGallery from './PropertyImageGallery';
import PropertyMap from './PropertyMap';
import OpenHouseList from './OpenHouseList';
import './PropertyDetailPage.css';

const YEAR_BUILT_FIELD = 'YearBuilt';
const DESCRIPTION_FIELD = 'L_Remarks';

export default function PropertyDetailPage() {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [openHouses, setOpenHouses] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'error' | 'ready'
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus('loading');
      try {
        const [propertyData, openHouseData] = await Promise.all([
          fetchPropertyDetail(id),
          fetchOpenHouses(id),
        ]);
        if (cancelled) return;
        setProperty(propertyData);
        setOpenHouses(openHouseData.results ?? []);
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        setErrorMessage(err.message);
        setStatus('error');
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  if (status === 'loading') {
    return <div className="property-detail__status">Loading property...</div>;
  }

  if (status === 'error') {
    return (
      <div className="property-detail__status property-detail__status--error">
        <p>Couldn't load this property: {errorMessage}</p>
        <Link to="/">← Back to listings</Link>
      </div>
    );
  }

  const {
    L_SystemPrice,
    L_Address,
    L_City,
    L_State,
    L_Zip,
    L_Keyword2: beds,
    LM_Dec_3: baths,
    LM_Int2_3: sqft,
    L_Photos,
    L_Type_: propertyType,
    L_Class: propertyClass,
    LMD_MP_Latitude: lat,
    LMD_MP_Longitude: lng,
  } = property;

  const yearBuilt = property[YEAR_BUILT_FIELD];
  const description = property[DESCRIPTION_FIELD];
  const photos = getAllPhotoUrls(L_Photos);

  return (
    <div className="property-detail">
      <Link to="/" className="property-detail__back">← Back to listings</Link>

      <PropertyImageGallery photos={photos} alt={L_Address || 'Property'} />

      <div className="property-detail__body">
        <p className="property-detail__price">
          {L_SystemPrice ? `$${Number(L_SystemPrice).toLocaleString()}` : 'Price unavailable'}
        </p>
        <h1 className="property-detail__address">{L_Address}</h1>
        <p className="property-detail__location">{L_City}, {L_State} {L_Zip}</p>

        <div className="property-detail__stats">
          <span>{beds ?? '–'} bd</span>
          <span>{baths ?? '–'} ba</span>
          <span>{sqft ? `${Number(sqft).toLocaleString()} sqft` : '– sqft'}</span>
          {yearBuilt && <span>Built {yearBuilt}</span>}
        </div>

        {description && (
          <section className="property-detail__section">
            <h2>Description</h2>
            <p>{description}</p>
          </section>
        )}

        <section className="property-detail__section">
          <h2>Property Details</h2>
          <dl className="property-detail__facts">
            {propertyType && (
              <>
                <dt>Type</dt>
                <dd>{propertyType}</dd>
              </>
            )}
            {propertyClass && (
              <>
                <dt>Class</dt>
                <dd>{propertyClass}</dd>
              </>
            )}
          </dl>
        </section>

        {lat && lng && (
          <section className="property-detail__section">
            <h2>Location</h2>
            <PropertyMap lat={lat} lng={lng} address={L_Address} />
          </section>
        )}

        <section className="property-detail__section">
          <h2>Open Houses</h2>
          <OpenHouseList openHouses={openHouses} />
        </section>
      </div>
    </div>
  );
}