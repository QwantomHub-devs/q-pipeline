import { NextRequest, NextResponse } from 'next/server';
import { ingestSandboxTelemetry } from '@/modules/assessment/module2-service';
import { AuthActor } from '@/modules/identity/types';

const EXPECTED_WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'qpipeline-test-webhook-secret';

export async function POST(req: NextRequest) {
  try {
    const secretHeader = req.headers.get('x-qpipeline-webhook-secret');
    if (!secretHeader || secretHeader !== EXPECTED_WEBHOOK_SECRET) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid or missing webhook secret header' },
        { status: 401 }
      );
    }

    const body = await req.json();

    // Internal actor for automated telemetry webhook ingestion
    const systemActor: AuthActor = {
      clerkUserId: body.fellowProfileId || 'system-webhook',
      roles: ['admin'],
    };

    const updatedSubmission = await ingestSandboxTelemetry(systemActor, body);
    return NextResponse.json({ success: true, data: updatedSubmission });
  } catch (err: any) {
    const status = err.message?.includes('Unauthorized') ? 401 : 400;
    return NextResponse.json(
      { success: false, error: err.message || 'Sandbox telemetry processing failed' },
      { status }
    );
  }
}
