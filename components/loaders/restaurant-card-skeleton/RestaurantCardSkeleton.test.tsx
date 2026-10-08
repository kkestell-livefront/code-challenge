import { render } from '@testing-library/react';

import { RestaurantCardSkeleton } from './RestaurantCardSkeleton';

describe('<RestaurantCardSkeleton />', () => {
  it('is hidden from assistive technology', () => {
    const { container } = render(<RestaurantCardSkeleton />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders two shimmering text placeholders', () => {
    const { container } = render(<RestaurantCardSkeleton />);
    expect(container.querySelectorAll('.loading-gradient')).toHaveLength(2);
  });

  it('does not announce a price level', () => {
    const { container } = render(<RestaurantCardSkeleton />);
    expect(container).not.toHaveTextContent(/price level/i);
  });

  it('matches the card layout for each size', () => {
    const { container, rerender } = render(<RestaurantCardSkeleton size="large" />);
    expect(container.firstChild).toHaveClass('flex-col', 'h-[285px]');
    rerender(<RestaurantCardSkeleton size="small" />);
    expect(container.firstChild).toHaveClass('flex-row');
    rerender(<RestaurantCardSkeleton />);
    expect(container.firstChild).toHaveClass('flex-row', 'md:flex-col');
  });
});
