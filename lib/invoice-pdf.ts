import { jsPDF } from 'jspdf';
import type { InvoiceData } from '@/lib/types';

export function formatMoney(amount: number, currency: string): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safeAmount);
  } catch {
    return `${currency || 'USD'} ${safeAmount.toFixed(2)}`;
  }
}

export function calculateInvoiceTotals(data: InvoiceData) {
  const subtotal = data.items.reduce(
    (sum, item) => sum + Math.max(0, item.quantity) * Math.max(0, item.unitPrice),
    0
  );
  const rawDiscount =
    data.discountType === 'percent'
      ? subtotal * (Math.max(0, Math.min(100, data.discountValue)) / 100)
      : Math.max(0, data.discountValue);
  const discountAmount = Math.min(subtotal, rawDiscount);
  const taxableBase = Math.max(0, subtotal - discountAmount);
  const taxAmount = taxableBase * (Math.max(0, data.taxPercent) / 100);
  const shipping = Math.max(0, data.shipping);
  const grandTotal = taxableBase + taxAmount + shipping;

  return {
    subtotal,
    discountAmount,
    taxAmount,
    shipping,
    grandTotal,
  };
}

async function loadImageDimensions(
  dataUrl: string
): Promise<{ width: number; height: number; format: 'PNG' | 'JPEG' }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const format = dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      resolve({
        width: img.naturalWidth || 100,
        height: img.naturalHeight || 100,
        format,
      });
    };
    img.onerror = () => resolve({ width: 100, height: 100, format: 'JPEG' });
    img.src = dataUrl;
  });
}

