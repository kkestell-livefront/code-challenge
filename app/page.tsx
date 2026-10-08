import branding from '@/constants/branding';

/**
 * Home page component.
 */
export default function Home() {
  return (
    <main className="min-h-screen">
      <h1>{branding.name}</h1>
    </main>
  );
}
