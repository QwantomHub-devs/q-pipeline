import { NextResponse } from 'next/server';
import { processPaystackWebhookEvent } from '@/modules/payout/payout-service';

/**
 * Route Handler: Paystack Webhook Handler (`/api/webhooks/paystack`)
 * Verifies x-paystack-signature HMAC SHA512 header and processes transfer status updates
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-paystack-signature') || undefined;

    const result = await processPaystackWebhookEvent(rawBody, signature);
    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error('Paystack webhook processing error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Webhook verification failed' },
      { status: 400 }
    );
  }
}
