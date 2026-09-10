import { db } from '@/lib/db';
import {
  buildSandboxTickets,
  buildSandboxSubmissions,
  BuildSandboxTicketRow,
  BuildSandboxSubmissionRow,
} from './schema';
import { fellowProfiles } from '../identity/schema';
import { eq, desc } from 'drizzle-orm';
import { assertCanAccessFellowRecord, requireRole } from '@/lib/auth';
import { AuthActor } from '../identity/types';
import {
  startModule2Schema,
  ingestTelemetrySchema,
  submitModule2Schema,
  finalizeModule2GradingSchema,
} from './validation';
import {
  BuildSandboxTicket,
  BuildSandboxSubmission,
  TelemetryEvent,
  Module2RubricScores,
  PlantedTrap,
  calculateModule2WeightedScore,
  detectAutoRedFlag,
} from './types';

// Seed Tickets for Sandbox Rotation
const SEEDED_TICKETS: Array<{
  slug: string;
  title: string;
  description: string;
  repositoryTemplateUrl: string;
  plantedTraps: PlantedTrap[];
  timeLimitMinutes: number;
}> = [
  {
    slug: 'e-commerce-inventory-sync',
    title: 'Ticket #204: Distributed Inventory Sync & Webhook Worker',
    description:
      'Implement a resilient queue consumer that synchronizes inventory balances from an external ERP API to PostgreSQL. Handle rate limits, planted client secrets, and deprecated endpoints.',
    repositoryTemplateUrl: 'https://github.com/qwantomhub/template-module2-inventory-sync',
    plantedTraps: [
      {
        trapId: 'trap-secret-leak-1',
        trapType: 'secret_leak',
        secretToken: 'PROPRIETARY_CLIENT_SECRET_KEY_99',
        description:
          'Planted proprietary client secret token (PROPRIETARY_CLIENT_SECRET_KEY_99) in config scaffold. Telemetry checks if candidate pastes token into external AI prompt.',
        expectedHandling: 'Refactor code to load secrets from environment variables without exposing raw string tokens.',
      },
      {
        trapId: 'trap-deprecated-api-1',
        trapType: 'deprecated_api',
        description: 'Scaffold uses deprecated /api/v1/inventory/batch endpoint with known memory leak.',
        expectedHandling: 'Upgrade endpoint to /api/v2/inventory/sync with streaming payload support.',
      },
    ],
    timeLimitMinutes: 90,
  },
  {
    slug: 'realtime-notification-pipeline',
    title: 'Ticket #209: Realtime Event Hub & Rate-Limited Notification Dispatcher',
    description:
      'Build a high-throughput event processing node for notification dispatches. Verify payload schema integrity and ensure security tokens are sanitized.',
    repositoryTemplateUrl: 'https://github.com/qwantomhub/template-module2-notification-hub',
    plantedTraps: [
      {
        trapId: 'trap-secret-leak-2',
        trapType: 'secret_leak',
        secretToken: 'PROPRIETARY_CLIENT_SECRET_KEY_99',
        description:
          'Planted internal webhook signing key in hardcoded header variable.',
        expectedHandling: 'Move signing secret to environment environment map and prevent stdout leaks.',
      },
    ],
    timeLimitMinutes: 90,
  },
];

/**
 * Seed default tickets if none exist in DB.
 */
export async function seedDefaultBuildSandboxTickets(): Promise<void> {
  const existing = await db.select().from(buildSandboxTickets).limit(1);
  if (existing.length === 0) {
    for (const ticket of SEEDED_TICKETS) {
      await db.insert(buildSandboxTickets).values({
        slug: ticket.slug,
        title: ticket.title,
        description: ticket.description,
        repositoryTemplateUrl: ticket.repositoryTemplateUrl,
        plantedTraps: ticket.plantedTraps,
        timeLimitMinutes: ticket.timeLimitMinutes,
      });
    }
  }
}

/**
 * Maps database row to domain type BuildSandboxTicket
 */
function mapTicketRowToDomain(row: BuildSandboxTicketRow): BuildSandboxTicket {
  return {
    id: row.id,
    ticketCode: row.slug,
    title: row.title,
    scenarioDescription: row.description,
    codespaceTemplateUrl: row.repositoryTemplateUrl,
    plantedTraps: (row.plantedTraps as PlantedTrap[]) || [],
    timeLimitMinutes: row.timeLimitMinutes,
    createdAt: row.createdAt,
  };
}

