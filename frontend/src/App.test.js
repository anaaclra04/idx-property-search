import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the Property Search heading', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /property search/i })).toBeInTheDocument();
});

test('renders the listings page filters', () => {
  render(<App />);
  expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
});