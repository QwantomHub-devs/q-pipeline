import { NextRequest, NextResponse } from 'next/server';
import { ingestQuizWebhook } from '@/modules/assessment/service';

export async function POST(req: NextRequest) {
  try {
    const secretHeader = req.headers.get('x-qpipeline-webhook-secret');
    const body = await req.json();

    const record = await ingestQuizWebhook(body, secretHeader);
    return NextResponse.json({ success: true, data: record });
  } catch (err: any) {
    const status = err.message?.includes('Unauthorized') ? 401 : 400;
    return NextResponse.json(
      { success: false, error: err.message || 'Quiz webhook processing failed' },
      { status }
    );
  }
}
