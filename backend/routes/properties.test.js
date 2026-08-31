const express = require('express');
const request = require('supertest');

// The pool is mocked with a factory, so the real db.js module (which opens a
// live connection and calls process.exit(1) on failure) never actually runs.
jest.mock('../src/db/db', () => ({
  query: jest.fn(),
}));

const pool = require('../src/db/db');
const propertiesRouter = require('./properties');

function buildApp() {
  const app = express();
  app.use('/api/properties', propertiesRouter);
  return app;
}

const app = buildApp();

beforeEach(() => {
  pool.query.mockReset();
});

// Mock helpers -- shaped to match what mysql2/promise actually resolves with,
// so tests fail if the route's destructuring assumptions ever change.
function mockListQueries(total, results) {
  pool.query
    .mockResolvedValueOnce([[{ total }]]) // COUNT(*) query
    .mockResolvedValueOnce([results]); // paginated data query
}

function mockDetailQuery(row) {
  pool.query.mockResolvedValueOnce([row ? [row] : []]);
}

function mockOpenHousesQueries(property, openhouses) {
  pool.query
    .mockResolvedValueOnce([property ? [property] : []]) // existence check
    .mockResolvedValueOnce([openhouses]); // open house rows
}

const sampleProperty = {
  id: 1,
  L_ListingID: '271555',
  L_DisplayId: 'MLS271555',
  L_Address: '3766 Deedham Drive',
  L_Zip: '95111',
  L_AddressStreet: 'Deedham Drive',
  L_City: 'San Jose',
  L_State: 'CA',
  L_Keyword2: 4,
  LM_Dec_3: 3,
  L_SystemPrice: 2150000,
  LM_Int2_3: 2170,
  L_Photos: '[]',
};

describe('GET /api/properties', () => {
  test('returns paginated results with default limit/offset', async () => {
    mockListQueries(2, [sampleProperty, { ...sampleProperty, id: 2 }]);

    const res = await request(app).get('/api/properties');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      total: 2,
      limit: 20,
      offset: 0,
      results: [sampleProperty, { ...sampleProperty, id: 2 }],
    });
    expect(pool.query).toHaveBeenCalledTimes(2);
  });

  test('honors custom limit and offset', async () => {
    mockListQueries(50, [sampleProperty]);

    const res = await request(app).get('/api/properties?limit=5&offset=10');

    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(5);
    expect(res.body.offset).toBe(10);
    // both the count and data queries should have been issued with bound values
    const dataCallArgs = pool.query.mock.calls[1];
    expect(dataCallArgs[1]).toEqual(expect.arrayContaining([5, 10]));
  });

  test('rejects a limit above 100', async () => {
    const res = await request(app).get('/api/properties?limit=500');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/limit/i);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('rejects a negative offset', async () => {
    const res = await request(app).get('/api/properties?offset=-1');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/offset/i);
  });

  test('filters by city', async () => {
    mockListQueries(1, [sampleProperty]);

    const res = await request(app).get('/api/properties?city=San Jose');

    expect(res.status).toBe(200);
    const [countSql, countValues] = pool.query.mock.calls[0];
    expect(countSql).toMatch(/LOWER\(TRIM\(L_City\)\)/);
    expect(countValues).toEqual(['San Jose']);
  });

  test('filters by zipcode', async () => {
    mockListQueries(1, [sampleProperty]);

    const res = await request(app).get('/api/properties?zipcode=95111');

    expect(res.status).toBe(200);
    const [countSql, countValues] = pool.query.mock.calls[0];
    expect(countSql).toMatch(/L_ZIP = \?/);
    expect(countValues).toEqual(['95111']);
  });

  test('filters by minPrice and maxPrice together', async () => {
    mockListQueries(1, [sampleProperty]);

    const res = await request(app).get('/api/properties?minPrice=400000&maxPrice=3000000');

    expect(res.status).toBe(200);
    const [countSql, countValues] = pool.query.mock.calls[0];
    expect(countSql).toMatch(/L_SystemPrice >= \?/);
    expect(countSql).toMatch(/L_SystemPrice <= \?/);
    expect(countValues).toEqual(['400000', '3000000']);
  });

  test('rejects a negative minPrice', async () => {
    const res = await request(app).get('/api/properties?minPrice=-1');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/minPrice/i);
  });

  test('rejects a non-numeric maxPrice', async () => {
    const res = await request(app).get('/api/properties?maxPrice=notanumber');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/maxPrice/i);
  });

  test('filters by beds', async () => {
    mockListQueries(3, [sampleProperty]);

    const res = await request(app).get('/api/properties?beds=3');

    expect(res.status).toBe(200);
    const [countSql, countValues] = pool.query.mock.calls[0];
    expect(countSql).toMatch(/L_Keyword2 >= \?/);
    expect(countValues).toEqual([3]); // beds is coerced to a Number before binding
  });

  test('rejects a non-integer beds value', async () => {
    const res = await request(app).get('/api/properties?beds=2.5');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/beds/i);
  });

  test('filters by baths', async () => {
    mockListQueries(1, [sampleProperty]);

    const res = await request(app).get('/api/properties?baths=2');

    expect(res.status).toBe(200);
    const [countSql, countValues] = pool.query.mock.calls[0];
    expect(countSql).toMatch(/LM_Dec_3 >= \?/);
    expect(countValues).toEqual(['2']);
  });

  test('rejects a negative baths value', async () => {
    const res = await request(app).get('/api/properties?baths=-2');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/baths/i);
  });

  test('rejects a non-numeric baths value', async () => {
    const res = await request(app).get('/api/properties?baths=notanumber');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/baths/i);
  });

  test('sorts by a whitelisted column', async () => {
    mockListQueries(1, [sampleProperty]);

    const res = await request(app).get('/api/properties?sortBy=price&sortOrder=desc');

    expect(res.status).toBe(200);
    const [dataSql] = pool.query.mock.calls[1];
    expect(dataSql).toMatch(/ORDER BY L_SystemPrice DESC/);
  });

  test('defaults sortOrder to asc when only sortBy is given', async () => {
    mockListQueries(1, [sampleProperty]);

    const res = await request(app).get('/api/properties?sortBy=beds');

    expect(res.status).toBe(200);
    const [dataSql] = pool.query.mock.calls[1];
    expect(dataSql).toMatch(/ORDER BY L_Keyword2 ASC/);
  });

  test('rejects an unrecognized sortBy value', async () => {
    const res = await request(app).get('/api/properties?sortBy=notarealcolumn');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid sortBy/i);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('rejects an invalid sortOrder value', async () => {
    const res = await request(app).get('/api/properties?sortBy=price&sortOrder=sideways');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/sortOrder/i);
  });

  test('falls back to ORDER BY id when no sort is requested', async () => {
    mockListQueries(1, [sampleProperty]);

    const res = await request(app).get('/api/properties');

    expect(res.status).toBe(200);
    const [dataSql] = pool.query.mock.calls[1];
    expect(dataSql).toMatch(/ORDER BY id/);
  });

  test('returns 500 when the database throws', async () => {
    pool.query.mockRejectedValueOnce(new Error('connection lost'));

    const res = await request(app).get('/api/properties');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
  });
});

