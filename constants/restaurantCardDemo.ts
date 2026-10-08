const sample = {
  href: '/demo/restaurant-card',
  name: 'Mission Street Burgers',
  cuisines: ['Burgers', 'Bars', 'Wings'],
  rating: 4.5,
  priceLevel: 2 as const,
  // next/image does not add the base path to `src`.
  imageUrl: `${process.env.PAGES_BASE_PATH ?? ''}/demo/mission-street-burgers.jpg`,
};

const restaurantCardDemo = {
  title: 'Restaurant card',
  comparisonHeading: 'Figma comparison cases',
  variantsHeading: 'Variants',
  responsiveHeading: 'Responsive (small below md, large from md)',
  stressHeading: 'Stress cases',
  loadingLabel: 'Loading restaurants',
  sample,
  stress: [
    {
      ...sample,
      name: 'The Extraordinarily Long-Named Neighborhood Burger and Milkshake Emporium of Mission Street',
      cuisines: ['American', 'Sandwiches', 'Burgers', 'Hot Dogs', 'Milkshakes', 'Breakfast'],
    },
    { ...sample, name: 'Luigi’s', cuisines: ['Pizza'], rating: 5, priceLevel: 1 as const },
    { ...sample, name: 'No Photo Diner', imageUrl: undefined, rating: 0, priceLevel: 3 as const },
    { ...sample, name: 'Empty Cuisines', cuisines: [], rating: 3.25 },
  ],
};

export default restaurantCardDemo;
