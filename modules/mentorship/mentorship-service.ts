import {
  Mentor,
  MentorAssignment,
  MentorSession,
  AssignmentStatus,
  RegisterMentorInput,
  RegisterMentorSchema,
  UpdateMentorInput,
  UpdateMentorSchema,
  AssignMentorInput,
  AssignMentorSchema,
  ScheduleSessionInput,
  ScheduleSessionSchema,
  CompleteSessionInput,
  CompleteSessionSchema,
} from './types';
import { logAuditEvent } from '../audit/service';

// In-memory state store for development & testing
const mentorsStore = new Map<string, Mentor>();
const assignmentsStore = new Map<string, MentorAssignment>();
const sessionsStore = new Map<string, MentorSession>();

/**
 * Delete a mentor profile and associated assignments (Admin only)
 */
export async function deleteMentor(adminUserId: string, mentorId: string): Promise<boolean> {
  const mentor = mentorsStore.get(mentorId);
  if (!mentor) {
    throw new Error(`Mentor with ID '${mentorId}' not found.`);
  }

  // Remove mentor
  mentorsStore.delete(mentorId);

  // Remove assignments
  for (const [assignId, assign] of assignmentsStore.entries()) {
    if (assign.mentorId === mentorId) {
      assignmentsStore.delete(assignId);
    }
  }

  await logAuditEvent({
    actorClerkUserId: adminUserId,
    action: 'MENTOR_DELETED',
    targetType: 'mentor',
    targetId: mentorId,
    metadata: { name: mentor.name, email: mentor.email },
  });

  return true;
}

/**
 * Register a new mentor profile (Admin only)
 */
