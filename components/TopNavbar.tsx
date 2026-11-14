'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { FileText, Image as ImageIcon, Menu, Moon, Sun, X } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

const NAV_PAGES = [
  {
    href: '/',
    label: 'Media & SEO',
    shortLabel: 'Media & SEO',
    description: 'AI social media resizer and multi-platform SEO generator',
    icon: ImageIcon,
  },
  {
    href: '/invoice',
    label: 'Brand Invoice',
    shortLabel: 'Brand Invoice',
    description: 'AI quick-fill invoice builder, templates, and PDF export',
    icon: FileText,
  },
] as const;

export function TopNavbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [mobilePaneOpen, setMobilePaneOpen] = useState(false);

  const isResizer = pathname === '/';
  const isInvoice = pathname.startsWith('/invoice');

  const isActive = (href: string) => (href === '/' ? isResizer : isInvoice);

  return (
    <>
      <header className="no-print sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-sm transition-colors dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-3 px-4 sm:h-16 sm:gap-8 sm:px-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <Link
            href="/"
            onClick={() => setMobilePaneOpen(false)}
            className="font-display text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 sm:text-lg dark:text-slate-50"
          >
            CommerceKit Studio
          </Link>

          {/* Zone 2: Desktop Single-Line Navigation Links */}
          <nav
            aria-label="Primary tools"
            className="hidden md:flex items-center gap-8 text-sm font-medium"
          >
            {NAV_PAGES.map((page) => {
              const active = isActive(page.href);
              return (
                <Link
                  key={page.href}
                  href={page.href}
                  className={`relative py-5 transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                  }`}
                >
                  {page.label}
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-600 dark:bg-blue-400"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Zone 3: Theme Toggle + Mobile Menu Pane Button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 touch-manipulation whitespace-nowrap shrink-0 sm:min-h-[38px] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-4 w-4 text-amber-400" aria-hidden="true" />
                  <span className="hidden sm:inline">Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4 text-slate-600" aria-hidden="true" />
                  <span className="hidden sm:inline">Dark Mode</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setMobilePaneOpen((open) => !open)}
              aria-expanded={mobilePaneOpen}
              aria-controls="mobile-pages-pane"
              aria-label={mobilePaneOpen ? 'Close pages menu' : 'Open pages menu'}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 touch-manipulation md:hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {mobilePaneOpen ? (
                <X className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Menu className="h-4 w-4" aria-hidden="true" />
              )}
              <span>Menu</span>
            </button>
          </div>
        </div>

        {/* Collapsible Mobile Two-Page Menu Pane */}
        <AnimatePresence>
          {mobilePaneOpen && (
            <motion.nav
              id="mobile-pages-pane"
              aria-label="Mobile pages menu"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
              className="border-t border-slate-200 bg-white px-4 py-3 md:hidden dark:border-slate-800 dark:bg-slate-950"
            >
              <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                Studio Pages
              </p>
              <div className="space-y-2">
                {NAV_PAGES.map((page) => {
                  const Icon = page.icon;
                  const active = isActive(page.href);
                  return (
                    <Link
                      key={page.href}
                      href={page.href}
                      onClick={() => setMobilePaneOpen(false)}
                      className={`flex min-h-[52px] w-full items-center gap-3 rounded-lg border px-3.5 py-2.5 transition-colors touch-manipulation ${
                        active
                          ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950/50 dark:text-blue-300'
                          : 'border-slate-200 bg-slate-50 text-slate-800 active:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold leading-tight">{page.label}</div>
                        <div className="mt-0.5 truncate text-xs opacity-75">
                          {page.description}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      {/* Non-sticky Mobile Two-Page Switcher Pane (fits 100% phone width, instant 1-tap access) */}
      <nav
        aria-label="Quick page switcher"
        className="no-print grid w-full grid-cols-2 border-b border-slate-200 bg-white md:hidden dark:border-slate-800 dark:bg-slate-900"
      >
        {NAV_PAGES.map((page) => {
          const Icon = page.icon;
          const active = isActive(page.href);
          return (
            <Link
              key={page.href}
              href={page.href}
              onClick={() => setMobilePaneOpen(false)}
              className={`relative flex min-h-[46px] items-center justify-center gap-2 px-3 py-2 text-xs font-semibold transition-colors touch-manipulation whitespace-nowrap ${
                active
                  ? 'text-blue-600 bg-blue-50/50 dark:text-blue-400 dark:bg-blue-950/30'
                  : 'text-slate-600 active:bg-slate-100 dark:text-slate-400 dark:active:bg-slate-800'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{page.shortLabel}</span>
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-600 dark:bg-blue-400"
                />
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
