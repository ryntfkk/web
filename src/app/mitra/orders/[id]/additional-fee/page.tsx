import AdditionalFeeFormClient from './Client';

export function generateStaticParams() {
  return [{ id: '1' }];
}

export default function AdditionalFeeFormPage() {
  return <AdditionalFeeFormClient />;
}