export async function registerMentor(
  adminUserId: string,
  input: RegisterMentorInput
): Promise<Mentor> {
  const validated = RegisterMentorSchema.parse(input);

  // Check email uniqueness
  for (const mentor of mentorsStore.values()) {
    if (mentor.email.toLowerCase() === validated.email.toLowerCase()) {
      throw new Error(`A mentor with email '${validated.email}' already exists.`);
    }
  }

  const mentorId = crypto.randomUUID();
  const now = new Date().toISOString();

  const mentor: Mentor = {
    id: mentorId,
    name: validated.name,
    email: validated.email,
    company: validated.company,
    role: validated.role,
    expertise: validated.expertise,
    bio: validated.bio || '',
    avatarUrl: validated.avatarUrl || '',
    maxMentees: validated.maxMentees,
    activeMenteesCount: 0,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  mentorsStore.set(mentorId, mentor);

  await logAuditEvent({
    actorClerkUserId: adminUserId,
    action: 'MENTOR_REGISTERED',
    targetType: 'mentor',
    targetId: mentorId,
    metadata: { name: mentor.name, email: mentor.email, company: mentor.company },
  });

  return mentor;
}

/**
 * Update mentor profile or availability status (Admin only)
 */
export async function updateMentorProfile(
  adminUserId: string,
  mentorId: string,
  input: UpdateMentorInput
): Promise<Mentor> {
  const mentor = mentorsStore.get(mentorId);
  if (!mentor) {
    throw new Error(`Mentor with ID '${mentorId}' not found.`);
  }

  const validated = UpdateMentorSchema.parse(input);

  const updated: Mentor = {
    ...mentor,
    ...validated,
    updatedAt: new Date().toISOString(),
  };

  mentorsStore.set(mentorId, updated);

  await logAuditEvent({
    actorClerkUserId: adminUserId,
    action: 'MENTOR_UPDATED',
    targetType: 'mentor',
    targetId: mentorId,
    metadata: { changes: Object.keys(validated) },
  });

  return updated;
}

/**
 * List all mentors with optional status or search filter
 */
export async function listMentors(options?: {
  status?: 'active' | 'inactive' | 'on_leave';
  expertise?: string;
  hasCapacity?: boolean;
}): Promise<Mentor[]> {
  let list = Array.from(mentorsStore.values());

  if (options?.status) {
    list = list.filter((m) => m.status === options.status);
  }

  if (options?.expertise) {
    const expLower = options.expertise.toLowerCase();
    list = list.filter((m) =>
      m.expertise.some((e) => e.toLowerCase().includes(expLower))
    );
  }

  if (options?.hasCapacity) {
    list = list.filter((m) => m.activeMenteesCount < m.maxMentees);
  }

  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Retrieve single mentor profile by ID
 */
export async function getMentorById(mentorId: string): Promise<Mentor | null> {
  return mentorsStore.get(mentorId) || null;
}

/**
 * Assign a mentor to a cohort or individual fellow (Admin only)
 */
export async function assignMentorToTarget(
  adminUserId: string,
  input: AssignMentorInput
): Promise<MentorAssignment> {
  const validated = AssignMentorSchema.parse(input);

  const mentor = mentorsStore.get(validated.mentorId);
  if (!mentor) {
    throw new Error(`Mentor with ID '${validated.mentorId}' not found.`);
  }

  if (mentor.status !== 'active') {
    throw new Error(`Mentor '${mentor.name}' is currently ${mentor.status} and cannot receive new assignments.`);
  }

  if (mentor.activeMenteesCount >= mentor.maxMentees) {
    throw new Error(
      `Mentor '${mentor.name}' has reached capacity (${mentor.activeMenteesCount}/${mentor.maxMentees} active mentees).`
    );
  }

  // Prevent duplicate active assignment
  for (const existing of assignmentsStore.values()) {
    if (
      existing.mentorId === validated.mentorId &&
      existing.targetType === validated.targetType &&
      existing.targetId === validated.targetId &&
      existing.status === 'active'
    ) {
      throw new Error(
        `Mentor '${mentor.name}' is already actively assigned to this ${validated.targetType}.`
      );
    }
  }

  const assignmentId = crypto.randomUUID();
  const now = new Date().toISOString();

  const assignment: MentorAssignment = {
    id: assignmentId,
    mentorId: validated.mentorId,
    targetType: validated.targetType,
    targetId: validated.targetId,
    targetName: validated.targetName || `${validated.targetType}:${validated.targetId}`,
    assignedBy: adminUserId,
    status: 'active',
    notes: validated.notes || '',
    createdAt: now,
    updatedAt: now,
  };

  assignmentsStore.set(assignmentId, assignment);

  // Increment mentor active mentees count
  mentor.activeMenteesCount += 1;
  mentor.updatedAt = now;
  mentorsStore.set(mentor.id, mentor);

  await logAuditEvent({
    actorClerkUserId: adminUserId,
    action: 'MENTOR_ASSIGNED',
    targetType: 'mentor_assignment',
    targetId: assignmentId,
    metadata: {
      mentorId: mentor.id,
      targetType: validated.targetType,
      targetId: validated.targetId,
    },
  });

  return assignment;
}

/**
 * Unassign/Deactivate a mentor assignment (Admin only)
 */
export async function unassignMentor(
  adminUserId: string,
  assignmentId: string
): Promise<MentorAssignment> {
  const assignment = assignmentsStore.get(assignmentId);
  if (!assignment) {
    throw new Error(`Assignment with ID '${assignmentId}' not found.`);
  }

  if (assignment.status !== 'active') {
    return assignment;
  }

  const now = new Date().toISOString();
  assignment.status = 'completed';
  assignment.updatedAt = now;
  assignmentsStore.set(assignmentId, assignment);

  // Decrement mentor active mentees count
  const mentor = mentorsStore.get(assignment.mentorId);
  if (mentor && mentor.activeMenteesCount > 0) {
    mentor.activeMenteesCount -= 1;
    mentor.updatedAt = now;
    mentorsStore.set(mentor.id, mentor);
  }

  await logAuditEvent({
    actorClerkUserId: adminUserId,
    action: 'MENTOR_UNASSIGNED',
    targetType: 'mentor_assignment',
    targetId: assignmentId,
    metadata: { mentorId: assignment.mentorId, targetId: assignment.targetId },
  });

  return assignment;
}

/**
 * List assignments for a mentor or target
 */
export async function listAssignments(options?: {
  mentorId?: string;
  targetId?: string;
  status?: AssignmentStatus;
}): Promise<MentorAssignment[]> {
  let list = Array.from(assignmentsStore.values());

  if (options?.mentorId) {
    list = list.filter((a) => a.mentorId === options.mentorId);
  }
  if (options?.targetId) {
    list = list.filter((a) => a.targetId === options.targetId);
  }
  if (options?.status) {
    list = list.filter((a) => a.status === options.status);
  }

  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Schedule a mentor session
 */
export async function scheduleSession(
  userId: string,
  input: ScheduleSessionInput
): Promise<MentorSession> {
  const validated = ScheduleSessionSchema.parse(input);

  const mentor = mentorsStore.get(validated.mentorId);
  if (!mentor) {
    throw new Error(`Mentor with ID '${validated.mentorId}' not found.`);
  }

  const sessionId = crypto.randomUUID();
  const now = new Date().toISOString();

  const session: MentorSession = {
    id: sessionId,
    mentorId: validated.mentorId,
    mentorName: mentor.name,
    targetType: validated.targetType,
    targetId: validated.targetId,
    fellowId: validated.fellowId || (validated.targetType === 'fellow' ? validated.targetId : undefined),
    cohortId: validated.cohortId || (validated.targetType === 'cohort' ? validated.targetId : undefined),
    title: validated.title,
    description: validated.description || '',
    meetingUrl: validated.meetingUrl,
    scheduledAt: validated.scheduledAt,
    durationMinutes: validated.durationMinutes,
    status: 'scheduled',
    createdAt: now,
    updatedAt: now,
  };

  sessionsStore.set(sessionId, session);

  await logAuditEvent({
    actorClerkUserId: userId,
    action: 'MENTOR_SESSION_SCHEDULED',
    targetType: 'mentor_session',
    targetId: sessionId,
    metadata: {
      mentorId: mentor.id,
      title: session.title,
      scheduledAt: session.scheduledAt,
    },
  });

  return session;
}

/**
 * Record session completion, mentor notes, or fellow feedback
 */
export async function completeSession(
  userId: string,
  input: CompleteSessionInput
): Promise<MentorSession> {
  const validated = CompleteSessionSchema.parse(input);

  const session = sessionsStore.get(validated.sessionId);
  if (!session) {
    throw new Error(`Mentor session with ID '${validated.sessionId}' not found.`);
  }

  const now = new Date().toISOString();

  const updated: MentorSession = {
    ...session,
    status: 'completed',
    mentorNotes: validated.mentorNotes ?? session.mentorNotes,
    fellowFeedbackScore: validated.fellowFeedbackScore ?? session.fellowFeedbackScore,
    fellowFeedbackComments: validated.fellowFeedbackComments ?? session.fellowFeedbackComments,
    updatedAt: now,
  };

  sessionsStore.set(session.id, updated);

  await logAuditEvent({
    actorClerkUserId: userId,
    action: 'MENTOR_SESSION_COMPLETED',
    targetType: 'mentor_session',
    targetId: session.id,
    metadata: {
      feedbackScore: updated.fellowFeedbackScore,
      hasNotes: Boolean(updated.mentorNotes),
    },
  });

  return updated;
}

/**
 * Get all assigned mentors & scheduled sessions for a fellow
 */
export async function getFellowMentorshipOverview(fellowId: string): Promise<{
  assignments: (MentorAssignment & { mentor?: Mentor })[];
  sessions: MentorSession[];
}> {

  const userAssignments = Array.from(assignmentsStore.values()).filter(
    (a) => a.targetType === 'fellow' && a.targetId === fellowId && a.status === 'active'
  );

  const assignmentsWithMentor = userAssignments.map((a) => ({
    ...a,
    mentor: mentorsStore.get(a.mentorId),
  }));

  const userSessions = Array.from(sessionsStore.values()).filter(
    (s) => s.fellowId === fellowId || (s.targetType === 'fellow' && s.targetId === fellowId)
  );

  return {
    assignments: assignmentsWithMentor,
    sessions: userSessions.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
  };
}

/**
 * Get all assigned mentors & scheduled sessions for a cohort
 */
export async function getCohortMentorshipOverview(cohortId: string): Promise<{
  assignments: (MentorAssignment & { mentor?: Mentor })[];
  sessions: MentorSession[];
}> {

  const cohortAssignments = Array.from(assignmentsStore.values()).filter(
    (a) => a.targetType === 'cohort' && a.targetId === cohortId && a.status === 'active'
  );

  const assignmentsWithMentor = cohortAssignments.map((a) => ({
    ...a,
    mentor: mentorsStore.get(a.mentorId),
  }));

  const cohortSessions = Array.from(sessionsStore.values()).filter(
    (s) => s.cohortId === cohortId || (s.targetType === 'cohort' && s.targetId === cohortId)
  );

  return {
    assignments: assignmentsWithMentor,
    sessions: cohortSessions.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
  };
}

/**
 * Helper function for tests to clear in-memory stores
 */
export function _resetMentorshipStoresForTesting(): void {
  mentorsStore.clear();
  assignmentsStore.clear();
  sessionsStore.clear();
}
