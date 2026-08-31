import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PropertyDetailPage from './PropertyDetailPage';
import * as client from '../api/client';

jest.mock('../api/client');

function renderDetailPage({ initialEntries = ['/property/271555'], historyLength = 2 } = {}) {
  Object.defineProperty(window, 'history', {
    value: { ...window.history, length: historyLength },
    writable: true,
  });

  return render(
    <MemoryRouter initialEntries={initialEntries} initialIndex={initialEntries.length - 1}>
      <Routes>
        <Route path="/" element={<div>Listings Marker</div>} />
        <Route path="/property/:id" element={<PropertyDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

const fullProperty = {
  L_ListingID: '271555',
  L_SystemPrice: 2150000,
  L_Address: '3766 Deedham Drive',
  L_City: 'San Jose',
  L_State: 'CA',
  L_Zip: '95111',
  L_Keyword2: 4,
  LM_Dec_3: 3,
  LM_Int2_3: 2170,
  L_Photos: '[]',
  L_Type_: 'Single Family Residence',
  L_Class: 'Residential',
  LMD_MP_Latitude: 37.33,
  LMD_MP_Longitude: -121.89,
  YearBuilt: 1998,
  L_Remarks: 'A beautifully maintained home in a quiet neighborhood.',

  // Interior
  MainLevelBedrooms: 2,
  BathroomsHalf: 1,
  Flooring: 'Hardwood,Tile',
  FireplaceYN: 1,
  FireplaceFeatures: 'LivingRoom',
  InteriorFeatures: 'CeilingFan,ADUSpace',
  Appliances: 'Dishwasher,Microwave',
  RoomType: 'FamilyRoom',
  Heating: 'Central',
  Cooling: 'CentralAir',

  // Exterior & Lot
  LotSizeAcres: 0.2567,
  LotSizeSquareFeet: 11200,
  LotFeatures: 'CornerLot',
  ArchitecturalStyle: 'Contemporary',
  StructureType: 'House',
  PropertyCondition: 'UpdatedRemodeled',
  Roof: 'Tile',
  PatioAndPorchFeatures: 'Patio',
  Fencing: 'Wood',
  View: 'Mountains',
  PoolPrivateYN: 'Y',
  PoolFeatures: 'InGround',
  SpaYN: true,
  SpaFeatures: 'Heated',

  // Parking
  GarageYN: 1,
  AttachedGarageYN: 'YES',
  OpenParkingSpaces: 2,

  // Community & HOA
  SubdivisionName: 'Willow Glen',
  AssociationYN: 'Y',
  AssociationName: 'Willow Glen HOA',
  AssociationFee: 150,
  AssociationFeeFrequency: 'Monthly',
  AssociationAmenities: 'Pool,Clubhouse',
  CommunityFeatures: 'Sidewalks',
  SecurityFeatures: 'SmokeDetectors',
  SeniorCommunityYN: 0,
  CommonInterest: 'None',

  // Listing Details
  StandardStatus: 'Active',
  DaysOnMarket: 14,
  OnMarketDate: '2026-06-01',
  NewConstructionYN: 'N',
  PreviousListPrice: 2250000,
  CountyOrParish: 'Santa Clara',
  HighSchoolDistrict: 'San Jose Unified',
  ParcelNumber: '123-45-678',
  LO1_OrganizationName: 'ABC Realty',
  ListAgentFullName: 'Jane Agent',
};

const minimalProperty = {
  L_ListingID: '999999',
  L_Address: '1 No Frills Ave',
  L_City: 'Nowhere',
  L_State: 'CA',
  L_Zip: '00000',
  L_Photos: '[]',
};

const quirkyProperty = {
  ...minimalProperty,
  GarageYN: 'Maybe', // unexpected yesno value -> shows raw string, not Yes/No
  NewConstructionYN: 'N', // "No" branch
  OnMarketDate: 'not-a-real-date', // invalid date -> row skipped
};

const edgeCaseProperty = {
  ...minimalProperty,
  L_Address: '', // falsy address -> gallery alt text falls back to 'Property'
  AssociationFee: 'not-a-number', // currency formatter's NaN branch -> row skipped
  LotSizeSquareFeet: 'not-a-number', // number formatter's NaN branch -> row skipped
  LotSizeAcres: 'not-a-number', // acres formatter's NaN branch -> row skipped
  Flooring: ',', // splits/trims/filters down to an empty list -> row skipped
};

beforeEach(() => {
  jest.clearAllMocks();
});

test('shows a loading state before data arrives', async () => {
  client.fetchPropertyDetail.mockImplementation(() => new Promise(() => {}));
  client.fetchOpenHouses.mockImplementation(() => new Promise(() => {}));

  renderDetailPage();

  expect(screen.getByText(/loading property/i)).toBeInTheDocument();
});

test('shows an error state when the fetch fails', async () => {
  client.fetchPropertyDetail.mockRejectedValueOnce(new Error('Not found'));
  client.fetchOpenHouses.mockResolvedValueOnce({ results: [] });

  renderDetailPage();

  await waitFor(() => {
    expect(screen.getByText(/couldn't load this property: not found/i)).toBeInTheDocument();
  });
});

test('renders full property details, formatted facts, map, and open houses', async () => {
  client.fetchPropertyDetail.mockResolvedValueOnce(fullProperty);
  client.fetchOpenHouses.mockResolvedValueOnce({
    results: [
      {
        id: 1,
        OpenHouseDate: '2026-09-06',
        OH_StartTime: '13:00:00',
        OH_EndTime: '15:00:00',
        all_data: '{"OpenHouseRemarks":"Sunday open house"}',
      },
    ],
  });

  renderDetailPage();

  await waitFor(() => {
    expect(screen.getByText('$2,150,000')).toBeInTheDocument();
  });
  expect(screen.getByText('3766 Deedham Drive')).toBeInTheDocument();
  expect(screen.getByText('San Jose, CA 95111')).toBeInTheDocument();
  expect(screen.getByText('4 bd')).toBeInTheDocument();
  expect(screen.getByText('3 ba')).toBeInTheDocument();
  expect(screen.getByText('2,170 sqft')).toBeInTheDocument();
  expect(screen.getByText('Built 1998')).toBeInTheDocument();
  expect(screen.getByText(/beautifully maintained home/i)).toBeInTheDocument();
  expect(screen.getByText('Single Family Residence')).toBeInTheDocument();
  expect(screen.getByText('Residential')).toBeInTheDocument();

  // yesno formatter branches: true-ish -> "Yes"
  expect(screen.getByText('Fireplace')).toBeInTheDocument();
  expect(screen.getAllByText('Yes').length).toBeGreaterThan(0);

  // multitext formatter, including the acronym-splitting regex branch
  expect(screen.getByText('Ceiling Fan, ADU Space')).toBeInTheDocument();

  // currency / number / acres / date formatters
  expect(screen.getByText('$150')).toBeInTheDocument(); // AssociationFee
  expect(screen.getByText('11,200')).toBeInTheDocument(); // LotSizeSquareFeet
  expect(screen.getByText('0.26 acres')).toBeInTheDocument(); // LotSizeAcres
  const expectedOnMarketDate = new Date(fullProperty.OnMarketDate).toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});
expect(screen.getByText(expectedOnMarketDate)).toBeInTheDocument(); // OnMarketDate

  // group headings all present since every group has at least one field
  expect(screen.getByText('Interior')).toBeInTheDocument();
  expect(screen.getByText('Exterior & Lot')).toBeInTheDocument();
  expect(screen.getByText('Parking')).toBeInTheDocument();
  expect(screen.getByText('Community & HOA')).toBeInTheDocument();
  expect(screen.getByText('Listing Details')).toBeInTheDocument();

  // map renders when lat/lng are present
  expect(screen.getByTitle(/map showing 3766 deedham drive/i)).toBeInTheDocument();

  // open house with remarks
  expect(screen.getByText('Sunday open house')).toBeInTheDocument();
});

test('omits optional sections and shows placeholders when data is sparse', async () => {
  client.fetchPropertyDetail.mockResolvedValueOnce(minimalProperty);
  client.fetchOpenHouses.mockResolvedValueOnce({ results: [] });

  renderDetailPage({ initialEntries: ['/property/999999'] });

  await waitFor(() => {
    expect(screen.getByText('1 No Frills Ave')).toBeInTheDocument();
  });

  expect(screen.getByText('Price unavailable')).toBeInTheDocument();
  expect(screen.getByText((_, el) => el?.textContent === '– bd')).toBeInTheDocument();
  expect(screen.getByText((_, el) => el?.textContent === '– ba')).toBeInTheDocument();
  expect(screen.getByText('– sqft')).toBeInTheDocument();
  expect(screen.queryByText(/^Built /)).not.toBeInTheDocument();
  expect(screen.queryByText('Description')).not.toBeInTheDocument();

  // no group has any populated field, so none of the group headings render
  expect(screen.queryByText('Interior')).not.toBeInTheDocument();
  expect(screen.queryByText('Exterior & Lot')).not.toBeInTheDocument();
  expect(screen.queryByText('Parking')).not.toBeInTheDocument();
  expect(screen.queryByText('Community & HOA')).not.toBeInTheDocument();
  expect(screen.queryByText('Listing Details')).not.toBeInTheDocument();

  // no lat/lng -> no map
  expect(screen.queryByTitle(/map showing/i)).not.toBeInTheDocument();

  // no open houses
  expect(screen.getByText(/no open houses scheduled/i)).toBeInTheDocument();
});

test('handles the "No" and unrecognized yesno branches, and an invalid date', async () => {
  client.fetchPropertyDetail.mockResolvedValueOnce(quirkyProperty);
  client.fetchOpenHouses.mockResolvedValueOnce({ results: [] });

  renderDetailPage({ initialEntries: ['/property/999999'] });

  await waitFor(() => {
    expect(screen.getByText('1 No Frills Ave')).toBeInTheDocument();
  });

  // GarageYN: 'Maybe' doesn't match Yes/No sets, so the raw value is shown
  expect(screen.getByText('Maybe')).toBeInTheDocument();
  // NewConstructionYN: 'N' -> "No"
  expect(screen.getByText('No')).toBeInTheDocument();
  // OnMarketDate: an unparseable string -> row is skipped entirely
  expect(screen.queryByText('On Market Date')).not.toBeInTheDocument();
});

test('skips fields that fail to format and falls back to a generic alt text with no address', async () => {
  client.fetchPropertyDetail.mockResolvedValueOnce(edgeCaseProperty);
  client.fetchOpenHouses.mockResolvedValueOnce({}); // no `results` key at all

  renderDetailPage({ initialEntries: ['/property/999999'] });

  await waitFor(() => {
    expect(screen.getByText('Price unavailable')).toBeInTheDocument();
  });

  // gallery alt falls back to 'Property' when L_Address is empty
  expect(screen.getByAltText('Property')).toBeInTheDocument();

  // currency/number/acres NaN branches -> these rows never render
  expect(screen.queryByText('Association Fee')).not.toBeInTheDocument();
  expect(screen.queryByText('Lot Size (sqft)')).not.toBeInTheDocument();
  expect(screen.queryByText('Lot Size')).not.toBeInTheDocument();

  // multitext that trims down to an empty list -> row skipped too
  expect(screen.queryByText('Flooring')).not.toBeInTheDocument();

  // fetchOpenHouses resolving with no `results` key falls back to []
  expect(screen.getByText(/no open houses scheduled/i)).toBeInTheDocument();
});

test('back button navigates to the previous page when history exists', async () => {
  client.fetchPropertyDetail.mockResolvedValueOnce(fullProperty);
  client.fetchOpenHouses.mockResolvedValueOnce({ results: [] });

  renderDetailPage({ initialEntries: ['/', '/property/271555'], historyLength: 2 });

  await waitFor(() => {
    expect(screen.getByText('3766 Deedham Drive')).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole('button', { name: /back to listings/i }));

  await waitFor(() => {
    expect(screen.getByText('Listings Marker')).toBeInTheDocument();
  });
});

test('back button falls back to the listings route when there is no history', async () => {
  client.fetchPropertyDetail.mockResolvedValueOnce(fullProperty);
  client.fetchOpenHouses.mockResolvedValueOnce({ results: [] });

  renderDetailPage({ initialEntries: ['/property/271555'], historyLength: 1 });

  await waitFor(() => {
    expect(screen.getByText('3766 Deedham Drive')).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole('button', { name: /back to listings/i }));

  await waitFor(() => {
    expect(screen.getByText('Listings Marker')).toBeInTheDocument();
  });
});

test('back button works from the error state too', async () => {
  client.fetchPropertyDetail.mockRejectedValueOnce(new Error('Not found'));
  client.fetchOpenHouses.mockResolvedValueOnce({ results: [] });

  renderDetailPage({ initialEntries: ['/', '/property/271555'], historyLength: 2 });

  await waitFor(() => {
    expect(screen.getByText(/couldn't load this property/i)).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole('button', { name: /back to listings/i }));

  await waitFor(() => {
    expect(screen.getByText('Listings Marker')).toBeInTheDocument();
  });
});

test('does not update state after unmounting mid-fetch', async () => {
  let resolveDetail;
  client.fetchPropertyDetail.mockImplementation(
    () => new Promise((resolve) => { resolveDetail = resolve; })
  );
  client.fetchOpenHouses.mockResolvedValue({ results: [] });

  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

  const { unmount } = renderDetailPage();
  unmount();

  resolveDetail(fullProperty);
  await Promise.resolve();
  await Promise.resolve();

  expect(consoleError).not.toHaveBeenCalled();
  consoleError.mockRestore();
});

test('does not update state after unmounting mid-fetch when the fetch then fails', async () => {
  let rejectDetail;
  client.fetchPropertyDetail.mockImplementation(
    () => new Promise((_, reject) => { rejectDetail = reject; })
  );
  client.fetchOpenHouses.mockResolvedValue({ results: [] });

  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

  const { unmount } = renderDetailPage();
  unmount();

  rejectDetail(new Error('too late'));
  await Promise.resolve();
  await Promise.resolve();

  expect(consoleError).not.toHaveBeenCalled();
  consoleError.mockRestore();
});