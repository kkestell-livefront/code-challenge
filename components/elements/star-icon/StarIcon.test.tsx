import { render } from '@testing-library/react';

import { StarIcon } from './StarIcon';

describe('<StarIcon />', () => {
  it('renders a decorative star filled with the current color', () => {
    const { container } = render(<StarIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('fill', 'currentColor');
  });

  it('applies the given classes', () => {
    const { container } = render(<StarIcon className="text-brand" />);
    expect(container.querySelector('svg')).toHaveClass('text-brand');
  });
});
