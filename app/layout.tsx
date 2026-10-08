import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';

import './globals.css';
import branding from '@/constants/branding';

const poppins = Poppins({
  weight: ['500', '600'],
  subsets: ['latin'],
  variable: '--font-poppins',
});

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
      <body className={`${poppins.variable} bg-background-primary font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
