import { render, screen } from '@testing-library/react';

import { PriceLevel } from './PriceLevel';

describe('<PriceLevel />', () => {
  it('highlights the first `level` dollar signs', () => {
    const { container } = render(<PriceLevel level={1} />);
    const paths = container.querySelectorAll('path');
    expect(paths).toHaveLength(3);
    expect(paths[0]).toHaveClass('text-active');
    expect(paths[1]).toHaveClass('text-inactive');
    expect(paths[2]).toHaveClass('text-inactive');
  });

  it('hides the icon and provides a text equivalent', () => {
    const { container } = render(<PriceLevel level={3} />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('Price level 3 of 3')).toBeInTheDocument();
  });

  it('omits the text equivalent when decorative', () => {
    render(<PriceLevel level={3} decorative />);
    expect(screen.queryByText(/price level/i)).toBeNull();
  });
});
