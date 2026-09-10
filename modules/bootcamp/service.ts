import { db } from '@/lib/db';
import { eq, and, desc, sql, count } from 'drizzle-orm';
import {
  bootcampTracks,
  cohorts,
  bootcampEnrollments,
  bootcampMilestones,
  fellowMilestoneProgress,
  BootcampTrackRow,
  CohortRow,
  BootcampEnrollmentRow,
  BootcampMilestoneRow,
  FellowMilestoneProgressRow,
} from './schema';
import { fellowProfiles } from '@/modules/identity/schema';
import {
  BootcampTrack,
  Cohort,
  BootcampEnrollment,
  BootcampMilestone,
  FellowMilestoneProgress,
  FellowBootcampDashboardData,
} from './types';
import {
  createTrackSchema,
  updateTrackSchema,
  createCohortSchema,
  updateCohortStatusSchema,
  enrollFellowSchema,
  createMilestoneSchema,
  submitMilestoneSchema,
  gradeMilestoneSchema,
} from './validation';
import { AuthActor } from '@/modules/identity/types';
import { requireRole, assertCanAccessFellowRecord } from '@/lib/auth';
import { logAuditEvent } from '@/modules/audit/service';

// --- Helper Data Mappers ---

function mapTrackRow(row: BootcampTrackRow): BootcampTrack {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapCohortRow(row: CohortRow, enrolledCount: number = 0, trackName?: string): Cohort {
  return {
    id: row.id,
    name: row.name,
    trackSlug: row.trackSlug,
    status: row.status as any,
    capacity: row.capacity,
    startDate: row.startDate,
    endDate: row.endDate,
    description: row.description,
    metadata: row.metadata || {},
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    enrolledCount,
    availableSlots: Math.max(0, row.capacity - enrolledCount),
    trackName,
  };
}

function mapEnrollmentRow(row: BootcampEnrollmentRow): BootcampEnrollment {
  return {
    id: row.id,
    fellowProfileId: row.fellowProfileId,
    cohortId: row.cohortId,
    status: row.status as any,
    currentWeek: row.currentWeek,
    enrolledAt: row.enrolledAt,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapMilestoneRow(row: BootcampMilestoneRow): BootcampMilestone {
  return {
    id: row.id,
    cohortId: row.cohortId,
    title: row.title,
    description: row.description,
    weekNumber: row.weekNumber,
    dueDate: row.dueDate,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapProgressRow(row: FellowMilestoneProgressRow): FellowMilestoneProgress {
  return {
    id: row.id,
    enrollmentId: row.enrollmentId,
    milestoneId: row.milestoneId,
    status: row.status as any,
    submissionUrl: row.submissionUrl,
    feedback: row.feedback,
    gradedAt: row.gradedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// --- 1. Dynamic Track Management (Admin Governance) ---

export async function createBootcampTrack(
  actor: AuthActor,
  rawInput: { slug: string; name: string; description?: string; isActive?: boolean }
): Promise<BootcampTrack> {
  requireRole(actor, 'admin');
  const input = createTrackSchema.parse(rawInput);

  const [inserted] = await db
    .insert(bootcampTracks)
    .values({
      slug: input.slug,
      name: input.name,
      description: input.description || null,
      isActive: input.isActive ?? true,
    })
    .returning();

  await logAuditEvent({
    actorClerkUserId: actor.clerkUserId,
    action: 'CREATE_BOOTCAMP_TRACK',
    targetType: 'bootcamp_track',
    targetId: inserted.id,
    severity: 'info',
    metadata: { slug: input.slug, name: input.name },
  });

  return mapTrackRow(inserted);
}

export async function updateBootcampTrack(
  actor: AuthActor,
  rawInput: { id: string; name?: string; description?: string; isActive?: boolean }
): Promise<BootcampTrack> {
  requireRole(actor, 'admin');
  const input = updateTrackSchema.parse(rawInput);

  const [updated] = await db
    .update(bootcampTracks)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      updatedAt: new Date(),
    })
    .where(eq(bootcampTracks.id, input.id))
    .returning();

  if (!updated) {
    throw new Error(`Bootcamp track with ID ${input.id} not found.`);
  }

  return mapTrackRow(updated);
}

export async function deleteBootcampTrack(actor: AuthActor, trackId: string): Promise<void> {
  requireRole(actor, 'admin');

  const [deleted] = await db
    .delete(bootcampTracks)
    .where(eq(bootcampTracks.id, trackId))
    .returning();

  if (deleted) {
    await logAuditEvent({
      actorClerkUserId: actor.clerkUserId,
      action: 'DELETE_BOOTCAMP_TRACK',
      targetType: 'bootcamp_track',
      targetId: deleted.id,
      severity: 'warning',
      metadata: { slug: deleted.slug, name: deleted.name },
    });
  }
}

export async function listBootcampTracks(actor: AuthActor): Promise<BootcampTrack[]> {
  const rows = await db.select().from(bootcampTracks).orderBy(bootcampTracks.name);
  return rows.map(mapTrackRow);
}

// --- 2. Cohort Operations ---

export async function createCohort(
  actor: AuthActor,
  rawInput: {
    name: string;
    trackSlug: string;
    capacity?: number;
    startDate?: string | Date;
    endDate?: string | Date;
    description?: string;
  }
): Promise<Cohort> {
  requireRole(actor, 'admin');
  const input = createCohortSchema.parse(rawInput);

  // Check track exists
  const trackRows = await db
    .select()
    .from(bootcampTracks)
    .where(eq(bootcampTracks.slug, input.trackSlug))
    .limit(1);

  if (trackRows.length === 0) {
    throw new Error(`Bootcamp track '${input.trackSlug}' does not exist.`);
  }

  const [inserted] = await db
    .insert(cohorts)
    .values({
      name: input.name,
      trackSlug: input.trackSlug,
      capacity: input.capacity || 30,
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
      description: input.description || null,
      status: 'upcoming',
    })
    .returning();

  await logAuditEvent({
    actorClerkUserId: actor.clerkUserId,
    action: 'CREATE_COHORT',
    targetType: 'cohort',
    targetId: inserted.id,
    severity: 'info',
    metadata: { name: input.name, trackSlug: input.trackSlug, capacity: inserted.capacity },
  });

  return mapCohortRow(inserted, 0, trackRows[0].name);
}

export async function updateCohortStatus(
  actor: AuthActor,
  rawInput: { cohortId: string; status: 'upcoming' | 'active' | 'completed' | 'cancelled' }
): Promise<Cohort> {
  requireRole(actor, 'admin');
  const input = updateCohortStatusSchema.parse(rawInput);

  const [updated] = await db
    .update(cohorts)
    .set({
      status: input.status,
      updatedAt: new Date(),
    })
    .where(eq(cohorts.id, input.cohortId))
    .returning();

  if (!updated) {
    throw new Error(`Cohort with ID ${input.cohortId} not found.`);
  }

  return mapCohortRow(updated);
}

export async function listCohortsForAdmin(actor: AuthActor): Promise<Cohort[]> {
  requireRole(actor, 'admin');

  const cohortRows = await db.select().from(cohorts).orderBy(desc(cohorts.createdAt));
  const trackRows = await db.select().from(bootcampTracks);
  const trackMap = new Map(trackRows.map((t) => [t.slug, t.name]));

  const enrollCounts = await db
    .select({
      cohortId: bootcampEnrollments.cohortId,
      count: count(),
    })
    .from(bootcampEnrollments)
    .groupBy(bootcampEnrollments.cohortId);

  const countMap = new Map(enrollCounts.map((e) => [e.cohortId, Number(e.count)]));

  return cohortRows.map((c) => mapCohortRow(c, countMap.get(c.id) || 0, trackMap.get(c.trackSlug)));
}

// --- 3. Fellow Enrollment in Cohort ---

export async function enrollFellowInCohort(
  actor: AuthActor,
  rawInput: { fellowProfileId: string; cohortId: string }
): Promise<BootcampEnrollment> {
  requireRole(actor, 'admin');
  const input = enrollFellowSchema.parse(rawInput);

  const cohortRows = await db.select().from(cohorts).where(eq(cohorts.id, input.cohortId)).limit(1);
  if (cohortRows.length === 0) {
    throw new Error(`Cohort with ID ${input.cohortId} not found.`);
  }

  const cohort = cohortRows[0];

  // Calculate current active enrollments
  const activeEnrollments = await db
    .select({ count: count() })
    .from(bootcampEnrollments)
    .where(eq(bootcampEnrollments.cohortId, input.cohortId));

  const currentCount = Number(activeEnrollments[0]?.count || 0);

  if (currentCount >= cohort.capacity) {
    throw new Error(`Cohort '${cohort.name}' has reached its maximum capacity of ${cohort.capacity} slots.`);
  }

  // Check if fellow is already enrolled
  const existing = await db
    .select()
    .from(bootcampEnrollments)
    .where(
      and(
        eq(bootcampEnrollments.fellowProfileId, input.fellowProfileId),
        eq(bootcampEnrollments.cohortId, input.cohortId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return mapEnrollmentRow(existing[0]);
  }

  const [inserted] = await db
    .insert(bootcampEnrollments)
    .values({
      fellowProfileId: input.fellowProfileId,
      cohortId: input.cohortId,
      status: 'enrolled',
      currentWeek: 1,
    })
    .returning();

  // Sync identity spine stage to 'training'
  await db
    .update(fellowProfiles)
    .set({
      stage: 'training',
      updatedAt: new Date(),
    })
    .where(eq(fellowProfiles.id, input.fellowProfileId));

  await logAuditEvent({
    actorClerkUserId: actor.clerkUserId,
    action: 'FELLOW_BOOTCAMP_ENROLLMENT',
    targetType: 'fellow_profile',
    targetId: input.fellowProfileId,
    severity: 'info',
    metadata: { cohortId: input.cohortId, cohortName: cohort.name },
  });

  return mapEnrollmentRow(inserted);
}

// --- 4. Milestone & Progress Management ---

export async function createMilestoneForCohort(
  actor: AuthActor,
  rawInput: { cohortId: string; title: string; description?: string; weekNumber: number; dueDate?: string | Date }
): Promise<BootcampMilestone> {
  requireRole(actor, 'admin');
  const input = createMilestoneSchema.parse(rawInput);

  const [inserted] = await db
    .insert(bootcampMilestones)
    .values({
      cohortId: input.cohortId,
      title: input.title,
      description: input.description || null,
      weekNumber: input.weekNumber,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
    })
    .returning();

  return mapMilestoneRow(inserted);
}

export async function submitMilestoneProgress(
  actor: AuthActor,
  rawInput: { enrollmentId: string; milestoneId: string; submissionUrl: string }
): Promise<FellowMilestoneProgress> {
  const input = submitMilestoneSchema.parse(rawInput);

  // Verify enrollment belongs to fellow
  const enrollRows = await db
    .select()
    .from(bootcampEnrollments)
    .where(eq(bootcampEnrollments.id, input.enrollmentId))
    .limit(1);

  if (enrollRows.length === 0) {
    throw new Error(`Enrollment record ${input.enrollmentId} not found.`);
  }

  await assertCanAccessFellowRecord(actor, enrollRows[0].fellowProfileId);

  const existing = await db
    .select()
    .from(fellowMilestoneProgress)
    .where(
      and(
        eq(fellowMilestoneProgress.enrollmentId, input.enrollmentId),
        eq(fellowMilestoneProgress.milestoneId, input.milestoneId)
      )
    )
    .limit(1);

  let resultRow: FellowMilestoneProgressRow;

  if (existing.length > 0) {
    const [updated] = await db
      .update(fellowMilestoneProgress)
      .set({
        submissionUrl: input.submissionUrl,
        status: 'submitted',
        updatedAt: new Date(),
      })
      .where(eq(fellowMilestoneProgress.id, existing[0].id))
      .returning();
    resultRow = updated;
  } else {
    const [inserted] = await db
      .insert(fellowMilestoneProgress)
      .values({
        enrollmentId: input.enrollmentId,
        milestoneId: input.milestoneId,
        submissionUrl: input.submissionUrl,
        status: 'submitted',
      })
      .returning();
    resultRow = inserted;
  }

  return mapProgressRow(resultRow);
}

export async function gradeMilestoneProgress(
  actor: AuthActor,
  rawInput: { progressId: string; status: 'approved' | 'revision_needed'; feedback?: string }
): Promise<FellowMilestoneProgress> {
  requireRole(actor, 'admin');
  const input = gradeMilestoneSchema.parse(rawInput);

  const [updated] = await db
    .update(fellowMilestoneProgress)
    .set({
      status: input.status,
      feedback: input.feedback || null,
      gradedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(fellowMilestoneProgress.id, input.progressId))
    .returning();

  if (!updated) {
    throw new Error(`Milestone progress record ${input.progressId} not found.`);
  }

  return mapProgressRow(updated);
}

// --- 5. Candidate Dashboard Data Aggregation ---

export async function getFellowBootcampDashboardData(
  actor: AuthActor,
  fellowProfileId: string
): Promise<FellowBootcampDashboardData> {
  await assertCanAccessFellowRecord(actor, fellowProfileId);

  const enrollRows = await db
    .select()
    .from(bootcampEnrollments)
    .where(eq(bootcampEnrollments.fellowProfileId, fellowProfileId))
    .orderBy(desc(bootcampEnrollments.enrolledAt))
    .limit(1);

  if (enrollRows.length === 0) {
    return {
      enrollment: null,
      cohort: null,
      track: null,
      milestones: [],
    };
  }

  const enrollment = mapEnrollmentRow(enrollRows[0]);

  const cohortRows = await db.select().from(cohorts).where(eq(cohorts.id, enrollment.cohortId)).limit(1);
  const cohort = cohortRows[0] ? mapCohortRow(cohortRows[0]) : null;

  let track: BootcampTrack | null = null;
  if (cohort) {
    const trackRows = await db.select().from(bootcampTracks).where(eq(bootcampTracks.slug, cohort.trackSlug)).limit(1);
    if (trackRows[0]) track = mapTrackRow(trackRows[0]);
  }

  const milestoneRows = await db
    .select()
    .from(bootcampMilestones)
    .where(eq(bootcampMilestones.cohortId, enrollment.cohortId))
    .orderBy(bootcampMilestones.weekNumber);

  const progressRows = await db
    .select()
    .from(fellowMilestoneProgress)
    .where(eq(fellowMilestoneProgress.enrollmentId, enrollment.id));

  const progressMap = new Map(progressRows.map((p) => [p.milestoneId, mapProgressRow(p)]));

  const milestones = milestoneRows.map((m) => {
    const mappedM = mapMilestoneRow(m);
    return {
      ...mappedM,
      progress: progressMap.get(m.id),
    };
  });

  return {
    enrollment,
    cohort,
    track,
    milestones,
  };
}
