import { render, screen, fireEvent } from '@testing-library/react';
import SortControl, { findSortOption, SORT_OPTIONS } from './SortControl';

describe('findSortOption', () => {
  test('returns Default when sortBy/sortOrder are undefined', () => {
    expect(findSortOption(undefined, undefined)).toBe(SORT_OPTIONS[0]);
  });

  test('matches price ascending', () => {
    const result = findSortOption('price', 'asc');
    expect(result.value).toBe('price-asc');
  });

  test('matches dateListed descending', () => {
    const result = findSortOption('dateListed', 'desc');
    expect(result.value).toBe('dateListed-desc');
  });

  test('falls back to Default for an unrecognized combination', () => {
    const result = findSortOption('nonsense', 'asc');
    expect(result).toBe(SORT_OPTIONS[0]);
  });
});

describe('SortControl component', () => {
  test('renders the currently selected option', () => {
    render(<SortControl sortBy="price" sortOrder="desc" onSortChange={() => {}} />);
    expect(screen.getByRole('combobox')).toHaveValue('price-desc');
  });

  test('calls onSortChange with the mapped sortBy/sortOrder pair', () => {
    const handleChange = jest.fn();
    render(<SortControl sortBy={undefined} sortOrder={undefined} onSortChange={handleChange} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'dateListed-desc' } });

    expect(handleChange).toHaveBeenCalledWith('dateListed', 'desc');
  });

  test('calling Default sends undefined for both values', () => {
    const handleChange = jest.fn();
    render(<SortControl sortBy="price" sortOrder="asc" onSortChange={handleChange} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } });

    expect(handleChange).toHaveBeenCalledWith(undefined, undefined);
  });
});