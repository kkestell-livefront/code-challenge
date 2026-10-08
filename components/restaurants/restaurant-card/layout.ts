/** How a restaurant card is laid out. `responsive` is small below `md` and large from it. */
export type RestaurantCardSize = 'large' | 'small' | 'responsive';

/**
 * Size-dependent classes shared by the restaurant card and its loading skeleton. Each value is
 * written out in full so Tailwind can find the classes.
 */
const restaurantCardLayout = {
  root: {
    large: 'h-[285px] flex-col rounded-2xl shadow-card',
    small: 'flex-row rounded-sm shadow-card-small',
    responsive:
      'flex-row rounded-sm shadow-card-small md:h-[285px] md:flex-col md:rounded-2xl md:shadow-card',
  },
  media: {
    large: 'min-h-0 flex-1',
    small: 'w-[100px] shrink-0',
    responsive: 'w-[100px] shrink-0 md:w-auto md:min-h-0 md:flex-1',
  },
  content: {
    large: '',
    small: 'min-w-0 flex-1',
    responsive: 'min-w-0 flex-1 md:flex-none',
  },
} satisfies Record<string, Record<RestaurantCardSize, string>>;

export default restaurantCardLayout;
