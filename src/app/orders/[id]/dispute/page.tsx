import DisputeClient from './Client';

export function generateStaticParams() {
  return [{ id: '1' }];
}

export default function DisputePage() {
  return <DisputeClient />;
}
