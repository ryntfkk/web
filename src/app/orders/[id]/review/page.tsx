import ReviewClient from './Client';

export function generateStaticParams() {
  return [{ id: '1' }];
}

export default function ReviewPage() {
  return <ReviewClient />;
}
