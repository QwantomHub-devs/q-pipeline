import { NextResponse } from 'next/server';
import { processDocumensoWebhook } from '@/modules/contracts/service';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get('x-documenso-signature') || undefined;

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (err) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const result = await processDocumensoWebhook(payload, signatureHeader);
    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error('Documenso Webhook Processing Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Webhook Error' }, { status: 400 });
  }
}
