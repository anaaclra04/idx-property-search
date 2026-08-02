import './Pagination.css';

const DOTS = '...';

function range(start, end) {
  const length = end - start + 1;
  return Array.from({ length }, (_, i) => start + i);
}

// Builds the array of page numbers/ellipsis to render.
// Page 1 and the last page are always included exactly once each 
export function getPageNumbers(currentPage, totalPages, siblingCount = 1) {
  const totalPageSlots = siblingCount * 2 + 5; // first + last + current + siblings + 2 dots

  if (totalPageSlots >= totalPages) {
    return range(1, totalPages);
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

  const shouldShowLeftDots = leftSiblingIndex > 2;
  const shouldShowRightDots = rightSiblingIndex < totalPages - 1;

  if (!shouldShowLeftDots && shouldShowRightDots) {
    const leftItemCount = 3 + 2 * siblingCount;
    return [...range(1, leftItemCount), DOTS, totalPages];
  }

  if (shouldShowLeftDots && !shouldShowRightDots) {
    const rightItemCount = 3 + 2 * siblingCount;
    return [1, DOTS, ...range(totalPages - rightItemCount + 1, totalPages)];
  }

  return [1, DOTS, ...range(leftSiblingIndex, rightSiblingIndex), DOTS, totalPages];
}

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        type="button"
        className="pagination__nav-btn"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        Previous
      </button>

      {pages.map((page, idx) =>
        page === DOTS ? (
          <span key={`dots-${idx}`} className="pagination__dots">{DOTS}</span>
        ) : (
          <button
            key={page}
            type="button"
            className={`pagination__page-btn${page === currentPage ? ' pagination__page-btn--active' : ''}`}
            onClick={() => onPageChange(page)}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </button>
        )
      )}

      <button
        type="button"
        className="pagination__nav-btn"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next
      </button>
    </nav>
  );
}