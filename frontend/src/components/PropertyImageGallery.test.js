import { render, screen, fireEvent } from '@testing-library/react';
import PropertyImageGallery from './PropertyImageGallery';

const photos = ['/a.jpg', '/b.jpg', '/c.jpg'];

describe('PropertyImageGallery', () => {
  test('renders a thumbnail per photo and updates the main image on click', () => {
    render(<PropertyImageGallery photos={photos} alt="Test" />);
    const thumbs = screen.getAllByAltText(/thumbnail/i);
    expect(thumbs).toHaveLength(3);

    fireEvent.click(thumbs[2]);
    expect(screen.getByAltText('Test')).toHaveAttribute('src', '/c.jpg');
  });

  test('opens the lightbox on main image click and closes it on Escape', () => {
    render(<PropertyImageGallery photos={photos} alt="Test" />);
    fireEvent.click(screen.getByAltText('Test'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('closes on a click on the overlay but not on the image itself', () => {
    render(<PropertyImageGallery photos={photos} alt="Test" />);
    fireEvent.click(screen.getByAltText('Test'));
    const dialog = screen.getByRole('dialog');

    fireEvent.click(dialog); // click lands on the overlay div itself
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('left/right arrow keys navigate photos inside the lightbox', () => {
    render(<PropertyImageGallery photos={photos} alt="Test" />);
    fireEvent.click(screen.getByAltText('Test'));
    const dialog = screen.getByRole('dialog');

    fireEvent.keyDown(dialog, { key: 'ArrowRight' });
    const lightboxImage = screen
      .getAllByAltText('Test')
      .find((img) => img.className.includes('lightbox-image'));
    expect(lightboxImage).toHaveAttribute('src', '/b.jpg');
  });

  test('shows the placeholder and no thumbnails when there are no photos', () => {
    render(<PropertyImageGallery photos={[]} alt="Test" />);
    expect(screen.queryByAltText(/thumbnail/i)).not.toBeInTheDocument();
    expect(screen.getByAltText('Test')).toHaveAttribute('src', '/placeholder-property.png');
  });
});