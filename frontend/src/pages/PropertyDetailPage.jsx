import { Fragment, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchPropertyDetail, fetchOpenHouses } from '../api/client';
import { getAllPhotoUrls } from '../utils/parsePhotos';
import PropertyImageGallery from '../components/PropertyImageGallery';
import PropertyMap from '../components/PropertyMap';
import OpenHouseList from '../components/OpenHouseList';
import './PropertyDetailPage.css';

const YEAR_BUILT_FIELD = 'YearBuilt';
const DESCRIPTION_FIELD = 'L_Remarks';

// --- Extra Property Details formatting -------------------------------------
// Column names below are verified against `DESCRIBE rets_property;` — don't
// add a field here without checking it exists first.

// Some *YN columns are tinyint(1) (1/0), others are varchar (likely 'Y'/'N').
// This handles both without assuming which one a given column is, and shows
// the raw value instead of guessing if it sees something unexpected.
function formatYesNo(value) {
  if (value === null || value === undefined || value === '') return null;
  const normalized = String(value).trim().toUpperCase();
  if (value === 1 || value === true || normalized === '1' || normalized === 'Y' || normalized === 'YES') {
    return 'Yes';
  }
  if (value === 0 || value === false || normalized === '0' || normalized === 'N' || normalized === 'NO') {
    return 'No';
  }
  return String(value); // unexpected value — don't guess, just show it
}

function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  return `$${num.toLocaleString()}`;
}

function formatNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  return num.toLocaleString();
}

function formatAcres(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  return `${num.toLocaleString(undefined, { maximumFractionDigits: 2 })} acres`;
}

function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatText(value) {
  if (value === null || value === undefined || value === '') return null;
  return String(value);
}

// MLS multi-select fields (InteriorFeatures, Appliances, LotFeatures, etc.)
// commonly come through as comma-separated PascalCase enum tokens with no
// spaces at all, e.g. "CeilingFan,CrownMolding,WalkInClosets". This splits
// each token into words and re-joins the list with proper spacing.
function formatEnumWord(word) {
  return word
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')   // ceilingFan -> ceiling Fan
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2') // HVACSystem -> HVAC System
    .trim();
}

function formatMultiValueText(value) {
  if (value === null || value === undefined || value === '') return null;
  const items = String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(formatEnumWord);
  if (items.length === 0) return null;
  return items.join(', ');
}

const FORMATTERS = {
  yesno: formatYesNo,
  currency: formatCurrency,
  number: formatNumber,
  acres: formatAcres,
  date: formatDate,
  text: formatText,
  multitext: formatMultiValueText,
};

