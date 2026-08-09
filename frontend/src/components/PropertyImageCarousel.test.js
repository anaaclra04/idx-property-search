import { render, screen, fireEvent } from '@testing-library/react';
import PropertyImageCarousel from './PropertyImageCarousel';

const photos = ['/a.jpg', '/b.jpg', '/c.jpg'];

describe('PropertyImageCarousel', () => {
  test('shows a counter and cycles forward through photos', () => {
    render(<PropertyImageCarousel photos={photos} alt="Test" />);
    expect(screen.getByText('1 / 3')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/next photo/i));
    expect(screen.getByText('2 / 3')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/previous photo/i));
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  test('wraps from the first photo back to the last on "previous"', () => {
    render(<PropertyImageCarousel photos={photos} alt="Test" />);
    fireEvent.click(screen.getByLabelText(/previous photo/i));
    expect(screen.getByText('3 / 3')).toBeInTheDocument();
  });

  test('hides arrows and counter when there is only one photo', () => {
    render(<PropertyImageCarousel photos={['/only.jpg']} alt="Test" />);
    expect(screen.queryByLabelText(/next photo/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/previous photo/i)).not.toBeInTheDocument();
  });

  test('falls back to the placeholder image when there are no photos', () => {
    render(<PropertyImageCarousel photos={[]} alt="Test" />);
    expect(screen.getByAltText('Test')).toHaveAttribute('src', '/placeholder-property.png');
  });

  test('arrow clicks stop propagation so a wrapping Link is not triggered', () => {
    const onWrapperClick = jest.fn();
    render(
      <div onClick={onWrapperClick}>
        <PropertyImageCarousel photos={photos} alt="Test" />
      </div>
    );
    fireEvent.click(screen.getByLabelText(/next photo/i));
    expect(onWrapperClick).not.toHaveBeenCalled();
  });
});