import { pgTable, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';

export const contractTemplates = pgTable('contract_templates', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  contractType: text('contract_type').notNull(), // 'bootcamp_agreement' | 'bench_stipend_contract' | 'placement_agreement'
  bodyTemplate: text('body_template').notNull(),
  variables: jsonb('variables').$type<string[]>().default([]),
  version: text('version').notNull().default('1.0.0'),
  status: text('status').notNull().default('active'), // 'active' | 'archived'
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const fellowContracts = pgTable('fellow_contracts', {
  id: text('id').primaryKey(),
  fellowProfileId: text('fellow_profile_id').notNull(),
  templateId: text('template_id'),
  contractType: text('contract_type').notNull(), // 'bootcamp_agreement' | 'bench_stipend_contract' | 'placement_agreement'
  title: text('title').notNull(),
  populatedBody: text('populated_body').notNull(),
  status: text('status').notNull().default('sent'), // 'draft' | 'sent' | 'delivered' | 'signed' | 'declined' | 'voided'
  signerName: text('signer_name').notNull(),
  signerEmail: text('signer_email').notNull(),
  signatureCanvasData: text('signature_canvas_data'), // Base64 signature image or typed signature representation
  sha256Hash: text('sha256_hash'), // Cryptographic document + signature seal hash
  signedAt: timestamp('signed_at'),
  signerIpAddress: text('signer_ip_address'),
  signedDocumentStoragePath: text('signed_document_storage_path'),
  externalEnvelopeId: text('external_envelope_id'), // For Documenso integration
  provider: text('provider').notNull().default('embedded'), // 'embedded' | 'documenso'
  declineReason: text('decline_reason'),
  voidReason: text('void_reason'),
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const contractAuditEvents = pgTable('contract_audit_events', {
  id: text('id').primaryKey(),
  contractId: text('contract_id').notNull(),
  action: text('action').notNull(), // 'created' | 'sent' | 'viewed' | 'signed' | 'declined' | 'voided'
  actorClerkUserId: text('actor_clerk_user_id').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
});
