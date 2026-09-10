'use server';

import { auth } from '@clerk/nextjs/server';
import {
  createContractEnvelope,
  updateContractEnvelope,
  sendContractEnvelope,
  deleteContractEnvelope,
  createContractTemplate,
  listContractTemplates,
  updateContractTemplate,
  deleteContractTemplate,
  signContractEnvelope,
  declineContractEnvelope,
  voidContractEnvelope,
  listContractsForFellow,
  listAllContractsForAdmin,
  getContractAuditTrail,
} from './service';
import {
  CreateContractEnvelopeInput,
  UpdateContractEnvelopeInput,
  SendContractEnvelopeInput,
  DeleteContractEnvelopeInput,
  CreateContractTemplateInput,
  UpdateContractTemplateInput,
  SignContractInput,
  DeclineContractInput,
  VoidContractInput,
  ContractType,
} from './types';
import { AuthActor } from '../identity/types';

async function getAuthActor(): Promise<AuthActor> {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    throw new Error('Unauthorized: Authentication required');
  }

  const roles = (sessionClaims?.metadata as { roles?: string[] })?.roles || ['fellow'];
  return {
    clerkUserId: userId,
    roles,
  };
}

/**
 * Server Action: Create or draft contract envelope (Admin only)
 */
export async function createContractEnvelopeAction(input: CreateContractEnvelopeInput) {
  const actor = await getAuthActor();
  return await createContractEnvelope(actor, input);
}

/**
 * Server Action: Modify existing contract envelope (Admin only)
 */
export async function updateContractEnvelopeAction(input: UpdateContractEnvelopeInput) {
  const actor = await getAuthActor();
  return await updateContractEnvelope(actor, input);
}

/**
 * Server Action: Send draft contract envelope to fellow (Admin only)
 */
export async function sendContractEnvelopeAction(input: SendContractEnvelopeInput) {
  const actor = await getAuthActor();
  return await sendContractEnvelope(actor, input);
}

/**
 * Server Action: Delete contract envelope (Admin only)
 */
export async function deleteContractEnvelopeAction(input: DeleteContractEnvelopeInput) {
  const actor = await getAuthActor();
  return await deleteContractEnvelope(actor, input);
}

/**
 * Server Actions: Template CRUD
 */
export async function createContractTemplateAction(input: CreateContractTemplateInput) {
  const actor = await getAuthActor();
  return await createContractTemplate(actor, input);
}

export async function listContractTemplatesAction() {
  const actor = await getAuthActor();
  return await listContractTemplates(actor);
}

export async function updateContractTemplateAction(input: UpdateContractTemplateInput) {
  const actor = await getAuthActor();
  return await updateContractTemplate(actor, input);
}

export async function deleteContractTemplateAction(templateId: string) {
  const actor = await getAuthActor();
  return await deleteContractTemplate(actor, templateId);
}

/**
 * Server Action: Sign contract envelope (Fellow Rule 5 record access check)
 */
export async function signContractEnvelopeAction(input: SignContractInput) {
  const actor = await getAuthActor();
  return await signContractEnvelope(actor, input);
}

/**
 * Server Action: Decline contract envelope (Fellow Rule 5 record access check)
 */
export async function declineContractEnvelopeAction(input: DeclineContractInput) {
  const actor = await getAuthActor();
  return await declineContractEnvelope(actor, input);
}

/**
 * Server Action: Void contract envelope (Admin only)
 */
export async function voidContractEnvelopeAction(input: VoidContractInput) {
  const actor = await getAuthActor();
  return await voidContractEnvelope(actor, input);
}

/**
 * Server Action: List assigned contracts for current fellow
 */
export async function getMyContractsAction(fellowProfileId: string) {
  const actor = await getAuthActor();
  return await listContractsForFellow(actor, fellowProfileId);
}

/**
 * Server Action: List all contract envelopes across platform for Admin Governance
 */
export async function listContractsForAdminAction(filterType?: ContractType) {
  const actor = await getAuthActor();
  return await listAllContractsForAdmin(actor, filterType);
}

/**
 * Server Action: Fetch contract audit events trail
 */
export async function getContractAuditTrailAction(contractId: string) {
  const actor = await getAuthActor();
  return await getContractAuditTrail(actor, contractId);
}