export async function exportInvoiceToPdf(data: InvoiceData): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  const template = data.template || 'modern';
  const headingFont = template === 'classic' ? 'times' : 'helvetica';
  let y = 18;

  // Modern template top cobalt accent stripe
  if (template === 'modern') {
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 4, 'F');
    y = 20;
  }

  // Header Left: Brand Logo + Brand Name & Contact
  let logoOffsetX = margin;
  if (data.brandLogo) {
    try {
      const meta = await loadImageDimensions(data.brandLogo);
      const maxLogoH = 16;
      const maxLogoW = 28;
      const ratio = Math.min(maxLogoW / meta.width, maxLogoH / meta.height);
      const drawW = meta.width * ratio;
      const drawH = meta.height * ratio;
      doc.addImage(data.brandLogo, meta.format, margin, y, drawW, drawH);
      logoOffsetX = margin + drawW + 4;
    } catch {
      logoOffsetX = margin;
    }
  }

  doc.setTextColor(15, 23, 42);
  doc.setFont(headingFont, 'bold');
  doc.setFontSize(template === 'minimalist' ? 14 : 15);
  doc.text(data.brandName || 'Your Brand Name', logoOffsetX, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const brandMetaLines: string[] = [];
  if (data.brandEmail) brandMetaLines.push(data.brandEmail);
  if (data.brandPhone) brandMetaLines.push(data.brandPhone);
  if (data.brandAddress) {
    const wrappedAddr = doc.splitTextToSize(data.brandAddress, 75) as string[];
    brandMetaLines.push(...wrappedAddr);
  }
  brandMetaLines.forEach((line, idx) => {
    doc.text(line, logoOffsetX, y + 10 + idx * 4.2);
  });

  // Header Right: INVOICE Title + Metadata
  if (template === 'modern') {
    doc.setTextColor(37, 99, 235);
  } else {
    doc.setTextColor(15, 23, 42);
  }
  doc.setFont(headingFont, template === 'minimalist' ? 'normal' : 'bold');
  doc.setFontSize(template === 'classic' ? 22 : 20);
  doc.text('INVOICE', pageWidth - margin, y + 6, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Invoice #: ${data.invoiceNumber || 'INV-001'}`, pageWidth - margin, y + 13, {
    align: 'right',
  });
  doc.text(`Issued: ${data.issueDate || '—'}`, pageWidth - margin, y + 18, {
    align: 'right',
  });
  if (data.dueDate) {
    doc.text(`Due Date: ${data.dueDate}`, pageWidth - margin, y + 23, {
      align: 'right',
    });
  }

  y = Math.max(y + 12 + brandMetaLines.length * 4.2, y + 28) + 6;

  // Header Divider per preset
  if (template === 'classic') {
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.7);
    doc.line(margin, y, pageWidth - margin, y);
    doc.setLineWidth(0.2);
    doc.line(margin, y + 1.4, pageWidth - margin, y + 1.4);
    y += 9;
  } else if (template === 'minimalist') {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);
    y += 9;
  } else {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.35);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
  }

  // Billed To Section
  if (template === 'classic') {
    // Classic boxed 2-column ledger info
    const boxStartY = y;
    const halfW = contentWidth / 2 - 2;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.rect(margin, boxStartY, halfW, 26);
    doc.rect(margin + halfW + 4, boxStartY, halfW, 26);

    doc.setFont('times', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('BILL TO', margin + 4, boxStartY + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(data.clientName || 'Client Name', margin + 4, boxStartY + 11.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    if (data.clientPhone) doc.text(data.clientPhone, margin + 4, boxStartY + 16.5);
    if (data.clientAddress) {
      const addrLines = doc.splitTextToSize(data.clientAddress, halfW - 8) as string[];
      addrLines.slice(0, 2).forEach((line, idx) => {
        doc.text(line, margin + 4, boxStartY + 21 + idx * 4);
      });
    }

    const rightBoxX = margin + halfW + 8;
    doc.setFont('times', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('INVOICE SUMMARY', rightBoxX, boxStartY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text(`Currency: ${data.currency}`, rightBoxX, boxStartY + 11.5);
    doc.text(`Payment: ${data.paymentMethod || 'Standard'}`, rightBoxX, boxStartY + 16.5);
    doc.text(`Reference: ${data.invoiceNumber || '—'}`, rightBoxX, boxStartY + 21.5);

    y = boxStartY + 34;
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(template === 'modern' ? 37 : 100, template === 'modern' ? 99 : 116, template === 'modern' ? 235 : 139);
    doc.text('BILLED TO', margin, y);
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(data.clientName || 'Client Name', margin, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    if (data.clientPhone) {
      doc.text(data.clientPhone, margin, y);
      y += 4.5;
    }
    if (data.clientAddress) {
      const clientAddrLines = doc.splitTextToSize(data.clientAddress, 110) as string[];
      clientAddrLines.forEach((line) => {
        doc.text(line, margin, y);
        y += 4.5;
      });
    }
    y += 8;
  }

  // Table Header
  const colItemX = margin + 3;
  const colQtyX = margin + 108;
  const colPriceX = margin + 142;
  const colTotalX = pageWidth - margin - 3;

  if (template === 'classic') {
    doc.setFillColor(30, 41, 59);
    doc.rect(margin, y, contentWidth, 9, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('times', 'bold');
  } else if (template === 'minimalist') {
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.line(margin, y + 8.5, pageWidth - margin, y + 8.5);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
  } else {
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 9, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageWidth - margin, y);
    doc.line(margin, y + 9, pageWidth - margin, y + 9);
    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'bold');
  }

  doc.setFontSize(8.5);
  doc.text('ITEM / DESCRIPTION', colItemX, y + 5.8);
  doc.text('QTY', colQtyX, y + 5.8, { align: 'right' });
  doc.text('UNIT PRICE', colPriceX, y + 5.8, { align: 'right' });
  doc.text('AMOUNT', colTotalX, y + 5.8, { align: 'right' });
  y += 13;

  // Table Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);

  for (const item of data.items) {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    const nameLines = doc.splitTextToSize(item.name || 'Untitled Item', 90) as string[];
    const rowHeight = Math.max(7.5, nameLines.length * 4.8 + 3);
    const lineTotal = Math.max(0, item.quantity) * Math.max(0, item.unitPrice);

    doc.setTextColor(15, 23, 42);
    nameLines.forEach((line, idx) => {
      doc.text(line, colItemX, y + idx * 4.8);
    });

    doc.text(String(item.quantity), colQtyX, y, { align: 'right' });
    doc.text(formatMoney(item.unitPrice, data.currency), colPriceX, y, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(formatMoney(lineTotal, data.currency), colTotalX, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    if (template === 'classic') {
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.2);
      doc.rect(margin, y - 4, contentWidth, rowHeight);
    } else {
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.2);
      doc.line(margin, y + rowHeight - 4.5, pageWidth - margin, y + rowHeight - 4.5);
    }

    y += rowHeight;
  }

  y += 6;

  // Totals Block (Right Aligned)
  const totals = calculateInvoiceTotals(data);
  const labelX = pageWidth - margin - 56;
  const valX = pageWidth - margin - 3;

  const drawSummaryRow = (label: string, value: string, bold = false, accent = false) => {
    doc.setFont(headingFont, bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 11 : 9.5);
    if (accent) {
      doc.setTextColor(37, 99, 235);
    } else {
      doc.setTextColor(bold ? 15 : 71, bold ? 23 : 85, bold ? 42 : 105);
    }
    doc.text(label, labelX, y);
    doc.text(value, valX, y, { align: 'right' });
    y += bold ? 7 : 5.5;
  };

  drawSummaryRow('Subtotal', formatMoney(totals.subtotal, data.currency));
  if (totals.discountAmount > 0) {
    const discountLabel =
      data.discountType === 'percent' ? `Discount (${data.discountValue}%)` : 'Discount';
    drawSummaryRow(discountLabel, `-${formatMoney(totals.discountAmount, data.currency)}`);
  }
  if (data.taxPercent > 0) {
    drawSummaryRow(`Tax (${data.taxPercent}%)`, formatMoney(totals.taxAmount, data.currency));
  }
  if (totals.shipping > 0) {
    drawSummaryRow('Shipping / Delivery', formatMoney(totals.shipping, data.currency));
  }

  doc.setDrawColor(template === 'classic' ? 30 : 203, template === 'classic' ? 41 : 213, template === 'classic' ? 59 : 225);
  doc.line(labelX, y - 1, pageWidth - margin, y - 1);
  y += 5;
  drawSummaryRow(
    'Total Due',
    formatMoney(totals.grandTotal, data.currency),
    true,
    template === 'modern'
  );

  y += 8;

  // Payment & Notes
  if (data.paymentMethod || data.notes) {
    if (y > 255) {
      doc.addPage();
      y = 20;
    }
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageWidth - margin, y);
    y += 7;

    if (data.paymentMethod) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text('PAYMENT METHOD', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(data.paymentMethod, margin, y + 5);
      y += 12;
    }

    if (data.notes) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text('NOTES & TERMS', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      const notesLines = doc.splitTextToSize(data.notes, contentWidth) as string[];
      notesLines.forEach((line, idx) => {
        doc.text(line, margin, y + 5 + idx * 4.3);
      });
    }
  }

  const safeFileNum = (data.invoiceNumber || 'Invoice').replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`${safeFileNum}-${template}.pdf`);
}