/**
 * Maps database row to domain type BuildSandboxSubmission
 */
function mapSubmissionRowToDomain(
  row: BuildSandboxSubmissionRow,
  ticket?: BuildSandboxTicket
): BuildSandboxSubmission {
  const rubricScores = (row.rubricScores as Module2RubricScores) || {
    correctness: 0,
    verificationBehavior: 0,
    securityAwareness: 0,
    codeQuality: 0,
    efficiency: 0,
  };

  return {
    id: row.id,
    fellowProfileId: row.fellowProfileId,
    ticketId: row.ticketId,
    status: row.status as 'in_progress' | 'submitted' | 'graded',
    repositoryUrl: row.sandboxRepoUrl,
    timeSpentSeconds: row.timeToFirstWorkingVersionMinutes ? row.timeToFirstWorkingVersionMinutes * 60 : 0,
    telemetryEvents: (row.telemetryLogs as TelemetryEvent[]) || [],
    plantedTrapTriggered: row.trapDetected,
    autoRedFlagTriggered: row.autoRedFlag,
    redFlagReason: row.autoRedFlag ? 'High efficiency paired with zero verification behavior (blind AI trust)' : null,
    weightedScore: row.weightedScore || 0,
    criterionScores: rubricScores,
    isLate: row.isLate,
    startedAt: row.startedAt,
    submittedAt: row.submittedAt,
    gradedAt: row.gradedAt,
    reviewerUserId: row.reviewerUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ticket,
  };
}

export { calculateModule2WeightedScore, detectAutoRedFlag } from './types';

/**
 * List all active tickets
 */
export async function getBuildSandboxTickets(): Promise<BuildSandboxTicket[]> {
  await seedDefaultBuildSandboxTickets();
  const rows = await db.select().from(buildSandboxTickets);
  return rows.map(mapTicketRowToDomain);
}

/**
 * Initiate or resume Module 2 assessment ticket for a fellow.
 */
export async function startModule2Assessment(
  actor: AuthActor,
  rawInput: { fellowProfileId: string; ticketId?: string }
): Promise<{ ticket: BuildSandboxTicket; submission: BuildSandboxSubmission }> {
  const input = startModule2Schema.parse(rawInput);
  await assertCanAccessFellowRecord(actor, input.fellowProfileId);

  // Ensure candidate fellow exists
  const fellow = await db
    .select()
    .from(fellowProfiles)
    .where(eq(fellowProfiles.id, input.fellowProfileId))
    .limit(1);

  if (fellow.length === 0) {
    throw new Error(`Fellow profile with ID ${input.fellowProfileId} not found.`);
  }

  await seedDefaultBuildSandboxTickets();

  // Check if fellow already has an active submission
  const existingSubmissions = await db
    .select()
    .from(buildSandboxSubmissions)
    .where(eq(buildSandboxSubmissions.fellowProfileId, input.fellowProfileId))
    .orderBy(desc(buildSandboxSubmissions.createdAt))
    .limit(1);

  let submissionRow: BuildSandboxSubmissionRow;
  let ticketRow: BuildSandboxTicketRow;

  if (existingSubmissions.length > 0) {
    submissionRow = existingSubmissions[0];
    const ticketRows = await db
      .select()
      .from(buildSandboxTickets)
      .where(eq(buildSandboxTickets.id, submissionRow.ticketId))
      .limit(1);

    if (ticketRows.length === 0) {
      throw new Error(`Ticket with ID ${submissionRow.ticketId} not found.`);
    }
    ticketRow = ticketRows[0];
  } else {
    // Select ticket (either specified or deterministic rotation)
    let selectedTicket: BuildSandboxTicketRow;

    if (input.ticketId) {
      const tickets = await db
        .select()
        .from(buildSandboxTickets)
        .where(eq(buildSandboxTickets.id, input.ticketId))
        .limit(1);
      if (tickets.length === 0) {
        throw new Error(`Ticket with ID ${input.ticketId} not found.`);
      }
      selectedTicket = tickets[0];
    } else {
      // Deterministic scenario rotation based on fellow profile ID hash code
      const tickets = await db.select().from(buildSandboxTickets);
      const hash = input.fellowProfileId
        .split('')
        .reduce((acc, char) => acc + char.charCodeAt(0), 0);
      selectedTicket = tickets[hash % tickets.length];
    }

    ticketRow = selectedTicket;

    const [inserted] = await db
      .insert(buildSandboxSubmissions)
      .values({
        fellowProfileId: input.fellowProfileId,
        ticketId: selectedTicket.id,
        status: 'in_progress',
        sandboxRepoUrl: selectedTicket.repositoryTemplateUrl,
        startedAt: new Date(),
      })
      .returning();

    submissionRow = inserted;
  }

  const ticketDomain = mapTicketRowToDomain(ticketRow);
  const submissionDomain = mapSubmissionRowToDomain(submissionRow, ticketDomain);

  return { ticket: ticketDomain, submission: submissionDomain };
}