describe('GET /api/properties/:id', () => {
  test('returns the property when found', async () => {
    mockDetailQuery(sampleProperty);

    const res = await request(app).get(`/api/properties/${sampleProperty.L_ListingID}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(sampleProperty);
  });

  test('returns 404 when no property matches the ID', async () => {
    mockDetailQuery(null);

    const res = await request(app).get('/api/properties/doesnotexist999');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/No property found/);
  });

  test('returns 400 for a malformed ID', async () => {
    const res = await request(app).get(
      '/api/properties/this-id-is-way-too-long-to-be-a-real-listing-id-000000000000'
    );

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid listing ID/);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('returns 500 when the database throws', async () => {
    pool.query.mockRejectedValueOnce(new Error('connection lost'));

    const res = await request(app).get(`/api/properties/${sampleProperty.L_ListingID}`);

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
  });
});

describe('GET /api/properties/:id/openhouses', () => {
  const sampleOpenHouse = {
    id: 1,
    L_ListingID: sampleProperty.L_ListingID,
    L_DisplayId: 'MLS271555',
    OpenHouseDate: '2026-09-06',
    OH_StartTime: '13:00:00',
    OH_EndTime: '15:00:00',
    OH_StartDate: '2026-09-06',
    OH_EndDate: '2026-09-06',
    all_data: '{"OpenHouseRemarks":"Sunday open house"}',
    API_OH_StartDate: '2026-09-06T13:00:00',
    API_OH_EndDate: '2026-09-06T15:00:00',
  };

  test('returns open houses for a valid, listed property', async () => {
    mockOpenHousesQueries({ id: 1, L_ListingID: sampleProperty.L_ListingID }, [sampleOpenHouse]);

    const res = await request(app).get(`/api/properties/${sampleProperty.L_ListingID}/openhouses`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ total: 1, results: [sampleOpenHouse] });
  });

  test('returns an empty result set for a property with no open houses', async () => {
    mockOpenHousesQueries({ id: 1, L_ListingID: sampleProperty.L_ListingID }, []);

    const res = await request(app).get(`/api/properties/${sampleProperty.L_ListingID}/openhouses`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ total: 0, results: [] });
  });

  test('returns 404 when the property itself does not exist', async () => {
    mockOpenHousesQueries(null, []);

    const res = await request(app).get('/api/properties/1021795007/openhouses');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/No property found/);
    // the open house query should never run once the existence check fails
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test('returns 400 for a malformed ID', async () => {
    const res = await request(app).get(
      '/api/properties/this-id-is-way-too-long-to-be-a-real-listing-id-000000000000/openhouses'
    );

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid listing ID/);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('returns 500 when the database throws', async () => {
    pool.query.mockRejectedValueOnce(new Error('connection lost'));

    const res = await request(app).get(`/api/properties/${sampleProperty.L_ListingID}/openhouses`);

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
  });
});