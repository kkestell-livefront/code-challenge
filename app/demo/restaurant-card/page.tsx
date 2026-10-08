import { RestaurantCardSkeleton } from '@/components/loaders/restaurant-card-skeleton/RestaurantCardSkeleton';
import { RestaurantCard } from '@/components/restaurants/restaurant-card/RestaurantCard';
import content from '@/constants/restaurantCardDemo';

const STATES = ['default', 'hover', 'focus', 'pressed', 'loading'] as const;
const SIZES = [
  { size: 'large', width: 'w-[206.4px]' },
  { size: 'small', width: 'w-[312px]' },
] as const;

/**
 * Demo of `RestaurantCard` in every variant, with stress cases. The first section holds one
 * wrapper per Figma variant for the pixel comparison; interaction states render at rest there and
 * are applied by the capture script.
 */
export default function RestaurantCardDemo() {
  const { sample } = content;

  return (
    <main className="flex flex-col gap-12 p-6 text-headline">
      <h1 className="text-h4">{content.title}</h1>

      <section className="flex flex-col gap-4">
        <h2 className="text-supporting text-body">{content.comparisonHeading}</h2>
        <div className="flex flex-col items-start pl-24">
          {SIZES.flatMap(({ size, width }) =>
            STATES.map((state) => (
              <div
                key={`${state}-${size}`}
                data-figma-case={`state-${state}-size-${size}`}
                className={`box-content p-12 ${width}`}
              >
                {state === 'loading' ? (
                  <RestaurantCardSkeleton size={size} />
                ) : (
                  <RestaurantCard {...sample} size={size} />
                )}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="flex flex-col gap-4 bg-background-primary p-6">
        <h2 className="text-supporting text-body">{content.responsiveHeading}</h2>
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-4 md:gap-6">
          <li>
            <RestaurantCard {...sample} />
          </li>
          <li>
            <RestaurantCard {...content.stress[1]} />
          </li>
          <li>
            <RestaurantCardSkeleton />
          </li>
          <li>
            <RestaurantCard {...content.stress[0]} />
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-4 bg-background-primary p-6">
        <h2 className="text-supporting text-body">{content.stressHeading}</h2>
        {SIZES.map(({ size }) => (
          <ul key={size} className="flex flex-wrap gap-6">
            {content.stress.map((restaurant) => (
              <li key={restaurant.name} className={size === 'large' ? 'w-64' : 'w-80'}>
                <RestaurantCard {...restaurant} size={size} />
              </li>
            ))}
          </ul>
        ))}
      </section>

      <section
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label={content.loadingLabel}
        className="flex flex-wrap gap-6 bg-background-primary p-6"
      >
        {SIZES.map(({ size }) => (
          <div key={size} className={size === 'large' ? 'w-64' : 'w-80'}>
            <RestaurantCardSkeleton size={size} />
          </div>
        ))}
      </section>
    </main>
  );
}
