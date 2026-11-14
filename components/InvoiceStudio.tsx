'use client';

import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Download,
  FileText,
  ImagePlus,
  Loader2,
  Plus,
  Printer,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import sampleBrandMarkImg from '@/src/assets/images/sample_brand_mark_1794674930514.jpg';
import { calculateInvoiceTotals, exportInvoiceToPdf, formatMoney } from '@/lib/invoice-pdf';
import type {
  InvoiceData,
  InvoiceLineItem,
  InvoiceTemplate,
  ParsedInvoiceResult,
} from '@/lib/types';

const CURRENCIES = ['USD', 'PKR', 'EUR', 'GBP', 'AED', 'SAR', 'CAD', 'AUD'];

const TEMPLATE_PRESETS: Array<{ id: InvoiceTemplate; label: string }> = [
  { id: 'modern', label: 'Modern' },
  { id: 'minimalist', label: 'Minimalist' },
  { id: 'classic', label: 'Classic' },
];

const SAMPLE_PROMPTS = [
  {
    label: 'Sara Order (PKR)',
    text: 'Client Sara Ahmed, phone 0300-4521890, House 42 Block K Gulberg II Lahore. 2 Cognac Leather Handbags at 3500 PKR each, 1 Brass Keychain at 850 PKR. 500 delivery, 5% discount, Cash on Delivery. Deliver before Friday evening.',
  },
  {
    label: 'Studio Retainer (USD)',
    text: 'Client Northstar Coffee Roasters, 415-890-2214, 740 Market St San Francisco CA. 12 Packaging Design Mockups at 85 USD each, 1 Brand Guidelines PDF at 350 USD. 8.5% tax, 100 discount, Bank Transfer (ACH), Net 14 days.',
  },
];

function createDefaultInvoice(): InvoiceData {
  const today = new Date().toISOString().split('T')[0];
  const due = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  return {
    template: 'modern',
    brandLogo: null,
    brandName: 'Atelier Craft Studio',
    brandPhone: '+1 (415) 555-0194',
    brandEmail: 'billing@ateliercraft.co',
    brandAddress: '280 Howard Street, Suite 400, San Francisco, CA',
    invoiceNumber: 'INV-2026-0104',
    issueDate: today,
    dueDate: due,
    currency: 'USD',
    clientName: 'Elena Vance',
    clientPhone: '+1 (415) 555-0148',
    clientAddress: '1420 Pine Street, Apt 6B, San Francisco, CA',
    items: [
      {
        id: 'item-1',
        name: 'Artisan Cognac Leather Handbag',
        quantity: 1,
        unitPrice: 240,
      },
      {
        id: 'item-2',
        name: 'Monogram Dust Bag & Care Balm',
        quantity: 1,
        unitPrice: 35,
      },
    ],
    taxPercent: 0,
    discountType: 'fixed',
    discountValue: 0,
    shipping: 15,
    paymentMethod: 'Bank Transfer / Card',
    notes: 'Thank you for your order. Goods include a 1-year craftsmanship guarantee.',
  };
}

