import { Suspense } from 'react';
import BookingClient from './BookingClient';

// generateStaticParams removed to fully embrace SSR using standalone Next.js server

interface PageProps {
  params: Promise<{ username: string }>;
}

export default async function BookingPage({ params }: PageProps) {
  const { username } = await params;
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-4 border-brand-gray-100 border-t-brand-red rounded-full animate-spin" />
        </div>
      }
    >
      <BookingClient />
    </Suspense>
  );
}
