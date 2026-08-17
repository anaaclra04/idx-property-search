import { render, screen, fireEvent } from '@testing-library/react';
import { useFavorites, __resetForTests } from './useFavorites';

function TestHarness({ id }) {
  const { isFavorite, toggleFavorite, count } = useFavorites();
  return (
    <div>
      <span data-testid="count">{count}</span>
      <span data-testid="status">{isFavorite(id) ? 'favorited' : 'not-favorited'}</span>
      <button onClick={() => toggleFavorite(id)}>Toggle</button>
    </div>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  __resetForTests();
});

test('starts with no favorites when localStorage is empty', () => {
  render(<TestHarness id="123" />);
  expect(screen.getByTestId('status')).toHaveTextContent('not-favorited');
  expect(screen.getByTestId('count')).toHaveTextContent('0');
});

test('toggling favorites updates state and persists to localStorage', () => {
  render(<TestHarness id="123" />);

  fireEvent.click(screen.getByText('Toggle'));
  expect(screen.getByTestId('status')).toHaveTextContent('favorited');
  expect(screen.getByTestId('count')).toHaveTextContent('1');
  expect(JSON.parse(window.localStorage.getItem('idx-favorites'))).toEqual(['123']);

  fireEvent.click(screen.getByText('Toggle'));
  expect(screen.getByTestId('status')).toHaveTextContent('not-favorited');
  expect(screen.getByTestId('count')).toHaveTextContent('0');
});

test('loads existing favorites from localStorage on first use', () => {
  window.localStorage.setItem('idx-favorites', JSON.stringify(['999']));
  __resetForTests(); // re-read localStorage into the module store
  render(<TestHarness id="999" />);
  expect(screen.getByTestId('status')).toHaveTextContent('favorited');
});

test('two components stay in sync when one toggles a favorite', () => {
  render(
    <>
      <TestHarness id="123" />
      <div data-testid="second">
        <TestHarness id="123" />
      </div>
    </>
  );

  const toggleButtons = screen.getAllByText('Toggle');
  fireEvent.click(toggleButtons[0]);

  const statuses = screen.getAllByTestId('status');
  expect(statuses[0]).toHaveTextContent('favorited');
  expect(statuses[1]).toHaveTextContent('favorited'); // second instance saw the update too
});