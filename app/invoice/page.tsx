import type { Metadata } from 'next';
import { InvoiceStudio } from '@/components/InvoiceStudio';

export const metadata: Metadata = {
  title: 'Brand Invoice Generator — CommerceKit Studio',
  description:
    'Generate branded customer invoices with AI natural-language quick-fill, real-time preview, PDF download, and print support.',
};

export default function InvoicePage() {
  return <InvoiceStudio />;
}