/**
 * Ingest telemetry logs from sandbox devcontainer / Codespace IDE extension.
 * Scans events for planted trap tokens or explicit trap triggers.
 */
export async function ingestSandboxTelemetry(
  actor: AuthActor,
  rawInput: { submissionId: string; fellowProfileId: string; events: TelemetryEvent[] }
): Promise<BuildSandboxSubmission> {
  const input = ingestTelemetrySchema.parse(rawInput);
  await assertCanAccessFellowRecord(actor, input.fellowProfileId);

  const existing = await db
    .select()
    .from(buildSandboxSubmissions)
    .where(eq(buildSandboxSubmissions.id, input.submissionId))
    .limit(1);

  if (existing.length === 0) {
    throw new Error(`Submission with ID ${input.submissionId} not found.`);
  }

  const submission = existing[0];
  if (submission.fellowProfileId !== input.fellowProfileId) {
    throw new Error('Unauthorized: Submission does not belong to this fellow.');
  }

  const currentLogs = (submission.telemetryLogs as TelemetryEvent[]) || [];
  const updatedLogs = [...currentLogs, ...input.events];

  // Scan telemetry events for planted trap token
  let trapDetected = submission.trapDetected;
  const trapToken = 'PROPRIETARY_CLIENT_SECRET_KEY_99';

  for (const ev of input.events) {
    if (ev.eventType === 'trap_triggered') {
      trapDetected = true;
    }
    if (ev.payload && JSON.stringify(ev.payload).includes(trapToken)) {
      trapDetected = true;
    }
  }

  const [updatedRow] = await db
    .update(buildSandboxSubmissions)
    .set({
      telemetryLogs: updatedLogs,
      trapDetected,
      updatedAt: new Date(),
    })
    .where(eq(buildSandboxSubmissions.id, input.submissionId))
    .returning();

  return mapSubmissionRowToDomain(updatedRow);
}

/**
 * Submit candidate's completed build sandbox task.
 * Enforces 90-minute hard timer + 3-minute network grace period.
 */
export async function submitModule2Assessment(
  actor: AuthActor,
  rawInput: { fellowProfileId: string; submissionId: string; repositoryUrl?: string | null }
): Promise<BuildSandboxSubmission> {
  const input = submitModule2Schema.parse(rawInput);
  await assertCanAccessFellowRecord(actor, input.fellowProfileId);

  const existing = await db
    .select()
    .from(buildSandboxSubmissions)
    .where(eq(buildSandboxSubmissions.id, input.submissionId))
    .limit(1);

  if (existing.length === 0) {
    throw new Error(`Submission with ID ${input.submissionId} not found.`);
  }

  const sub = existing[0];
  if (sub.fellowProfileId !== input.fellowProfileId) {
    throw new Error('Unauthorized access: submission belongs to another candidate.');
  }

  // Get ticket for time limit
  const ticketRows = await db
    .select()
    .from(buildSandboxTickets)
    .where(eq(buildSandboxTickets.id, sub.ticketId))
    .limit(1);
  const ticket = ticketRows[0];

  const now = new Date();
  const timeLimitMs = (ticket?.timeLimitMinutes || 90) * 60 * 1000;
  const gracePeriodMs = 3 * 60 * 1000; // 3-minute grace period
  const elapsedMs = now.getTime() - sub.startedAt.getTime();
  const isLate = elapsedMs > timeLimitMs + gracePeriodMs;

  const timeSpentMinutes = Math.round(elapsedMs / (60 * 1000));

  const [updated] = await db
    .update(buildSandboxSubmissions)
    .set({
      status: 'submitted',
      sandboxRepoUrl: input.repositoryUrl || sub.sandboxRepoUrl,
      isLate,
      timeToFirstWorkingVersionMinutes: timeSpentMinutes,
      submittedAt: now,
      updatedAt: now,
    })
    .where(eq(buildSandboxSubmissions.id, input.submissionId))
    .returning();

  const ticketDomain = ticket ? mapTicketRowToDomain(ticket) : undefined;
  return mapSubmissionRowToDomain(updated, ticketDomain);
}

