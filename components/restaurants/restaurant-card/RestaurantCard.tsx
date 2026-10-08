import Image from 'next/image';
import Link from 'next/link';

import type { PriceLevelValue } from '@/components/elements/price-level/PriceLevel';
import { PriceLevel } from '@/components/elements/price-level/PriceLevel';
import { StarIcon } from '@/components/elements/star-icon/StarIcon';
import type { RestaurantCardSize } from '@/components/restaurants/restaurant-card/layout';
import layout from '@/components/restaurants/restaurant-card/layout';

export type RestaurantCardProps = {
  /** Where the card links to, usually the restaurant's detail page. */
  href: string;
  /** The restaurant's name. */
  name: string;
  /** The restaurant's cuisines, shown joined with commas. */
  cuisines: string[];
  /** The average rating, shown with one decimal place. */
  rating: number;
  /** The price level, from 1 ($) to 3 ($$$). */
  priceLevel: PriceLevelValue;
  /** URL of the restaurant's photo. Without one, the photo area shows a plain fill. */
  imageUrl?: string;
  /** The layout. `responsive` is small below the `md` breakpoint and large from it. */
  size?: RestaurantCardSize;
  /** Extra classes for the root element, such as grid placement. */
  className?: string;
};

const titleClasses: Record<RestaurantCardSize, string> = {
  large: 'line-clamp-2',
  small: 'h-[18px] truncate',
  responsive: 'h-[18px] truncate md:line-clamp-2 md:h-auto md:whitespace-normal',
};

const imageSizes: Record<RestaurantCardSize, string> = {
  large: '(min-width: 768px) 25vw, 100vw',
  small: '100px',
  responsive: '(min-width: 768px) 25vw, 100px',
};

/**
 * A restaurant summary that links to the restaurant. The whole card is the link's hit area,
 * while the link's accessible name is just the restaurant's name.
 */
export function RestaurantCard({
  href,
  name,
  cuisines,
  rating,
  priceLevel,
  imageUrl,
  size = 'responsive',
  className = '',
}: RestaurantCardProps) {
  return (
    <article
      className={`relative flex overflow-hidden bg-background-secondary transition-shadow duration-150 hover:shadow-card-hover motion-reduce:transition-none has-[a:active]:bg-[image:linear-gradient(var(--color-pressed),var(--color-pressed))] has-[a:focus-visible]:outline-1 has-[a:focus-visible]:-outline-offset-1 has-[a:focus-visible]:outline-focus ${size === 'responsive' ? 'md:hover:shadow-card-hover' : ''} ${layout.root[size]} ${className}`}
    >
      <div className={`relative bg-skeleton ${layout.media[size]}`}>
        {imageUrl && (
          <Image src={imageUrl} alt="" fill sizes={imageSizes[size]} className="object-cover" />
        )}
      </div>
      <div className={`flex flex-col gap-4 p-4 ${layout.content[size]}`}>
        <div className="flex flex-col gap-1">
          <h2 className={`text-h4 text-headline ${titleClasses[size]}`}>
            <Link href={href} className="outline-none after:absolute after:inset-0">
              {name}
            </Link>
          </h2>
          <p className="h-4 truncate text-supporting text-body">{cuisines.join(', ')}</p>
        </div>
        <div className="flex items-center gap-4">
          <p className="flex gap-1 text-supporting text-body">
            <StarIcon className="text-brand" />
            <span className="sr-only">Rating </span>
            {rating.toFixed(1)}
          </p>
          <PriceLevel level={priceLevel} />
        </div>
      </div>
    </article>
  );
}
