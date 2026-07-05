import AdditionalFeeClient from './Client';

export function generateStaticParams() {
  return [{ id: '1' }];
}

export default function AdditionalFeePage() {
  return <AdditionalFeeClient />;
}
