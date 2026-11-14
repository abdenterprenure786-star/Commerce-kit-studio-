'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check,
  Copy,
  Download,
  ImagePlus,
  Loader2,
  Maximize2,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import sampleHandbagImg from '@/src/assets/images/sample_leather_handbag_1794674930848.jpg';
import { renderResizedProductCanvas } from '@/lib/canvas-resizer';
import {
  PLATFORM_SPECS,
  type BackdropMode,
  type MediaSeoResponse,
  type PlatformFormatSpec,
  type PlatformSeoBlock,
} from '@/lib/types';

type SeoFilter = 'all' | 'youtube' | 'tiktok' | 'instagram' | 'pinterest';

const BACKDROP_MODES: Array<{ id: BackdropMode; label: string; hint: string }> = [
  {
    id: 'seamless-edge',
    label: 'Seamless Edge',
    hint: 'Extends perimeter colors & lighting softly beyond the original frame',
  },
  {
    id: 'ambient-blur',
    label: 'Ambient Blur',
    hint: 'Softly blurred ambient backdrop behind the uncropped product',
  },
  {
    id: 'editorial-mat',
    label: 'Editorial Mat',
    hint: 'AI-matched radial studio gradient framing the full product',
  },
  {
    id: 'clean-studio',
    label: 'Clean Studio',
    hint: 'Pure neutral studio surface with subtle contact elevation',
  },
];

const SEO_PLATFORMS: Array<{
  key: keyof MediaSeoResponse['seo'];
  label: string;
  specNote: string;
}> = [
  { key: 'youtube', label: 'YouTube', specNote: 'Searchable Video & Shorts' },
  { key: 'tiktok', label: 'TikTok', specNote: 'Hook & Discovery Feed' },
  { key: 'instagram', label: 'Instagram', specNote: 'Feed & Carousel Caption' },
  { key: 'pinterest', label: 'Pinterest', specNote: 'Visual Search Pin' },
];

