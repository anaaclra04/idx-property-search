import './SortControl.css';

// Each option encodes both the sortBy field AND sortOrder direction as one value,
// so the dropdown reads naturally ("Price: Low to High") while still mapping
// cleanly onto the two separate query params the backend expects.
export const SORT_OPTIONS = [
  { value: '', label: 'Default', sortBy: undefined, sortOrder: undefined },
  { value: 'price-asc', label: 'Price: Low to High', sortBy: 'price', sortOrder: 'asc' },
  { value: 'price-desc', label: 'Price: High to Low', sortBy: 'price', sortOrder: 'desc' },
  { value: 'dateListed-desc', label: 'Newest Listed', sortBy: 'dateListed', sortOrder: 'desc' },
  { value: 'dateListed-asc', label: 'Oldest Listed', sortBy: 'dateListed', sortOrder: 'asc' },
  { value: 'sqft-desc', label: 'Square Footage: Largest First', sortBy: 'sqft', sortOrder: 'desc' },
  { value: 'beds-desc', label: 'Beds: Most First', sortBy: 'beds', sortOrder: 'desc' },
];

// Pure function, exported for isolated unit testing (same pattern as getPageNumbers)
export function findSortOption(sortBy, sortOrder) {
  const match = SORT_OPTIONS.find(
    (opt) => opt.sortBy === sortBy && opt.sortOrder === sortOrder
  );
  return match ?? SORT_OPTIONS[0];
}

export default function SortControl({ sortBy, sortOrder, onSortChange }) {
  const currentValue = findSortOption(sortBy, sortOrder).value;

  function handleChange(e) {
    const selected = SORT_OPTIONS.find((opt) => opt.value === e.target.value);
    onSortChange(selected.sortBy, selected.sortOrder);
  }

  return (
    <div className="sort-control">
      <label htmlFor="sortBy">Sort by</label>
      <select id="sortBy" name="sortBy" value={currentValue} onChange={handleChange}>
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value || 'default'} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}