import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ListingsPage from './ListingsPage';
import * as client from '../api/client';
import { __resetForTests } from '../hooks/useFavorites';

jest.mock('../api/client');

const sampleProperty = {
  id: 1,
  L_ListingID: '271555',
  L_Address: '3766 Deedham Drive',
  L_City: 'San Jose',
  L_State: 'CA',
  L_Keyword2: 4,
  LM_Dec_3: 3,
  L_SystemPrice: 2150000,
  LM_Int2_3: 2170,
  L_Photos: '[]',
};

function renderPage(initialEntries = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ListingsPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  __resetForTests();
  jest.clearAllMocks();
  window.scrollTo = jest.fn();
});

test('shows a loading state, then renders results', async () => {
  client.fetchProperties.mockResolvedValueOnce({ total: 1, results: [sampleProperty] });

  renderPage();

  expect(screen.getByText(/loading properties/i)).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.getByText('3766 Deedham Drive')).toBeInTheDocument();
  });
  expect(screen.getByText(/showing 1-1 of 1 properties/i)).toBeInTheDocument();
});

test('fetches with default offset/limit and no sort params on first load', async () => {
  client.fetchProperties.mockResolvedValueOnce({ total: 0, results: [] });

  renderPage();

  await waitFor(() => expect(client.fetchProperties).toHaveBeenCalled());
  const params = client.fetchProperties.mock.calls[0][0];
  expect(params).toEqual(expect.objectContaining({ offset: 0, limit: 20 }));
  expect(params.sortBy).toBeUndefined();
});

