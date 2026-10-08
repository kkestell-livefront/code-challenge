import type { NextConfig } from 'next';

// Set when building for GitHub Pages, e.g. `/code-challenge`. Produces a static export in `out/`
// served from that path.
const pagesBasePath = process.env.PAGES_BASE_PATH;

const nextConfig: NextConfig = pagesBasePath
  ? {
      output: 'export',
      basePath: pagesBasePath,
      trailingSlash: true,
      images: { unoptimized: true },
    }
  : {};

export default nextConfig;
