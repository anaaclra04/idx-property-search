import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PropertyCard from './PropertyCard';
import { __resetForTests } from '../hooks/useFavorites';

const property = {
  L_ListingID: '271555',
  L_SystemPrice: 2150000,
  L_Address: '3766 Deedham Drive',
  L_City: 'San Jose',
  L_State: 'CA',
  L_Keyword2: 4,
  LM_Dec_3: 3,
  LM_Int2_3: 2170,
  L_Photos: '[]',
};

beforeEach(() => {
  window.localStorage.clear();
  __resetForTests();
});

function renderCard() {
  return render(
    <MemoryRouter>
      <PropertyCard property={property} />
    </MemoryRouter>
  );
}

test('heart button toggles favorited state and shows filled heart', () => {
  renderCard();
  const heartBtn = screen.getByRole('button', { name: /add to favorites/i });
  expect(heartBtn).toHaveTextContent('♡');

  fireEvent.click(heartBtn);
  expect(screen.getByRole('button', { name: /remove from favorites/i })).toHaveTextContent('♥');
});

test('clicking the heart does not navigate (stopPropagation works)', () => {
  renderCard();
  const heartBtn = screen.getByRole('button', { name: /add to favorites/i });
  const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
  const stopSpy = jest.spyOn(clickEvent, 'stopPropagation');

  heartBtn.dispatchEvent(clickEvent);
  expect(stopSpy).toHaveBeenCalled();
});