test('shows an error state when the fetch fails', async () => {
  client.fetchProperties.mockRejectedValueOnce(new Error('Backend is down'));

  renderPage();

  await waitFor(() => {
    expect(screen.getByText(/couldn't load properties: backend is down/i)).toBeInTheDocument();
  });
});

test('shows an empty state when there are no results', async () => {
  client.fetchProperties.mockResolvedValueOnce({ total: 0, results: [] });

  renderPage();

  await waitFor(() => {
    expect(screen.getByText(/no properties found/i)).toBeInTheDocument();
  });
});

test('falls back to data.properties when data.results is absent', async () => {
  client.fetchProperties.mockResolvedValueOnce({ total: 1, properties: [sampleProperty] });

  renderPage();

  await waitFor(() => {
    expect(screen.getByText('3766 Deedham Drive')).toBeInTheDocument();
  });
});

test('defaults total and results to empty when the response omits them entirely', async () => {
  client.fetchProperties.mockResolvedValueOnce({});

  renderPage();

  await waitFor(() => {
    expect(screen.getByText(/no properties found/i)).toBeInTheDocument();
  });
});

test('defaults sortOrder to asc when the URL provides sortBy without sortOrder', async () => {
  client.fetchProperties.mockResolvedValue({ total: 1, results: [sampleProperty] });

  renderPage(['/?sortBy=price']);

  await waitFor(() => expect(client.fetchProperties).toHaveBeenCalledTimes(1));
  const params = client.fetchProperties.mock.calls[0][0];
  expect(params.sortBy).toBe('price');
  expect(params.sortOrder).toBe('asc');
});

test('a stale response never overwrites a newer one', async () => {
  let resolveFirst;
  let resolveSecond;
  client.fetchProperties
    .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
    .mockImplementationOnce(() => new Promise((resolve) => { resolveSecond = resolve; }));

  renderPage();
  await waitFor(() => expect(client.fetchProperties).toHaveBeenCalledTimes(1));

  // trigger a second request before the first resolves (a new search)
  fireEvent.click(screen.getByRole('button', { name: /search/i }));
  await waitFor(() => expect(client.fetchProperties).toHaveBeenCalledTimes(2));

  // resolve the newer request first, then the stale one
  resolveSecond({ total: 1, results: [{ ...sampleProperty, L_ListingID: 'newer' }] });
  await waitFor(() => {
    expect(screen.getByText('3766 Deedham Drive')).toBeInTheDocument();
  });

  resolveFirst({ total: 1, results: [{ ...sampleProperty, L_Address: 'Stale Address' }] });
  // give the stale promise's .then() a chance to run (and be discarded)
  await act(async () => { await Promise.resolve(); });

  expect(screen.queryByText('Stale Address')).not.toBeInTheDocument();
  expect(screen.getByText('3766 Deedham Drive')).toBeInTheDocument();
});

test('a stale error never overwrites a newer success', async () => {
  let rejectFirst;
  let resolveSecond;
  client.fetchProperties
    .mockImplementationOnce(() => new Promise((_, reject) => { rejectFirst = reject; }))
    .mockImplementationOnce(() => new Promise((resolve) => { resolveSecond = resolve; }));

  renderPage();
  await waitFor(() => expect(client.fetchProperties).toHaveBeenCalledTimes(1));

  fireEvent.click(screen.getByRole('button', { name: /search/i }));
  await waitFor(() => expect(client.fetchProperties).toHaveBeenCalledTimes(2));

  resolveSecond({ total: 1, results: [sampleProperty] });
  await waitFor(() => {
    expect(screen.getByText('3766 Deedham Drive')).toBeInTheDocument();
  });

  rejectFirst(new Error('stale failure'));
  await act(async () => { await Promise.resolve(); });

  expect(screen.queryByText(/couldn't load properties/i)).not.toBeInTheDocument();
  expect(screen.getByText('3766 Deedham Drive')).toBeInTheDocument();
});

test('submitting a search resets sort and page, and includes the filter values', async () => {
  client.fetchProperties.mockResolvedValue({ total: 1, results: [sampleProperty] });

  renderPage();
  await waitFor(() => expect(client.fetchProperties).toHaveBeenCalledTimes(1));

  fireEvent.change(screen.getByLabelText(/city/i), { target: { value: 'Malibu' } });
  fireEvent.click(screen.getByRole('button', { name: /search/i }));

  await waitFor(() => expect(client.fetchProperties).toHaveBeenCalledTimes(2));
  const params = client.fetchProperties.mock.calls[1][0];
  expect(params.city).toBe('Malibu');
  expect(params.offset).toBe(0);
  expect(params.sortBy).toBeUndefined();
});

test('clearing filters refetches with no filters applied', async () => {
  client.fetchProperties.mockResolvedValue({ total: 1, results: [sampleProperty] });

  renderPage();
  await waitFor(() => expect(client.fetchProperties).toHaveBeenCalledTimes(1));

  fireEvent.change(screen.getByLabelText(/city/i), { target: { value: 'Malibu' } });
  fireEvent.click(screen.getByRole('button', { name: /search/i }));
  await waitFor(() => expect(client.fetchProperties).toHaveBeenCalledTimes(2));

  fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));
  await waitFor(() => expect(client.fetchProperties).toHaveBeenCalledTimes(3));
  const params = client.fetchProperties.mock.calls[2][0];
  expect(params.city).toBeUndefined();
});

test('changing sort includes sortBy/sortOrder and resets to page 1', async () => {
  // two pages of results so the sort control renders and page can be > 1 first
  client.fetchProperties.mockResolvedValue({ total: 40, results: [sampleProperty] });

  renderPage();
  await waitFor(() => expect(client.fetchProperties).toHaveBeenCalledTimes(1));

  // go to page 2 first
  fireEvent.click(screen.getByRole('button', { name: '2' }));
  await waitFor(() => expect(client.fetchProperties).toHaveBeenCalledTimes(2));
  expect(client.fetchProperties.mock.calls[1][0].offset).toBe(20);

  fireEvent.change(screen.getByLabelText(/sort by/i), { target: { value: 'price-desc' } });

  await waitFor(() => expect(client.fetchProperties).toHaveBeenCalledTimes(3));
  const params = client.fetchProperties.mock.calls[2][0];
  expect(params.sortBy).toBe('price');
  expect(params.sortOrder).toBe('desc');
  expect(params.offset).toBe(0); // sort change reset back to page 1
});

test('changing page calls fetchProperties with the new offset and scrolls to top', async () => {
  client.fetchProperties.mockResolvedValue({ total: 40, results: [sampleProperty] });

  renderPage();
  await waitFor(() => expect(client.fetchProperties).toHaveBeenCalledTimes(1));

  fireEvent.click(screen.getByRole('button', { name: '2' }));

  await waitFor(() => expect(client.fetchProperties).toHaveBeenCalledTimes(2));
  expect(client.fetchProperties.mock.calls[1][0].offset).toBe(20);
  expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
});

test('reads initial filters, sort, and page from the URL on mount', async () => {
  client.fetchProperties.mockResolvedValue({ total: 40, results: [sampleProperty] });

  renderPage(['/?city=Malibu&sortBy=price&sortOrder=asc&page=2']);

  await waitFor(() => expect(client.fetchProperties).toHaveBeenCalledTimes(1));
  const params = client.fetchProperties.mock.calls[0][0];
  expect(params).toEqual(expect.objectContaining({
    city: 'Malibu',
    sortBy: 'price',
    sortOrder: 'asc',
    offset: 20,
  }));
  expect(screen.getByLabelText(/city/i)).toHaveValue('Malibu');
});

test('restores saved scroll position for a matching search key and clears it', async () => {
  client.fetchProperties.mockResolvedValueOnce({ total: 1, results: [sampleProperty] });
  window.sessionStorage.setItem('listings-scroll:', '450');

  renderPage();

  await waitFor(() => {
    expect(screen.getByText('3766 Deedham Drive')).toBeInTheDocument();
  });
  await waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith(0, 450));
  expect(window.sessionStorage.getItem('listings-scroll:')).toBeNull();
});

test('does not restore scroll when there is no saved key for this search', async () => {
  client.fetchProperties.mockResolvedValueOnce({ total: 1, results: [sampleProperty] });

  renderPage();

  await waitFor(() => {
    expect(screen.getByText('3766 Deedham Drive')).toBeInTheDocument();
  });
  expect(window.scrollTo).not.toHaveBeenCalled();
});

test('saves scroll position under the current search key on unmount', async () => {
  client.fetchProperties.mockResolvedValueOnce({ total: 1, results: [sampleProperty] });
  Object.defineProperty(window, 'scrollY', { value: 275, configurable: true });

  const { unmount } = renderPage();
  await waitFor(() => expect(client.fetchProperties).toHaveBeenCalledTimes(1));

  unmount();

  expect(window.sessionStorage.getItem('listings-scroll:')).toBe('275');
});