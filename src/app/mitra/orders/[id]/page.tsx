import MitraOrderDetailClient from './Client';

export function generateStaticParams() {
  return [{ id: '1' }];
}

export default function MitraOrderDetailPage() {
  return <MitraOrderDetailClient />;
}
