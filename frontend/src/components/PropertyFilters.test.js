// frontend/src/components/PropertyFilters.test.js
import { render, screen, fireEvent } from '@testing-library/react';
import PropertyFilters from './PropertyFilters';

describe('PropertyFilters', () => {
  test('renders all six filter inputs', () => {
    render(<PropertyFilters onSearch={jest.fn()} onClear={jest.fn()} />);

    expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/zip code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/min price/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/max price/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/beds/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/baths/i)).toBeInTheDocument();
  });

  test('submitting the form calls onSearch with only the filled-in filters', () => {
    const onSearch = jest.fn();
    render(<PropertyFilters onSearch={onSearch} onClear={jest.fn()} />);

    fireEvent.change(screen.getByLabelText(/city/i), { target: { value: 'Malibu' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    expect(onSearch).toHaveBeenCalledWith({ city: 'Malibu' });
  });

  test('combines multiple filters into a single object on submit', () => {
    const onSearch = jest.fn();
    render(<PropertyFilters onSearch={onSearch} onClear={jest.fn()} />);

    fireEvent.change(screen.getByLabelText(/city/i), { target: { value: 'Malibu' } });
    fireEvent.change(screen.getByLabelText(/min price/i), { target: { value: '400000' } });
    fireEvent.change(screen.getByLabelText(/beds/i), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    expect(onSearch).toHaveBeenCalledWith({ city: 'Malibu', minPrice: '400000', beds: '3' });
  });

  test('submitting with no values filled in sends no filters', () => {
    const onSearch = jest.fn();
    render(<PropertyFilters onSearch={onSearch} onClear={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    expect(onSearch).toHaveBeenCalledWith({});
  });

  test('clicking Clear Filters resets the form and calls onClear', () => {
    const onClear = jest.fn();
    render(<PropertyFilters onSearch={jest.fn()} onClear={onClear} />);

    const cityInput = screen.getByLabelText(/city/i);
    fireEvent.change(cityInput, { target: { value: 'Malibu' } });
    expect(cityInput.value).toBe('Malibu');

    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));

    expect(cityInput.value).toBe('');
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});