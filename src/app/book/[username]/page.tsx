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
  return <BookingClient />;
}
