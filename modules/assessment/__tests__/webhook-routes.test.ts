import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as quizRouteHandler } from '@/app/api/webhooks/assessment/quiz/route';
import { POST as githubRouteHandler } from '@/app/api/webhooks/assessment/github/route';
import * as assessmentService from '../service';

vi.mock('../service', async () => {
  const actual = await vi.importActual('../service');
  return {
    ...actual,
    ingestQuizWebhook: vi.fn(),
    ingestGitHubGradingWebhook: vi.fn(),
  };
});

describe('Baseline Assessment Webhook Route Handlers (HTTP Integration)', () => {
  const secret = process.env.QPIPELINE_WEBHOOK_SECRET || 'qpipeline_webhook_secret_dev';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Quiz Webhook Route Handler (/api/webhooks/assessment/quiz)', () => {
    it('returns HTTP 401 when x-qpipeline-webhook-secret is missing or wrong', async () => {
      (assessmentService.ingestQuizWebhook as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Unauthorized webhook secret header')
      );

      const req = new NextRequest('http://localhost:3000/api/webhooks/assessment/quiz', {
        method: 'POST',
        headers: { 'x-qpipeline-webhook-secret': 'bad_secret' },
        body: JSON.stringify({ fellowProfileId: '550e8400-e29b-41d4-a716-446655440000', quizScore: 90 }),
      });

      const res = await quizRouteHandler(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Unauthorized');
    });

    it('returns HTTP 400 when payload is invalid Zod schema', async () => {
      (assessmentService.ingestQuizWebhook as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Zod validation error: Invalid fellow profile UUID')
      );

      const req = new NextRequest('http://localhost:3000/api/webhooks/assessment/quiz', {
        method: 'POST',
        headers: { 'x-qpipeline-webhook-secret': secret },
        body: JSON.stringify({ fellowProfileId: 'invalid-uuid', quizScore: 90 }),
      });

      const res = await quizRouteHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it('returns HTTP 200 and data when valid payload & secret provided', async () => {
      const mockRecord = {
        id: 'record-1',
        fellowProfileId: '550e8400-e29b-41d4-a716-446655440000',
        quizScore: 90,
        quizStatus: 'passed',
        compositeScore: 36,
        status: 'in_progress',
      };

      (assessmentService.ingestQuizWebhook as ReturnType<typeof vi.fn>).mockResolvedValue(mockRecord);

      const req = new NextRequest('http://localhost:3000/api/webhooks/assessment/quiz', {
        method: 'POST',
        headers: { 'x-qpipeline-webhook-secret': secret },
        body: JSON.stringify({ fellowProfileId: '550e8400-e29b-41d4-a716-446655440000', quizScore: 90 }),
      });

      const res = await quizRouteHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.quizScore).toBe(90);
    });
  });

  describe('GitHub Grading Route Handler (/api/webhooks/assessment/github)', () => {
    it('returns HTTP 401 on secret mismatch', async () => {
      (assessmentService.ingestGitHubGradingWebhook as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Unauthorized webhook secret header')
      );

      const req = new NextRequest('http://localhost:3000/api/webhooks/assessment/github', {
        method: 'POST',
        headers: { 'x-qpipeline-webhook-secret': 'wrong' },
        body: JSON.stringify({}),
      });

      const res = await githubRouteHandler(req);
      expect(res.status).toBe(401);
    });

    it('returns HTTP 200 when valid grading payload received', async () => {
      const mockRecord = {
        id: 'record-1',
        codingScore: 85,
        codingStatus: 'passed',
        status: 'passed',
      };

      (assessmentService.ingestGitHubGradingWebhook as ReturnType<typeof vi.fn>).mockResolvedValue(mockRecord);

      const req = new NextRequest('http://localhost:3000/api/webhooks/assessment/github', {
        method: 'POST',
        headers: { 'x-qpipeline-webhook-secret': secret },
        body: JSON.stringify({
          fellowProfileId: '550e8400-e29b-41d4-a716-446655440000',
          repoUrl: 'https://github.com/qwantomhub-classroom/baseline-octocat',
          codingScore: 85,
          testResults: [{ name: 'Test 1', passed: true }],
        }),
      });

      const res = await githubRouteHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.codingScore).toBe(85);
    });
  });
});
