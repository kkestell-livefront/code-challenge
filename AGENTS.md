# AGENTS.md

Blank Next.js project. The conventions below describe how Livefront builds Next.js apps; follow them
when adding new code.

## Commands

| Command                 | Purpose                                               |
| ----------------------- | ----------------------------------------------------- |
| `npm run dev`           | Dev server at http://localhost:3000                   |
| `npm run build`         | Production build, including the TypeScript type check |
| `npm run lint`          | ESLint (`eslint .`)                                   |
| `npm test`              | Vitest in watch mode                                  |
| `npm run test:coverage` | Single Vitest run with V8 coverage and 80% thresholds |
| `npm run prettier`      | Check formatting                                      |
| `npm run prettier:fix`  | Fix formatting                                        |

CI (`.github/workflows/ci.yml`) runs on every pull request with Node 24: `npm ci`, `prettier`,
`lint`, `test:coverage`. Run all three checks before considering work done. npm is the package
manager (`package-lock.json`).

Use Node 24 (`.nvmrc`). Some dev dependencies (Vitest 5, jsdom 30, eslint-plugin-jsdoc) require at
least Node 22.22.2 or 24.15.

CI does not type-check. Run `npx tsc --noEmit` or `npm run build` before considering work done.

Two dependencies are intentionally held below their latest major:

- **ESLint 9**: `eslint-config-next` depends on `eslint-plugin-import`, `eslint-plugin-react`, and
  `eslint-plugin-jsx-a11y`, which do not yet allow ESLint 10.
- **TypeScript 6.0**: `typescript-eslint` (used by `eslint-config-next`) requires TypeScript below
  6.1, so TypeScript 7 cannot be used yet.

## Stack

- Next.js 16 App Router, React 19, TypeScript 6 in strict mode.
- Tailwind CSS v4, configured in CSS (`app/globals.css`). There is no `tailwind.config` file.
  PostCSS runs `@tailwindcss/postcss` and `autoprefixer`.
- Vitest 5 with jsdom, React Testing Library, `@testing-library/jest-dom`, and
  `@testing-library/user-event`.
- No runtime dependencies beyond `next`, `react`, and `react-dom`. No state library, no class-name
  helper, no data-fetching library, no icon library. Add one only with a clear reason.

## Project Structure

```
app/                     Routes (App Router). page.tsx, layout.tsx, not-found.tsx, api/**/route.ts
components/
  global/                Components used across pages
  elements/              Small reusable UI elements
  loaders/               Skeleton loading states
  <feature>/             Feature components
constants/               Default-exported config and copy objects (branding.ts, content.ts)
lib/                     Data fetchers and helpers, one function per file
types/                   Shared domain types (custom.d.ts)
assets/svg/              Source SVGs
public/                  Static files served from /
setupTests.ts            Vitest setup
```

The `.gitkeep` files only hold the empty folders. Delete each one once its folder has real files.

## Code Style

- Prettier: 2 spaces, semicolons, single quotes, 100-character lines, `trailingComma: "es5"`.
- ESLint (`eslint.config.js`): `next/core-web-vitals`, `eqeqeq`, and `eslint-plugin-import` rules.
  Imports must be ordered builtin, unknown, external, internal, parent, sibling, index, and sorted
  alphabetically (case-insensitive) within each group, with a blank line after the imports. Run
  `npm run lint` to check the order.
- Import across folders with the `@/` alias, which maps to the repo root (for example
  `@/components/elements/thing-summary/ThingSummary`). Use `./` only for files in the same folder, such as a test
  importing its component.
- Use `import type { ... }` for type-only imports.
- Use `type`, not `interface`, for props and data shapes.
- Write JSDoc comments on exported functions, pages, and route handlers, and a `/** ... */` comment
  on every field of props and domain types:

  ```ts
  export type ThingSummaryProps = {
    /** The thing's display name. */
    name: string;
    /** The size of the summary. */
    size?: 'large' | 'small';
  };
  ```

## Components

- One component per folder: `components/<category>/<kebab-case-name>/<PascalCase>.tsx` with a
  co-located `<PascalCase>.test.tsx`. Example:
  `components/elements/thing-summary/ThingSummary.tsx`.
- Use named function exports: `export function ThingSummary(...)`. Default exports are only for
  Next.js route files (`page.tsx`, `layout.tsx`, `not-found.tsx`).
- Export the props type as `<Name>Props`, destructure props in the signature, and set defaults there
  (`{ size = 'large' }`).
- Components are server components by default. Add `'use client'` only when the component needs
  hooks, event handlers, or browser APIs.
- Async server components fetch their own data by calling a `lib/` fetcher. They catch errors and
  render the shared error component, and they render an empty state when the result is empty:

  ```tsx
  export async function ThingList() {
    try {
      const things = await getThings();
      if (things.length === 0) {
        return <ErrorMessage message="..." />;
      }
      return <ThingGrid things={things} />;
    } catch {
      return <ErrorMessage message="..." />;
    }
  }
  ```

- Pages compose components. Wrap each async data component in `<Suspense>` with a skeleton from
  `components/loaders/` as the fallback.
