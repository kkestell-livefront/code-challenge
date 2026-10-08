import { render, screen } from '@testing-library/react';

import { RestaurantCard } from './RestaurantCard';

const props = {
  href: '/restaurants/mission-street-burgers',
  name: 'Mission Street Burgers',
  cuisines: ['Burgers', 'Bars', 'Wings'],
  rating: 4.5,
  priceLevel: 2 as const,
  imageUrl: 'https://example.com/burger.jpg',
};

describe('<RestaurantCard />', () => {
  it('renders a link named after the restaurant that goes to its href', () => {
    render(<RestaurantCard {...props} />);
    const link = screen.getByRole('link', { name: 'Mission Street Burgers' });
    expect(link).toHaveAttribute('href', '/restaurants/mission-street-burgers');
  });

  it('renders the name as a heading inside an article', () => {
    render(<RestaurantCard {...props} />);
    expect(screen.getByRole('article')).toContainElement(
      screen.getByRole('heading', { name: 'Mission Street Burgers' })
    );
  });

  it('joins the cuisines with commas', () => {
    render(<RestaurantCard {...props} />);
    expect(screen.getByText('Burgers, Bars, Wings')).toBeInTheDocument();
  });

  it('shows the rating with one decimal place and a text label', () => {
    render(<RestaurantCard {...props} rating={4} />);
    expect(screen.getByText(/4\.0/).textContent).toBe('Rating 4.0');
  });

  it('describes the price level in text', () => {
    render(<RestaurantCard {...props} />);
    expect(screen.getByText('Price level 2 of 3')).toBeInTheDocument();
  });

  it('renders the photo as a decorative image', () => {
    const { container } = render(<RestaurantCard {...props} />);
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('alt', '');
    const src = new URL(img!.getAttribute('src')!, 'http://localhost');
    expect(src.searchParams.get('url')).toBe('https://example.com/burger.jpg');
  });

  it('renders no image when there is no image URL', () => {
    const { container } = render(<RestaurantCard {...props} imageUrl={undefined} />);
    expect(container.querySelector('img')).toBeNull();
  });

  it('defaults to the responsive layout', () => {
    render(<RestaurantCard {...props} />);
    expect(screen.getByRole('article')).toHaveClass('flex-row', 'md:flex-col');
  });

  it('uses a column layout when large and a row layout when small', () => {
    const { rerender } = render(<RestaurantCard {...props} size="large" />);
    expect(screen.getByRole('article')).toHaveClass('flex-col');
    rerender(<RestaurantCard {...props} size="small" />);
    expect(screen.getByRole('article')).toHaveClass('flex-row');
    expect(screen.getByRole('article')).not.toHaveClass('md:flex-col');
  });

  it('adds extra classes to the root element', () => {
    render(<RestaurantCard {...props} className="col-span-2" />);
    expect(screen.getByRole('article')).toHaveClass('col-span-2');
  });
});
