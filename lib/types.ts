export interface PlatformSeoBlock {
  title: string;
  description: string;
  hashtags: string[];
}

export interface MediaSeoResponse {
  visualAnalysis: {
    productCategory: string;
    dominantEdgeColor: string;
    secondaryStudioColor: string;
    isDarkBackground: boolean;
    shadowTone: string;
  };
  seo: {
    youtube: PlatformSeoBlock;
    tiktok: PlatformSeoBlock;
    instagram: PlatformSeoBlock;
    pinterest: PlatformSeoBlock;
  };
}

export type BackdropMode =
  | 'seamless-edge'
  | 'ambient-blur'
  | 'editorial-mat'
  | 'clean-studio';

export interface PlatformFormatSpec {
  id: 'youtube' | 'tiktok' | 'instagram-square' | 'instagram-portrait' | 'pinterest';
  platform: string;
  formatLabel: string;
  aspectLabel: string;
  width: number;
  height: number;
}

export const PLATFORM_SPECS: PlatformFormatSpec[] = [
  {
    id: 'youtube',
    platform: 'YouTube',
    formatLabel: 'Thumbnail / Cover',
    aspectLabel: '16:9',
    width: 1280,
    height: 720,
  },
  {
    id: 'tiktok',
    platform: 'TikTok',
    formatLabel: 'Full Vertical Video',
    aspectLabel: '9:16',
    width: 1080,
    height: 1920,
  },
  {
    id: 'instagram-square',
    platform: 'Instagram',
    formatLabel: 'Square Feed Post',
    aspectLabel: '1:1',
    width: 1080,
    height: 1080,
  },
  {
    id: 'instagram-portrait',
    platform: 'Instagram',
    formatLabel: 'Portrait Feed Post',
    aspectLabel: '4:5',
    width: 1080,
    height: 1350,
  },
  {
    id: 'pinterest',
    platform: 'Pinterest',
    formatLabel: 'Standard Pin',
    aspectLabel: '2:3',
    width: 1000,
    height: 1500,
  },
];

export type InvoiceTemplate = 'modern' | 'minimalist' | 'classic';

export interface InvoiceLineItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface InvoiceData {
  template: InvoiceTemplate;
  brandLogo: string | null;
  brandName: string;
  brandPhone: string;
  brandEmail: string;
  brandAddress: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  items: InvoiceLineItem[];
  taxPercent: number;
  discountType: 'fixed' | 'percent';
  discountValue: number;
  shipping: number;
  paymentMethod: string;
  notes: string;
}

export interface ParsedInvoiceResult {
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  currency: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
  taxPercent: number;
  discountType: 'fixed' | 'percent';
  discountValue: number;
  shipping: number;
  paymentMethod: string;
  notes: string;
}
