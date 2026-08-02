import { render, screen, fireEvent } from '@testing-library/react';
import Pagination, { getPageNumbers } from './Pagination';

describe('getPageNumbers', () => {
  test('returns all pages with no ellipsis when total pages is small', () => {
    expect(getPageNumbers(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  test('shows ellipsis only on the right when current page is near the start', () => {
    expect(getPageNumbers(1, 10)).toEqual([1, 2, 3, 4, 5, '...', 10]);
  });

  test('shows ellipsis only on the left when current page is near the end', () => {
    expect(getPageNumbers(10, 10)).toEqual([1, '...', 6, 7, 8, 9, 10]);
  });

  test('shows ellipsis on both sides when current page is in the middle', () => {
    expect(getPageNumbers(12, 24)).toEqual([1, '...', 11, 12, 13, '...', 24]);
  });

  // Debug Challenge regression test: reproduces the scenario where a naive
  // implementation could emit the last page number twice near the end boundary.
  test('never includes the last page number twice near the end boundary', () => {
    const pages = getPageNumbers(23, 24);
    const lastPageOccurrences = pages.filter((p) => p === 24).length;

    expect(lastPageOccurrences).toBe(1);
    expect(pages).toEqual([1, '...', 20, 21, 22, 23, 24]);
  });

  test('never includes page 1 twice near the start boundary', () => {
    const pages = getPageNumbers(2, 24);
    const firstPageOccurrences = pages.filter((p) => p === 1).length;

    expect(firstPageOccurrences).toBe(1);
  });
});

describe('Pagination component', () => {
  test('renders nothing when there is only one page', () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={1} onPageChange={jest.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  test('disables Previous on the first page', () => {
    render(<Pagination currentPage={1} totalPages={5} onPageChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
  });

  test('disables Next on the last page', () => {
    render(<Pagination currentPage={5} totalPages={5} onPageChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  test('clicking a page number calls onPageChange with that page', () => {
    const onPageChange = jest.fn();
    render(<Pagination currentPage={1} totalPages={5} onPageChange={onPageChange} />);

    fireEvent.click(screen.getByRole('button', { name: '3' }));

    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  test('clicking Next advances to the next page', () => {
    const onPageChange = jest.fn();
    render(<Pagination currentPage={2} totalPages={5} onPageChange={onPageChange} />);

    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  test('clicking Previous goes back a page', () => {
    const onPageChange = jest.fn();
    render(<Pagination currentPage={2} totalPages={5} onPageChange={onPageChange} />);

    fireEvent.click(screen.getByRole('button', { name: /previous/i }));

    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  test('marks the current page button as active/current', () => {
    render(<Pagination currentPage={3} totalPages={5} onPageChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: '3' })).toHaveAttribute('aria-current', 'page');
  });
});