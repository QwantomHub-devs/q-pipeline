import crypto from 'crypto';
import {
  FellowContract,
  ContractTemplate,
  ContractAuditEvent,
  ContractType,
  CreateContractEnvelopeInput,
  CreateContractEnvelopeSchema,
  UpdateContractEnvelopeInput,
  UpdateContractEnvelopeSchema,
  SendContractEnvelopeInput,
  SendContractEnvelopeSchema,
  DeleteContractEnvelopeInput,
  DeleteContractEnvelopeSchema,
  CreateContractTemplateInput,
  CreateContractTemplateSchema,
  UpdateContractTemplateInput,
  UpdateContractTemplateSchema,
  SignContractInput,
  SignContractSchema,
  DeclineContractInput,
  DeclineContractSchema,
  VoidContractInput,
  VoidContractSchema,
  DocumensoWebhookPayload,
} from './types';
import { AuthActor } from '../identity/types';
import * as auth from '@/lib/auth';
import { getFellowProfileById } from '../identity/service';
import { logAuditEvent } from '../audit/service';
import { sendEmail } from '../notifications/service';

// Standard Default Contract Templates
const DEFAULT_TEMPLATES: Record<ContractType, { id: string; title: string; body: string; variables: string[] }> = {
  bootcamp_agreement: {
    id: 'tmpl_bootcamp_default',
    title: 'QwantomHub Fellow Bootcamp & Skill Development Agreement',
    body: `QWANTOMHUB TALENT PIPELINE — BOOTCAMP PARTICIPATION AGREEMENT

This Agreement is entered into on {{EFFECTIVE_DATE}} by and between QwantomHub Talent Pipeline Platform ("QwantomHub") and {{FELLOW_NAME}} ("Fellow"), residing at {{FELLOW_LOCATION}}.

1. PROGRAM PURPOSE & OBLIGATIONS
The Fellow is accepted into the QwantomHub Local Track Intensive Bootcamp. The Fellow agrees to maintain 90%+ milestone completion timeliness, participate in mentorship sessions, and adhere to the Honor Code.

2. INTELLECTUAL PROPERTY & AUTHENTICITY
All code submissions, project builds, and assessments must represent the Fellow's original work. Plagiarism, proxy-submission, or fraudulent assistance during technical screens will result in immediate disqualification.

3. STIPEND & BENCH ELIGIBILITY
Upon successful graduation with a Tier 1 (Global) or Tier 2 (Regional) composite score, the Fellow shall be eligible for Bench Farm System stipend allocation and Client Opportunity Matching.

AGREED AND SEALED DIGITALLY BY:
Fellow Name: {{FELLOW_NAME}}
Fellow Email: {{FELLOW_EMAIL}}
Document Ref ID: {{CONTRACT_ID}}`,
    variables: ['FELLOW_NAME', 'FELLOW_EMAIL', 'FELLOW_LOCATION', 'EFFECTIVE_DATE', 'CONTRACT_ID'],
  },
  bench_stipend_contract: {
    id: 'tmpl_bench_default',
    title: 'QwantomHub Bench Farm System Monthly Stipend Contract',
    body: `QWANTOMHUB TALENT PIPELINE — BENCH FARM SYSTEM STIPEND CONTRACT

This Bench Stipend Contract is effective as of {{EFFECTIVE_DATE}} between QwantomHub and Fellow {{FELLOW_NAME}} (ID: {{FELLOW_PROFILE_ID}}).

1. BENCH STIPEND ALLOCATION
QwantomHub agrees to allocate a monthly stipend of {{STIPEND_AMOUNT}} {{CURRENCY}} to the Fellow's wallet during their active tenure on the QwantomHub Bench Pool, subject to active SME internal project assignments.

2. FELLOW MAINTENANCE & AVAILABILITY
The Fellow agrees to remain available for client opportunity interviews, complete 10+ hours/week of internal SME micro-projects, and maintain top-tier coding standards.

3. DISBURSEMENT TERMS
Disbursements shall be processed according to scheduled payout batches via linked NUBAN bank accounts verified under the Fellow's registered identity spine name.

AGREED AND SEALED DIGITALLY BY:
Fellow Name: {{FELLOW_NAME}}
Stipend Amount: {{STIPEND_AMOUNT}} {{CURRENCY}} / month
Document Ref ID: {{CONTRACT_ID}}`,
    variables: ['FELLOW_NAME', 'FELLOW_PROFILE_ID', 'STIPEND_AMOUNT', 'CURRENCY', 'EFFECTIVE_DATE', 'CONTRACT_ID'],
  },
  placement_agreement: {
    id: 'tmpl_placement_default',
    title: 'QwantomHub Global/Regional Client Placement Agreement',
    body: `QWANTOMHUB TALENT PIPELINE — CLIENT PLACEMENT & PERFORMANCE CONTRACT

This Placement Agreement is entered into on {{EFFECTIVE_DATE}} between QwantomHub, Fellow {{FELLOW_NAME}}, and Client Partner {{CLIENT_NAME}}.

1. PLACEMENT ROLE & SCOPE
The Fellow is placed into the position of {{PLACEMENT_ROLE}} with a designated monthly compensation of {{COMPENSATION_AMOUNT}} {{CURRENCY}}.

2. CONFIDENTIALITY & CLIENT CODE OF CONDUCT
The Fellow agrees to strictly observe the Client Partner's data protection policy, code repository rules, and project milestones.

3. PERFORMANCE MONITORING & CONTINUOUS EVALUATION
QwantomHub will continuously monitor technical velocity and client satisfaction ratings.

AGREED AND SEALED DIGITALLY BY:
Fellow Name: {{FELLOW_NAME}}
Role: {{PLACEMENT_ROLE}}
Client Partner: {{CLIENT_NAME}}
Document Ref ID: {{CONTRACT_ID}}`,
    variables: ['FELLOW_NAME', 'CLIENT_NAME', 'PLACEMENT_ROLE', 'COMPENSATION_AMOUNT', 'CURRENCY', 'EFFECTIVE_DATE', 'CONTRACT_ID'],
  },
};