// Grouped the way Zillow/Redfin present "Facts & Features."
const DETAIL_GROUPS = [
  {
    title: 'Interior',
    fields: [
      { label: 'Bedrooms (main level)', key: 'MainLevelBedrooms', format: 'number' },
      { label: 'Half Bathrooms', key: 'BathroomsHalf', format: 'number' },
      { label: 'Flooring', key: 'Flooring', format: 'multitext' },
      { label: 'Fireplace', key: 'FireplaceYN', format: 'yesno' },
      { label: 'Fireplace Features', key: 'FireplaceFeatures', format: 'multitext' },
      { label: 'Interior Features', key: 'InteriorFeatures', format: 'multitext' },
      { label: 'Appliances', key: 'Appliances', format: 'multitext' },
      { label: 'Room Types', key: 'RoomType', format: 'multitext' },
      { label: 'Heating', key: 'Heating', format: 'multitext' },
      { label: 'Cooling', key: 'Cooling', format: 'multitext' },
    ],
  },
  {
    title: 'Exterior & Lot',
    fields: [
      { label: 'Lot Size', key: 'LotSizeAcres', format: 'acres' },
      { label: 'Lot Size (sqft)', key: 'LotSizeSquareFeet', format: 'number' },
      { label: 'Lot Features', key: 'LotFeatures', format: 'multitext' },
      { label: 'Architectural Style', key: 'ArchitecturalStyle', format: 'multitext' },
      { label: 'Structure Type', key: 'StructureType', format: 'multitext' },
      { label: 'Property Condition', key: 'PropertyCondition', format: 'multitext' },
      { label: 'Roof', key: 'Roof', format: 'multitext' },
      { label: 'Patio / Porch', key: 'PatioAndPorchFeatures', format: 'multitext' },
      { label: 'Fencing', key: 'Fencing', format: 'multitext' },
      { label: 'View', key: 'View', format: 'multitext' },
      { label: 'Pool', key: 'PoolPrivateYN', format: 'yesno' },
      { label: 'Pool Features', key: 'PoolFeatures', format: 'multitext' },
      { label: 'Spa', key: 'SpaYN', format: 'yesno' },
      { label: 'Spa Features', key: 'SpaFeatures', format: 'multitext' },
    ],
  },
  {
    title: 'Parking',
    fields: [
      { label: 'Garage', key: 'GarageYN', format: 'yesno' },
      { label: 'Attached Garage', key: 'AttachedGarageYN', format: 'yesno' },
      { label: 'Open Parking Spaces', key: 'OpenParkingSpaces', format: 'number' },
    ],
  },
  {
    title: 'Community & HOA',
    fields: [
      { label: 'Subdivision', key: 'SubdivisionName' },
      { label: 'HOA', key: 'AssociationYN', format: 'yesno' },
      { label: 'Association Name', key: 'AssociationName' },
      { label: 'Association Fee', key: 'AssociationFee', format: 'currency' },
      { label: 'Fee Frequency', key: 'AssociationFeeFrequency' },
      { label: 'Association Amenities', key: 'AssociationAmenities', format: 'multitext' },
      { label: 'Community Features', key: 'CommunityFeatures', format: 'multitext' },
      { label: 'Security Features', key: 'SecurityFeatures', format: 'multitext' },
      { label: 'Senior Community', key: 'SeniorCommunityYN', format: 'yesno' },
      { label: 'Common Interest', key: 'CommonInterest' },
    ],
  },
  {
    title: 'Listing Details',
    fields: [
      { label: 'Status', key: 'StandardStatus' },
      { label: 'Days on Market', key: 'DaysOnMarket', format: 'number' },
      { label: 'On Market Date', key: 'OnMarketDate', format: 'date' },
      { label: 'New Construction', key: 'NewConstructionYN', format: 'yesno' },
      { label: 'Previous Price', key: 'PreviousListPrice', format: 'currency' },
      { label: 'County', key: 'CountyOrParish' },
      { label: 'High School District', key: 'HighSchoolDistrict' },
      { label: 'Parcel Number', key: 'ParcelNumber' },
      { label: 'Listing Office', key: 'LO1_OrganizationName' },
      { label: 'Listing Agent', key: 'ListAgentFullName' },
    ],
  },
];

// Formats one field's raw value using its declared formatter (defaults to
// plain text). Returns null for empty/missing values so callers can skip
// rendering that row entirely.
function formatFieldValue(field, property) {
  const raw = property[field.key];
  const formatter = FORMATTERS[field.format] || formatText;
  return formatter(raw);
}
// -----------------------------------------------------------------------------

export default function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
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

  // Uses browser back (not a Link to "/") so filters/page/sort/scroll on the
  // listings page are preserved. Falls back to "/" if there's no history
  // (e.g. someone opened this property from a shared link directly).
  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  }

  if (status === 'loading') {
    return <div className="property-detail__status">Loading property...</div>;
  }

  if (status === 'error') {
    return (
      <div className="property-detail__status property-detail__status--error">
        <p>Couldn't load this property: {errorMessage}</p>
        <button type="button" className="property-detail__back" onClick={handleBack}>Back to listings</button>
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
      <button type="button" className="property-detail__back" onClick={handleBack}>Back to listings</button>

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

        {DETAIL_GROUPS.map((group) => {
          const rows = group.fields
            .map((field) => ({ label: field.label, value: formatFieldValue(field, property) }))
            .filter((row) => row.value !== null && row.value !== undefined);

          if (rows.length === 0) return null; // skip whole group if nothing to show

          return (
            <section className="property-detail__section" key={group.title}>
              <h2>{group.title}</h2>
              <dl className="property-detail__facts">
                {rows.map((row) => (
                  <Fragment key={row.label}>
                    <dt>{row.label}</dt>
                    <dd>{row.value}</dd>
                  </Fragment>
                ))}
              </dl>
            </section>
          );
        })}

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