- Build skeletons to mirror the real layout, use the `loading-gradient` utility, and mark them with
  `role="status"`, `aria-live="polite"`, and `aria-busy="true"` on the wrapping section.
- Client state with more than one related value uses `useReducer`, with a discriminated-union
  `Action` type and a `status: 'idle' | 'loading' | 'success' | 'error'` field.
- Inline icons as JSX `<svg>` with `fill="currentColor"` and set the color with a Tailwind `text-*`
  class. Mark decorative icons `aria-hidden="true"` and give meaningful ones an `aria-label`. Keep
  the source file in `assets/svg/`.
- Use `next/image` for images, with explicit `width`/`height` or `fill`. Add remote image hosts to
  `images.remotePatterns` in `next.config.ts`:

  ```ts
  images: { remotePatterns: [new URL('https://example.com/img/**')] },
  ```

- Use `next/link` for internal navigation and `useRouter` from `next/navigation` for imperative
  navigation.
- Accessibility: use semantic elements (`header`, `main`, `section`, `article`, `aside`), set
  `type="button"` on non-submit buttons, and add an `aria-label` to icon-only links and buttons.
  Tests query by role and label, so these attributes are also how components get tested.

## Pages and Routes

- Each page is a default-exported function with a JSDoc comment. Dynamic route `params` is a
  Promise and must be awaited:

  ```tsx
  type Props = { params: Promise<{ id: string }> };

  export default async function Thing({ params }: Props) {
    const { id } = await params;
    ...
  }
  ```

- Read page metadata and visible copy from `constants/` (`branding.ts`, `content.ts`). These files
  default-export a plain object. Do not hardcode copy in pages.
- Include `app/not-found.tsx` once the app has a design.
- Client components never call the upstream API directly, because the API token must stay on the
  server. They call an internal route handler in `app/api/**/route.ts`, which calls the `lib/`
  fetcher and returns `NextResponse.json<T>(...)` on success or
  `NextResponse.json({ error: message }, { status: 500 })` on failure. On the client, call these
  routes with `cache: 'no-store'` and an `Accept: 'application/json'` header.

## Data Fetching (`lib/`)

One fetcher per file (`lib/getThing.ts`), each with a co-located test:

```ts
type NextFetchInit = RequestInit & {
  next?: { revalidate?: number | false; tags?: string[] };
};

type GetThingOpts = {
  base?: string;
  token?: string;
  revalidate?: number | false;
  tags?: string[];
};

/** Fetch a single thing. Throws on error. */
export async function getThing(
  id: string,
  {
    base = process.env.API_BASE_URL,
    token = process.env.API_TOKEN,
    revalidate = 60,
    tags = ['things'],
  }: GetThingOpts = {}
): Promise<ThingResponse['thing']> {
  if (!base || !token) {
    throw new Error('Missing API configuration');
  }

  const endpoint = `${base.replace(/\/+$/, '')}/thing/${id}`;
  const init: NextFetchInit = {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    next: { revalidate, tags },
  };

  const res = await fetch(endpoint, init);
  if (!res.ok) {
    throw new Error(`Thing fetch failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as ThingResponse;
  if (!data?.thing) {
    throw new Error('Malformed response: missing "thing"');
  }
  return data.thing;
}
```

- Read configuration from server-only environment variables (no `NEXT_PUBLIC_` prefix), passed in
  as defaults of an options object so tests can override them.
- Validate inputs and the response shape, and throw an `Error` with a descriptive message. The
  calling component catches it and decides what to render.
- Cache with Next's `fetch` options (`next: { revalidate, tags }`), not a separate cache layer.
- Strip trailing slashes from the base URL.

### Environment variables

Keep `.env` out of git (it is in `.gitignore`). Commit a `.env.example` listing every variable with
placeholder values, and document each variable in a README table (name, description, default).

## Types

Put domain types in `types/custom.d.ts` as exported `type` aliases with a JSDoc comment on every
field. Model API responses exactly (`ThingResponse`, `ThingListResponse`) and derive the shapes
components use from them (`ThingResponse['thing']`, `Thing['status']`). Use unions of literals for
enumerations (`type ThingStatus = 'draft' | 'published'`).

## Styling (`app/globals.css`)

`globals.css` keeps its section layout and is the only place design tokens are defined:

1. **`:root`**: raw CSS variables with semantic names, grouped by comments: text
   (`--text-primary`, `--text-secondary`), background (`--background-primary`,
   `--background-secondary`), state (`--state-active`), and UI (`--ui-border`).
2. **`@theme inline`**: maps the raw variables into Tailwind's namespaces so utilities exist for
   them (`--color-primary: var(--text-primary)` gives `text-primary`, and
   `--color-background-primary: var(--background-primary)` gives `bg-background-primary`). This is
   also where sizing tokens (`--max-content`) and font-size overrides (`--text-xl`, etc.) go.
3. **Dark mode**: `@media (prefers-color-scheme: dark)` redefines the same `:root` variables.
   Components never use `dark:` variants; the tokens switch on their own.
4. **`@utility`**: named utilities for patterns reused across components (`container`,
   `loading-gradient`). Utilities can `@apply` other utilities.

Example (token values come from the design; these are placeholders):

```css
:root {
  --text-primary: #000000;
  --background-primary: #ffffff;
}