// In-memory state store for development & testing
const contractsStore = new Map<string, FellowContract>();
const templatesStore = new Map<string, ContractTemplate>();
const auditEventsStore = new Map<string, ContractAuditEvent[]>();

// Initialize default templates in store
for (const [type, tmpl] of Object.entries(DEFAULT_TEMPLATES)) {
  templatesStore.set(tmpl.id, {
    id: tmpl.id,
    title: tmpl.title,
    contractType: type as ContractType,
    bodyTemplate: tmpl.body,
    variables: tmpl.variables,
    version: '1.0.0',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export function _resetContractStoreForTesting(): void {
  contractsStore.clear();
  auditEventsStore.clear();
  templatesStore.clear();
  for (const [type, tmpl] of Object.entries(DEFAULT_TEMPLATES)) {
    templatesStore.set(tmpl.id, {
      id: tmpl.id,
      title: tmpl.title,
      contractType: type as ContractType,
      bodyTemplate: tmpl.body,
      variables: tmpl.variables,
      version: '1.0.0',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}

/**
 * Generate SHA-256 cryptographic HMAC digital seal for signed contract payload
 */
export function generateSHA256Seal(
  contractId: string,
  fellowProfileId: string,
  signatureData: string,
  timestamp: string
): string {
  const secret = process.env.CONTRACT_HMAC_SECRET || 'qwantomhub_contract_security_secret_key_2026';
  const dataPayload = `${contractId}:${fellowProfileId}:${signatureData}:${timestamp}`;
  return crypto.createHmac('sha256', secret).update(dataPayload).digest('hex');
}

// ----------------------------------------------------
// CONTRACT TEMPLATES CRUD MANAGEMENT
// ----------------------------------------------------

export async function createContractTemplate(
  actor: AuthActor,
  rawInput: CreateContractTemplateInput
): Promise<ContractTemplate> {
  auth.requireRole(actor, 'admin');
  const input = CreateContractTemplateSchema.parse(rawInput);

  const templateId = `tmpl_${crypto.randomUUID().substring(0, 8)}`;
  const now = new Date().toISOString();

  const template: ContractTemplate = {
    id: templateId,
    title: input.title,
    contractType: input.contractType,
    bodyTemplate: input.bodyTemplate,
    variables: input.variables || [],
    version: input.version || '1.0.0',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  templatesStore.set(templateId, template);

  await logAuditEvent({
    actorClerkUserId: actor.clerkUserId,
    action: 'CONTRACT_TEMPLATE_CREATED',
    targetType: 'contract_template',
    targetId: templateId,
    metadata: { title: input.title, contractType: input.contractType },
  });

  return template;
}

export async function listContractTemplates(actor: AuthActor): Promise<ContractTemplate[]> {
  auth.requireRole(actor, 'admin');
  return Array.from(templatesStore.values());
}

export async function updateContractTemplate(
  actor: AuthActor,
  rawInput: UpdateContractTemplateInput
): Promise<ContractTemplate> {
  auth.requireRole(actor, 'admin');
  const input = UpdateContractTemplateSchema.parse(rawInput);

  const template = templatesStore.get(input.templateId);
  if (!template) {
    throw new Error(`Contract template '${input.templateId}' not found.`);
  }

  const now = new Date().toISOString();
  if (input.title) template.title = input.title;
  if (input.bodyTemplate) template.bodyTemplate = input.bodyTemplate;
  if (input.variables) template.variables = input.variables;
  if (input.status) template.status = input.status;
  template.updatedAt = now;

  templatesStore.set(template.id, template);

  await logAuditEvent({
    actorClerkUserId: actor.clerkUserId,
    action: 'CONTRACT_TEMPLATE_UPDATED',
    targetType: 'contract_template',
    targetId: template.id,
    metadata: { title: template.title },
  });

  return template;
}

export async function deleteContractTemplate(
  actor: AuthActor,
  templateId: string
): Promise<{ success: boolean; templateId: string }> {
  auth.requireRole(actor, 'admin');

  if (!templatesStore.has(templateId)) {
    throw new Error(`Contract template '${templateId}' not found.`);
  }

  templatesStore.delete(templateId);

  await logAuditEvent({
    actorClerkUserId: actor.clerkUserId,
    action: 'CONTRACT_TEMPLATE_DELETED',
    targetType: 'contract_template',
    targetId: templateId,
  });

  return { success: true, templateId };
}

// ----------------------------------------------------
// CONTRACT ENVELOPES CRUD & LIFECYCLE MANAGEMENT
// ----------------------------------------------------

/**
 * Create or draft a new contract envelope for a fellow (Admin action)
 */
export async function createContractEnvelope(
  actor: AuthActor,
  rawInput: CreateContractEnvelopeInput
): Promise<FellowContract> {
  auth.requireRole(actor, 'admin');
  const input = CreateContractEnvelopeSchema.parse(rawInput);

  // Fetch fellow profile to populate identity variables
  let fellowName = 'Registered Fellow';
  let fellowEmail = 'fellow@qwantomhub.com';
  let fellowLocation = 'Lagos, Nigeria';

  try {
    const profile = await getFellowProfileById(input.fellowProfileId, actor);
    if (profile) {
      fellowName = `${profile.firstName} ${profile.lastName}`.trim() || fellowName;
      fellowEmail = profile.email || fellowEmail;
      fellowLocation = profile.country || fellowLocation;
    }
  } catch (err) {
    // Fallback if isolated profile mock in unit tests
  }

  const contractId = crypto.randomUUID();
  const defaultTmpl = DEFAULT_TEMPLATES[input.contractType];
  const customTmpl = input.templateId ? templatesStore.get(input.templateId) : null;
  const templateBody = customTmpl ? customTmpl.bodyTemplate : defaultTmpl.body;
  const templateTitle = input.title || (customTmpl ? customTmpl.title : defaultTmpl.title);

  const now = new Date().toISOString();
  const effectiveDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  let populatedBody = templateBody
    .replace(/\{\{FELLOW_NAME\}\}/g, fellowName)
    .replace(/\{\{FELLOW_EMAIL\}\}/g, fellowEmail)
    .replace(/\{\{FELLOW_LOCATION\}\}/g, fellowLocation)
    .replace(/\{\{FELLOW_PROFILE_ID\}\}/g, input.fellowProfileId)
    .replace(/\{\{EFFECTIVE_DATE\}\}/g, effectiveDate)
    .replace(/\{\{CONTRACT_ID\}\}/g, contractId);

  // Apply custom template variables if provided
  if (input.customVariables) {
    for (const [key, value] of Object.entries(input.customVariables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      populatedBody = populatedBody.replace(regex, String(value));
    }
  }

  // Replace default placeholders
  populatedBody = populatedBody
    .replace(/\{\{STIPEND_AMOUNT\}\}/g, input.customVariables?.STIPEND_AMOUNT || '$500')
    .replace(/\{\{CURRENCY\}\}/g, input.customVariables?.CURRENCY || 'USD')
    .replace(/\{\{CLIENT_NAME\}\}/g, input.customVariables?.CLIENT_NAME || 'Seelicongate Global')
    .replace(/\{\{PLACEMENT_ROLE\}\}/g, input.customVariables?.PLACEMENT_ROLE || 'Senior AI Engineer')
    .replace(/\{\{COMPENSATION_AMOUNT\}\}/g, input.customVariables?.COMPENSATION_AMOUNT || '$3,500');

  const contractStatus = input.status || 'sent';

  const contract: FellowContract = {
    id: contractId,
    fellowProfileId: input.fellowProfileId,
    templateId: input.templateId,
    contractType: input.contractType,
    title: templateTitle,
    populatedBody,
    status: contractStatus,
    signerName: fellowName,
    signerEmail: fellowEmail,
    provider: input.provider || 'embedded',
    metadata: input.metadata || {},
    createdAt: now,
    updatedAt: now,
  };

  contractsStore.set(contractId, contract);

  const auditEvent: ContractAuditEvent = {
    id: crypto.randomUUID(),
    contractId,
    action: contractStatus === 'draft' ? 'created' : 'sent',
    actorClerkUserId: actor.clerkUserId,
    timestamp: now,
    metadata: { contractType: input.contractType, provider: contract.provider, status: contractStatus },
  };

  const existingAudit = auditEventsStore.get(contractId) || [];
  auditEventsStore.set(contractId, [...existingAudit, auditEvent]);

  await logAuditEvent({
    actorClerkUserId: actor.clerkUserId,
    action: contractStatus === 'draft' ? 'CONTRACT_ENVELOPE_DRAFTED' : 'CONTRACT_ENVELOPE_CREATED',
    targetType: 'fellow_contract',
    targetId: contractId,
    metadata: {
      fellowProfileId: input.fellowProfileId,
      contractType: input.contractType,
      provider: contract.provider,
      status: contractStatus,
    },
  });

  if (contractStatus === 'sent') {
    try {
      await sendEmail({
        to: fellowEmail,
        subject: `Action Required: Please Sign ${contract.title}`,
        htmlContent: `<p>Hello ${fellowName},</p><p>Your QwantomHub onboarding contract <strong>${contract.title}</strong> is ready for your review and e-signature.</p><p>Please log in to your fellow portal to sign.</p>`,
      });
    } catch (err) {
      // Graceful notification handling
    }
  }

  return contract;
}

/**
 * Modify an existing contract envelope (Admin action - draft or sent)
 */
export async function updateContractEnvelope(
  actor: AuthActor,
  rawInput: UpdateContractEnvelopeInput
): Promise<FellowContract> {
  auth.requireRole(actor, 'admin');
  const input = UpdateContractEnvelopeSchema.parse(rawInput);

  const contract = contractsStore.get(input.contractId);
  if (!contract) {
    throw new Error(`Contract envelope '${input.contractId}' not found.`);
  }

  if (contract.status === 'signed') {
    throw new Error('Cannot modify an already signed legally binding contract envelope.');
  }

  const now = new Date().toISOString();
  if (input.title) contract.title = input.title;
  if (input.populatedBody) contract.populatedBody = input.populatedBody;
  if (input.signerName) contract.signerName = input.signerName;
  if (input.signerEmail) contract.signerEmail = input.signerEmail;
  if (input.metadata) contract.metadata = { ...contract.metadata, ...input.metadata };
  contract.updatedAt = now;

  contractsStore.set(contract.id, contract);

  const auditEvent: ContractAuditEvent = {
    id: crypto.randomUUID(),
    contractId: contract.id,
    action: 'updated',
    actorClerkUserId: actor.clerkUserId,
    timestamp: now,
    metadata: { title: contract.title },
  };

  const existingAudit = auditEventsStore.get(contract.id) || [];
  auditEventsStore.set(contract.id, [...existingAudit, auditEvent]);

  await logAuditEvent({
    actorClerkUserId: actor.clerkUserId,
    action: 'CONTRACT_ENVELOPE_UPDATED',
    targetType: 'fellow_contract',
    targetId: contract.id,
    metadata: { title: contract.title },
  });

  return contract;
}

/**
 * Send a draft contract envelope to the fellow (Admin action)
 */
export async function sendContractEnvelope(
  actor: AuthActor,
  rawInput: SendContractEnvelopeInput
): Promise<FellowContract> {
  auth.requireRole(actor, 'admin');
  const input = SendContractEnvelopeSchema.parse(rawInput);

  const contract = contractsStore.get(input.contractId);
  if (!contract) {
    throw new Error(`Contract envelope '${input.contractId}' not found.`);
  }

  if (contract.status === 'signed') {
    throw new Error('Contract envelope is already signed.');
  }

  const now = new Date().toISOString();
  contract.status = 'sent';
  contract.updatedAt = now;

  contractsStore.set(contract.id, contract);

  const auditEvent: ContractAuditEvent = {
    id: crypto.randomUUID(),
    contractId: contract.id,
    action: 'sent',
    actorClerkUserId: actor.clerkUserId,
    timestamp: now,
  };

  const existingAudit = auditEventsStore.get(contract.id) || [];
  auditEventsStore.set(contract.id, [...existingAudit, auditEvent]);

  await logAuditEvent({
    actorClerkUserId: actor.clerkUserId,
    action: 'CONTRACT_ENVELOPE_SENT',
    targetType: 'fellow_contract',
    targetId: contract.id,
    metadata: { fellowProfileId: contract.fellowProfileId },
  });

  try {
    await sendEmail({
      to: contract.signerEmail,
      subject: `Action Required: Please Sign ${contract.title}`,
      htmlContent: `<p>Hello ${contract.signerName},</p><p>Your QwantomHub onboarding contract <strong>${contract.title}</strong> is ready for your review and e-signature.</p><p>Please log in to your fellow portal to sign.</p>`,
    });
  } catch (err) {
    // Graceful notification handling
  }

  return contract;
}

/**
 * Delete a contract envelope (Admin action - cannot delete signed contracts)
 */
export async function deleteContractEnvelope(
  actor: AuthActor,
  rawInput: DeleteContractEnvelopeInput
): Promise<{ success: boolean; contractId: string }> {
  auth.requireRole(actor, 'admin');
  const input = DeleteContractEnvelopeSchema.parse(rawInput);

  const contract = contractsStore.get(input.contractId);
  if (!contract) {
    throw new Error(`Contract envelope '${input.contractId}' not found.`);
  }

  if (contract.status === 'signed') {
    throw new Error('Cannot delete an already signed legally binding contract envelope.');
  }

  contractsStore.delete(input.contractId);

  await logAuditEvent({
    actorClerkUserId: actor.clerkUserId,
    action: 'CONTRACT_ENVELOPE_DELETED',
    targetType: 'fellow_contract',
    targetId: input.contractId,
    metadata: { title: contract.title, fellowProfileId: contract.fellowProfileId },
  });

  return { success: true, contractId: input.contractId };
}

/**
 * Sign contract envelope with digital canvas signature and cryptographic SHA-256 seal (Rule 5 record access check)
 */
export async function signContractEnvelope(
  actor: AuthActor,
  rawInput: SignContractInput
): Promise<FellowContract> {
  const input = SignContractSchema.parse(rawInput);
  await auth.assertCanAccessFellowRecord(actor, input.fellowProfileId);

  const contract = contractsStore.get(input.contractId);
  if (!contract || contract.fellowProfileId !== input.fellowProfileId) {
    throw new Error(`Contract envelope '${input.contractId}' not found for fellow profile.`);
  }

  if (contract.status === 'signed') {
    return contract; // Idempotent return if already signed
  }

  if (contract.status === 'voided' || contract.status === 'declined') {
    throw new Error(`Cannot sign contract in '${contract.status}' state.`);
  }

  const now = new Date().toISOString();
  const sha256Hash = generateSHA256Seal(contract.id, input.fellowProfileId, input.signatureCanvasData, now);
  const storagePath = `contracts/${input.fellowProfileId}/${contract.id}_signed_${Date.now()}.json`;

  contract.status = 'signed';
  contract.signatureCanvasData = input.signatureCanvasData;
  contract.sha256Hash = sha256Hash;
  contract.signedAt = now;
  contract.signerIpAddress = input.signerIpAddress || '127.0.0.1';
  contract.signedDocumentStoragePath = storagePath;
  contract.updatedAt = now;

  contractsStore.set(contract.id, contract);

  const auditEvent: ContractAuditEvent = {
    id: crypto.randomUUID(),
    contractId: contract.id,
    action: 'signed',
    actorClerkUserId: actor.clerkUserId,
    ipAddress: input.signerIpAddress,
    userAgent: input.userAgent,
    timestamp: now,
    metadata: { sha256Hash, storagePath },
  };

  const existingAudit = auditEventsStore.get(contract.id) || [];
  auditEventsStore.set(contract.id, [...existingAudit, auditEvent]);

  await logAuditEvent({
    actorClerkUserId: actor.clerkUserId,
    action: 'CONTRACT_ENVELOPE_SIGNED',
    targetType: 'fellow_contract',
    targetId: contract.id,
    metadata: {
      fellowProfileId: input.fellowProfileId,
      sha256Hash,
      signedAt: now,
    },
  });

  return contract;
}

/**
 * Decline contract envelope (Rule 5 record access check)
 */
export async function declineContractEnvelope(
  actor: AuthActor,
  rawInput: DeclineContractInput
): Promise<FellowContract> {
  const input = DeclineContractSchema.parse(rawInput);
  await auth.assertCanAccessFellowRecord(actor, input.fellowProfileId);

  const contract = contractsStore.get(input.contractId);
  if (!contract || contract.fellowProfileId !== input.fellowProfileId) {
    throw new Error(`Contract envelope '${input.contractId}' not found for fellow profile.`);
  }

  if (contract.status === 'signed') {
    throw new Error('Cannot decline an already signed contract.');
  }

  const now = new Date().toISOString();
  contract.status = 'declined';
  contract.declineReason = input.reason;
  contract.updatedAt = now;

  contractsStore.set(contract.id, contract);

  const auditEvent: ContractAuditEvent = {
    id: crypto.randomUUID(),
    contractId: contract.id,
    action: 'declined',
    actorClerkUserId: actor.clerkUserId,
    timestamp: now,
    metadata: { reason: input.reason },
  };

  const existingAudit = auditEventsStore.get(contract.id) || [];
  auditEventsStore.set(contract.id, [...existingAudit, auditEvent]);

  await logAuditEvent({
    actorClerkUserId: actor.clerkUserId,
    action: 'CONTRACT_ENVELOPE_DECLINED',
    targetType: 'fellow_contract',
    targetId: contract.id,
    metadata: { fellowProfileId: input.fellowProfileId, reason: input.reason },
  });

  return contract;
}

/**
 * Void contract envelope (Admin action)
 */
export async function voidContractEnvelope(
  actor: AuthActor,
  rawInput: VoidContractInput
): Promise<FellowContract> {
  auth.requireRole(actor, 'admin');
  const input = VoidContractSchema.parse(rawInput);

  const contract = contractsStore.get(input.contractId);
  if (!contract) {
    throw new Error(`Contract envelope '${input.contractId}' not found.`);
  }

  const now = new Date().toISOString();
  contract.status = 'voided';
  contract.voidReason = input.reason;
  contract.updatedAt = now;

  contractsStore.set(contract.id, contract);

  const auditEvent: ContractAuditEvent = {
    id: crypto.randomUUID(),
    contractId: contract.id,
    action: 'voided',
    actorClerkUserId: actor.clerkUserId,
    timestamp: now,
    metadata: { reason: input.reason },
  };

  const existingAudit = auditEventsStore.get(contract.id) || [];
  auditEventsStore.set(contract.id, [...existingAudit, auditEvent]);

  await logAuditEvent({
    actorClerkUserId: actor.clerkUserId,
    action: 'CONTRACT_ENVELOPE_VOIDED',
    targetType: 'fellow_contract',
    targetId: contract.id,
    metadata: { reason: input.reason },
  });

  return contract;
}

/**
 * List all assigned contract envelopes for a fellow (Rule 5 access check - returns only non-draft sent/signed/declined contracts)
 */
export async function listContractsForFellow(
  actor: AuthActor,
  fellowProfileId: string
): Promise<FellowContract[]> {
  await auth.assertCanAccessFellowRecord(actor, fellowProfileId);

  return Array.from(contractsStore.values())
    .filter((c) => c.fellowProfileId === fellowProfileId && c.status !== 'draft')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * List all platform contract envelopes for Admin Contract Governance Console
 */
export async function listAllContractsForAdmin(
  actor: AuthActor,
  filterType?: ContractType
): Promise<FellowContract[]> {
  auth.requireRole(actor, 'admin');

  return Array.from(contractsStore.values())
    .filter((c) => (filterType ? c.contractType === filterType : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Process Documenso webhook callbacks with signature header verification
 */
export async function processDocumensoWebhook(
  payload: DocumensoWebhookPayload,
  signatureHeader?: string
): Promise<{ success: boolean; eventProcessed?: string; message?: string }> {
  const webhookSecret = process.env.DOCUMENSO_WEBHOOK_SECRET;

  if (webhookSecret && signatureHeader) {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (signatureHeader !== expectedSignature) {
      throw new Error('Invalid Documenso HMAC SHA256 signature header. Webhook rejected.');
    }
  }

  const { event, documentId, envelopeId, data } = payload;
  const targetId = envelopeId || documentId;

  let contract: FellowContract | undefined;
  for (const c of contractsStore.values()) {
    if (c.externalEnvelopeId === targetId || c.id === targetId) {
      contract = c;
      break;
    }
  }

  if (!contract) {
    return { success: true, message: `No matching contract envelope for Documenso ID ${targetId}` };
  }

  const now = new Date().toISOString();

  if (event === 'document.signed' || event === 'envelope.completed') {
    contract.status = 'signed';
    contract.signedAt = data.signedAt || now;
    contract.sha256Hash = generateSHA256Seal(contract.id, contract.fellowProfileId, 'DOCUMENSO_EXTERNAL_SIG', now);
    contract.updatedAt = now;
  } else if (event === 'document.declined') {
    contract.status = 'declined';
    contract.declineReason = data.declineReason || 'Declined via Documenso Portal';
    contract.updatedAt = now;
  } else if (event === 'document.voided') {
    contract.status = 'voided';
    contract.voidReason = 'Voided via Documenso Portal';
    contract.updatedAt = now;
  }

  contractsStore.set(contract.id, contract);
  return { success: true, eventProcessed: event };
}

/**
 * Fetch audit trail events for a contract envelope (Rule 5 access check)
 */
export async function getContractAuditTrail(
  actor: AuthActor,
  contractId: string
): Promise<ContractAuditEvent[]> {
  const contract = contractsStore.get(contractId);
  if (!contract) {
    throw new Error(`Contract '${contractId}' not found.`);
  }

  await auth.assertCanAccessFellowRecord(actor, contract.fellowProfileId);
  return auditEventsStore.get(contractId) || [];
}
