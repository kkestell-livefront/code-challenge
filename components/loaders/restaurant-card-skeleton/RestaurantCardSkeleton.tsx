import { PriceLevel } from '@/components/elements/price-level/PriceLevel';
import { StarIcon } from '@/components/elements/star-icon/StarIcon';
import type { RestaurantCardSize } from '@/components/restaurants/restaurant-card/layout';
import layout from '@/components/restaurants/restaurant-card/layout';

export type RestaurantCardSkeletonProps = {
  /** The layout, matching the card it stands in for. */
  size?: RestaurantCardSize;
};

const headlineClasses: Record<RestaurantCardSize, string> = {
  large: '',
  small: 'py-px',
  responsive: 'py-px md:py-0',
};

/**
 * Loading placeholder for `RestaurantCard`. It is hidden from assistive technology: the section
 * that wraps a list of skeletons carries `role="status"` and `aria-busy`.
 */
export function RestaurantCardSkeleton({ size = 'responsive' }: RestaurantCardSkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`flex overflow-hidden bg-background-secondary ${layout.root[size]}`}
    >
      <div className={`bg-skeleton ${layout.media[size]}`} />
      <div className={`flex flex-col gap-4 p-4 ${layout.content[size]}`}>
        <div className={`flex flex-col gap-1 ${headlineClasses[size]}`}>
          <div className="loading-gradient h-4 rounded-lg" />
          <div className="loading-gradient h-4 w-24 rounded-lg" />
        </div>
        <div className="flex items-center gap-4">
          <div className="h-4 w-[37px]">
            <StarIcon className="text-brand" />
          </div>
          <PriceLevel level={3} decorative />
        </div>
      </div>
    </div>
  );
}
