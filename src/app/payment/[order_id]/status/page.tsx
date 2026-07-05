import { Suspense } from 'react';
import PaymentStatusClient from './Client';

export function generateStaticParams() {
  return [{ order_id: '1' }];
}

export default function PaymentStatusPage() {
  return (
    <Suspense fallback={<div>Loading payment status...</div>}>
      <PaymentStatusClient />
    </Suspense>
  );
}
