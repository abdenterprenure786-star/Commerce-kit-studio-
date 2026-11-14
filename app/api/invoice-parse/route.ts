import { NextRequest, NextResponse } from 'next/server';
import { Type, ThinkingLevel } from '@google/genai';
import { getGeminiClient } from '@/lib/gemini';
import type { ParsedInvoiceResult } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const defaultCurrency =
      typeof body.defaultCurrency === 'string' && body.defaultCurrency.trim()
        ? body.defaultCurrency.trim()
        : 'USD';

    if (!prompt) {
      return NextResponse.json(
        { error: 'Please enter order details for AI to extract.' },
        { status: 400 }
      );
    }

    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Extract structured invoice details from the following unstructured order message.
If a field is not mentioned, return an empty string "" for text fields or 0 for numeric fields.
For currency, infer ISO 3-letter code like PKR, USD, EUR, GBP, AED, SAR, CAD, AUD if mentioned, otherwise use "${defaultCurrency}".
For discount: if a percentage discount is stated (e.g. "10% off" or "5% discount"), set discountType to "percent" and discountValue to the number (e.g. 10 or 5). If a flat amount discount is stated (e.g. "500 off"), set discountType to "fixed" and discountValue to 500. Otherwise set discountType to "fixed" and discountValue to 0.
For items, extract each product/service with its name, quantity (default 1 if omitted), and unitPrice (if only a line total is clearly stated for N items, divide to get unitPrice; if unit price is stated like "at 3500 each", use 3500).

Order Message:
"""
${prompt}
"""`,
      config: {
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            clientName: { type: Type.STRING },
            clientPhone: { type: Type.STRING },
            clientAddress: { type: Type.STRING },
            currency: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unitPrice: { type: Type.NUMBER },
                },
                required: ['name', 'quantity', 'unitPrice'],
              },
            },
            taxPercent: { type: Type.NUMBER },
            discountType: { type: Type.STRING },
            discountValue: { type: Type.NUMBER },
            shipping: { type: Type.NUMBER },
            paymentMethod: { type: Type.STRING },
            notes: { type: Type.STRING },
          },
          required: [
            'clientName',
            'clientPhone',
            'clientAddress',
            'currency',
            'items',
            'taxPercent',
            'discountType',
            'discountValue',
            'shipping',
            'paymentMethod',
            'notes',
          ],
        },
      },
    });

    const rawText = (response.text ?? '').trim();
    if (!rawText) {
      return NextResponse.json(
        { error: 'Gemini returned an empty response. Please try again.' },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(rawText) as ParsedInvoiceResult;
    // Normalize discountType
    if (parsed.discountType !== 'percent' && parsed.discountType !== 'fixed') {
      parsed.discountType = 'fixed';
    }
    return NextResponse.json(parsed);
  } catch (err) {
    console.error('Error in /api/invoice-parse:', err);
    const message =
      err instanceof Error ? err.message : 'Failed to parse order text into invoice fields.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
