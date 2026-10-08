export type StarIconProps = {
  /** Classes for size and color. The star is filled with the current text color. */
  className?: string;
};

/**
 * A filled star. Decorative, so it is hidden from assistive technology.
 */
export function StarIcon({ className = '' }: StarIconProps) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M7 11.2516L11.326 14L10.178 8.82L14 5.33474L8.967 4.88526L7 0L5.033 4.88526L0 5.33474L3.822 8.82L2.674 14L7 11.2516Z" />
    </svg>
  );
}
