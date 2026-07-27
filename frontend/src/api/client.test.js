import { fetchProperties, fetchPropertyDetail, fetchOpenHouses } from './client';

describe('api client', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('fetchProperties builds a query string from params and returns parsed JSON', async () => {
    const mockData = { total: 2, results: [{ L_ListingID: '1' }] };
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => mockData });

    const data = await fetchProperties({ city: 'Malibu', beds: 3 });

    expect(global.fetch).toHaveBeenCalledWith('/api/properties?city=Malibu&beds=3');
    expect(data).toEqual(mockData);
  });

  test('fetchProperties omits the query string when no params are given', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ total: 0, results: [] }) });

    await fetchProperties();

    expect(global.fetch).toHaveBeenCalledWith('/api/properties');
  });

  test('throws with the server-provided error message on a failed response', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'minPrice must be a non-negative number' }),
    });

    await expect(fetchProperties({ minPrice: -5 })).rejects.toThrow(
      'minPrice must be a non-negative number'
    );
  });

  test('falls back to a generic message when the error response is not JSON', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => { throw new Error('not json'); },
    });

    await expect(fetchProperties()).rejects.toThrow('Request failed with status 500');
  });

  test('fetchPropertyDetail requests the correct endpoint', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ L_ListingID: '123' }) });

    await fetchPropertyDetail('123');

    expect(global.fetch).toHaveBeenCalledWith('/api/properties/123');
  });

  test('fetchOpenHouses requests the correct endpoint', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ total: 0, results: [] }) });

    await fetchOpenHouses('123');

    expect(global.fetch).toHaveBeenCalledWith('/api/properties/123/openhouses');
  });
});