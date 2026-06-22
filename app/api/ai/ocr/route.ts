import { NextResponse } from 'next/server';
import { processReceiptImage } from '@/lib/gemini';

export async function POST(request: Request) {
  try {
    const { image, mimeType } = await request.json();

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Call real Gemini AI OCR
    const result = await processReceiptImage(image, mimeType || 'image/jpeg');

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("AI OCR Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