export function InvoiceStudio() {
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const [invoice, setInvoice] = useState<InvoiceData>(() => createDefaultInvoice());
  const [aiPrompt, setAiPrompt] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const totals = useMemo(() => calculateInvoiceTotals(invoice), [invoice]);

  const updateField = <K extends keyof InvoiceData>(key: K, value: InvoiceData[K]) => {
    setInvoice((prev) => ({ ...prev, [key]: value }));
  };

  const handleLogoUpload = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please upload a valid PNG, JPG, or SVG logo image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateField('brandLogo', reader.result);
        setErrorMsg(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLoadSampleBrand = async () => {
    try {
      const response = await fetch(sampleBrandMarkImg.src);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setInvoice((prev) => ({
            ...prev,
            brandLogo: reader.result as string,
            brandName: 'Architect Studio London',
            brandEmail: 'orders@architectstudio.co.uk',
            brandPhone: '+44 20 7946 0821',
            brandAddress: '18 Clerkenwell Green, London EC1R 0DP',
          }));
          setErrorMsg(null);
        }
      };
      reader.readAsDataURL(blob);
    } catch {
      setErrorMsg('Unable to load sample brand logo.');
    }
  };

  const handleAiQuickFill = async () => {
    if (!aiPrompt.trim()) {
      setErrorMsg('Please paste or type order details in the AI Quick-Fill box.');
      return;
    }

    setIsParsing(true);
    setErrorMsg(null);
    setStatusNotice(null);

    try {
      const response = await fetch('/api/invoice-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt.trim(),
          defaultCurrency: invoice.currency,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse order details.');
      }

      const parsed = data as ParsedInvoiceResult;
      const mappedItems: InvoiceLineItem[] =
        parsed.items && parsed.items.length > 0
          ? parsed.items.map((item, idx) => ({
              id: `ai-item-${Date.now()}-${idx}`,
              name: item.name || 'Item',
              quantity: item.quantity > 0 ? item.quantity : 1,
              unitPrice: item.unitPrice >= 0 ? item.unitPrice : 0,
            }))
          : invoice.items;

      setInvoice((prev) => ({
        ...prev,
        clientName: parsed.clientName || prev.clientName,
        clientPhone: parsed.clientPhone || prev.clientPhone,
        clientAddress: parsed.clientAddress || prev.clientAddress,
        currency: parsed.currency || prev.currency,
        items: mappedItems,
        taxPercent: Number.isFinite(parsed.taxPercent) ? parsed.taxPercent : prev.taxPercent,
        discountType: parsed.discountType === 'percent' ? 'percent' : 'fixed',
        discountValue: Number.isFinite(parsed.discountValue)
          ? parsed.discountValue
          : prev.discountValue,
        shipping: Number.isFinite(parsed.shipping) ? parsed.shipping : prev.shipping,
        paymentMethod: parsed.paymentMethod || prev.paymentMethod,
        notes: parsed.notes || prev.notes,
      }));

      setStatusNotice('Invoice fields populated from your order notes.');
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to parse order text with Gemini AI.'
      );
    } finally {
      setIsParsing(false);
    }
  };

  const handleAddItem = () => {
    setInvoice((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: `item-${Date.now()}`,
          name: '',
          quantity: 1,
          unitPrice: 0,
        },
      ],
    }));
  };

  const handleUpdateItem = (
    id: string,
    field: keyof Omit<InvoiceLineItem, 'id'>,
    value: string | number
  ) => {
    setInvoice((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }));
  };

  const handleRemoveItem = (id: string) => {
    setInvoice((prev) => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((item) => item.id !== id) : prev.items,
    }));
  };

  const handleGenerateInvoiceNumber = () => {
    const rand = Math.floor(1000 + Math.random() * 9000);
    const yr = new Date().getFullYear();
    updateField('invoiceNumber', `INV-${yr}-${rand}`);
  };

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    setErrorMsg(null);
    try {
      await exportInvoiceToPdf(invoice);
    } catch {
      setErrorMsg('Could not export PDF. Please try Print Invoice as a fallback.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setInvoice(createDefaultInvoice());
    setAiPrompt('');
    setErrorMsg(null);
    setStatusNotice(null);
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-8">
      {/* Page Header */}
      <div className="no-print mb-8 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between dark:border-slate-800">
        <div className="max-w-2xl">
          <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
            Billing &amp; Brand Document Studio
          </p>
          <h1 className="font-display mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-50 [text-wrap:balance]">
            AI Brand Invoice Generator
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Paste messy customer order notes for instant AI field extraction or edit line items
            directly with real-time brand logo preview and PDF export.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleLoadSampleBrand}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ImagePlus className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
            Load Sample Brand
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
            Reset
          </button>
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Editor Column (5 cols) */}
        <div className="no-print lg:col-span-5 min-w-0 space-y-6">
          {/* AI Quick-Fill Prompt Box */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-50">
                AI Quick-Fill Order Parser
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">Natural language</span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Paste WhatsApp, DM, or email order notes and AI will populate client details, items,
              currency, tax, discount, and shipping.
            </p>

            <textarea
              rows={3}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder='e.g. "Client Sara, 2 Leather Handbags at 3500 PKR each, 500 delivery, phone 0300-4521890, Gulberg Lahore"'
              className="mt-3 w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400"
            />

            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                {SAMPLE_PROMPTS.map((sample) => (
                  <button
                    key={sample.label}
                    type="button"
                    onClick={() => {
                      setAiPrompt(sample.text);
                      setErrorMsg(null);
                    }}
                    className="font-medium text-blue-600 hover:underline whitespace-nowrap dark:text-blue-400"
                  >
                    Try: {sample.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAiQuickFill}
                disabled={isParsing}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap shrink-0 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    Auto-Fill Invoice
                  </>
                )}
              </button>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
              >
                {errorMsg}
              </div>
            )}

            {statusNotice && !errorMsg && (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                {statusNotice}
              </div>
            )}
          </section>

          {/* Brand Customization */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-50">
              Brand Identity
            </h2>

            <div className="mt-4 flex items-center gap-4">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="sr-only"
                onChange={(e) => handleLogoUpload(e.target.files?.[0])}
              />

              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-1.5 dark:border-slate-700 dark:bg-slate-950">
                {invoice.brandLogo ? (
                  <img
                    src={invoice.brandLogo}
                    alt="Uploaded brand logo"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <FileText className="h-6 w-6 text-slate-400" aria-hidden="true" />
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  {invoice.brandLogo ? 'Change Logo' : 'Upload Logo'}
                </button>
                {invoice.brandLogo && (
                  <button
                    type="button"
                    onClick={() => updateField('brandLogo', null)}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 whitespace-nowrap dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Brand / Business Name
                </label>
                <input
                  type="text"
                  value={invoice.brandName}
                  onChange={(e) => updateField('brandName', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={invoice.brandEmail}
                  onChange={(e) => updateField('brandEmail', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={invoice.brandPhone}
                  onChange={(e) => updateField('brandPhone', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Business Address
                </label>
                <input
                  type="text"
                  value={invoice.brandAddress}
                  onChange={(e) => updateField('brandAddress', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>
          </section>

          {/* Invoice Meta & Client Details */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-50">
              Invoice &amp; Client Details
            </h2>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Invoice Number
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateInvoiceNumber}
                    className="text-[11px] font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    New #
                  </button>
                </div>
                <input
                  type="text"
                  value={invoice.invoiceNumber}
                  onChange={(e) => updateField('invoiceNumber', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Currency
                </label>
                <select
                  value={invoice.currency}
                  onChange={(e) => updateField('currency', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                  {CURRENCIES.map((cur) => (
                    <option key={cur} value={cur}>
                      {cur}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Issue Date
                </label>
                <input
                  type="date"
                  value={invoice.issueDate}
                  onChange={(e) => updateField('issueDate', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Due Date
                </label>
                <input
                  type="date"
                  value={invoice.dueDate}
                  onChange={(e) => updateField('dueDate', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <div className="sm:col-span-2 mt-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Client Name
                </label>
                <input
                  type="text"
                  value={invoice.clientName}
                  onChange={(e) => updateField('clientName', e.target.value)}
                  placeholder="Client or Company Name"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Client Phone
                </label>
                <input
                  type="text"
                  value={invoice.clientPhone}
                  onChange={(e) => updateField('clientPhone', e.target.value)}
                  placeholder="Phone number"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Client Address
                </label>
                <input
                  type="text"
                  value={invoice.clientAddress}
                  onChange={(e) => updateField('clientAddress', e.target.value)}
                  placeholder="Billing or delivery address"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>
          </section>

          {/* Itemized Line Items */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-50">
                Line Items
              </h2>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add Item
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {invoice.items.map((item, idx) => (
                <div
                  key={item.id}
                  className="grid grid-cols-12 items-end gap-2 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0 dark:border-slate-800"
                >
                  <div className="col-span-12 sm:col-span-6">
                    <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Item {idx + 1}
                    </label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                      placeholder="Product or service"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </div>

                  <div className="col-span-4 sm:col-span-2">
                    <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Qty
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={item.quantity}
                      onChange={(e) =>
                        handleUpdateItem(item.id, 'quantity', Math.max(0, Number(e.target.value)))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-right font-mono text-sm tabular-nums text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Unit Price
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) =>
                        handleUpdateItem(item.id, 'unitPrice', Math.max(0, Number(e.target.value)))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-right font-mono text-sm tabular-nums text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={invoice.items.length === 1}
                      aria-label={`Remove ${item.name || `item ${idx + 1}`}`}
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-30 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Charges, Payment & Notes */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-50">
              Charges, Payment &amp; Notes
            </h2>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Tax (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={invoice.taxPercent}
                  onChange={(e) => updateField('taxPercent', Math.max(0, Number(e.target.value)))}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-right font-mono text-sm tabular-nums text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Discount
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      updateField(
                        'discountType',
                        invoice.discountType === 'fixed' ? 'percent' : 'fixed'
                      )
                    }
                    className="font-mono text-[11px] font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {invoice.discountType === 'percent' ? '%' : invoice.currency}
                  </button>
                </div>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={invoice.discountValue}
                  onChange={(e) =>
                    updateField('discountValue', Math.max(0, Number(e.target.value)))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-right font-mono text-sm tabular-nums text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Shipping / Delivery
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={invoice.shipping}
                  onChange={(e) => updateField('shipping', Math.max(0, Number(e.target.value)))}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-right font-mono text-sm tabular-nums text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Payment Method
                </label>
                <input
                  type="text"
                  value={invoice.paymentMethod}
                  onChange={(e) => updateField('paymentMethod', e.target.value)}
                  placeholder="e.g. Cash on Delivery, Bank Transfer, Card"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Invoice Notes / Terms
                </label>
                <textarea
                  rows={2}
                  value={invoice.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Right Live Preview Column (7 cols) */}
        <div className="lg:col-span-7 min-w-0">
          <div className="lg:sticky lg:top-24 space-y-4">
            {/* Template Switcher & Export Toolbar */}
            <div className="no-print flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
              {/* Template Switcher */}
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Template
                </span>
                <div
                  role="tablist"
                  aria-label="Invoice layout template"
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-950"
                >
                  {TEMPLATE_PRESETS.map((preset) => {
                    const active = invoice.template === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => updateField('template', preset.id)}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors touch-manipulation whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100'
                            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Export Actions */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 touch-manipulation whitespace-nowrap shrink-0 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                  Print Invoice
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isExportingPdf}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50 touch-manipulation whitespace-nowrap shrink-0 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  {isExportingPdf ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      Generating PDF...
                    </>
                  ) : (
                    <>
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      Download PDF
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Paper Invoice Sheet (Always crisp white paper surface for accurate print preview) */}
            <motion.div
              key={invoice.template}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className={`print-only-sheet overflow-hidden rounded-xl border bg-white text-slate-900 shadow-xs ${
                invoice.template === 'classic'
                  ? 'border-slate-300 dark:border-slate-700'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              {/* Modern Accent Top Bar */}
              {invoice.template === 'modern' && (
                <div aria-hidden="true" className="h-2 w-full bg-blue-600" />
              )}

              <div className={invoice.template === 'minimalist' ? 'p-6 sm:p-12' : 'p-6 sm:p-10'}>
                {/* Invoice Header */}
                <div
                  className={`flex flex-col justify-between gap-6 pb-6 sm:flex-row sm:items-start ${
                    invoice.template === 'classic'
                      ? 'border-b-4 border-double border-slate-800'
                      : 'border-b border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {invoice.brandLogo && (
                      <div
                        className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden bg-white p-1 ${
                          invoice.template === 'classic'
                            ? 'border border-slate-300'
                            : 'rounded-lg border border-slate-100'
                        }`}
                      >
                        <img
                          src={invoice.brandLogo}
                          alt={invoice.brandName || 'Brand logo'}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    )}
                    <div>
                      <h2
                        className={`text-xl font-bold text-slate-900 ${
                          invoice.template === 'classic' ? 'font-serif' : 'font-display'
                        }`}
                      >
                        {invoice.brandName || 'Your Brand Name'}
                      </h2>
                      <div className="mt-1 space-y-0.5 text-xs text-slate-600">
                        {invoice.brandEmail && <p>{invoice.brandEmail}</p>}
                        {invoice.brandPhone && <p>{invoice.brandPhone}</p>}
                        {invoice.brandAddress && <p>{invoice.brandAddress}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <p
                      className={`text-2xl tracking-tight ${
                        invoice.template === 'modern'
                          ? 'font-display font-bold text-blue-600'
                          : invoice.template === 'classic'
                            ? 'font-serif font-bold tracking-wide text-slate-900'
                            : 'font-display font-medium tracking-widest text-slate-800'
                      }`}
                    >
                      INVOICE
                    </p>
                    <div className="mt-2 space-y-1 text-xs text-slate-600">
                      <p>
                        Invoice #:{' '}
                        <span className="font-mono font-semibold text-slate-900">
                          {invoice.invoiceNumber || '—'}
                        </span>
                      </p>
                      <p>
                        Issue Date:{' '}
                        <span className="font-mono tabular-nums text-slate-900">
                          {invoice.issueDate || '—'}
                        </span>
                      </p>
                      {invoice.dueDate && (
                        <p>
                          Due Date:{' '}
                          <span className="font-mono tabular-nums text-slate-900">
                            {invoice.dueDate}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Client Information */}
                {invoice.template === 'classic' ? (
                  <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="border border-slate-300 p-4">
                      <p className="font-serif text-xs font-bold uppercase tracking-wider text-slate-600">
                        Bill To
                      </p>
                      <p className="mt-1.5 text-sm font-bold text-slate-900">
                        {invoice.clientName || 'Client Name'}
                      </p>
                      <div className="mt-1 space-y-0.5 text-xs text-slate-600">
                        {invoice.clientPhone && <p>{invoice.clientPhone}</p>}
                        {invoice.clientAddress && <p>{invoice.clientAddress}</p>}
                      </div>
                    </div>
                    <div className="border border-slate-300 p-4">
                      <p className="font-serif text-xs font-bold uppercase tracking-wider text-slate-600">
                        Invoice Summary
                      </p>
                      <div className="mt-1.5 space-y-1 text-xs text-slate-700">
                        <p>
                          Currency: <span className="font-mono font-semibold">{invoice.currency}</span>
                        </p>
                        <p>
                          Payment: <span className="font-medium">{invoice.paymentMethod || 'Standard'}</span>
                        </p>
                        <p>
                          Reference: <span className="font-mono">{invoice.invoiceNumber || '—'}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6">
                    <p
                      className={`text-xs font-semibold uppercase tracking-wider ${
                        invoice.template === 'modern' ? 'text-blue-600' : 'text-slate-400'
                      }`}
                    >
                      Billed To
                    </p>
                    <p className="mt-1.5 text-base font-semibold text-slate-900">
                      {invoice.clientName || 'Client Name'}
                    </p>
                    <div className="mt-0.5 space-y-0.5 text-xs text-slate-600">
                      {invoice.clientPhone && <p>{invoice.clientPhone}</p>}
                      {invoice.clientAddress && <p>{invoice.clientAddress}</p>}
                    </div>
                  </div>
                )}

                {/* Itemized Table */}
                <div className="mt-8 overflow-x-auto">
                  <table
                    className={`w-full border-collapse text-left text-sm ${
                      invoice.template === 'classic' ? 'border border-slate-300' : ''
                    }`}
                  >
                    <thead>
                      <tr
                        className={
                          invoice.template === 'classic'
                            ? 'bg-slate-800 font-serif text-xs font-bold text-white'
                            : invoice.template === 'minimalist'
                              ? 'border-b border-slate-300 text-xs font-medium text-slate-500'
                              : 'border-y border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600'
                        }
                      >
                        <th className="px-3 py-2.5">Item / Description</th>
                        <th className="px-3 py-2.5 text-right">Qty</th>
                        <th className="px-3 py-2.5 text-right">Unit Price</th>
                        <th className="px-3 py-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody
                      className={
                        invoice.template === 'classic'
                          ? 'divide-y divide-slate-300'
                          : 'divide-y divide-slate-100'
                      }
                    >
                      {invoice.items.map((item) => {
                        const lineTotal =
                          Math.max(0, item.quantity) * Math.max(0, item.unitPrice);
                        return (
                          <tr key={item.id}>
                            <td className="px-3 py-3 font-medium text-slate-900">
                              {item.name || 'Untitled Item'}
                            </td>
                            <td className="px-3 py-3 text-right font-mono tabular-nums text-slate-700">
                              {item.quantity}
                            </td>
                            <td className="px-3 py-3 text-right font-mono tabular-nums text-slate-700">
                              {formatMoney(item.unitPrice, invoice.currency)}
                            </td>
                            <td className="px-3 py-3 text-right font-mono font-semibold tabular-nums text-slate-900">
                              {formatMoney(lineTotal, invoice.currency)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Totals Summary */}
                <div className="mt-6 flex justify-end">
                  <div
                    className={`w-full max-w-xs space-y-2 text-sm ${
                      invoice.template === 'modern'
                        ? 'rounded-lg bg-slate-50 p-4'
                        : invoice.template === 'classic'
                          ? 'border border-slate-300 p-4'
                          : 'pt-2'
                    }`}
                  >
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Subtotal</span>
                      <span className="font-mono tabular-nums text-slate-900">
                        {formatMoney(totals.subtotal, invoice.currency)}
                      </span>
                    </div>

                    {totals.discountAmount > 0 && (
                      <div className="flex items-center justify-between text-slate-600">
                        <span>
                          Discount
                          {invoice.discountType === 'percent'
                            ? ` (${invoice.discountValue}%)`
                            : ''}
                        </span>
                        <span className="font-mono tabular-nums text-emerald-700">
                          -{formatMoney(totals.discountAmount, invoice.currency)}
                        </span>
                      </div>
                    )}

                    {invoice.taxPercent > 0 && (
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Tax ({invoice.taxPercent}%)</span>
                        <span className="font-mono tabular-nums text-slate-900">
                          {formatMoney(totals.taxAmount, invoice.currency)}
                        </span>
                      </div>
                    )}

                    {totals.shipping > 0 && (
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Shipping / Delivery</span>
                        <span className="font-mono tabular-nums text-slate-900">
                          {formatMoney(totals.shipping, invoice.currency)}
                        </span>
                      </div>
                    )}

                    <div
                      className={`flex items-center justify-between border-t pt-2.5 text-base font-bold ${
                        invoice.template === 'modern'
                          ? 'border-slate-200 text-blue-600'
                          : invoice.template === 'classic'
                            ? 'border-slate-800 font-serif text-slate-900'
                            : 'border-slate-200 text-slate-900'
                      }`}
                    >
                      <span>Total Due</span>
                      <span className="font-mono tabular-nums">
                        {formatMoney(totals.grandTotal, invoice.currency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Method & Notes */}
                {(invoice.paymentMethod || invoice.notes) && (
                  <div className="mt-10 grid grid-cols-1 gap-4 border-t border-slate-200 pt-6 text-xs text-slate-600 sm:grid-cols-2">
                    {invoice.paymentMethod && (
                      <div>
                        <p className="font-semibold uppercase tracking-wider text-slate-500">
                          Payment Method
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {invoice.paymentMethod}
                        </p>
                      </div>
                    )}
                    {invoice.notes && (
                      <div>
                        <p className="font-semibold uppercase tracking-wider text-slate-500">
                          Notes &amp; Terms
                        </p>
                        <p className="mt-1 leading-relaxed text-slate-700">{invoice.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
