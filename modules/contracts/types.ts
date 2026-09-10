import { z } from 'zod';

export type ContractType = 'bootcamp_agreement' | 'bench_stipend_contract' | 'placement_agreement';
export type ContractStatus = 'draft' | 'sent' | 'delivered' | 'signed' | 'declined' | 'voided';
export type ESignatureProviderType = 'embedded' | 'documenso';

export interface ContractTemplate {
  id: string;
  title: string;
  contractType: ContractType;
  bodyTemplate: string;
  variables: string[];
  version: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface FellowContract {
  id: string;
  fellowProfileId: string;
  templateId?: string;
  contractType: ContractType;
  title: string;
  populatedBody: string;
  status: ContractStatus;
  signerName: string;
  signerEmail: string;
  signatureCanvasData?: string;
  sha256Hash?: string;
  signedAt?: string;
  signerIpAddress?: string;
  signedDocumentStoragePath?: string;
  externalEnvelopeId?: string;
  provider: ESignatureProviderType;
  declineReason?: string;
  voidReason?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ContractAuditEvent {
  id: string;
  contractId: string;
  action: 'created' | 'sent' | 'viewed' | 'signed' | 'declined' | 'voided' | 'updated' | 'deleted';
  actorClerkUserId: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

// Zod Validation Schemas
export const CreateContractTemplateSchema = z.object({
  title: z.string().min(3, 'Template title must be at least 3 characters'),
  contractType: z.enum(['bootcamp_agreement', 'bench_stipend_contract', 'placement_agreement']),
  bodyTemplate: z.string().min(20, 'Template body must be at least 20 characters'),
  variables: z.array(z.string()).optional(),
  version: z.string().optional().default('1.0.0'),
});

export const UpdateContractTemplateSchema = z.object({
  templateId: z.string().min(1, 'Template ID is required'),
  title: z.string().min(3, 'Template title must be at least 3 characters').optional(),
  bodyTemplate: z.string().min(20, 'Template body must be at least 20 characters').optional(),
  variables: z.array(z.string()).optional(),
  status: z.enum(['active', 'archived']).optional(),
});

export const CreateContractEnvelopeSchema = z.object({
  fellowProfileId: z.string().min(1, 'Fellow Profile ID is required'),
  contractType: z.enum(['bootcamp_agreement', 'bench_stipend_contract', 'placement_agreement']),
  title: z.string().min(3, 'Contract title must be at least 3 characters').optional(),
  customVariables: z.record(z.string()).optional(),
  provider: z.enum(['embedded', 'documenso']).optional().default('embedded'),
  status: z.enum(['draft', 'sent']).optional().default('sent'),
  templateId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export const UpdateContractEnvelopeSchema = z.object({
  contractId: z.string().min(1, 'Contract ID is required'),
  title: z.string().min(3, 'Contract title must be at least 3 characters').optional(),
  populatedBody: z.string().min(20, 'Contract body must be at least 20 characters').optional(),
  signerName: z.string().min(2, 'Signer name must be at least 2 characters').optional(),
  signerEmail: z.string().email('Invalid email address').optional(),
  metadata: z.record(z.any()).optional(),
});

export const SendContractEnvelopeSchema = z.object({
  contractId: z.string().min(1, 'Contract ID is required'),
});

export const DeleteContractEnvelopeSchema = z.object({
  contractId: z.string().min(1, 'Contract ID is required'),
});

export const SignContractSchema = z.object({
  contractId: z.string().min(1, 'Contract ID is required'),
  fellowProfileId: z.string().min(1, 'Fellow Profile ID is required'),
  signatureCanvasData: z.string().min(10, 'Signature canvas data or typed signature is required'),
  signerIpAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

export const DeclineContractSchema = z.object({
  contractId: z.string().min(1, 'Contract ID is required'),
  fellowProfileId: z.string().min(1, 'Fellow Profile ID is required'),
  reason: z.string().min(5, 'Decline reason must be at least 5 characters'),
});

export const VoidContractSchema = z.object({
  contractId: z.string().min(1, 'Contract ID is required'),
  reason: z.string().min(5, 'Void reason must be at least 5 characters'),
});

export type CreateContractTemplateInput = z.input<typeof CreateContractTemplateSchema>;
export type UpdateContractTemplateInput = z.input<typeof UpdateContractTemplateSchema>;
export type CreateContractEnvelopeInput = z.input<typeof CreateContractEnvelopeSchema>;
export type UpdateContractEnvelopeInput = z.input<typeof UpdateContractEnvelopeSchema>;
export type SendContractEnvelopeInput = z.input<typeof SendContractEnvelopeSchema>;
export type DeleteContractEnvelopeInput = z.input<typeof DeleteContractEnvelopeSchema>;
export type SignContractInput = z.infer<typeof SignContractSchema>;
export type DeclineContractInput = z.infer<typeof DeclineContractSchema>;
export type VoidContractInput = z.infer<typeof VoidContractSchema>;

export interface DocumensoWebhookPayload {
  event: 'document.signed' | 'document.declined' | 'document.voided' | 'envelope.completed';
  documentId: string;
  envelopeId?: string;
  data: {
    status: string;
    signerEmail?: string;
    signerName?: string;
    declineReason?: string;
    signedAt?: string;
    downloadUrl?: string;
  };
}
