import { describe, it, expect, beforeEach, vi } from 'vitest';
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
  processDocumensoWebhook,
  getContractAuditTrail,
  generateSHA256Seal,
  _resetContractStoreForTesting,
} from '../service';
import { AuthActor } from '@/modules/identity/types';
import * as auth from '@/lib/auth';

// Mock audit & notification services
vi.mock('../../audit/service', () => ({
  logAuditEvent: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../notifications/service', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true, messageId: 'msg_123' }),
}));

describe('Service 22: Contract & Onboarding (E-Signature Layer & Documenso Integration)', () => {
  const fellowProfileIdA = '550e8400-e29b-41d4-a716-446655440000';
  const fellowProfileIdB = '660e8400-e29b-41d4-a716-446655440001';

  const fellowUserA: AuthActor = { clerkUserId: 'clerk_user_fellow_1', roles: ['fellow'] };
  const fellowUserB: AuthActor = { clerkUserId: 'clerk_user_fellow_2', roles: ['fellow'] };
  const adminUser: AuthActor = { clerkUserId: 'clerk_admin', roles: ['admin'] };

  beforeEach(() => {
    _resetContractStoreForTesting();
    vi.restoreAllMocks();
  });

  describe('Admin Contract Envelope CRUD (Drafting, Editing, Sending, Deleting)', () => {
    it('allows admin to create a draft contract envelope and send it to fellow later', async () => {
      vi.spyOn(auth, 'assertCanAccessFellowRecord').mockResolvedValue(undefined);

      // 1. Create draft contract
      const draftContract = await createContractEnvelope(adminUser, {
        fellowProfileId: fellowProfileIdA,
        contractType: 'bootcamp_agreement',
        title: 'Draft Bootcamp Agreement',
        status: 'draft',
      });

      expect(draftContract.status).toBe('draft');

      // Fellow shouldn't see draft contracts in their list
      const fellowListBefore = await listContractsForFellow(fellowUserA, fellowProfileIdA);
      expect(fellowListBefore.length).toBe(0);

      // 2. Modify draft contract
      const updatedContract = await updateContractEnvelope(adminUser, {
        contractId: draftContract.id,
        title: 'Revised Bootcamp Agreement',
        populatedBody: 'Updated contract body terms for fellow.',
      });

      expect(updatedContract.title).toBe('Revised Bootcamp Agreement');
      expect(updatedContract.populatedBody).toBe('Updated contract body terms for fellow.');

      // 3. Send contract envelope
      const sentContract = await sendContractEnvelope(adminUser, {
        contractId: draftContract.id,
      });

      expect(sentContract.status).toBe('sent');

      // Fellow can now view and sign the sent contract
      const fellowListAfter = await listContractsForFellow(fellowUserA, fellowProfileIdA);
      expect(fellowListAfter.length).toBe(1);
      expect(fellowListAfter[0].id).toBe(draftContract.id);
    });

    it('allows admin to delete an unsigned draft or sent contract envelope', async () => {
      const contract = await createContractEnvelope(adminUser, {
        fellowProfileId: fellowProfileIdA,
        contractType: 'bench_stipend_contract',
        title: 'Temporary Stipend Agreement',
        status: 'draft',
      });

      const deleteResult = await deleteContractEnvelope(adminUser, {
        contractId: contract.id,
      });

      expect(deleteResult.success).toBe(true);
      const adminList = await listAllContractsForAdmin(adminUser);
      expect(adminList.find((c) => c.id === contract.id)).toBeUndefined();
    });

    it('blocks deletion of an already signed legally binding contract envelope', async () => {
      vi.spyOn(auth, 'assertCanAccessFellowRecord').mockResolvedValue(undefined);

      const contract = await createContractEnvelope(adminUser, {
        fellowProfileId: fellowProfileIdA,
        contractType: 'bootcamp_agreement',
        title: 'Signed Agreement',
      });

      await signContractEnvelope(fellowUserA, {
        contractId: contract.id,
        fellowProfileId: fellowProfileIdA,
        signatureCanvasData: 'TYPED_SIGNATURE:Ada Lovelace',
      });

      await expect(
        deleteContractEnvelope(adminUser, {
          contractId: contract.id,
        })
      ).rejects.toThrow(/Cannot delete an already signed legally binding contract/i);
    });
  });

  describe('Contract Template Management CRUD', () => {
    it('allows admin to create, update, list, and delete custom contract templates', async () => {
      // 1. Create template
      const template = await createContractTemplate(adminUser, {
        title: 'Custom Client Agreement Template',
        contractType: 'placement_agreement',
        bodyTemplate: 'Custom placement body template for {{FELLOW_NAME}} at {{CLIENT_NAME}}',
        variables: ['FELLOW_NAME', 'CLIENT_NAME'],
      });

      expect(template.id).toBeDefined();
      expect(template.title).toBe('Custom Client Agreement Template');

      // 2. List templates
      const templates = await listContractTemplates(adminUser);
      expect(templates.some((t) => t.id === template.id)).toBe(true);

      // 3. Update template
      const updated = await updateContractTemplate(adminUser, {
        templateId: template.id,
        title: 'Updated Client Agreement Template',
      });
      expect(updated.title).toBe('Updated Client Agreement Template');

      // 4. Delete template
      const deleteRes = await deleteContractTemplate(adminUser, template.id);
      expect(deleteRes.success).toBe(true);
    });
  });

  describe('Embedded Digital Signing & Cryptographic SHA-256 Sealing', () => {
    it('allows fellow to sign their assigned contract, creating SHA-256 seal and storage record', async () => {
      vi.spyOn(auth, 'assertCanAccessFellowRecord').mockResolvedValue(undefined);

      const contract = await createContractEnvelope(adminUser, {
        fellowProfileId: fellowProfileIdA,
        contractType: 'bootcamp_agreement',
        title: 'Bootcamp Agreement',
      });

      const sampleSignatureCanvas = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      const signedContract = await signContractEnvelope(fellowUserA, {
        contractId: contract.id,
        fellowProfileId: fellowProfileIdA,
        signatureCanvasData: sampleSignatureCanvas,
        signerIpAddress: '197.210.64.12',
      });

      expect(signedContract.status).toBe('signed');
      expect(signedContract.signatureCanvasData).toBe(sampleSignatureCanvas);
      expect(signedContract.sha256Hash).toBeDefined();
      expect(signedContract.sha256Hash?.length).toBe(64);
      expect(signedContract.signerIpAddress).toBe('197.210.64.12');
      expect(signedContract.signedDocumentStoragePath).toContain(`contracts/${fellowProfileIdA}/`);
    });

    it('prevents signing an already voided or declined contract envelope', async () => {
      vi.spyOn(auth, 'assertCanAccessFellowRecord').mockResolvedValue(undefined);

      const contract = await createContractEnvelope(adminUser, {
        fellowProfileId: fellowProfileIdA,
        contractType: 'placement_agreement',
        title: 'Placement Contract',
      });

      await voidContractEnvelope(adminUser, {
        contractId: contract.id,
        reason: 'Placement terms updated',
      });

      await expect(
        signContractEnvelope(fellowUserA, {
          contractId: contract.id,
          fellowProfileId: fellowProfileIdA,
          signatureCanvasData: 'TYPED_SIGNATURE:Ada Lovelace',
        })
      ).rejects.toThrow(/Cannot sign contract in 'voided' state/i);
    });
  });

  describe('Documenso Webhook Integration', () => {
    it('processes document.signed webhook event and updates envelope status', async () => {
      const contract = await createContractEnvelope(adminUser, {
        fellowProfileId: fellowProfileIdA,
        contractType: 'placement_agreement',
        title: 'Documenso External Agreement',
        provider: 'documenso',
      });

      const result = await processDocumensoWebhook({
        event: 'document.signed',
        documentId: contract.id,
        data: {
          status: 'COMPLETED',
          signerEmail: 'fellow@qwantomhub.com',
          signedAt: new Date().toISOString(),
        },
      });

      expect(result.success).toBe(true);
      expect(result.eventProcessed).toBe('document.signed');

      const updatedList = await listAllContractsForAdmin(adminUser);
      const updatedContract = updatedList.find((c) => c.id === contract.id);
      expect(updatedContract?.status).toBe('signed');
      expect(updatedContract?.sha256Hash).toBeDefined();
    });
  });

  describe('Rule 5 Security & Explicit Fellow Isolation', () => {
    it('blocks Fellow A from signing or viewing Fellow B contract envelope', async () => {
      const contractB = await createContractEnvelope(adminUser, {
        fellowProfileId: fellowProfileIdB,
        contractType: 'bootcamp_agreement',
        title: 'Fellow B Agreement',
      });

      // Mock auth check to reject Fellow A accessing Fellow B record
      vi.spyOn(auth, 'assertCanAccessFellowRecord').mockImplementation(async (actor, profileId) => {
        if (profileId !== '550e8400-e29b-41d4-a716-446655440000') {
          throw new Error('Unauthorized: actor cannot access fellow profile record');
        }
      });

      // Fellow A attempts to sign Fellow B contract (Blocked)
      await expect(
        signContractEnvelope(fellowUserA, {
          contractId: contractB.id,
          fellowProfileId: fellowProfileIdB,
          signatureCanvasData: 'TYPED_SIGNATURE:Attacker',
        })
      ).rejects.toThrow(/unauthorized/i);

      // Fellow A attempts to list Fellow B contracts (Blocked)
      await expect(listContractsForFellow(fellowUserA, fellowProfileIdB)).rejects.toThrow(/unauthorized/i);
    });
  });
});