@theme inline {
  --color-primary: var(--text-primary);
  --color-background-primary: var(--background-primary);
  --max-content: 1200px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --text-primary: #ffffff;
    --background-primary: #000000;
  }
}

@utility container {
  max-width: var(--max-content);
  margin-inline: auto;
  padding-inline: 1.5rem;
}
```

- Style with Tailwind utilities in `className`. Build conditional classes with template literals
  (`` `base ${isLoading ? 'text-transparent' : ''}` ``). No `clsx`.
- Write styles mobile-first. The main breakpoint is `md:` (768px), plus `sm:` and `lg:` where needed.
- Use token utilities (`text-primary`, `bg-background-secondary`) instead of raw hex values or the
  default Tailwind palette.
- Fonts come from `next/font/google` in `app/layout.tsx` with a CSS `variable`, applied on `<body>`.
  Map the variable in `@theme` so the font applies:

  ```tsx
  const inter = Inter({
    weight: ['400', '600'],
    subsets: ['latin'],
    variable: '--font-inter',
  });
  // <body className={`${inter.variable} antialiased`}>
  ```

  ```css
  @theme inline {
    --font-sans: var(--font-inter);
  }
  ```

## Testing

- Every component and `lib/` function gets a co-located `*.test.ts(x)`. CI fails if coverage of
  lines, functions, branches, or statements drops below 80%. `app/layout.tsx`, `app/page.tsx`,
  `app/api/**`, and `constants/**` are excluded from coverage. Add dynamic route folders to
  `coverage.exclude` in `vitest.config.ts` (for example `'**/app/thing/[[]id[]]/**'`).
- `passWithNoTests` is on only so the empty project passes CI. Leave it on; once tests exist it has
  no effect.
- Vitest globals are enabled: use `describe`, `it`, `expect`, and `vi` without importing them.
  `setupTests.ts` registers the jest-dom matchers and runs `cleanup()` after each test.
- Name describe blocks after the component (`describe('<ThingSummary />', ...)`) and write `it`
  descriptions as full behavior sentences.
- Query by role, label, or text (`getByRole('button', { name: /save/i })`, `getByLabelText`). Use
  `data-testid` only as a last resort. Use `userEvent` for interactions and `fireEvent` for events
  like `scroll`.
- Test an async server component by awaiting it as a function, then rendering the result:

  ```tsx
  const ui = await ThingList();
  render(ui);
  ```

- Mock `lib/` fetchers at the module boundary:

  ```ts
  vi.mock('@/lib/getThings', () => ({ getThings: vi.fn() }));
  const mockGetThings = vi.mocked(getThings) as MockedFunction<typeof getThings>;
  ```

- Mock `next/navigation` in any test that renders a component using `useRouter`:

  ```ts
  vi.mock('next/navigation', () => ({
    useRouter: () => ({
      back: vi.fn(),
      push: vi.fn(),
      replace: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    }),
  }));
  ```

- In tests, `next/image` renders `src` as `/_next/image?url=<original>&...`. Assert on the `url`
  query parameter.
- Stub `fetch` with `vi.stubGlobal('fetch', spy)`. Call `vi.unstubAllGlobals()` in `beforeEach` and
  `vi.restoreAllMocks()` in `afterEach`. Keep these shared helpers in `lib/helpers.ts`, created
  with the first fetcher:

  ```ts
  /** Set environment variables for testing */
  export const setEnv = (vars: Partial<NodeJS.ProcessEnv>) => {
    Object.entries(vars).forEach(([k, v]) => {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    });
  };

  /** Generic OK fetch mock: returns whatever body you pass in */
  export const mockFetchOk = <T>(body: T) => {
    const spy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => body,
    } as Response);
    vi.stubGlobal('fetch', spy as unknown as typeof fetch);
    return spy;
  };

  /** Non-OK fetch mock */
  export const mockFetchFail = (status: number, statusText = 'Error') => {
    const spy = vi.fn().mockResolvedValue({
      ok: false,
      status,
      statusText,
      json: async () => ({}),
    } as Response);
    vi.stubGlobal('fetch', spy as unknown as typeof fetch);
    return spy;
  };

  /** Minimal Next.js RequestInit for tests */
  export type MinimalNextInit = RequestInit & {
    next?: { revalidate?: number | false; tags?: string[] };
  };
  ```

- Fetcher tests cover missing config (and assert `fetch` was not called), non-OK responses,
  malformed responses, the success path (URL, `Authorization` and `Accept` headers, and
  `next.revalidate`/`next.tags` defaults), and option overrides.

## Documentation

Keep `README.md` up to date with prerequisites, environment variables, scripts, project structure,
browser support, and the dependency tables (name, description, license) whenever a dependency is
added or removed. `package.json` is the source of truth for dependencies.

Browser support target: the three most recent versions of Chrome, Safari, and Firefox on desktop;
Android 10+ and iOS 14+ on mobile; responsive from 320px to 2000px+ wide, portrait and landscape.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
