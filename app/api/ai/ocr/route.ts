import { NextResponse } from 'next/server';
import { processReceiptWithFallback } from '@/lib/ocr';

export async function POST(request: Request) {
  try {
    const { image, mimeType } = await request.json();

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const result = await processReceiptWithFallback(image, mimeType || 'image/jpeg');

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "AI OCR Error";
    console.error("AI OCR Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
