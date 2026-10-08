import type { Metadata } from 'next';
import './globals.css';
import branding from '@/constants/branding';

export const metadata: Metadata = {
  title: `${branding.name} | ${branding.tagline}`,
  description: branding.description,
};

/**
 * Root layout component for the Next.js app.
 * Sets global styles, fonts, and metadata for all pages.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