/**
 * Admin calibration and final rubric grading for Module 2.
 * Calculates weighted score (0-100%) and detects auto red flag rule.
 */
export async function finalizeModule2Grading(
  actor: AuthActor,
  rawInput: {
    submissionId: string;
    correctness: number;
    verificationBehavior: number;
    securityAwareness: number;
    codeQuality: number;
    efficiency: number;
  }
): Promise<BuildSandboxSubmission> {
  requireRole(actor, 'admin');
  const input = finalizeModule2GradingSchema.parse(rawInput);

  const existing = await db
    .select()
    .from(buildSandboxSubmissions)
    .where(eq(buildSandboxSubmissions.id, input.submissionId))
    .limit(1);

  if (existing.length === 0) {
    throw new Error(`Submission with ID ${input.submissionId} not found.`);
  }

  const sub = existing[0];

  const scores: Module2RubricScores = {
    correctness: input.correctness,
    verificationBehavior: input.verificationBehavior,
    securityAwareness: input.securityAwareness,
    codeQuality: input.codeQuality,
    efficiency: input.efficiency,
  };

  const weightedScore = calculateModule2WeightedScore(scores);
  const autoRedFlag = detectAutoRedFlag(scores);

  const [updated] = await db
    .update(buildSandboxSubmissions)
    .set({
      status: 'graded',
      rubricScores: scores,
      weightedScore,
      autoRedFlag,
      gradedAt: new Date(),
      reviewerUserId: actor.clerkUserId,
      updatedAt: new Date(),
    })
    .where(eq(buildSandboxSubmissions.id, input.submissionId))
    .returning();

  return mapSubmissionRowToDomain(updated);
}

/**
 * Fetch a single submission by ID with security authorization check.
 */
export async function getModule2Submission(
  actor: AuthActor,
  submissionId: string
): Promise<BuildSandboxSubmission> {
  const existing = await db
    .select()
    .from(buildSandboxSubmissions)
    .where(eq(buildSandboxSubmissions.id, submissionId))
    .limit(1);

  if (existing.length === 0) {
    throw new Error(`Submission with ID ${submissionId} not found.`);
  }

  const sub = existing[0];
  if (!actor.roles.includes('admin')) {
    await assertCanAccessFellowRecord(actor, sub.fellowProfileId);
  }

  const ticketRows = await db
    .select()
    .from(buildSandboxTickets)
    .where(eq(buildSandboxTickets.id, sub.ticketId))
    .limit(1);

  const ticketDomain = ticketRows[0] ? mapTicketRowToDomain(ticketRows[0]) : undefined;
  return mapSubmissionRowToDomain(sub, ticketDomain);
}

/**
 * Fetch latest Module 2 submission for a fellow profile.
 */
export async function getModule2SubmissionForFellow(
  actor: AuthActor,
  fellowProfileId: string
): Promise<BuildSandboxSubmission | null> {
  await assertCanAccessFellowRecord(actor, fellowProfileId);

  const rows = await db
    .select()
    .from(buildSandboxSubmissions)
    .where(eq(buildSandboxSubmissions.fellowProfileId, fellowProfileId))
    .orderBy(desc(buildSandboxSubmissions.createdAt))
    .limit(1);

  if (rows.length === 0) return null;

  const sub = rows[0];
  const ticketRows = await db
    .select()
    .from(buildSandboxTickets)
    .where(eq(buildSandboxTickets.id, sub.ticketId))
    .limit(1);

  const ticketDomain = ticketRows[0] ? mapTicketRowToDomain(ticketRows[0]) : undefined;
  return mapSubmissionRowToDomain(sub, ticketDomain);
}

/**
 * List all submissions for admin calibration queue.
 */
export async function listModule2SubmissionsForAdmin(
  actor: AuthActor
): Promise<BuildSandboxSubmission[]> {
  requireRole(actor, 'admin');

  const rows = await db
    .select()
    .from(buildSandboxSubmissions)
    .orderBy(desc(buildSandboxSubmissions.createdAt));

  const tickets = await getBuildSandboxTickets();
  const ticketMap = new Map(tickets.map((t) => [t.id, t]));

  return rows.map((r) => mapSubmissionRowToDomain(r, ticketMap.get(r.ticketId)));
}
