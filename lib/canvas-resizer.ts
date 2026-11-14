import type { BackdropMode, MediaSeoResponse, PlatformFormatSpec } from '@/lib/types';

interface EdgeSample {
  top: string;
  bottom: string;
  left: string;
  right: string;
  avg: string;
  isDark: boolean;
}

function sampleImageEdges(img: HTMLImageElement): EdgeSample {
  const sampleSize = 64;
  const offscreen = document.createElement('canvas');
  offscreen.width = sampleSize;
  offscreen.height = sampleSize;
  const ctx = offscreen.getContext('2d');
  if (!ctx) {
    return {
      top: '#f4f4f5',
      bottom: '#e4e4e7',
      left: '#f4f4f5',
      right: '#f4f4f5',
      avg: '#f4f4f5',
      isDark: false,
    };
  }

  ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
  const data = ctx.getImageData(0, 0, sampleSize, sampleSize).data;

  const avgRegion = (
    xStart: number,
    xEnd: number,
    yStart: number,
    yEnd: number
  ): [number, number, number] => {
    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;
    for (let y = yStart; y < yEnd; y++) {
      for (let x = xStart; x < xEnd; x++) {
        const idx = (y * sampleSize + x) * 4;
        r += data[idx];
        g += data[idx + 1];
        b += data[idx + 2];
        count++;
      }
    }
    if (count === 0) return [244, 244, 245];
    return [Math.round(r / count), Math.round(g / count), Math.round(b / count)];
  };

  const toHex = ([r, g, b]: [number, number, number]) =>
    `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;

  const topRgb = avgRegion(0, sampleSize, 0, 3);
  const bottomRgb = avgRegion(0, sampleSize, sampleSize - 3, sampleSize);
  const leftRgb = avgRegion(0, 3, 0, sampleSize);
  const rightRgb = avgRegion(sampleSize - 3, sampleSize, 0, sampleSize);

  const avgRgb: [number, number, number] = [
    Math.round((topRgb[0] + bottomRgb[0] + leftRgb[0] + rightRgb[0]) / 4),
    Math.round((topRgb[1] + bottomRgb[1] + leftRgb[1] + rightRgb[1]) / 4),
    Math.round((topRgb[2] + bottomRgb[2] + leftRgb[2] + rightRgb[2]) / 4),
  ];

  const luminance = (0.299 * avgRgb[0] + 0.587 * avgRgb[1] + 0.114 * avgRgb[2]) / 255;

  return {
    top: toHex(topRgb),
    bottom: toHex(bottomRgb),
    left: toHex(leftRgb),
    right: toHex(rightRgb),
    avg: toHex(avgRgb),
    isDark: luminance < 0.45,
  };
}

function drawFeatheredSource(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  featherPx: number
) {
  if (featherPx <= 0) {
    ctx.drawImage(img, dx, dy, dw, dh);
    return;
  }

  const temp = document.createElement('canvas');
  temp.width = Math.max(1, Math.round(dw));
  temp.height = Math.max(1, Math.round(dh));
  const tctx = temp.getContext('2d');
  if (!tctx) {
    ctx.drawImage(img, dx, dy, dw, dh);
    return;
  }

  tctx.drawImage(img, 0, 0, temp.width, temp.height);

  // Soft edge-only alpha feather on the outermost perimeter so studio backdrops melt invisibly
  tctx.globalCompositeOperation = 'destination-in';

  // Horizontal mask
  const hGrad = tctx.createLinearGradient(0, 0, temp.width, 0);
  const fx = Math.min(0.06, featherPx / temp.width);
  hGrad.addColorStop(0, 'rgba(0,0,0,0)');
  hGrad.addColorStop(fx, 'rgba(0,0,0,1)');
  hGrad.addColorStop(1 - fx, 'rgba(0,0,0,1)');
  hGrad.addColorStop(1, 'rgba(0,0,0,0)');
  tctx.fillStyle = hGrad;
  tctx.fillRect(0, 0, temp.width, temp.height);

  // Vertical mask
  const vGrad = tctx.createLinearGradient(0, 0, 0, temp.height);
  const fy = Math.min(0.06, featherPx / temp.height);
  vGrad.addColorStop(0, 'rgba(0,0,0,0)');
  vGrad.addColorStop(fy, 'rgba(0,0,0,1)');
  vGrad.addColorStop(1 - fy, 'rgba(0,0,0,1)');
  vGrad.addColorStop(1, 'rgba(0,0,0,0)');
  tctx.fillStyle = vGrad;
  tctx.fillRect(0, 0, temp.width, temp.height);

  ctx.drawImage(temp, dx, dy, dw, dh);
}

export interface RenderOptions {
  spec: PlatformFormatSpec;
  image: HTMLImageElement;
  mode: BackdropMode;
  marginRatio: number; // e.g. 0.08 to 0.20
  visualAnalysis?: MediaSeoResponse['visualAnalysis'] | null;
  format?: 'image/png' | 'image/jpeg';
}

export function renderResizedProductCanvas(options: RenderOptions): string {
  const { spec, image, mode, marginRatio, visualAnalysis, format = 'image/png' } = options;
  const { width: targetW, height: targetH } = spec;

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const edge = sampleImageEdges(image);
  const isDark = visualAnalysis ? visualAnalysis.isDarkBackground : edge.isDark;
  const primaryColor = visualAnalysis?.dominantEdgeColor || edge.avg;
  const secondaryColor = visualAnalysis?.secondaryStudioColor || edge.bottom;

  // Compute safe bounding box guaranteeing 100% uncropped product visibility
  const safeMargin = Math.max(0.04, Math.min(0.24, marginRatio));
  const availW = targetW * (1 - 2 * safeMargin);
  const availH = targetH * (1 - 2 * safeMargin);
  const scale = Math.min(availW / image.naturalWidth, availH / image.naturalHeight);
  const drawW = image.naturalWidth * scale;
  const drawH = image.naturalHeight * scale;
  const drawX = (targetW - drawW) / 2;
  const drawY = (targetH - drawH) / 2;

  if (mode === 'seamless-edge') {
    // 1. Paint base studio gradient matching actual top->bottom edge colors
    const bgGrad = ctx.createLinearGradient(0, 0, 0, targetH);
    bgGrad.addColorStop(0, edge.top);
    bgGrad.addColorStop(0.5, edge.avg);
    bgGrad.addColorStop(1, edge.bottom);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, targetW, targetH);

    // 2. Horizontal edge color blend
    const sideGrad = ctx.createLinearGradient(0, 0, targetW, 0);
    sideGrad.addColorStop(0, edge.left);
    sideGrad.addColorStop(0.25, 'rgba(0,0,0,0)');
    sideGrad.addColorStop(0.75, 'rgba(0,0,0,0)');
    sideGrad.addColorStop(1, edge.right);
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = sideGrad;
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.restore();

    // 3. Soft blurred reflected outer-strip outpainting for natural lighting continuity
    ctx.save();
    ctx.filter = 'blur(54px)';
    ctx.globalAlpha = 0.55;
    // Draw slightly oversized mirrored extensions behind the product
    const coverScale = Math.max(targetW / image.naturalWidth, targetH / image.naturalHeight) * 1.12;
    const cw = image.naturalWidth * coverScale;
    const ch = image.naturalHeight * coverScale;
    ctx.drawImage(image, (targetW - cw) / 2, (targetH - ch) / 2, cw, ch);
    ctx.restore();

    // 4. Re-tint softly toward the edge palette so outer backdrop feels cohesive
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.restore();

    // 5. Draw full uncropped product with subtle perimeter feathering
    const feather = Math.round(Math.min(drawW, drawH) * 0.025);
    drawFeatheredSource(ctx, image, drawX, drawY, drawW, drawH, feather);
  } else if (mode === 'ambient-blur') {
    const coverScale = Math.max(targetW / image.naturalWidth, targetH / image.naturalHeight) * 1.15;
    const cw = image.naturalWidth * coverScale;
    const ch = image.naturalHeight * coverScale;

    ctx.save();
    ctx.filter = 'blur(44px)';
    ctx.drawImage(image, (targetW - cw) / 2, (targetH - ch) / 2, cw, ch);
    ctx.restore();

    // Subtle balanced scrim for separation
    ctx.fillStyle = isDark ? 'rgba(9, 13, 22, 0.35)' : 'rgba(255, 255, 255, 0.25)';
    ctx.fillRect(0, 0, targetW, targetH);

    // Crisp drop shadow + uncropped foreground product
    ctx.save();
    ctx.shadowColor = 'rgba(15, 23, 42, 0.22)';
    ctx.shadowBlur = Math.round(Math.min(targetW, targetH) * 0.045);
    ctx.shadowOffsetY = Math.round(Math.min(targetW, targetH) * 0.015);
    ctx.drawImage(image, drawX, drawY, drawW, drawH);
    ctx.restore();
  } else if (mode === 'editorial-mat') {
    const radGrad = ctx.createRadialGradient(
      targetW * 0.5,
      targetH * 0.44,
      Math.min(targetW, targetH) * 0.08,
      targetW * 0.5,
      targetH * 0.5,
      Math.max(targetW, targetH) * 0.75
    );
    radGrad.addColorStop(0, primaryColor);
    radGrad.addColorStop(1, secondaryColor);
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, targetW, targetH);

    ctx.save();
    ctx.shadowColor = isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(15, 23, 42, 0.14)';
    ctx.shadowBlur = Math.round(Math.min(targetW, targetH) * 0.04);
    ctx.shadowOffsetY = Math.round(Math.min(targetW, targetH) * 0.014);
    drawFeatheredSource(
      ctx,
      image,
      drawX,
      drawY,
      drawW,
      drawH,
      Math.round(Math.min(drawW, drawH) * 0.015)
    );
    ctx.restore();
  } else {
    // clean-studio
    ctx.fillStyle = isDark ? '#0f172a' : '#f8fafc';
    ctx.fillRect(0, 0, targetW, targetH);

    ctx.save();
    ctx.shadowColor = isDark ? 'rgba(0, 0, 0, 0.45)' : 'rgba(15, 23, 42, 0.10)';
    ctx.shadowBlur = Math.round(Math.min(targetW, targetH) * 0.035);
    ctx.shadowOffsetY = Math.round(Math.min(targetW, targetH) * 0.012);
    ctx.drawImage(image, drawX, drawY, drawW, drawH);
    ctx.restore();
  }

  return canvas.toDataURL(format, 0.94);
}
