import OrderDetailClient from './Client';

export function generateStaticParams() {
  return [{ id: '1' }];
}

export default function OrderDetailPage() {
  return <OrderDetailClient />;
}
