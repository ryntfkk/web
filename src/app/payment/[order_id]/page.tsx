import PaymentClient from './Client';

export function generateStaticParams() {
  return [{ order_id: '1' }];
}

export default function PaymentPage() {
  return <PaymentClient />;
}
