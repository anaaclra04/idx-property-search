import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FavoritesPage from './FavoritesPage';
import * as client from '../api/client';
import { __resetForTests } from '../hooks/useFavorites';

jest.mock('../api/client');

beforeEach(() => {
  window.localStorage.clear();
  __resetForTests();
  jest.clearAllMocks();
});

test('shows empty state when there are no favorites', async () => {
  render(<MemoryRouter><FavoritesPage /></MemoryRouter>);
  await waitFor(() => {
    expect(screen.getByText(/no favorites yet/i)).toBeInTheDocument();
  });
});

test('fetches and displays favorited properties', async () => {
  window.localStorage.setItem('idx-favorites', JSON.stringify(['1', '2']));
  __resetForTests();
  client.fetchPropertyDetail.mockImplementation((id) =>
    Promise.resolve({ L_ListingID: id, L_Address: `Address ${id}`, L_Photos: '[]' })
  );

  render(<MemoryRouter><FavoritesPage /></MemoryRouter>);

  await waitFor(() => {
    expect(screen.getByText('Address 1')).toBeInTheDocument();
    expect(screen.getByText('Address 2')).toBeInTheDocument();
  });
});

test('skips favorites whose property fetch fails (e.g. delisted)', async () => {
  window.localStorage.setItem('idx-favorites', JSON.stringify(['1', '2']));
  __resetForTests();
  client.fetchPropertyDetail.mockImplementation((id) =>
    id === '1'
      ? Promise.resolve({ L_ListingID: '1', L_Address: 'Address 1', L_Photos: '[]' })
      : Promise.reject(new Error('Not found'))
  );

  render(<MemoryRouter><FavoritesPage /></MemoryRouter>);

  await waitFor(() => {
    expect(screen.getByText('Address 1')).toBeInTheDocument();
    expect(screen.queryByText('Address 2')).not.toBeInTheDocument();
  });
});