export function MediaSeoStudio() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [productTitle, setProductTitle] = useState('');
  const [sourceDataUrl, setSourceDataUrl] = useState<string | null>(null);
  const [sourceMimeType, setSourceMimeType] = useState<string>('image/jpeg');
  const [sourceDimensions, setSourceDimensions] = useState<{ w: number; h: number } | null>(null);
  const [loadedImageEl, setLoadedImageEl] = useState<HTMLImageElement | null>(null);

  const [backdropMode, setBackdropMode] = useState<BackdropMode>('seamless-edge');
  const [marginPercent, setMarginPercent] = useState<number>(10);
  const [exportFormat, setExportFormat] = useState<'image/png' | 'image/jpeg'>('image/png');
  const [isDragging, setIsDragging] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [seoData, setSeoData] = useState<MediaSeoResponse | null>(null);
  const [seoFilter, setSeoFilter] = useState<SeoFilter>('all');

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [previewModalSpec, setPreviewModalSpec] = useState<PlatformFormatSpec | null>(null);

  const loadImageFromDataUrl = useCallback((dataUrl: string, mime: string) => {
    const img = new Image();
    img.onload = () => {
      setSourceDataUrl(dataUrl);
      setSourceMimeType(mime);
      setSourceDimensions({ w: img.naturalWidth, h: img.naturalHeight });
      setLoadedImageEl(img);
      setErrorMsg(null);
    };
    img.onerror = () => {
      setErrorMsg('Could not read the selected image file. Please try another PNG, JPG, or WEBP.');
    };
    img.src = dataUrl;
  }, []);

  const handleFileSelected = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        setErrorMsg('Unsupported file format. Please upload a PNG, JPG, or WEBP product image.');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          loadImageFromDataUrl(reader.result, file.type || 'image/jpeg');
          setSeoData(null);
        }
      };
      reader.readAsDataURL(file);
    },
    [loadImageFromDataUrl]
  );

  const handleLoadSample = useCallback(async () => {
    try {
      setErrorMsg(null);
      const response = await fetch(sampleHandbagImg.src);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          loadImageFromDataUrl(reader.result, blob.type || 'image/jpeg');
          setProductTitle((prev) =>
            prev.trim() ? prev : 'Artisan Cognac Full-Grain Leather Handbag'
          );
          setSeoData(null);
        }
      };
      reader.readAsDataURL(blob);
    } catch {
      setErrorMsg('Unable to load sample product image.');
    }
  }, [loadImageFromDataUrl]);

  // Re-render all 5 aspect ratios whenever source image, backdrop mode, margin, format, or AI visual analysis changes
  const renderedOutputs = useMemo(() => {
    if (!loadedImageEl || typeof document === 'undefined') {
      return {} as Record<string, string>;
    }

    const nextOutputs: Record<string, string> = {};
    for (const spec of PLATFORM_SPECS) {
      nextOutputs[spec.id] = renderResizedProductCanvas({
        spec,
        image: loadedImageEl,
        mode: backdropMode,
        marginRatio: marginPercent / 100,
        visualAnalysis: seoData?.visualAnalysis ?? null,
        format: exportFormat,
      });
    }
    return nextOutputs;
  }, [loadedImageEl, backdropMode, marginPercent, exportFormat, seoData]);

  const handleGenerate = async () => {
    if (!sourceDataUrl) {
      setErrorMsg('Please upload a product image or load the sample product first.');
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/media-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productTitle: productTitle.trim() || 'Featured Product',
          imageBase64: sourceDataUrl,
          mimeType: sourceMimeType,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate AI SEO content.');
      }

      setSeoData(data as MediaSeoResponse);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Something went wrong while contacting Gemini AI.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const slugifiedTitle = useMemo(() => {
    const base = (productTitle.trim() || 'product')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return base || 'product';
  }, [productTitle]);

  const downloadSingle = (spec: PlatformFormatSpec) => {
    const dataUrl = renderedOutputs[spec.id];
    if (!dataUrl) return;
    const ext = exportFormat === 'image/jpeg' ? 'jpg' : 'png';
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${slugifiedTitle}-${spec.id}-${spec.width}x${spec.height}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAll = () => {
    PLATFORM_SPECS.forEach((spec, idx) => {
      setTimeout(() => {
        downloadSingle(spec);
      }, idx * 180);
    });
  };

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current));
      }, 1800);
    } catch {
      setErrorMsg('Clipboard access was denied by your browser.');
    }
  };

  const formatFullPlatformCopy = (label: string, block: PlatformSeoBlock) => {
    const tags = block.hashtags.join(' ');
    return `${label.toUpperCase()} TITLE\n${block.title}\n\nDESCRIPTION\n${block.description}\n\nHASHTAGS\n${tags}`;
  };

  const visibleSeoPlatforms = useMemo(() => {
    if (seoFilter === 'all') return SEO_PLATFORMS;
    return SEO_PLATFORMS.filter((p) => p.key === seoFilter);
  }, [seoFilter]);

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-8">
      {/* Page Header */}
      <div className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between dark:border-slate-800">
        <div className="max-w-2xl">
          <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
            Social Media Studio
          </p>
          <h1 className="font-display mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-50 [text-wrap:balance]">
            AI Social Media Resizer &amp; SEO Generator
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Upload a product photo once to export uncropped, edge-extended assets across YouTube,
            TikTok, Instagram, and Pinterest alongside tailored platform SEO copy.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleLoadSample}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 whitespace-nowrap shrink-0 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ImagePlus className="h-4 w-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
            Try Sample Product
          </button>
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Sidebar Controls (4 cols) */}
        <aside className="lg:col-span-4 min-w-0 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-50">
              1. Product Source
            </h2>

            {/* Upload Dropzone */}
            <div className="mt-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(e) => handleFileSelected(e.target.files?.[0])}
              />

              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFileSelected(e.dataTransfer.files?.[0]);
                }}
                className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-5 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                  isDragging
                    ? 'border-blue-600 bg-blue-50/60 dark:border-blue-400 dark:bg-blue-950/30'
                    : 'border-slate-300 bg-slate-50/70 hover:border-slate-400 hover:bg-slate-100/70 dark:border-slate-700 dark:bg-slate-950/50 dark:hover:border-slate-600 dark:hover:bg-slate-800/50'
                }`}
              >
                {sourceDataUrl ? (
                  <div className="w-full space-y-3">
                    <div className="relative mx-auto flex h-44 w-full items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                      <img
                        src={sourceDataUrl}
                        alt={productTitle || 'Uploaded product preview'}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono tabular-nums">
                        {sourceDimensions ? `${sourceDimensions.w} × ${sourceDimensions.h} px` : 'Loaded'}
                      </span>
                      <span className="font-medium text-blue-600 group-hover:underline dark:text-blue-400">
                        Replace image
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="py-5">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                      <Upload className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <p className="mt-3 text-sm font-medium text-slate-800 dark:text-slate-200">
                      Drop product image or click to browse
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      PNG, JPG, or WEBP · Never cropped or cut off
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Product Title Input */}
            <div className="mt-5">
              <label
                htmlFor="product-title"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Product Title / Name
              </label>
              <input
                id="product-title"
                type="text"
                value={productTitle}
                onChange={(e) => setProductTitle(e.target.value)}
                placeholder="e.g. Artisan Cognac Leather Handbag"
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400"
              />
            </div>

            {/* Generate CTA */}
            <div className="mt-6">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || !sourceDataUrl}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 whitespace-nowrap dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Generating Assets &amp; SEO...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    {seoData ? 'Regenerate Assets & SEO' : 'Generate Assets & SEO'}
                  </>
                )}
              </button>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
              >
                {errorMsg}
              </div>
            )}
          </div>

          {/* Framing & Extension Controls */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-50">
                2. Framing &amp; Outpaint Style
              </h2>
              <SlidersHorizontal
                className="h-4 w-4 text-slate-400 dark:text-slate-500"
                aria-hidden="true"
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {BACKDROP_MODES.map((mode) => {
                const active = backdropMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setBackdropMode(mode.id)}
                    className={`rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950/50 dark:text-blue-300'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    {mode.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2.5 text-xs text-slate-500 dark:text-slate-400">
              {BACKDROP_MODES.find((m) => m.id === backdropMode)?.hint}
            </p>

            {/* Safe Padding Margin Slider */}
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs">
                <label
                  htmlFor="safe-margin"
                  className="font-medium text-slate-700 dark:text-slate-300"
                >
                  Product Safe Padding
                </label>
                <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400">
                  {marginPercent}%
                </span>
              </div>
              <input
                id="safe-margin"
                type="range"
                min={6}
                max={20}
                step={1}
                value={marginPercent}
                onChange={(e) => setMarginPercent(Number(e.target.value))}
                className="mt-2 w-full accent-blue-600"
              />
            </div>

            {/* Export File Format */}
            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Export File Format
              </span>
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-950">
                {(['image/png', 'image/jpeg'] as const).map((fmt) => {
                  const active = exportFormat === fmt;
                  return (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setExportFormat(fmt)}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      {fmt === 'image/png' ? 'PNG' : 'JPG'}
                    </button>
                  );
                })}
              </div>
            </div>

            {seoData?.visualAnalysis && (
              <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  AI Detected Palette
                </p>
                <div className="mt-2 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="h-3.5 w-3.5 rounded-sm border border-slate-300 dark:border-slate-700"
                      style={{ backgroundColor: seoData.visualAnalysis.dominantEdgeColor }}
                    />
                    <span className="font-mono">{seoData.visualAnalysis.dominantEdgeColor}</span>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{seoData.visualAnalysis.productCategory}</span>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Right Main Viewport (8 cols) */}
        <section className="lg:col-span-8 min-w-0 space-y-10">
          {/* Resized Assets Section */}
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-50">
                  Platform-Ready Resized Images
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  5 exact social dimensions · 100% uncropped product preservation
                </p>
              </div>

              {loadedImageEl && (
                <button
                  type="button"
                  onClick={downloadAll}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 whitespace-nowrap shrink-0 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  Download All (5)
                </button>
              )}
            </div>

            {!loadedImageEl ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-900">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                  <ImagePlus className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="font-display mt-4 text-base font-semibold text-slate-900 dark:text-slate-100">
                  No product image loaded yet
                </h3>
                <p className="mt-1.5 max-w-md text-sm text-slate-500 dark:text-slate-400">
                  Upload your product image on the left to automatically compose YouTube (16:9),
                  TikTok (9:16), Instagram (1:1 &amp; 4:5), and Pinterest (2:3) canvases without
                  cropping.
                </p>
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 whitespace-nowrap dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  Load Sample Handbag
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {PLATFORM_SPECS.map((spec) => {
                  const dataUrl = renderedOutputs[spec.id];
                  return (
                    <motion.article
                      key={spec.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18 }}
                      className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div>
                        <div className="flex items-baseline justify-between gap-2">
                          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {spec.platform}
                          </h3>
                          <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                            {spec.width}×{spec.height}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {spec.formatLabel} · {spec.aspectLabel}
                        </p>

                        {/* Canvas Output Preview */}
                        <div className="mt-3 flex h-52 items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-slate-100/70 p-2 dark:border-slate-800 dark:bg-slate-950">
                          {dataUrl ? (
                            <button
                              type="button"
                              onClick={() => setPreviewModalSpec(spec)}
                              aria-label={`Inspect ${spec.platform} ${spec.aspectLabel} output`}
                              className="group relative flex h-full w-full items-center justify-center focus-visible:outline-2 focus-visible:outline-blue-600"
                            >
                              <img
                                src={dataUrl}
                                alt={`${spec.platform} ${spec.aspectLabel} resized preview`}
                                className="max-h-full max-w-full rounded-sm object-contain shadow-xs transition-transform duration-150 group-hover:scale-[1.02]"
                              />
                              <span className="absolute right-1.5 bottom-1.5 inline-flex items-center gap-1 rounded-md bg-slate-900/75 px-2 py-1 text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                                <Maximize2 className="h-3 w-3" aria-hidden="true" />
                                Inspect
                              </span>
                            </button>
                          ) : (
                            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                          )}
                        </div>
                      </div>

                      <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {exportFormat === 'image/png' ? 'PNG' : 'JPG'} Ready
                        </span>
                        <button
                          type="button"
                          onClick={() => downloadSingle(spec)}
                          disabled={!dataUrl}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap shrink-0 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                        >
                          <Download className="h-3.5 w-3.5" aria-hidden="true" />
                          Download
                        </button>
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            )}
          </div>

          {/* AI SEO Content Generator Section */}
          <div className="border-t border-slate-200 pt-8 dark:border-slate-800">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-50">
                  AI Multi-Platform SEO Copy
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Platform-tailored titles, descriptions, and discovery hashtags
                </p>
              </div>

              {seoData && (
                <div
                  role="tablist"
                  aria-label="Filter SEO by platform"
                  className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-900"
                >
                  {(
                    [
                      { id: 'all', label: 'All' },
                      { id: 'youtube', label: 'YouTube' },
                      { id: 'tiktok', label: 'TikTok' },
                      { id: 'instagram', label: 'Instagram' },
                      { id: 'pinterest', label: 'Pinterest' },
                    ] as const
                  ).map((tab) => {
                    const active = seoFilter === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setSeoFilter(tab.id)}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100'
                            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {isGenerating ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {SEO_PLATFORMS.map((p) => (
                  <div
                    key={p.key}
                    className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-center justify-between">
                      <div className="h-5 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                      <div className="h-7 w-24 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                    </div>
                    <div className="mt-5 space-y-3">
                      <div className="h-10 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                      <div className="h-24 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                      <div className="h-12 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !seoData ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Ready to generate tailored SEO copy
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Enter a product title and click &ldquo;Generate Assets &amp; SEO&rdquo; to
                  create titles, descriptions, and hashtags for YouTube, TikTok, Instagram, and
                  Pinterest.
                </p>
                {loadedImageEl && (
                  <button
                    type="button"
                    onClick={handleGenerate}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 whitespace-nowrap dark:bg-blue-500 dark:hover:bg-blue-600"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    Generate SEO Now
                  </button>
                )}
              </div>
            ) : (
              <div
                className={`grid grid-cols-1 gap-5 ${
                  visibleSeoPlatforms.length > 1 ? 'md:grid-cols-2' : ''
                }`}
              >
                {visibleSeoPlatforms.map((platform) => {
                  const block = seoData.seo[platform.key];
                  const hashtagsText = block.hashtags.join(' ');
                  const fullKey = `${platform.key}-full`;
                  const titleKey = `${platform.key}-title`;
                  const descKey = `${platform.key}-desc`;
                  const tagsKey = `${platform.key}-tags`;

                  return (
                    <motion.article
                      key={platform.key}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18 }}
                      className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3.5 dark:border-slate-800">
                        <div>
                          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-50">
                            {platform.label}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {platform.specNote}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(fullKey, formatFullPlatformCopy(platform.label, block))
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          {copiedKey === fullKey ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                              Copied All
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                              Copy Pack
                            </>
                          )}
                        </button>
                      </div>

                      <div className="mt-4 space-y-4">
                        {/* Title */}
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              SEO Title ·{' '}
                              <span className="font-mono tabular-nums">
                                {block.title.length} chars
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(titleKey, block.title)}
                              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 whitespace-nowrap dark:text-blue-400 dark:hover:bg-blue-950/50"
                            >
                              {copiedKey === titleKey ? (
                                <>
                                  <Check className="h-3 w-3" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" aria-hidden="true" />
                                  Copy
                                </>
                              )}
                            </button>
                          </div>
                          <p className="mt-1 text-sm font-medium leading-snug text-slate-900 dark:text-slate-100">
                            {block.title}
                          </p>
                        </div>

                        {/* Description */}
                        <div className="border-t border-slate-100 pt-3.5 dark:border-slate-800">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              Description
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(descKey, block.description)}
                              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 whitespace-nowrap dark:text-blue-400 dark:hover:bg-blue-950/50"
                            >
                              {copiedKey === descKey ? (
                                <>
                                  <Check className="h-3 w-3" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" aria-hidden="true" />
                                  Copy
                                </>
                              )}
                            </button>
                          </div>
                          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                            {block.description}
                          </p>
                        </div>

                        {/* Hashtags */}
                        <div className="border-t border-slate-100 pt-3.5 dark:border-slate-800">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              Hashtags ·{' '}
                              <span className="font-mono tabular-nums">
                                {block.hashtags.length}
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(tagsKey, hashtagsText)}
                              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 whitespace-nowrap dark:text-blue-400 dark:hover:bg-blue-950/50"
                            >
                              {copiedKey === tagsKey ? (
                                <>
                                  <Check className="h-3 w-3" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" aria-hidden="true" />
                                  Copy
                                </>
                              )}
                            </button>
                          </div>
                          <p className="mt-1.5 font-mono text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                            {hashtagsText}
                          </p>
                        </div>
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Inspect Resized Output Modal */}
      <AnimatePresence>
        {previewModalSpec && renderedOutputs[previewModalSpec.id] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setPreviewModalSpec(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs"
          >
            <motion.div
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 dark:border-slate-800">
                <div>
                  <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-50">
                    {previewModalSpec.platform} · {previewModalSpec.formatLabel}
                  </h3>
                  <p className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                    {previewModalSpec.width} × {previewModalSpec.height} px ({previewModalSpec.aspectLabel})
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => downloadSingle(previewModalSpec)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 whitespace-nowrap dark:bg-blue-500 dark:hover:bg-blue-600"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewModalSpec(null)}
                    aria-label="Close preview"
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 flex max-h-[70vh] items-center justify-center overflow-hidden rounded-lg bg-slate-100 p-4 dark:bg-slate-950">
                <img
                  src={renderedOutputs[previewModalSpec.id]}
                  alt={`${previewModalSpec.platform} full preview`}
                  className="max-h-[62vh] max-w-full rounded object-contain shadow-sm"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
