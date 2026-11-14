import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, DM_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { TopNavbar } from '@/components/TopNavbar';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'CommerceKit Studio — AI Product Media Resizer, SEO & Brand Invoicing',
  description:
    'Resize product photography across YouTube, TikTok, Instagram, and Pinterest without cropping, generate platform-ready SEO copy, and build branded invoices with AI quick-fill.',
  openGraph: {
    title: 'CommerceKit Studio',
    description:
      'AI-powered Social Media Product Resizer, Multi-Platform SEO Generator, and Brand Invoice Studio.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CommerceKit Studio',
    description:
      'AI-powered Social Media Product Resizer, Multi-Platform SEO Generator, and Brand Invoice Studio.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plusJakarta.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body
        suppressHydrationWarning
        className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 antialiased transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100"
      >
        <ThemeProvider>
          <div className="flex min-h-screen w-full flex-col overflow-x-hidden">
            <TopNavbar />
            <main className="flex-1 w-full min-w-0">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
