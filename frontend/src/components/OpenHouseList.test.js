import { render, screen } from '@testing-library/react';
import OpenHouseList from './OpenHouseList';

describe('OpenHouseList', () => {
  test('shows "No open houses scheduled" when the list is empty', () => {
    render(<OpenHouseList openHouses={[]} />);
    expect(screen.getByText(/no open houses scheduled/i)).toBeInTheDocument();
  });

  test('extracts OpenHouseRemarks from the all_data JSON blob', () => {
    const openHouses = [
      {
        id: 1,
        OpenHouseDate: '2026-08-10',
        OH_StartTime: '13:00:00',
        OH_EndTime: '15:00:00',
        all_data: JSON.stringify({ OpenHouseRemarks: 'Refreshments provided' }),
      },
    ];
    render(<OpenHouseList openHouses={openHouses} />);
    expect(screen.getByText('Refreshments provided')).toBeInTheDocument();
    expect(screen.getByText(/1:00 PM/)).toBeInTheDocument();
  });

  test('does not crash when all_data is null or malformed', () => {
    const openHouses = [
      { id: 1, OpenHouseDate: '2026-08-10', OH_StartTime: '09:00:00', OH_EndTime: '10:00:00', all_data: null },
      { id: 2, OpenHouseDate: '2026-08-11', OH_StartTime: '09:00:00', OH_EndTime: '10:00:00', all_data: 'not json' },
    ];
    render(<OpenHouseList openHouses={openHouses} />);
    expect(screen.queryByText(/remarks/i)).not.toBeInTheDocument();
  });
});