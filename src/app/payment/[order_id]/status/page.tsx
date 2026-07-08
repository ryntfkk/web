import { Suspense } from 'react';
import PaymentStatusClient from './Client';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default function PaymentStatusPage() {
  return (
    <Suspense fallback={<div>Loading payment status...</div>}>
      <PaymentStatusClient />
    </Suspense>
  );
}
