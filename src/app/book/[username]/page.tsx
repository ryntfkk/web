import { Suspense } from 'react';
import BookingClient from './BookingClient';

// List of partner usernames to pre-render (same as [username] profile pages)
const VALID_USERNAMES = ['budiac', 'siticom', 'jokoplumb', 'antotech'];

export function generateStaticParams() {
  return VALID_USERNAMES.map((username) => ({
    username,
  }));
}

interface PageProps {
  params: Promise<{ username: string }>;
}

export default async function BookingPage({ params }: PageProps) {
  const { username } = await params;
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-4 border-[#e5e2e1] border-t-[#b51822] rounded-full animate-spin" />
        </div>
      }
    >
      <BookingClient />
    </Suspense>
  );
}
