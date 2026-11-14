import { NextRequest, NextResponse } from 'next/server';
import { Type, ThinkingLevel } from '@google/genai';
import { getGeminiClient } from '@/lib/gemini';
import type { MediaSeoResponse } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const productTitle = typeof body.productTitle === 'string' ? body.productTitle.trim() : '';
    const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64 : '';
    const mimeType = typeof body.mimeType === 'string' ? body.mimeType : 'image/jpeg';

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'Please upload a product image before generating.' },
        { status: 400 }
      );
    }

    const ai = getGeminiClient();

    const cleanBase64 = imageBase64.includes(',')
      ? imageBase64.split(',')[1]
      : imageBase64;

    const promptText = `You are a senior e-commerce creative director and multi-platform SEO strategist.
Analyze the attached product image and the user's product title: "${productTitle || 'Featured Product'}".

1. Visual & Backdrop Analysis (for seamless aspect-ratio extension):
   - Identify the productCategory (2-4 words).
   - Provide dominantEdgeColor as a valid 6-digit hex color matching the outer perimeter/background of the photo.
   - Provide secondaryStudioColor as a harmonious 6-digit hex color slightly deeper or warmer/cooler for an editorial backdrop gradient.
   - Set isDarkBackground true if the image backdrop is dark, false if light/neutral.
   - Provide shadowTone as a subtle 6-digit hex color suitable for soft ground shadow.

2. Platform-Specific High-Converting SEO Content:
   Generate tailored, authentic, keyword-rich copy for:
   - YouTube: Click-worthy searchable title (max 70 chars), detailed keyword-rich video/Shorts description with value props and CTA, and 8-10 relevant hashtags (without duplicates, each starting with #).
   - TikTok: Punchy hook-driven caption/title (max 80 chars), engaging short-form description with discovery keywords, and 6-8 trending niche hashtags (starting with #).
   - Instagram: Polished editorial headline/hook (max 80 chars), scroll-stopping caption highlighting craft, use case, and call to action, and 10-12 curated hashtags (starting with #).
   - Pinterest: Search-intent pin title (max 90 chars), descriptive SEO pin narrative with buyer keywords and style inspiration, and 6-8 searchable hashtags/tags (starting with #).

Keep copy natural, grounded in what is actually visible in the product image, and free of exaggerated hype or placeholder text.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: cleanBase64,
            },
          },
          {
            text: promptText,
          },
        ],
      },
      config: {
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            visualAnalysis: {
              type: Type.OBJECT,
              properties: {
                productCategory: { type: Type.STRING },
                dominantEdgeColor: { type: Type.STRING },
                secondaryStudioColor: { type: Type.STRING },
                isDarkBackground: { type: Type.BOOLEAN },
                shadowTone: { type: Type.STRING },
              },
              required: [
                'productCategory',
                'dominantEdgeColor',
                'secondaryStudioColor',
                'isDarkBackground',
                'shadowTone',
              ],
            },
            seo: {
              type: Type.OBJECT,
              properties: {
                youtube: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                  required: ['title', 'description', 'hashtags'],
                },
                tiktok: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                  required: ['title', 'description', 'hashtags'],
                },
                instagram: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                  required: ['title', 'description', 'hashtags'],
                },
                pinterest: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                  required: ['title', 'description', 'hashtags'],
                },
              },
              required: ['youtube', 'tiktok', 'instagram', 'pinterest'],
            },
          },
          required: ['visualAnalysis', 'seo'],
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

    const parsed = JSON.parse(rawText) as MediaSeoResponse;
    return NextResponse.json(parsed);
  } catch (err) {
    console.error('Error in /api/media-seo:', err);
    const message =
      err instanceof Error ? err.message : 'Failed to analyze image and generate SEO content.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
